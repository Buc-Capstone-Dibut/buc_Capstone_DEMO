"use client";

import React, { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { colorTokens } from "../../shared/svg-primitives";

// Trace of `for (let x = 0; x < 3; x++) print(x)` modelled as discrete steps.
type Branch = "none" | "true" | "false";
type Step = {
  node: "start" | "init" | "cond" | "body" | "update" | "end";
  x: number | null; // control variable value (null before init)
  branch: Branch; // result of the most recent condition test
  output: string[]; // console output accumulated
  msg: string;
};

const STEPS: Step[] = [
  { node: "start", x: null, branch: "none", output: [], msg: "프로그램이 시작되었습니다." },
  { node: "init", x: 0, branch: "none", output: [], msg: "제어 변수 x를 0으로 초기화합니다." },
  { node: "cond", x: 0, branch: "true", output: [], msg: "조건 x<3 → 0<3 = TRUE. 본문으로 진입합니다." },
  { node: "body", x: 0, branch: "true", output: ["x is 0"], msg: "본문 실행: print(0)." },
  { node: "update", x: 1, branch: "true", output: ["x is 0"], msg: "x++ → x=1. 조건으로 회귀합니다." },
  { node: "cond", x: 1, branch: "true", output: ["x is 0"], msg: "조건 1<3 = TRUE." },
  { node: "body", x: 1, branch: "true", output: ["x is 0", "x is 1"], msg: "본문 실행: print(1)." },
  { node: "update", x: 2, branch: "true", output: ["x is 0", "x is 1"], msg: "x++ → x=2." },
  { node: "cond", x: 2, branch: "true", output: ["x is 0", "x is 1"], msg: "조건 2<3 = TRUE." },
  { node: "body", x: 2, branch: "true", output: ["x is 0", "x is 1", "x is 2"], msg: "본문 실행: print(2)." },
  { node: "update", x: 3, branch: "true", output: ["x is 0", "x is 1", "x is 2"], msg: "x++ → x=3." },
  { node: "cond", x: 3, branch: "false", output: ["x is 0", "x is 1", "x is 2"], msg: "조건 3<3 = FALSE. 거짓 분기로 루프를 탈출합니다." },
  { node: "end", x: 3, branch: "false", output: ["x is 0", "x is 1", "x is 2"], msg: "루프 종료. 제어권을 반환합니다." },
];

export function useConditionLoopSim() {
  const [stepIdx, setStepIdx] = useState(0);
  const [logs, setLogs] = useState<string[]>(["> Control_Flow 엔진 준비 완료. Step을 눌러 시작하세요."]);
  const maxSteps = STEPS.length;

  const rebuild = useCallback((t: number) => {
    const arr = ["> Control_Flow 엔진 준비 완료. Step을 눌러 시작하세요."];
    for (let i = 1; i <= t; i++) arr.unshift(`[Step ${i}] ${STEPS[i].msg}`);
    setLogs(arr);
  }, []);

  const handleSetStep = useCallback((s: number) => {
    if (s < 0 || s >= maxSteps) return;
    setStepIdx(s);
    rebuild(s);
  }, [maxSteps, rebuild]);

  const nextStep = useCallback(() => {
    setStepIdx((p) => {
      const n = p >= maxSteps - 1 ? p : p + 1;
      if (n !== p) rebuild(n);
      return n;
    });
  }, [maxSteps, rebuild]);

  const reset = useCallback(() => handleSetStep(0), [handleSetStep]);

  return {
    runSimulation: () => {},
    interactive: {
      visualData: STEPS[stepIdx],
      logs,
      handlers: { push: nextStep, clear: reset },
      currentStep: stepIdx,
      maxSteps,
      setStep: handleSetStep,
      nextStep,
      reset,
    },
  };
}

// All coordinates relative to a 800x500 viewBox (defect 2: no hardcoded px).
const VB = { w: 800, h: 500 };
const CX = 300; // flow column center
// node anchor geometry
const NODE = {
  start: { cy: 50, w: 150, h: 40, shape: "pill" },
  init: { cy: 130, w: 170, h: 44, shape: "rect" },
  cond: { cy: 240, r: 64, shape: "diamond" },
  body: { cy: 360, w: 200, h: 46, shape: "rect" },
  end: { cy: 450, w: 150, h: 40, shape: "pill" },
} as const;

export function ConditionLoopVisualizer({ data }: { data: Step | null }) {
  const s = data;
  const node = s?.node ?? "start";
  const branch = s?.branch ?? "none";
  const xVal = s?.x;
  const output = s?.output ?? [];

  const isActive = (n: string) => node === n;
  const diamondPts = (cy: number, r: number) =>
    `${CX},${cy - r} ${CX + r},${cy} ${CX},${cy + r} ${CX - r},${cy}`;

  const edgeColor = (on: boolean, c: string) => (on ? c : colorTokens.border);

  return (
    <svg viewBox={`0 0 ${VB.w} ${VB.h}`} className="w-full h-full font-mono">
      <defs>
        <filter id="cl-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <marker id="cl-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill={colorTokens.muted} />
        </marker>
      </defs>

      <text x="40" y="34" fontSize="16" fontWeight="bold" fill={colorTokens.info}>조건문 + 반복문 흐름 추적</text>
      <text x="40" y="54" fontSize="11" fill={colorTokens.muted}>for (let x = 0; x &lt; 3; x++) print(x)</text>

      {/* ── edges (computed anchors) ── */}
      {/* start -> init */}
      <line x1={CX} y1={NODE.start.cy + NODE.start.h / 2} x2={CX} y2={NODE.init.cy - NODE.init.h / 2}
        stroke={edgeColor(node !== "start", colorTokens.info)} strokeWidth="3" markerEnd="url(#cl-arrow)" />
      {/* init -> cond */}
      <line x1={CX} y1={NODE.init.cy + NODE.init.h / 2} x2={CX} y2={NODE.cond.cy - NODE.cond.r}
        stroke={edgeColor(node === "cond" || node === "body" || node === "update" || node === "end", colorTokens.info)} strokeWidth="3" markerEnd="url(#cl-arrow)" />

      {/* cond -(TRUE)-> body */}
      <line x1={CX} y1={NODE.cond.cy + NODE.cond.r} x2={CX} y2={NODE.body.cy - NODE.body.h / 2}
        stroke={edgeColor(branch === "true" && (node === "cond" || node === "body"), colorTokens.success)} strokeWidth="3" markerEnd="url(#cl-arrow)"
        filter={branch === "true" && node === "cond" ? "url(#cl-glow)" : undefined} />
      <text x={CX + 12} y={(NODE.cond.cy + NODE.cond.r + NODE.body.cy - NODE.body.h / 2) / 2} fontSize="11" fontWeight="bold"
        fill={branch === "true" ? colorTokens.success : colorTokens.muted}>TRUE</text>

      {/* loop back: body left -> up -> cond left apex (computed rail at xRail) */}
      {(() => {
        const xRail = 110;
        const bodyLeft = CX - NODE.body.w / 2;
        const bodyMidY = NODE.body.cy;
        const condLeft = CX - NODE.cond.r;
        const on = node === "update";
        const d = `M ${bodyLeft} ${bodyMidY} L ${xRail} ${bodyMidY} L ${xRail} ${NODE.cond.cy} L ${condLeft} ${NODE.cond.cy}`;
        return (
          <g>
            <path d={d} fill="none" stroke={edgeColor(on, colorTokens.info)} strokeWidth="3" strokeLinejoin="round" markerEnd="url(#cl-arrow)"
              filter={on ? "url(#cl-glow)" : undefined} />
            <text x={xRail + 8} y={(bodyMidY + NODE.cond.cy) / 2} fontSize="11" fontWeight="bold"
              fill={on ? colorTokens.info : colorTokens.muted}>x++ LOOP</text>
          </g>
        );
      })()}

      {/* cond -(FALSE)-> end via right rail */}
      {(() => {
        const xRail = 520;
        const condRight = CX + NODE.cond.r;
        const on = branch === "false";
        const d = `M ${condRight} ${NODE.cond.cy} L ${xRail} ${NODE.cond.cy} L ${xRail} ${NODE.end.cy} L ${CX + NODE.end.w / 2} ${NODE.end.cy}`;
        return (
          <g>
            <path d={d} fill="none" stroke={edgeColor(on, colorTokens.destructive)} strokeWidth="3" strokeLinejoin="round" markerEnd="url(#cl-arrow)"
              filter={on ? "url(#cl-glow)" : undefined} />
            <text x={condRight + 14} y={NODE.cond.cy - 8} fontSize="11" fontWeight="bold"
              fill={on ? colorTokens.destructive : colorTokens.muted}>FALSE</text>
          </g>
        );
      })()}

      {/* ── nodes ── */}
      {/* start */}
      <motion.rect x={CX - NODE.start.w / 2} y={NODE.start.cy - NODE.start.h / 2} rx={NODE.start.h / 2}
        width={NODE.start.w} height={NODE.start.h} initial={false}
        animate={{ stroke: isActive("start") ? colorTokens.info : colorTokens.border, strokeWidth: isActive("start") ? 3 : 1.5 }}
        fill={colorTokens.card} />
      <text x={CX} y={NODE.start.cy + 5} textAnchor="middle" fontSize="13" fontWeight="bold" fill={colorTokens.text}>START</text>

      {/* init */}
      <motion.rect x={CX - NODE.init.w / 2} y={NODE.init.cy - NODE.init.h / 2} rx="8"
        width={NODE.init.w} height={NODE.init.h} initial={false}
        animate={{ stroke: isActive("init") ? colorTokens.info : colorTokens.border, strokeWidth: isActive("init") ? 3 : 1.5 }}
        fill={colorTokens.card} />
      <text x={CX} y={NODE.init.cy + 5} textAnchor="middle" fontSize="13" fontWeight="bold" fill={colorTokens.text}>let x = 0</text>

      {/* cond diamond */}
      <motion.polygon points={diamondPts(NODE.cond.cy, NODE.cond.r)} initial={false}
        animate={{
          stroke: isActive("cond") ? (branch === "false" ? colorTokens.destructive : colorTokens.info) : colorTokens.border,
          strokeWidth: isActive("cond") ? 3 : 1.5,
        }}
        fill={colorTokens.card} filter={isActive("cond") ? "url(#cl-glow)" : undefined} />
      <text x={CX} y={NODE.cond.cy - 2} textAnchor="middle" fontSize="14" fontWeight="bold" fill={colorTokens.text}>x &lt; 3 ?</text>
      {/* live comparison readout — clarifies BOTH branches (defect 2) */}
      <text x={CX} y={NODE.cond.cy + 18} textAnchor="middle" fontSize="11"
        fill={branch === "false" ? colorTokens.destructive : branch === "true" ? colorTokens.success : colorTokens.muted}>
        {xVal === null ? "" : `${xVal} < 3 = ${branch === "false" ? "FALSE" : branch === "true" ? "TRUE" : "?"}`}
      </text>

      {/* body */}
      <motion.rect x={CX - NODE.body.w / 2} y={NODE.body.cy - NODE.body.h / 2} rx="8"
        width={NODE.body.w} height={NODE.body.h} initial={false}
        animate={{ stroke: isActive("body") ? colorTokens.success : colorTokens.border, strokeWidth: isActive("body") ? 3 : 1.5 }}
        fill={colorTokens.card} />
      <text x={CX} y={NODE.body.cy + 5} textAnchor="middle" fontSize="13" fontWeight="bold" fill={colorTokens.text}>print(x)</text>

      {/* update chip on the loop rail */}
      <motion.g initial={false} animate={{ opacity: node === "update" ? 1 : 0.35 }}>
        <rect x={86} y={NODE.body.cy - 16} width="48" height="32" rx="6"
          fill={colorTokens.card} stroke={node === "update" ? colorTokens.info : colorTokens.border} strokeWidth={node === "update" ? 2.5 : 1} />
        <text x={110} y={NODE.body.cy + 5} textAnchor="middle" fontSize="13" fontWeight="bold"
          fill={node === "update" ? colorTokens.info : colorTokens.muted}>x++</text>
      </motion.g>

      {/* end */}
      <motion.rect x={CX - NODE.end.w / 2} y={NODE.end.cy - NODE.end.h / 2} rx={NODE.end.h / 2}
        width={NODE.end.w} height={NODE.end.h} initial={false}
        animate={{ stroke: isActive("end") ? colorTokens.destructive : colorTokens.border, strokeWidth: isActive("end") ? 3 : 1.5 }}
        fill={colorTokens.card} />
      <text x={CX} y={NODE.end.cy + 5} textAnchor="middle" fontSize="13" fontWeight="bold" fill={colorTokens.text}>END</text>

      {/* ── right side: memory + console ── */}
      <g transform="translate(600, 90)">
        <rect width="170" height="80" rx="10" fill={colorTokens.card} stroke={colorTokens.border} strokeWidth="1.5" />
        <text x="14" y="24" fontSize="11" fontWeight="bold" fill={colorTokens.muted}>MEMORY</text>
        <text x="14" y="56" fontSize="14" fill={colorTokens.text}>let x =</text>
        <text x="156" y="56" textAnchor="end" fontSize="22" fontWeight="bold" fill={colorTokens.info}>{xVal === null ? "—" : xVal}</text>
      </g>
      <g transform="translate(600, 190)">
        <rect width="170" height="160" rx="10" fill={colorTokens.card} stroke={colorTokens.border} strokeWidth="1.5" />
        <text x="14" y="24" fontSize="11" fontWeight="bold" fill={colorTokens.muted}>CONSOLE</text>
        {output.map((line, i) => (
          <text key={i} x="14" y={48 + i * 22} fontSize="13" fill={colorTokens.success}>{line}</text>
        ))}
        {output.length === 0 && <text x="14" y="48" fontSize="12" fill={colorTokens.muted}>(empty)</text>}
      </g>

      <text x="40" y="478" fontSize="13" fill={colorTokens.text}>{s?.msg ?? STEPS[0].msg}</text>
    </svg>
  );
}
