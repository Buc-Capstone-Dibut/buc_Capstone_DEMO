"use client";

/**
 * 슬라이드 내 텍스트 인라인 편집을 위한 핵심 컴포넌트.
 *
 * 설계 원칙:
 *  1. **View 모드**: 그냥 텍스트만 (truncate 적용). plain span — 부모 font/색 그대로 상속.
 *     → 디자인이 절대 안 깨짐.
 *  2. **편집 활성화** (편집기 + 호버): 점선 outline + cursor:text 로 편집 가능함을 알림.
 *  3. **편집 중** (클릭): contentEditable=true.
 *     - 자체 local draft state 로 typing 처리 (React 부모 재렌더가 텍스트 덮어쓰지 않음)
 *     - 한국어 IME composition 이벤트 정확히 처리
 *     - Enter (single) / Shift+Enter (multi) commit · Esc cancel · blur commit
 *  4. **저장**: onChange 호출 → 부모가 document 업데이트. 부모는 debounce 자동 저장.
 *  5. **truncate (보기)**: maxLength 가 있으면 view 모드에서 `…` 으로 자름. 편집 시 전체.
 */

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

// ──────────────────────────────────────────────────────────────────────────
// Context — 편집기에서 켜고 끄기
// ──────────────────────────────────────────────────────────────────────────

type PatchPath = (string | number)[];

type EditableCtx = {
  enabled: boolean;
  /** 활성 페이지를 patch — 슬라이드 컴포넌트들이 사용 */
  patch?: (path: PatchPath, value: unknown) => void;
};

const EditableContext = createContext<EditableCtx>({ enabled: false });

export function EditableProvider({
  enabled,
  patch,
  children,
}: {
  enabled: boolean;
  patch?: (path: PatchPath, value: unknown) => void;
  children: ReactNode;
}) {
  return (
    <EditableContext.Provider value={{ enabled, patch }}>
      {children}
    </EditableContext.Provider>
  );
}

export function useEditableEnabled() {
  return useContext(EditableContext).enabled;
}

/**
 * 슬라이드 컴포넌트가 활성 페이지의 특정 path 를 업데이트하는 헬퍼.
 * 사용 예: `patch(["title"], "새 제목")` / `patch(["blocks", blockId, "content"], "텍스트")`
 */
export function usePatchActivePage() {
  const ctx = useContext(EditableContext);
  // enabled 아닐 땐 noop 으로 만들어 사용처가 항상 안전하게 호출 가능
  return ctx.patch || (() => {});
}

// ──────────────────────────────────────────────────────────────────────────
// 텍스트 truncate (보기 모드에서만)
// ──────────────────────────────────────────────────────────────────────────

function truncate(text: string, max?: number): string {
  if (!max || text.length <= max) return text;
  return `${text.slice(0, max).trim()}…`;
}

// ──────────────────────────────────────────────────────────────────────────
// EditableText — 인라인 편집 가능한 한 줄 텍스트 (또는 narrative 같은 멀티라인)
// ──────────────────────────────────────────────────────────────────────────

export type EditableTextProps = {
  value: string | undefined;
  onChange: (next: string) => void;
  /** 보기 모드 최대 길이 (`…` 자르기). 편집 시엔 무시. */
  maxLength?: number;
  /** narrative 같이 줄바꿈 허용. Enter 가 commit 이 아니라 줄바꿈. */
  multiline?: boolean;
  /** 비어 있을 때 보여줄 안내 (편집 활성 상태에서) */
  placeholder?: string;
  /** 부모와 동일한 className 유지 (h1/h2/p 안에 들어가면 자동 상속) */
  className?: string;
  style?: CSSProperties;
  /** 디버깅·AI 강조용 식별자 (선택) */
  fieldKey?: string;
};

export function EditableText({
  value,
  onChange,
  maxLength,
  multiline,
  placeholder,
  className,
  style,
  fieldKey,
}: EditableTextProps) {
  const enabled = useEditableEnabled();
  const [editing, setEditing] = useState(false);
  const elRef = useRef<HTMLSpanElement>(null);
  const isComposing = useRef(false);
  const draft = useRef<string>(value || "");
  const original = useRef<string>(value || "");

  // 편집 시작 시 DOM 에 현재 값 채우고 전체 선택
  useEffect(() => {
    if (!editing) return;
    const el = elRef.current;
    if (!el) return;
    original.current = value || "";
    draft.current = value || "";
    el.innerText = value || "";
    el.focus();
    // 전체 선택
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(el);
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, [editing]);
  // eslint-disable-line react-hooks/exhaustive-deps — value 변화 시엔 의도적으로 재실행 X

  // ─── View 전용 모드 (편집기 아님) ───
  if (!enabled) {
    const shown = truncate(value || "", maxLength);
    return (
      <span className={className} style={style} data-field-key={fieldKey}>
        {shown}
      </span>
    );
  }

  // ─── 편집 중 (contentEditable) ───
  if (editing) {
    return (
      <span
        ref={elRef}
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        role="textbox"
        aria-multiline={multiline ? "true" : undefined}
        data-field-key={fieldKey}
        onCompositionStart={() => {
          isComposing.current = true;
        }}
        onCompositionEnd={() => {
          isComposing.current = false;
        }}
        onInput={(e) => {
          draft.current = (e.currentTarget as HTMLElement).innerText;
        }}
        onKeyDown={(e) => {
          if (isComposing.current) return; // 한글 조합 중엔 단축키 무시
          if (e.key === "Escape") {
            e.preventDefault();
            draft.current = original.current;
            if (elRef.current) elRef.current.innerText = original.current;
            // blur → onBlur 가 cancel 처리
            elRef.current?.blur();
          } else if (e.key === "Enter" && !multiline && !e.shiftKey) {
            e.preventDefault();
            elRef.current?.blur();
          }
        }}
        onBlur={() => {
          const finalText = (elRef.current?.innerText || "")
            .replace(/​/g, "") // zero-width space 제거
            .replace(/\n+$/g, "") // 끝부분 빈 줄 제거
            .replace(/^\n+/g, "");
          setEditing(false);
          // 원본과 같으면 noop (placeholder 같은 emrelated 이슈 방지)
          if (finalText !== original.current) {
            onChange(finalText);
          }
        }}
        className={cn(
          className,
          // 편집 중 스타일 — outline 으로 layout shift 없이
          "outline outline-2 outline-offset-2 outline-emerald-500 rounded-sm",
          // overflow 잘림 방지
          "break-words",
        )}
        style={{
          ...style,
          // contentEditable 의 기본 white-space 강제 (multiline 일 때)
          whiteSpace: multiline ? "pre-wrap" : "nowrap",
          // narrative 같은 multiline 은 max-content 까지 늘어남
          // (single-line 은 일반 inline)
          caretColor: "rgb(16, 185, 129)",
        }}
      />
    );
  }

  // ─── 호버 가능 상태 (편집 활성, 아직 클릭 안 함) ───
  const display = value || "";
  const shown = truncate(display, maxLength);
  const empty = !display.trim();

  return (
    <span
      tabIndex={0}
      role="button"
      aria-label={placeholder ? `${placeholder} 편집` : "텍스트 편집"}
      data-field-key={fieldKey}
      onClick={() => setEditing(true)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setEditing(true);
        }
      }}
      className={cn(
        className,
        // 호버 시 점선 outline + cursor — 편집 가능함을 알림
        "cursor-text rounded-sm transition",
        "hover:outline hover:outline-1 hover:outline-dashed hover:outline-emerald-500/60 hover:outline-offset-2",
        "focus:outline focus:outline-2 focus:outline-emerald-500 focus:outline-offset-2",
        empty && "min-w-[2ch] inline-block",
      )}
      style={style}
    >
      {empty ? (
        <em className="font-light not-italic text-emerald-600/60">
          {placeholder || "비어 있음"}
        </em>
      ) : (
        shown
      )}
    </span>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// EditableArray — items[] 배열 편집 (emphasis, flow items, matrix items 등)
//
// 각 항목 자체는 EditableText 로 클릭 편집. 항목 추가/삭제는 별도 UI.
// 여기서는 단순 wrapper — 각 항목을 children render prop 으로 노출.
// ──────────────────────────────────────────────────────────────────────────

export type EditableArrayProps = {
  items: string[];
  onChange: (next: string[]) => void;
  /** 각 항목을 어떻게 렌더할지 */
  renderItem: (
    item: string,
    onPatch: (v: string) => void,
    index: number,
  ) => ReactNode;
  /** 항목 추가 가능 여부 (편집 모드일 때만 + 버튼 노출) */
  allowAdd?: boolean;
  newItemPlaceholder?: string;
  className?: string;
};

export function EditableArray({
  items,
  onChange,
  renderItem,
  allowAdd,
  newItemPlaceholder = "새 항목",
  className,
}: EditableArrayProps) {
  const enabled = useEditableEnabled();

  return (
    <span className={className}>
      {items.map((item, i) => (
        <span key={`item-${i}`} className="relative inline-block">
          {renderItem(
            item,
            (v) => {
              if (v.trim() === "") {
                // 빈 값 입력 → 항목 삭제
                onChange(items.filter((_, j) => j !== i));
              } else {
                onChange(items.map((it, j) => (j === i ? v : it)));
              }
            },
            i,
          )}
        </span>
      ))}
      {enabled && allowAdd ? (
        <button
          type="button"
          onClick={() => onChange([...items, ""])}
          className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-emerald-500/60 text-[11px] text-emerald-600 hover:bg-emerald-50"
          aria-label="항목 추가"
          title={newItemPlaceholder}
        >
          +
        </button>
      ) : null}
    </span>
  );
}
