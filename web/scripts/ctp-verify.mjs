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
  const g1 = g1_namingMatch(spec);
  logResult(conceptId, "G1", g1.status, g1.reason);
  const g2 = g2_moduleRegistration(spec);
  logResult(conceptId, "G2", g2.status, g2.reason);
  // G3-G7는 Task 7.2에서 추가
  const allPass = [g1, g2].every((r) => r.status !== "FAIL");
  return allPass;
}

if (conceptArg) {
  const ok = verifyConcept(conceptArg);
  process.exit(ok ? 0 : 1);
} else if (allMode) {
  console.log("All mode 미구현 — Task 7.2에서 추가");
  process.exit(0);
} else {
  console.log("Usage: ctp-verify.mjs --concept=<id> | --all");
  process.exit(2);
}
