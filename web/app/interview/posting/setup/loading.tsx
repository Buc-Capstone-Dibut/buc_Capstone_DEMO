import { Loader2, Sparkles } from "lucide-react";

/**
 * 모의면접 설정 페이지 로딩 화면.
 * Next.js App Router가 페이지 번들과 데이터 fetch를 준비하는 동안 자동으로 표시한다.
 * 채용공고 카드/상세에서 "이 공고로 모의면접" 클릭 후 setup 페이지가 마운트되기 전까지 보인다.
 */
export default function InterviewSetupLoading() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
      <div className="relative">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 animate-pulse rounded-full bg-primary/10 blur-2xl"
        />
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Sparkles className="h-7 w-7" aria-hidden />
        </div>
      </div>
      <h1 className="mt-6 text-lg font-semibold text-foreground">
        모의면접 준비 중
      </h1>
      <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
        선택한 채용공고와 연결된 자료를 불러오는 중입니다. 잠시만 기다려 주세요.
      </p>
      <div
        className="mt-6 inline-flex items-center gap-2 text-xs text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        잠시만요…
      </div>
    </div>
  );
}
