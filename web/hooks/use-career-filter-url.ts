"use client";

import { useEffect, useMemo } from "react";

type FilterUrlValue = string | number | null | undefined;

/**
 * 목록 필터만 현재 URL에 동기화한다. 전달하지 않은 id, mode 같은 화면 고유
 * 파라미터는 보존하므로 상세 선택이나 작성 모드가 필터 변경으로 사라지지 않는다.
 */
export function useCareerFilterUrl(values: Record<string, FilterUrlValue>) {
  const serialized = useMemo(() => JSON.stringify(values), [values]);

  useEffect(() => {
    const nextValues = JSON.parse(serialized) as Record<string, FilterUrlValue>;
    const params = new URLSearchParams(window.location.search);

    for (const [key, value] of Object.entries(nextValues)) {
      if (value === null || value === undefined || value === "") {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    }

    const query = params.toString();
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
    window.history.replaceState(window.history.state, "", nextUrl);
  }, [serialized]);
}
