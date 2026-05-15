/**
 * 미리보기 DOM 을 그대로 캡쳐해서 PDF 로 만든다 ("스냅샷 방식").
 *
 * 동작:
 * 1. 화면 밖(off-screen) 에 미리보기 페이지들을 native A4 크기(794×1123px) 로 직접 렌더한다.
 *    페이지 인덱스 0..N-1 까지 모든 페이지를 동시에 DOM 에 그린다.
 * 2. html2canvas-pro 로 각 페이지를 캔버스로 변환 (LCH/oklch 컬러까지 지원).
 * 3. jsPDF 에 A4 사이즈 페이지로 캔버스 이미지를 추가.
 * 4. 결과 Blob 을 반환.
 *
 * 장점: 화면 미리보기 = PDF 가 100% 동일 (로고·폰트·레이아웃 모두 보존).
 * 단점: 텍스트가 라스터화돼 검색·복사 불가. 파일 사이즈 조금 큼.
 *
 * 사용처: ResumePdfDownloadButton.
 */

import type { ReactNode } from "react";

const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;

/**
 * 이미 DOM 에 그려진 A4 페이지 노드들을 받아 PDF Blob 으로 만든다.
 * 각 노드는 정확히 A4 크기(794×1123) 의 박스여야 한다.
 */
export async function buildPdfFromPageElements(
  pageElements: HTMLElement[],
  options?: { scale?: number; title?: string },
): Promise<Blob> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas-pro"),
    import("jspdf"),
  ]);

  const scale = options?.scale ?? 2; // 2x → retina 수준의 선명함

  // jsPDF: A4 사이즈 (mm 단위), portrait
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });
  const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
  const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm

  for (let i = 0; i < pageElements.length; i++) {
    const el = pageElements[i];
    const canvas = await html2canvas(el, {
      scale,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
      // window 크기를 강제로 정해 layout-shift 방지
      windowWidth: A4_WIDTH_PX,
      windowHeight: A4_HEIGHT_PX,
    });
    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    if (i > 0) pdf.addPage();
    pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");
  }

  if (options?.title) {
    pdf.setProperties({ title: options.title });
  }

  return pdf.output("blob");
}

/**
 * React 트리(`render`) 를 off-screen 컨테이너에 직접 마운트해서 캡쳐 → PDF 빌드.
 * React 18 의 `createRoot` 를 사용해 비동기 마운트 후 다음 frame 까지 기다린다.
 */
export async function snapshotReactTreeToPdf(
  render: () => ReactNode,
  options?: { title?: string; scale?: number },
): Promise<Blob> {
  const { createRoot } = await import("react-dom/client");

  // off-screen 컨테이너 — 화면 밖, 정확히 A4 폭으로 잡아 layout 이 미리보기와 동일하게 나오도록.
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-99999px";
  host.style.top = "0";
  host.style.width = `${A4_WIDTH_PX}px`;
  host.style.background = "#ffffff";
  // pointer-events 끄고 사용자 인터랙션 차단
  host.style.pointerEvents = "none";
  host.setAttribute("data-pdf-snapshot-host", "");
  document.body.appendChild(host);

  const root = createRoot(host);

  try {
    // React 트리 마운트
    await new Promise<void>((resolve) => {
      root.render(render() as React.ReactElement);
      // 다음 두 frame 까지 기다려 layout/paint 가 모두 끝나도록 한다.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });

    // 폰트 로딩이 끝날 때까지 추가 대기 (한글 폰트가 늦게 들어오면 캡쳐가 비어 보임)
    if (typeof document !== "undefined" && (document as Document).fonts?.ready) {
      try {
        await (document as Document).fonts.ready;
      } catch {
        /* noop */
      }
    }

    // 모든 <img> 가 디코드 완료될 때까지 추가 대기 — 기술 스택 로고가 빈 칸으로
    // 캡쳐되는 문제 방지. data URI 라도 decode() 가 한 frame 걸릴 수 있다.
    const imgs = Array.from(host.querySelectorAll("img"));
    await Promise.all(
      imgs.map(async (img) => {
        try {
          if (img.complete && img.naturalWidth > 0) return;
          if (typeof img.decode === "function") {
            await img.decode();
            return;
          }
          await new Promise<void>((resolve) => {
            const done = () => resolve();
            img.addEventListener("load", done, { once: true });
            img.addEventListener("error", done, { once: true });
          });
        } catch {
          /* noop — 로고 한두 개 누락돼도 PDF 생성 자체는 계속 진행 */
        }
      }),
    );

    // 캡쳐할 A4 페이지 노드들을 찾는다 — `[data-pdf-page]` 로 마킹.
    const pageNodes = Array.from(
      host.querySelectorAll<HTMLElement>("[data-pdf-page]"),
    );
    if (pageNodes.length === 0) {
      // fallback: host 자체 한 장
      pageNodes.push(host);
    }

    return await buildPdfFromPageElements(pageNodes, {
      scale: options?.scale,
      title: options?.title,
    });
  } finally {
    // 비동기 unmount — DOM 정리 직후 GC
    queueMicrotask(() => {
      try {
        root.unmount();
      } catch {
        /* noop */
      }
      host.remove();
    });
  }
}
