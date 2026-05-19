"use client";

import { useEffect, useState } from "react";

const PHASES = [
  "선택한 프로젝트 분석 중",
  "AI가 포트폴리오 초안을 작성 중",
  "디자인 템플릿 준비 중",
  "에디터로 이동 중",
];

export default function ShowcaseNewLoading() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    // 1초마다 다음 단계로 (마지막 단계에서 멈춤)
    const id = setInterval(() => {
      setPhase((p) => (p < PHASES.length - 1 ? p + 1 : p));
    }, 1200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0A0A0A] text-[#F0F0F0]">
      {/* Neon green spinner ring */}
      <div className="relative h-16 w-16">
        <div className="absolute inset-0 rounded-full border-2 border-[#222]" />
        <div
          className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#39FF14] animate-spin"
          style={{ animationDuration: "1s" }}
        />
      </div>

      <h2 className="mt-8 text-2xl font-black tracking-tight">
        디자인 포트폴리오를 만들고 있어요
      </h2>
      <p className="mt-3 text-sm text-[#888]">
        AI가 선택하신 프로젝트로 초안을 작성하고 있습니다 · 보통 3~5초 걸려요
      </p>

      {/* 진행 단계 */}
      <ol className="mt-10 space-y-2 text-sm">
        {PHASES.map((label, i) => {
          const done = i < phase;
          const active = i === phase;
          return (
            <li
              key={label}
              className={`flex items-center gap-3 transition-opacity duration-300 ${
                done || active ? "opacity-100" : "opacity-30"
              }`}
            >
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full ${
                  done
                    ? "bg-[#39FF14] text-black"
                    : active
                      ? "border border-[#39FF14] bg-transparent"
                      : "border border-[#444] bg-transparent"
                }`}
              >
                {done ? (
                  <svg className="h-2.5 w-2.5" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6.5L5 9L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : active ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-[#39FF14] animate-pulse" />
                ) : null}
              </span>
              <span className={done || active ? "" : "text-[#666]"}>{label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
