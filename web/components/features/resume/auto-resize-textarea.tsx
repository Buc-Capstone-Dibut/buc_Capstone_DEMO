"use client";

import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type TextareaProps = React.ComponentPropsWithoutRef<typeof Textarea>;

/**
 * 입력된 텍스트 길이에 따라 자체 높이를 자동으로 확장하는 Textarea.
 *
 * value 가 바뀔 때마다 height 를 "auto"(축소) → scrollHeight(확장) 로 다시 잡아 정확히
 * 콘텐츠 만큼만 차지하게 한다. 외부에서 ref 가 필요할 경우 forwardRef 로 노출한다.
 */
export const AutoResizeTextarea = forwardRef<
  HTMLTextAreaElement,
  TextareaProps & { minRows?: number }
>(function AutoResizeTextarea({ className, minRows = 3, value, style, ...props }, externalRef) {
  const innerRef = useRef<HTMLTextAreaElement | null>(null);
  useImperativeHandle(externalRef, () => innerRef.current as HTMLTextAreaElement);

  const resize = () => {
    const el = innerRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  useLayoutEffect(resize, [value]);
  useEffect(() => {
    // 폰트 로딩 직후에도 한번 더 맞춰서 초기 측정 오차를 제거한다.
    const id = window.setTimeout(resize, 30);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <Textarea
      {...props}
      ref={innerRef}
      value={value}
      onInput={(e) => {
        resize();
        props.onInput?.(e);
      }}
      rows={minRows}
      className={cn("resize-none overflow-hidden", className)}
      style={style}
    />
  );
});
