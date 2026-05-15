/**
 * 채용공고 페이지의 공통 비주얼 토큰.
 * 상태/일정 종류별 색상과 라벨을 한 곳에서 관리하여 카드·리스트·캘린더·모달의 표현을 일치시킨다.
 */
import type { JobPostingStatus, ScheduleKind } from "@/lib/job-postings/types";

export const STATUS_TONE: Record<JobPostingStatus, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200/60",
  applied: "bg-blue-50 text-blue-700 ring-blue-200/60",
  interviewing: "bg-orange-50 text-orange-700 ring-orange-200/60",
  closed: "bg-slate-100 text-slate-600 ring-slate-200/60",
  archived: "bg-slate-50 text-slate-500 ring-slate-200/60",
};

/**
 * 카드/리스트의 좌측 상태 액센트 바 색.
 * 4면 외곽선 대신 한 면(왼쪽)에만 색을 입혀 분류탭(서류 인덱스) 같은 인상을 준다.
 */
export const STATUS_BAR: Record<JobPostingStatus, string> = {
  active: "bg-emerald-300",
  applied: "bg-blue-300",
  interviewing: "bg-orange-300",
  closed: "bg-slate-300",
  archived: "bg-slate-200",
};

export const STATUS_TONE_ACTIVE: Record<JobPostingStatus, string> = {
  active: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200",
  applied: "bg-blue-100 text-blue-700 hover:bg-blue-200",
  interviewing: "bg-orange-100 text-orange-700 hover:bg-orange-200",
  closed: "bg-slate-200 text-slate-700 hover:bg-slate-300",
  archived: "bg-slate-100 text-slate-500 hover:bg-slate-200",
};

export const STATUS_LABEL: Record<JobPostingStatus, string> = {
  active: "관심",
  applied: "지원완료",
  interviewing: "면접중",
  closed: "마감",
  archived: "보관",
};

export const KIND_COLOR: Record<ScheduleKind, string> = {
  deadline: "#ef4444",
  document_due: "#3b82f6",
  interview: "#f97316",
  other: "#64748b",
};

export const KIND_TONE: Record<ScheduleKind, string> = {
  deadline: "bg-red-50 text-red-700 ring-red-200/60",
  document_due: "bg-blue-50 text-blue-700 ring-blue-200/60",
  interview: "bg-orange-50 text-orange-700 ring-orange-200/60",
  other: "bg-slate-50 text-slate-700 ring-slate-200/60",
};

export const KIND_LABEL: Record<ScheduleKind, string> = {
  deadline: "마감",
  document_due: "서류",
  interview: "면접",
  other: "기타",
};
