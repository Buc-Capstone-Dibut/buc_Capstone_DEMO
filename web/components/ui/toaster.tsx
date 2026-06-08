"use client"

import { usePathname } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { isSiteHelperVisible } from "@/components/features/site-helper-chat/site-helper-chat"

export function Toaster() {
  const { toasts } = useToast()
  const pathname = usePathname()
  // 도우미 캐릭터 보이는 페이지에선 viewport 를 위로 띄움 (캐릭터 위), 아니면 우하단 가까이
  const helperVisible = isSiteHelperVisible(pathname)
  // toast.tsx 의 기본 viewport 는 sm:bottom-[130px]. 도우미 안 보이는 페이지면 sm:bottom-0 으로 override.
  const viewportClassName = helperVisible ? undefined : "sm:bottom-0"

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport className={viewportClassName} />
    </ToastProvider>
  )
}
