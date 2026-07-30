"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, WifiOff } from "lucide-react";
import { useSocketStore } from "@/components/features/workspace/store/socket-store";

const NOTICE_DELAY_MS = 700;

export function WorkspaceServerStatus() {
  const connectionState = useSocketStore((state) => state.connectionState);
  const [showNotice, setShowNotice] = useState(false);

  useEffect(() => {
    if (
      connectionState !== "connecting" &&
      connectionState !== "reconnecting" &&
      connectionState !== "error"
    ) {
      setShowNotice(false);
      return;
    }

    if (connectionState === "error") {
      setShowNotice(true);
      return;
    }

    const timer = window.setTimeout(() => {
      setShowNotice(true);
    }, NOTICE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [connectionState]);

  if (!showNotice) {
    return null;
  }

  const isError = connectionState === "error";

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute bottom-3 right-3 z-50 flex max-w-[260px] items-start gap-2 rounded-md border border-slate-200/80 bg-white/95 px-2.5 py-2 text-slate-600 shadow-sm backdrop-blur"
    >
      {isError ? (
        <WifiOff className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
      ) : (
        <LoaderCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-slate-400" />
      )}
      <div className="min-w-0">
        <p className="text-[11px] font-medium leading-4 text-slate-700">
          {isError
            ? "실시간 기능 연결이 늦어지고 있어요"
            : "워크스페이스 서버가 켜지고 있어요…"}
        </p>
        <p className="text-[10px] leading-4 text-slate-400">
          보드·문서 등 웹 기능은 계속 사용할 수 있어요.
        </p>
      </div>
    </div>
  );
}
