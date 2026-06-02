"use client"

import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

/**
 * Sonner toast — 위치를 사이트 도우미 캐릭터(우하단) 위로 띄움.
 * 캐릭터가 말하는 말풍선 형태로 보이게:
 * - position: bottom-right
 * - offset: 130px (캐릭터 95×95 + 여백 위로)
 * - toast 우하단에 작은 꼬리(tail) 추가 → 캐릭터 가리킴
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      position="bottom-right"
      offset={130}
      expand={false}
      className="toaster group"
      // toast 우측을 화면 우측(캐릭터)에 가까이 고정 + 꼬리는 toast 우측 끝에 위치
      style={
        {
          "--width": "320px",
          "--toast-width": "320px",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            // 꼬리(after) 는 toast 우측 끝(right-6 = 24px)에 → 캐릭터(우하단) 쪽으로 향함
            "group toast relative group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:after:absolute group-[.toaster]:after:-bottom-[6px] group-[.toaster]:after:right-6 group-[.toaster]:after:h-3 group-[.toaster]:after:w-3 group-[.toaster]:after:rotate-45 group-[.toaster]:after:border-b group-[.toaster]:after:border-r group-[.toaster]:after:border-border group-[.toaster]:after:bg-background",
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
