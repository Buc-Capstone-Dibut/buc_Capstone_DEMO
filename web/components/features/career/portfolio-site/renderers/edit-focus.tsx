"use client";

/**
 * 편집 포커스 컨텍스트 — 우측 편집 패널에서 어떤 필드/블록을 누르고 있는지
 * 슬라이드 렌더링 영역에 알려서 시각적으로 강조.
 *
 * - field: "title" | "subtitle" | "eyebrow" | "narrative" | "emphasis"
 * - blockId: 페이지의 특정 블록을 강조하고 싶을 때
 *
 * 동작 방식:
 * 1. PortfolioSiteRenderer(dispatcher) 가 EditFocusProvider 로 슬라이드 영역 wrap
 * 2. 그 안에서 outer wrapper 가 data-portfolio-edit-focus="title|..." 를 가짐
 * 3. CSS attribute selector 가 자동으로 h1/h2 등을 강조 (모든 렌더러 공통)
 * 4. 블록 단위로 정밀 강조하려면 각 렌더러가 EditTarget 으로 wrap (점진적)
 */

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";

/** CSS selector 내부에 ID 를 안전하게 삽입하기 위한 escape (영문/숫자/하이픈/언더스코어만 허용). */
function cssEscape(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

/**
 * Inline edit handlers — 클릭한 element 의 data 속성으로 어떤 필드/블록인지 판별 후
 * 부모에 patch 요청.
 */
export type InlineEditHandlers = {
  onPatchPageField: (
    field: EditFocusField,
    value: string | string[],
  ) => void;
  onPatchBlockContent: (blockId: string, content: string) => void;
};

export type EditFocusField =
  | "title"
  | "subtitle"
  | "eyebrow"
  | "narrative"
  | "emphasis";

export type EditFocus = {
  field?: EditFocusField | null;
  blockId?: string | null;
};

const EditFocusContext = createContext<EditFocus>({ field: null, blockId: null });

export function useEditFocus(): EditFocus {
  return useContext(EditFocusContext);
}

/**
 * 슬라이드 영역을 감싸는 wrapper. 자식들에 EditFocus 컨텍스트 + data 속성을 제공.
 *
 * CSS attribute selector 가 자동으로 동작:
 *   [data-portfolio-edit-focus="title"] h1,
 *   [data-portfolio-edit-focus="title"] h2 { outline: ... }
 *
 * 블록 단위 정밀 강조는 자식 element 에 data-edit-block={id} 를 추가해서 사용:
 *   [data-portfolio-edit-focus-block="abc123"] [data-edit-block="abc123"] { ... }
 */
export function EditFocusProvider({
  focus,
  children,
  inlineEdit,
}: {
  focus?: EditFocus;
  children: ReactNode;
  /** 슬라이드 위 텍스트 직접 클릭 편집 활성화 (편집기 전용) */
  inlineEdit?: InlineEditHandlers;
}) {
  const resolved: EditFocus = focus || { field: null, blockId: null };
  const hasFocus = Boolean(resolved.field || resolved.blockId);
  const rootRef = useRef<HTMLDivElement>(null);
  const inlineEditRef = useRef(inlineEdit);
  inlineEditRef.current = inlineEdit;

  // Inline edit — 슬라이드 안 마커 element 클릭 → contentEditable 활성화
  useEffect(() => {
    if (!inlineEdit) return;
    const root = rootRef.current;
    if (!root) return;

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      // 이미 편집 중인 element 면 자체 동작 유지
      if (target.closest('[contenteditable="true"]')) return;
      const editable = findEditableTarget(target, root);
      if (!editable) return;
      event.preventDefault();
      event.stopPropagation();
      startInlineEdit(editable.el, editable.kind, editable.value, inlineEditRef);
    };

    root.addEventListener("click", onClick, true);
    return () => root.removeEventListener("click", onClick, true);
  }, [inlineEdit]);

  return (
    <EditFocusContext.Provider value={resolved}>
      <div
        ref={rootRef}
        data-portfolio-edit-focus={resolved.field || undefined}
        data-portfolio-edit-focus-block={resolved.blockId || undefined}
        className={[
          hasFocus ? "portfolio-edit-focus-root" : "",
          inlineEdit ? "portfolio-inline-edit-root" : "",
        ]
          .filter(Boolean)
          .join(" ") || undefined}
      >
        {children}
        {/* 활성 블록 ID 에 대해서만 동적으로 CSS 주입 → renderer 수정 없이 블록 강조 */}
        {resolved.blockId ? (
          <style
            dangerouslySetInnerHTML={{
              __html: `[data-edit-block-id="${cssEscape(resolved.blockId)}"] {
                box-shadow: inset 0 0 0 2px rgba(132, 185, 70, 0.9) !important;
                background-color: rgba(132, 185, 70, 0.18) !important;
                border-radius: 6px !important;
                outline: 2px solid rgba(132, 185, 70, 0.4) !important;
                outline-offset: 3px !important;
                animation: portfolio-edit-pulse 1.4s ease-in-out infinite alternate !important;
              }`,
            }}
          />
        ) : null}
      </div>
    </EditFocusContext.Provider>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Inline editing 헬퍼
// ──────────────────────────────────────────────────────────────────────────

type EditableKind =
  | { type: "field"; field: EditFocusField }
  | { type: "block"; blockId: string };

function findEditableTarget(
  clicked: HTMLElement,
  root: HTMLElement,
): { el: HTMLElement; kind: EditableKind; value: string } | null {
  // 1) data-edit-field 마커가 있는 가장 가까운 조상
  const fieldEl = clicked.closest<HTMLElement>("[data-edit-field]");
  if (fieldEl && root.contains(fieldEl)) {
    const field = fieldEl.dataset.editField as EditFocusField | undefined;
    if (field) return { el: fieldEl, kind: { type: "field", field }, value: fieldEl.innerText };
  }

  // 2) h1/h2 = title (data-edit-field 없을 때도)
  const heading = clicked.closest<HTMLElement>("h1, h2");
  if (heading && root.contains(heading)) {
    // 단, RendererShell 의 헤더에 있는 텍스트는 제외 (역할이 다름)
    if (!heading.closest("header")) {
      return { el: heading, kind: { type: "field", field: "title" }, value: heading.innerText };
    }
  }

  // 3) data-edit-block-id 마커 (블록 카드 컨테이너) — 텍스트 컨텐츠 편집
  const blockEl = clicked.closest<HTMLElement>("[data-edit-block-id]");
  if (blockEl && root.contains(blockEl)) {
    const blockId = blockEl.dataset.editBlockId;
    if (blockId) return { el: blockEl, kind: { type: "block", blockId }, value: blockEl.innerText };
  }

  return null;
}

function startInlineEdit(
  el: HTMLElement,
  kind: EditableKind,
  originalValue: string,
  handlersRef: { current: InlineEditHandlers | undefined },
) {
  // 시각 큐 — 외곽 ring
  const prevOutline = el.style.outline;
  const prevOffset = el.style.outlineOffset;
  const prevBorderRadius = el.style.borderRadius;
  el.style.outline = "2px solid rgba(132,185,70,0.95)";
  el.style.outlineOffset = "3px";
  el.style.borderRadius = "4px";

  el.setAttribute("contenteditable", "true");
  el.setAttribute("spellcheck", "false");
  el.focus();

  // 전체 선택
  const sel = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(el);
  sel?.removeAllRanges();
  sel?.addRange(range);

  const isMultiline = kind.type === "field" && kind.field === "narrative";

  let finished = false;
  const finish = (commit: boolean) => {
    if (finished) return;
    finished = true;
    el.removeAttribute("contenteditable");
    el.removeAttribute("spellcheck");
    el.style.outline = prevOutline;
    el.style.outlineOffset = prevOffset;
    el.style.borderRadius = prevBorderRadius;
    el.removeEventListener("blur", onBlur);
    el.removeEventListener("keydown", onKey);

    if (commit) {
      const newText = el.innerText.trim();
      if (newText !== originalValue.trim()) {
        const handlers = handlersRef.current;
        if (handlers) {
          if (kind.type === "field") {
            if (kind.field === "emphasis") {
              const items = newText
                .split(/[,\n]/)
                .map((s) => s.trim())
                .filter(Boolean);
              handlers.onPatchPageField(kind.field, items);
            } else {
              handlers.onPatchPageField(kind.field, newText);
            }
          } else if (kind.type === "block") {
            handlers.onPatchBlockContent(kind.blockId, newText);
          }
        }
      } else {
        // 텍스트 변경 없으면 React 가 다시 그릴 때 reset
        el.innerText = originalValue;
      }
    } else {
      // Esc — 원본 복원
      el.innerText = originalValue;
    }
  };

  const onBlur = () => finish(true);
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      finish(false);
      el.blur();
    } else if (e.key === "Enter" && !e.shiftKey && !isMultiline) {
      e.preventDefault();
      el.blur();
    }
  };

  el.addEventListener("blur", onBlur);
  el.addEventListener("keydown", onKey);
}

/**
 * 블록(혹은 특정 element)을 명시적으로 강조 대상으로 마킹하는 wrapper.
 * 각 렌더러의 슬라이드 컴포넌트에서 점진적으로 사용 (강조하고 싶은 곳에만).
 */
export function EditTarget({
  blockId,
  children,
  className,
  inline,
}: {
  blockId?: string;
  children: ReactNode;
  className?: string;
  inline?: boolean;
}) {
  const focus = useEditFocus();
  const isActive = blockId !== undefined && focus.blockId === blockId;
  const Tag = inline ? "span" : "div";
  return (
    <Tag
      data-edit-block={blockId}
      data-edit-block-active={isActive ? "true" : undefined}
      className={className}
    >
      {children}
    </Tag>
  );
}

/**
 * 슬라이드 캔버스 위에 떠 있는 작은 chip — 현재 어떤 필드를 편집 중인지 알림.
 * 우측 패널에서 input 포커스 시 표시.
 */
export function EditFocusBadge({ focus }: { focus: EditFocus }) {
  const label = labelFor(focus);
  if (!label) return null;
  return (
    <div className="pointer-events-none fixed left-1/2 top-20 z-[55] -translate-x-1/2 select-none rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold text-white shadow-[0_8px_20px_rgba(15,80,40,0.25)]">
      ✏️ {label}
    </div>
  );
}

function labelFor(focus: EditFocus): string | null {
  if (focus.field === "title") return "제목 편집 중";
  if (focus.field === "subtitle") return "부제 편집 중";
  if (focus.field === "eyebrow") return "Eyebrow 편집 중";
  if (focus.field === "narrative") return "본문 narrative 편집 중";
  if (focus.field === "emphasis") return "강조 키워드 편집 중";
  if (focus.blockId) return "블록 편집 중";
  return null;
}
