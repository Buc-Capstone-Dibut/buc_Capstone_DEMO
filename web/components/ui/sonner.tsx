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
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            // 꼬리: toast 우측에서 56px 안쪽 → 캐릭터 (우측에서 24px + width 95/2 = 71px) 의 중심 위에 위치
            "group toast relative group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:after:absolute group-[.toaster]:after:-bottom-[6px] group-[.toaster]:after:right-14 group-[.toaster]:after:h-3 group-[.toaster]:after:w-3 group-[.toaster]:after:rotate-45 group-[.toaster]:after:border-b group-[.toaster]:after:border-r group-[.toaster]:after:border-border group-[.toaster]:after:bg-background",
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
