"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import type { JobPostingStatus } from "@/lib/job-postings/types";

export type View = "cards" | "list";
export type Sort = "created_desc" | "created_asc" | "deadline_asc" | "company_asc";
export type FavoritesPolicy = "off" | "top" | "only";

export interface ViewState {
  view: View;
  calendarVisible: boolean;
  query: string;
  statusFilters: JobPostingStatus[]; // 빈 배열 = 전체
  sort: Sort;
  favoritesPolicy: FavoritesPolicy;
  page: number;
  pageSize: number;
}

const STORAGE_KEY = "dibut.job-postings.view";
const DEFAULT_PAGE_SIZE = 20;

const DEFAULT_STATE: ViewState = {
  view: "cards",
  calendarVisible: true,
  query: "",
  statusFilters: [],
  sort: "created_desc",
  favoritesPolicy: "top",
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
};

type Action =
  | { type: "SET_QUERY"; payload: string }
  | { type: "TOGGLE_STATUS"; payload: JobPostingStatus }
  | { type: "SET_SORT"; payload: Sort }
  | { type: "SET_VIEW"; payload: View }
  | { type: "TOGGLE_CALENDAR" }
  | { type: "SET_FAVORITES_POLICY"; payload: FavoritesPolicy }
  | { type: "SET_PAGE"; payload: number }
  | { type: "SET_PAGE_SIZE"; payload: number }
  | { type: "RESTORE"; payload: Partial<ViewState> };

function reducer(state: ViewState, action: Action): ViewState {
  switch (action.type) {
    case "SET_QUERY":
      return { ...state, query: action.payload, page: 1 };
    case "TOGGLE_STATUS": {
      const exists = state.statusFilters.includes(action.payload);
      const next = exists
        ? state.statusFilters.filter((s) => s !== action.payload)
        : [...state.statusFilters, action.payload];
      return { ...state, statusFilters: next, page: 1 };
    }
    case "SET_SORT":
      return { ...state, sort: action.payload, page: 1 };
    case "SET_VIEW":
      return { ...state, view: action.payload };
    case "TOGGLE_CALENDAR":
      return { ...state, calendarVisible: !state.calendarVisible };
    case "SET_FAVORITES_POLICY":
      return { ...state, favoritesPolicy: action.payload, page: 1 };
    case "SET_PAGE":
      return { ...state, page: Math.max(1, action.payload) };
    case "SET_PAGE_SIZE":
      return { ...state, pageSize: Math.max(1, action.payload), page: 1 };
    case "RESTORE":
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

interface PersistedState {
  view?: View;
  calendarVisible?: boolean;
  pageSize?: number;
  sort?: Sort;
  favoritesPolicy?: FavoritesPolicy;
}

function loadFromStorage(): PersistedState {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PersistedState;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveToStorage(state: ViewState) {
  if (typeof window === "undefined") return;
  try {
    const persisted: PersistedState = {
      view: state.view,
      calendarVisible: state.calendarVisible,
      pageSize: state.pageSize,
      sort: state.sort,
      favoritesPolicy: state.favoritesPolicy,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  } catch {
    // 무시
  }
}

function loadFromUrl(): Partial<ViewState> {
  if (typeof window === "undefined") return {};
  try {
    const params = new URLSearchParams(window.location.search);
    const out: Partial<ViewState> = {};
    const view = params.get("view");
    if (view === "cards" || view === "list") out.view = view;
    const page = params.get("page");
    if (page) {
      const n = parseInt(page, 10);
      if (!Number.isNaN(n) && n >= 1) out.page = n;
    }
    const q = params.get("q");
    if (q !== null) out.query = q;
    return out;
  } catch {
    return {};
  }
}

function updateUrl(state: ViewState) {
  if (typeof window === "undefined") return;
  try {
    const params = new URLSearchParams(window.location.search);
    if (state.view !== DEFAULT_STATE.view) params.set("view", state.view);
    else params.delete("view");
    if (state.page > 1) params.set("page", String(state.page));
    else params.delete("page");
    if (state.query) params.set("q", state.query);
    else params.delete("q");
    const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    window.history.replaceState(null, "", next);
  } catch {
    // 무시
  }
}

export function useJobPostingsView() {
  const [state, dispatch] = useReducer(reducer, DEFAULT_STATE);
  const hydratedRef = useRef(false);

  // 첫 마운트 시 localStorage + URL 복원
  useEffect(() => {
    const stored = loadFromStorage();
    const urlState = loadFromUrl();
    dispatch({ type: "RESTORE", payload: { ...stored, ...urlState } });
    hydratedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 변경 시 localStorage + URL 동기화 (첫 마운트 hydration 전엔 skip)
  useEffect(() => {
    if (!hydratedRef.current) return;
    saveToStorage(state);
    updateUrl(state);
  }, [state]);

  const setQuery = useCallback((payload: string) => dispatch({ type: "SET_QUERY", payload }), []);
  const toggleStatus = useCallback(
    (payload: JobPostingStatus) => dispatch({ type: "TOGGLE_STATUS", payload }),
    [],
  );
  const setSort = useCallback((payload: Sort) => dispatch({ type: "SET_SORT", payload }), []);
  const setView = useCallback((payload: View) => dispatch({ type: "SET_VIEW", payload }), []);
  const toggleCalendar = useCallback(() => dispatch({ type: "TOGGLE_CALENDAR" }), []);
  const setFavoritesPolicy = useCallback(
    (payload: FavoritesPolicy) => dispatch({ type: "SET_FAVORITES_POLICY", payload }),
    [],
  );
  const setPage = useCallback((payload: number) => dispatch({ type: "SET_PAGE", payload }), []);
  const setPageSize = useCallback(
    (payload: number) => dispatch({ type: "SET_PAGE_SIZE", payload }),
    [],
  );

  return {
    state,
    setQuery,
    toggleStatus,
    setSort,
    setView,
    toggleCalendar,
    setFavoritesPolicy,
    setPage,
    setPageSize,
  };
}
