"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const TIPS = [
  "자기소개에는 이 직무에 맞는 강점 세 가지만 적어 보세요.",
  "면접 전에 PDF를 한 번 더 읽어 보세요. 말하려던 문장이 다시 보여요.",
  "한 장에는 성과 하나만 남겨 보세요. 다음에 뭘 물을지 분명해져요.",
];

const TIP_INTERVAL_MS = 3000;

export function PdfExportWaitModal({ progress }: { progress: number }) {
  const [tipIndex, setTipIndex] = useState(0);
  const [tipVisible, setTipVisible] = useState(true);
  const percent = Math.max(0, Math.min(99, Math.round(progress)));

  useEffect(() => {
    let fadeId = 0;
    const id = window.setInterval(() => {
      setTipVisible(false);
      fadeId = window.setTimeout(() => {
        setTipIndex((current) => (current + 1) % TIPS.length);
        setTipVisible(true);
      }, 220);
    }, TIP_INTERVAL_MS);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(fadeId);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[160] flex items-center justify-center bg-[#8a9b82]/35 px-6 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdf-export-wait-subtitle"
      aria-busy="true"
    >
      <div className="w-[min(100%,420px)] overflow-hidden rounded-[28px] border border-[#d8e4d0] bg-white shadow-[0_30px_80px_rgba(15,42,28,0.22)]">
        <div className="relative flex h-36 items-center justify-center bg-[linear-gradient(180deg,#f8faf6_0%,#ffffff_100%)]">
          <PapersIntoPdfAnimation />
        </div>

        <div className="px-8 pb-8">
          <p
            id="pdf-export-wait-subtitle"
            className="text-center text-[16px] font-semibold tracking-tight text-slate-800"
          >
            포트폴리오 PDF를 만들고 있어요
          </p>

          <div className="mt-4 flex items-center gap-3">
            <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[#eef6e8]">
              <div
                className="h-full rounded-full bg-[#7ca36a] transition-[width] duration-500 ease-out"
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="w-9 shrink-0 text-right text-[13px] font-bold tabular-nums text-[#7ca36a]">
              {percent}%
            </span>
          </div>

          <div className="mt-5 rounded-2xl bg-[#eef6e8]/80 px-4 py-3.5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[12px] font-bold text-[#6f8a5e]">
                기다리는 동안 팁
              </p>
              <div className="flex shrink-0 gap-1" aria-hidden>
                {TIPS.map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      i === tipIndex ? "bg-[#7ca36a]" : "bg-[#c5d6b8]",
                    )}
                  />
                ))}
              </div>
            </div>
            <p
              className={cn(
                "mt-1.5 h-12 text-[13.5px] font-medium leading-6 text-slate-800 break-keep transition-opacity duration-200",
                tipVisible ? "opacity-100" : "opacity-0",
              )}
            >
              {TIPS[tipIndex]}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PapersIntoPdfAnimation() {
  return (
    <div className="relative h-[88px] w-[200px]" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="absolute left-4 top-5 h-[52px] w-[40px] rounded-[4px] border border-[#d5decc] bg-white shadow-[0_6px_14px_rgba(42,72,42,0.12)]"
          style={{
            animation: "pdf-export-paper-fly 1.8s ease-in-out infinite",
            animationDelay: `${i * 0.28}s`,
          }}
        />
      ))}
      <span
        className="absolute right-5 top-2 flex h-[68px] w-[54px] items-center justify-center rounded-[8px] bg-[#7ca36a] shadow-[0_10px_20px_rgba(90,122,70,0.28)]"
        style={{ animation: "pdf-export-icon-pulse 1.8s ease-in-out infinite" }}
      >
        <span className="text-[13px] font-black tracking-wide text-white">
          PDF
        </span>
      </span>
      <style>{`
        @keyframes pdf-export-paper-fly {
          0% { transform: translateX(0) rotate(-10deg); opacity: 0.35; }
          55% { transform: translateX(78px) rotate(-2deg); opacity: 1; }
          100% { transform: translateX(108px) rotate(0deg); opacity: 0; }
        }
        @keyframes pdf-export-icon-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }
      `}</style>
    </div>
  );
}
