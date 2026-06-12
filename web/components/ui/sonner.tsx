"use client"

import { useEffect } from "react"
import { Toaster as Sonner, toast } from "sonner"
import { usePathname } from "next/navigation"
import { isSiteHelperVisible } from "@/components/features/site-helper-chat/site-helper-chat"

type ToasterProps = React.ComponentProps<typeof Sonner>

/**
 * Sonner toast.
 * - 도우미 캐릭터가 보이는 메인 페이지에선 캐릭터 "바로 위"에 표시
 *   (숫자 offset 은 모든 변에 적용돼 오른쪽도 130px 밀려 대각선으로 비껴
 *    보였음 — bottom 만 올리고 right 는 캐릭터와 같은 24px 로 정렬)
 * - 그 외 페이지에선 기본 offset 24px (우하단 가까이)
 * - 꼬리(diamond tail) 제거됨 — 평범한 toast 카드
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const pathname = usePathname()
  const helperVisible = isSiteHelperVisible(pathname)
  // 도우미 버튼: 데스크톱 bottom-6 right-6(24px), 모바일 bottom-24(96px) right-4(16px)
  const offset = helperVisible ? { bottom: 130, right: 24 } : 24
  const mobileOffset = helperVisible ? { bottom: 170, right: 16 } : 16

  // 개발 모드 전용 — 브라우저 콘솔에서 __testToast() 로 위치/스타일 즉시 확인.
  // (실제 토스트는 백그라운드 작업 완료 등 비동기 흐름에서만 떠서 테스트가 번거로움)
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return
    const w = window as unknown as { __testToast?: (kind?: "success" | "error" | "info") => void }
    w.__testToast = (kind = "success") => {
      const fire = kind === "error" ? toast.error : kind === "info" ? toast.info : toast.success
      fire("토스트 위치 테스트", {
        description: "도우미가 보이는 페이지에선 캐릭터 바로 위에 떠야 해요",
        action: { label: "열기", onClick: () => undefined },
      })
    }
    return () => {
      delete w.__testToast
    }
  }, [])

  return (
    <Sonner
      theme="light"
      position="bottom-right"
      offset={offset}
      mobileOffset={mobileOffset}
      expand={false}
      className="toaster group"
      style={
        {
          "--width": "320px",
          "--toast-width": "320px",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
