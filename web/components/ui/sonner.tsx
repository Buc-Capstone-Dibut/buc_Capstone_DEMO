"use client"

import { Toaster as Sonner } from "sonner"
import { usePathname } from "next/navigation"
import { isSiteHelperVisible } from "@/components/features/site-helper-chat/site-helper-chat"

type ToasterProps = React.ComponentProps<typeof Sonner>

/**
 * Sonner toast.
 * - 도우미 캐릭터가 보이는 메인 페이지에선 offset 130px (캐릭터 위)
 * - 그 외 페이지에선 기본 offset 24px (우하단 가까이)
 * - 꼬리(diamond tail) 제거됨 — 평범한 toast 카드
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const pathname = usePathname()
  const offset = isSiteHelperVisible(pathname) ? 130 : 24

  return (
    <Sonner
      theme="light"
      position="bottom-right"
      offset={offset}
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
