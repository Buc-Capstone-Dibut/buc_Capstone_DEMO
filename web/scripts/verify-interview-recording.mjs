import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const { build } = require("esbuild");
const base = process.env.RECORDING_QA_URL || "http://localhost:3100";
const output = process.env.RECORDING_QA_OUTPUT || "/tmp/dibut-recording-qa";
await mkdir(output, { recursive: true });
const bundle = await build({
  entryPoints: ["test/interview-recording-fixture.tsx"],
  bundle: true,
  write: false,
  format: "iife",
  jsx: "automatic",
  tsconfig: "tsconfig.json",
  define: { "process.env.NODE_ENV": '"development"' },
});
const browser = await chromium.launch({
  headless: true,
  args: [
    "--use-fake-device-for-media-stream",
    "--use-fake-ui-for-media-stream",
    "--autoplay-policy=no-user-gesture-required",
  ],
});
let video;
let metadata;
let failUpload = true;
let uploadCount = 0;
const uploadMode = process.env.RECORDING_QA_STORAGE || "supabase";
const signedUpload =
  uploadMode === "local"
    ? { mode: "local" }
    : {
        mode: "supabase",
        signedUrl: "https://recording-storage.test/upload?token=qa",
      };
const context = await browser.newContext({
  permissions: ["microphone", "camera"],
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
page.setDefaultNavigationTimeout(180000);
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
try {
  await page.route("https://recording-storage.test/**", (route) => {
    const headers = {
      "Access-Control-Allow-Origin": base,
      "Access-Control-Allow-Methods": "PUT, OPTIONS",
      "Access-Control-Allow-Headers": "content-type",
    };
    if (route.request().method() === "OPTIONS")
      return route.fulfill({ status: 204, headers });
    assert.equal(route.request().method(), "PUT");
    uploadCount++;
    if (failUpload)
      return route.fulfill({ status: 503, headers, json: { success: false } });
    video = route.request().postDataBuffer();
    return route.fulfill({ headers, json: { success: true } });
  });
  await page.route(`${base}/__recording-fixture`, (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<div id="root"></div><script src="/__recording-fixture.js"></script>',
    }),
  );
  await page.route(`${base}/__recording-fixture.js`, (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: bundle.outputFiles[0].text,
    }),
  );
  await page.route(
    "**/api/interview/sessions/qa-recording/recording/**",
    async (route) => {
      if (route.request().url().includes("upload-url"))
        return route.fulfill({ json: { success: true, data: signedUpload } });
      uploadCount++;
      if (failUpload)
        return route.fulfill({ status: 503, json: { success: false } });
      video = route.request().postDataBuffer();
      return route.fulfill({ json: { success: true } });
    },
  );
  await page.route(
    "**/api/interview/sessions/qa-recording/recording",
    async (route) => {
      metadata = route.request().postDataJSON();
      return route.fulfill({ json: { success: true } });
    },
  );
  await page.goto(`${base}/__recording-fixture`);
  await page.getByText("Start recording", { exact: true }).click();
  await page.getByRole("status").filter({ hasText: "ready-to-save" }).waitFor();
  await page.getByText("Save recording", { exact: true }).click();
  await page.getByRole("status").filter({ hasText: "retryable" }).waitFor();
  failUpload = false;
  await page.reload();
  const pending = await page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open("interview-recording-recovery", 1);
        open.onsuccess = () => {
          const request = open.result
            .transaction("recordings")
            .objectStore("recordings")
            .get("qa-recording");
          request.onsuccess = () => {
            resolve({
              bytes: request.result.blob.size,
              transcript: request.result.transcript,
              durationMs: request.result.durationMs,
              storagePath: request.result.storagePath,
            });
            open.result.close();
          };
          request.onerror = () => reject(request.error);
        };
      }),
  );
  assert.ok(pending.bytes > 1000);
  assert.equal(pending.transcript.entries.length, 2);

  await page.unroute("**/api/interview/sessions/qa-recording/recording");
  let recordingReady = false;
  let failRead = false;
  let missing = false;
  let legacy = false;
  let reportPending = false;
  let failVideo = false;
  let expiresAt;
  let signedVersion = 0;
  let currentMode = "live_interview";
  const reportView = {
    summary: "구조와 배포 책임을 구분해 설명했습니다.",
    fitSummary: "구체적인 근거를 보완하세요.",
    company: "Dibut",
    role: "Backend Engineer",
    analysisMode: "full",
    strengths: ["서비스 경계를 이해합니다."],
    improvements: ["장애 대응 근거를 보완하세요."],
    nextActions: ["실제 운영 사례를 정리하세요."],
    questionFindings: [
      {
        question: "배포 구조를 설명해 주세요.",
        userAnswer: "웹은 Vercel, 면접 엔진은 Render에서 운영합니다.",
        improvements: ["서비스별 장애 대응도 설명해 보세요."],
      },
    ],
  };
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/recording/upload-url"))
      return route.fulfill({ json: { success: true, data: signedUpload } });
    if (url.pathname.endsWith("/recording/upload")) {
      uploadCount++;
      video = route.request().postDataBuffer();
      return route.fulfill({ json: { success: true } });
    }
    if (url.pathname.endsWith("/recording")) {
      if (route.request().method() === "POST") {
        metadata = route.request().postDataJSON();
        recordingReady = true;
        return route.fulfill({ json: { success: true } });
      }
      if (failRead)
        return route.fulfill({ status: 500, json: { success: false } });
      return route.fulfill({
        json: {
          success: true,
          data:
            !recordingReady || missing
              ? null
              : {
                  url: `${base}/qa.webm?version=${++signedVersion}`,
                  storagePath: pending.storagePath,
                  durationMs: pending.durationMs,
                  transcript: legacy ? null : metadata.transcript,
                  expiresAt: expiresAt > Date.now() ? expiresAt : undefined,
                },
        },
      });
    }
    if (url.pathname.endsWith("/signals"))
      return route.fulfill({ json: { success: true, data: null } });
    if (url.pathname.endsWith("/segments"))
      return route.fulfill({
        json: { success: true, data: { anchorIso: null, turns: [] } },
      });
    if (/\/api\/interview\/sessions\/[^/]+$/.test(url.pathname))
      return route.fulfill({
        json: {
          success: true,
          data: {
            session_type: currentMode,
            status: "completed",
            reportStatus: reportPending ? "running" : "completed",
            mode: "video",
            target_duration_sec: 300,
            report_view: reportPending
              ? null
              : currentMode === "portfolio_defense"
                ? {
                    ...reportView,
                    rubric: {
                      design_intent: 80,
                      code_quality: 70,
                      ai_usage: 75,
                    },
                  }
                : reportView,
            report_generation_meta: { analysisMode: "full" },
            timeline: [
              {
                prompt: "배포 구조를 설명해 주세요.",
                answer: "웹은 Vercel, 면접 엔진은 Render에서 운영합니다.",
              },
            ],
          },
        },
      });
    return route.fulfill({ json: { success: true, data: [] } });
  });
  await page.route("**/qa.webm?*", (route) => {
    if (failVideo) return route.fulfill({ status: 404 });
    const range = /bytes=(\d+)-(\d*)/.exec(
      route.request().headers().range || "",
    );
    if (!range)
      return route.fulfill({ contentType: "video/webm", body: video });
    const start = Number(range[1]);
    const end = range[2]
      ? Math.min(Number(range[2]), video.length - 1)
      : video.length - 1;
    return route.fulfill({
      status: 206,
      contentType: "video/webm",
      headers: {
        "Accept-Ranges": "bytes",
        "Content-Range": `bytes ${start}-${end}/${video.length}`,
      },
      body: video.subarray(start, end + 1),
    });
  });
  // Keep QA self-contained and avoid sending profile queries to a real Supabase project.
  await page.route("**/*.supabase.co/**", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.goto(`${base}/interview/result?id=qa-recording&tab=recording`);
  await page
    .getByRole("button", { name: "다시 저장", exact: true })
    .waitFor({ timeout: 90000 });
  await page.getByRole("button", { name: "다시 저장", exact: true }).click();
  await page.getByText("저장 완료", { exact: true }).waitFor();
  assert.ok(video.length > 1000);
  assert.equal(metadata.transcript.entries.length, 2);
  assert.equal(
    metadata.bucket,
    uploadMode === "local" ? "local" : "interview-recordings",
  );
  assert.equal(uploadCount, 2);
  const transcriptButton = page
    .getByRole("button")
    .filter({ hasText: "내 답변" })
    .first();
  await transcriptButton.click();
  await page.waitForFunction(() => {
    const video = document.querySelector("video");
    return (
      video && !video.paused && video.currentTime >= 0.7 && video.videoWidth > 0
    );
  });
  await page.locator('button[aria-current="true"]').first().waitFor();
  await page
    .locator("video")
    .first()
    .evaluate((video) => video.pause());
  await page
    .getByRole("heading", { name: "면접 영상", exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: path.join(output, "interview-desktop.png"),
    fullPage: false,
  });
  for (const mode of ["live_interview", "portfolio_defense"]) {
    currentMode = mode;
    const route =
      mode === "live_interview"
        ? "/interview/result"
        : "/interview/training/portfolio/report";
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      await page.goto(`${base}${route}?id=qa-recording&tab=recording`);
      await page
        .getByText("저장 완료", { exact: true })
        .waitFor({ timeout: 90000 });
      await page.screenshot({
        path: path.join(output, `${mode}-${width}-top.png`),
      });
      await page
        .getByRole("button")
        .filter({ hasText: "면접관 질문" })
        .first()
        .click();
      await page.waitForFunction(() => {
        const video = document.querySelector("video");
        return video && !video.paused && video.videoWidth > 0;
      });
      await page
        .locator("video")
        .first()
        .evaluate((video) => video.pause());
      const bounds = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        viewport: innerWidth,
      }));
      assert.ok(
        bounds.scroll <= bounds.viewport + 1,
        `${mode} overflow at ${width}: ${JSON.stringify(bounds)}`,
      );
      await page
        .getByRole("heading", { name: "면접 영상", exact: true })
        .scrollIntoViewIfNeeded();
      await page.screenshot({
        path: path.join(output, `${mode}-${width}.png`),
      });
    }
  }
  failRead = true;
  await page.reload();
  await page.getByRole("button", { name: "영상 다시 불러오기" }).waitFor();
  failRead = false;
  await page.getByRole("button", { name: "영상 다시 불러오기" }).click();
  await page.getByText("저장 완료", { exact: true }).waitFor();
  expiresAt = Date.now() + 2500;
  await page.reload();
  await page.getByText("저장 완료", { exact: true }).waitFor();
  await page.waitForFunction(
    () => document.querySelector("video")?.readyState >= 2,
  );
  const oldUrl = await page.locator("video").evaluate((video) => {
    video.currentTime = 0.9;
    return video.currentSrc;
  });
  await page.waitForFunction((old) => {
    const video = document.querySelector("video");
    return video?.currentSrc !== old && video?.readyState >= 2;
  }, oldUrl);
  const resumedAt = await page
    .locator("video")
    .evaluate((video) => video.currentTime);
  assert.ok(
    Math.abs(resumedAt - 0.9) < 0.2,
    `signed URL refresh lost position: ${resumedAt}`,
  );
  failVideo = true;
  await page.reload();
  await page
    .getByText("영상을 재생하지 못했습니다.", { exact: false })
    .waitFor();
  failVideo = false;
  await page
    .getByRole("button", { name: "다시 불러오기", exact: true })
    .click();
  await page.waitForFunction(
    () => document.querySelector("video")?.readyState >= 2,
  );
  reportPending = true;
  for (const mode of ["live_interview", "portfolio_defense"]) {
    currentMode = mode;
    const route =
      mode === "live_interview"
        ? "/interview/result"
        : "/interview/training/portfolio/report";
    await page.goto(`${base}${route}?id=qa-recording&tab=recording`);
    await page.getByText("저장 완료", { exact: true }).waitFor();
    assert.equal(await page.locator("video").count(), 1);
  }
  reportPending = false;
  legacy = true;
  await page.reload();
  await page
    .getByText("이전 녹화의 구간 시각은 추정값입니다.", { exact: false })
    .waitFor();
  assert.equal(await page.locator("video").count(), 1);
  missing = true;
  await page.reload();
  await page
    .getByText("저장된 영상이 없습니다.", { exact: true })
    .waitFor({ timeout: 25000 });
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      passed: true,
      uploadMode,
      checks: [
        "MediaRecorder output",
        "failed upload recovery after reload",
        "transcript metadata upload",
        "question and answer seek/autoplay",
        "active transcript",
        "both report routes",
        "desktop/mobile overflow",
        "query retry",
        "signed URL refresh position",
        "playback error retry",
        "video before analysis completes",
        "legacy recording",
        "missing recording",
      ],
      screenshots: output,
    }),
  );
} catch (error) {
  console.error(
    JSON.stringify({
      errors,
      media: await page
        .locator("video")
        .evaluateAll((videos) =>
          videos.map((video) => ({
            src: video.currentSrc,
            time: video.currentTime,
            duration: video.duration,
            paused: video.paused,
            ready: video.readyState,
            error: video.error?.message,
            width: video.videoWidth,
          })),
        ),
      text: (await page.locator("body").innerText()).slice(-4000),
    }),
  );
  await page.screenshot({
    path: path.join(output, "failure.png"),
    fullPage: true,
  });
  throw error;
} finally {
  await browser.close();
}
