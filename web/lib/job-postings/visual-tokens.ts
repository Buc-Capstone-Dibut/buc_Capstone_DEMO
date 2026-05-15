/**
 * 채용공고 페이지의 공통 비주얼 토큰.
 * 상태/일정 종류별 색상과 라벨을 한 곳에서 관리하여 카드·리스트·캘린더·모달의 표현을 일치시킨다.
 */
import type {
  ColorPreset,
  JobPostingStatus,
  ScheduleKind,
} from "@/lib/job-postings/types";

/**
 * 사용자가 카드/폴더에 지정 가능한 8개 프리셋. 자유 hex 대신 토큰으로
 * 일관된 톤을 보장하고, 라이트/다크 모드 모두에서 가독성을 챙긴다.
 */
export const COLOR_PRESET_LIST: ColorPreset[] = [
  "slate", "red", "orange", "amber", "emerald", "sky", "violet", "pink",
];

export const COLOR_PRESET_LABEL: Record<ColorPreset, string> = {
  slate: "회색",
  red: "빨강",
  orange: "주황",
  amber: "노랑",
  emerald: "초록",
  sky: "파랑",
  violet: "보라",
  pink: "분홍",
};

/** 카드 좌측 액센트 바 색 (사용자 지정 색이 있으면 STATUS_BAR 위에 우선 적용). */
export const COLOR_PRESET_BAR: Record<ColorPreset, string> = {
  slate: "bg-slate-400",
  red: "bg-red-400",
  orange: "bg-orange-400",
  amber: "bg-amber-400",
  emerald: "bg-emerald-400",
  sky: "bg-sky-400",
  violet: "bg-violet-400",
  pink: "bg-pink-400",
};

/** 작은 도트(예: 우상단 보조 신호 / 사이드바 폴더 옆). */
export const COLOR_PRESET_DOT: Record<ColorPreset, string> = {
  slate: "bg-slate-400",
  red: "bg-red-400",
  orange: "bg-orange-400",
  amber: "bg-amber-400",
  emerald: "bg-emerald-400",
  sky: "bg-sky-400",
  violet: "bg-violet-400",
  pink: "bg-pink-400",
};

/** 폴더 행 / 칩의 옅은 배경 톤. */
export const COLOR_PRESET_SOFT: Record<ColorPreset, string> = {
  slate: "bg-slate-100 text-slate-700",
  red: "bg-red-50 text-red-700",
  orange: "bg-orange-50 text-orange-700",
  amber: "bg-amber-50 text-amber-700",
  emerald: "bg-emerald-50 text-emerald-700",
  sky: "bg-sky-50 text-sky-700",
  violet: "bg-violet-50 text-violet-700",
  pink: "bg-pink-50 text-pink-700",
};

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
