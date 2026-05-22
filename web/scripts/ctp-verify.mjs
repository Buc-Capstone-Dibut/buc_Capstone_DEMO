#!/usr/bin/env node
// CTP G1-G7 자동 검증 스크립트
// Usage:
//   node scripts/ctp-verify.mjs --concept=basic-binary-search
//   node scripts/ctp-verify.mjs --all

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const SPECS_DIR = join(ROOT, "data/ctp/specs");
const MODULES_DIR = join(ROOT, "components/features/ctp/contents/categories/modules");
const VISUALIZERS_DIR = join(ROOT, "components/features/ctp/playground/visualizers/svg-animations");

const args = process.argv.slice(2);
const conceptArg = args.find((a) => a.startsWith("--concept="))?.split("=")[1];
const allMode = args.includes("--all");

function logResult(conceptId, gate, status, reason = "") {
  const icon = status === "PASS" ? "✓" : status === "WARN" ? "⚠" : "✗";
  console.log(`  [${gate}] ${icon} ${status}${reason ? ` — ${reason}` : ""}`);
}

const MODULE_FOLDER = {
  "module-01-foundation": "module-01",
  "module-02-stack-recursion": "module-02",
  "module-03-sorting-string": "module-03",
  "module-04-list-tree-final": "module-04",
};

const MODULE_FILE = {
  "module-01-foundation": "module-01-foundation.tsx",
  "module-02-stack-recursion": "module-02-stack-recursion.tsx",
  "module-03-sorting-string": "module-03-sorting-string.tsx",
  "module-04-list-tree-final": "module-04-list-tree-final.tsx",
};

function toPascalCase(id) {
  return id.split("-").map((s) => s[0].toUpperCase() + s.slice(1)).join("");
}

// G1: ConceptSpec.id가 useSim/Visualizer 이름과 일치
function g1_namingMatch(spec) {
  const pascal = toPascalCase(spec.id);
  const expectedSim = `use${pascal}Sim`;
  const expectedViz = `${pascal}Visualizer`;
  const folder = MODULE_FOLDER[spec.moduleId];
  if (!folder) return { status: "FAIL", reason: `unknown moduleId: ${spec.moduleId}` };
  const path = join(VISUALIZERS_DIR, folder, `${spec.id}.tsx`);
  if (!existsSync(path)) {
    return { status: "WARN", reason: `${folder}/${spec.id}.tsx 파일 없음 (Phase 1에서 생성 예정)` };
  }
  const content = readFileSync(path, "utf-8");
  const hasSim = content.includes(`function ${expectedSim}`) || content.includes(`const ${expectedSim}`);
  const hasViz = content.includes(`function ${expectedViz}`) || content.includes(`const ${expectedViz}`);
  if (!hasSim) return { status: "FAIL", reason: `${expectedSim} 함수 없음` };
  if (!hasViz) return { status: "FAIL", reason: `${expectedViz} 컴포넌트 없음` };
  return { status: "PASS" };
}

// G2: 모듈 파일에 해당 conceptId가 등록되어 있는지
function g2_moduleRegistration(spec) {
  const file = MODULE_FILE[spec.moduleId];
  if (!file) return { status: "FAIL", reason: `unknown moduleId: ${spec.moduleId}` };
  const path = join(MODULES_DIR, file);
  if (!existsSync(path)) return { status: "FAIL", reason: `${path} 없음` };
  const content = readFileSync(path, "utf-8");
  if (!content.includes(`id: "${spec.id}"`) && !content.includes(`id: '${spec.id}'`)) {
    return { status: "WARN", reason: `module 파일에 id: "${spec.id}" 등록 안 됨 (Phase 1에서 등록 예정)` };
  }
  return { status: "PASS" };
}

// G3: ConceptSpec.id가 expansion 사전에 매핑되어 있는지 (또는 모듈 본문에 있으면 OK)
function g3_expansionMapping(spec) {
  const expansionPath = join(ROOT, "components/features/ctp/contents/shared/ctp-content-expansion.ts");
  if (!existsSync(expansionPath)) return { status: "WARN", reason: "expansion 파일 없음" };
  const content = readFileSync(expansionPath, "utf-8");
  const hasExpansion = content.includes(`"${spec.id}"`) || content.includes(`'${spec.id}'`);
  if (!hasExpansion) {
    return { status: "WARN", reason: "expansion 사전 매핑 없음 (모듈 본문에 story 있으면 OK)" };
  }
  return { status: "PASS" };
}

// G4: Tone Guide — 문장 수 + 금지 표현
function countSentences(text) {
  const punct = (text.match(/[.?!]/g) || []).length;
  const bullets = (text.match(/^\s*[-*]\s/gm) || []).length;
  return Math.max(punct, bullets);
}

const FORBIDDEN_WORDS = ["압도적", "잔혹", "신비한", "미슐랭", "마스터하기"];

function g4_toneGuide(spec) {
  const { story, features } = spec.content;
  const issues = [];
  if (!story || countSentences(story.problem) < 2) issues.push("story.problem < 2 문장");
  if (!story || countSentences(story.definition) < 3) issues.push("story.definition < 3 문장");
  if (!story || countSentences(story.analogy) < 2) issues.push("story.analogy < 2 문장");
  if (!Array.isArray(features) || features.length !== 4) {
    issues.push(`features 개수 ${features?.length ?? 0} (4 필요)`);
  } else {
    for (const f of features) {
      if (countSentences(f.description) < 2) issues.push(`feature "${f.title}" description < 2 문장`);
    }
  }
  const joined = JSON.stringify(spec.content);
  for (const word of FORBIDDEN_WORDS) {
    if (joined.includes(word)) issues.push(`금지 표현 "${word}" 포함`);
  }
  if (issues.length > 0) return { status: "FAIL", reason: issues.join(", ") };
  return { status: "PASS" };
}

// G5: svg-primitive 사용 — hardcoded hex / inline filter 검사
function g5_primitiveUsage(spec) {
  const folder = MODULE_FOLDER[spec.moduleId];
  if (!folder) return { status: "FAIL", reason: `unknown moduleId: ${spec.moduleId}` };
  const path = join(VISUALIZERS_DIR, folder, `${spec.id}.tsx`);
  if (!existsSync(path)) return { status: "WARN", reason: "Visualizer 파일 없음" };
  const content = readFileSync(path, "utf-8");
  const hexMatches = content.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
  // Tailwind/CSS의 hsl(var(--...)) 패턴은 OK. Pure hex만 FAIL.
  if (hexMatches.length > 0) {
    return { status: "FAIL", reason: `hardcoded hex 색상 ${hexMatches.length}개 발견 — svg-primitives/colorTokens 사용 권장` };
  }
  if (content.includes('<filter id="neon-glow') && !content.includes("NeonGlowFilters")) {
    return { status: "FAIL", reason: "inline neon-glow filter 정의 발견 — NeonGlowFilters primitive 사용 권장" };
  }
  return { status: "PASS" };
}

// G6: Skulpt 실행 검증 — interactive 모드는 면제, code 모드는 Phase 4까지 stub
function g6_skulptExec(spec) {
  if (spec.simulation?.mode !== "code") {
    return { status: "PASS", reason: "interactive 모드 — 면제" };
  }
  return { status: "WARN", reason: "G6 Skulpt 실행 검증은 Phase 4에 활성화" };
}

// G7: ctp-curriculum.ts에 id 등록 정합
function g7_urlMapping(spec) {
  const curriculumPath = join(ROOT, "lib/ctp-curriculum.ts");
  if (!existsSync(curriculumPath)) return { status: "FAIL", reason: "ctp-curriculum.ts 없음" };
  const content = readFileSync(curriculumPath, "utf-8");
  if (!content.includes(`id: "${spec.id}"`) && !content.includes(`id: '${spec.id}'`)) {
    return { status: "WARN", reason: `ctp-curriculum.ts에 id: "${spec.id}" 등록 안 됨 (Phase 1에서 등록 예정)` };
  }
  return { status: "PASS" };
}

function loadSpec(conceptId) {
  // 1. id와 파일명이 같은 경우 우선 탐색
  const direct = [
    join(SPECS_DIR, `${conceptId}.json`),
    join(SPECS_DIR, "samples", `${conceptId}.json`),
  ];
  for (const p of direct) {
    if (existsSync(p)) return JSON.parse(readFileSync(p, "utf-8"));
  }
  // 2. 파일명이 다를 수 있으니 specs/와 samples/의 모든 JSON을 열어 id 필드로 매칭
  const dirs = [SPECS_DIR, join(SPECS_DIR, "samples")];
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir)) {
      if (!f.endsWith(".json")) continue;
      try {
        const spec = JSON.parse(readFileSync(join(dir, f), "utf-8"));
        if (spec?.id === conceptId) return spec;
      } catch {
        // ignore non-spec JSON
      }
    }
  }
  return null;
}

function verifyConcept(conceptId) {
  const spec = loadSpec(conceptId);
  if (!spec) {
    console.log(`\n✗ Spec not found: ${conceptId}`);
    return false;
  }
  console.log(`\n=== ${conceptId} ===`);
  const results = [
    ["G1", g1_namingMatch(spec)],
    ["G2", g2_moduleRegistration(spec)],
    ["G3", g3_expansionMapping(spec)],
    ["G4", g4_toneGuide(spec)],
    ["G5", g5_primitiveUsage(spec)],
    ["G6", g6_skulptExec(spec)],
    ["G7", g7_urlMapping(spec)],
  ];
  for (const [gate, r] of results) {
    logResult(conceptId, gate, r.status, r.reason);
  }
  const allPass = results.every(([_, r]) => r.status !== "FAIL");
  return allPass;
}

if (conceptArg) {
  const ok = verifyConcept(conceptArg);
  process.exit(ok ? 0 : 1);
} else if (allMode) {
  const dirs = [SPECS_DIR, join(SPECS_DIR, "samples")];
  const concepts = [];
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir)) {
      if (!f.endsWith(".json")) continue;
      try {
        const spec = JSON.parse(readFileSync(join(dir, f), "utf-8"));
        if (spec?.id) concepts.push(spec.id);
      } catch {
        // ignore non-spec JSON
      }
    }
  }
  let totalPass = 0, totalFail = 0;
  for (const id of concepts) {
    const ok = verifyConcept(id);
    if (ok) totalPass++;
    else totalFail++;
  }
  console.log(`\n=== Summary ===`);
  console.log(`PASS: ${totalPass}, FAIL: ${totalFail}`);
  process.exit(totalFail === 0 ? 0 : 1);
} else {
  console.log("Usage: ctp-verify.mjs --concept=<id> | --all");
  process.exit(2);
}
