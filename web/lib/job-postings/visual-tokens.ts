/**
 * 채용공고 페이지에서 공통으로 사용하는 비주얼 토큰.
 *
 * 상태(STATUS_*), 일정 종류(KIND_*) 별 색상/라벨을 한 곳에 모아두어
 * 카드/리스트/캘린더/모달 등 여러 컴포넌트에서 일관된 표현을 유지한다.
 *
 * Tailwind의 JIT가 클래스명을 정적으로 인식할 수 있도록
 * 문자열 그대로의 className을 저장한다 (동적 조립 금지).
 */
import type { JobPostingStatus, ScheduleKind } from "@/lib/job-postings/types";

// 카드/리스트의 정적 배지 배경 + 텍스트 + 링 (3D-look)
export const STATUS_TONE: Record<JobPostingStatus, string> = {
  active: "bg-emerald-100 text-emerald-700 ring-emerald-200/50",
  applied: "bg-blue-100 text-blue-700 ring-blue-200/50",
  interviewing: "bg-orange-100 text-orange-700 ring-orange-200/50",
  closed: "bg-slate-200 text-slate-700 ring-slate-300/50",
  archived: "bg-slate-100 text-slate-500 ring-slate-200/50",
};

// 헤더의 토글형 칩 (active 상태). hover 톤이 살짝 더 진하다.
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

// 일정 종류별 단색 (FullCalendar 등에서 backgroundColor 값으로 직접 사용)
export const KIND_COLOR: Record<ScheduleKind, string> = {
  deadline: "#ef4444",
  document_due: "#3b82f6",
  interview: "#f97316",
  other: "#64748b",
};

// 3D-look 아이콘/배지에 사용하는 그라데이션
export const KIND_GRADIENT: Record<ScheduleKind, string> = {
  deadline: "linear-gradient(135deg,#fca5a5,#dc2626)",
  document_due: "linear-gradient(135deg,#93c5fd,#2563eb)",
  interview: "linear-gradient(135deg,#fdba74,#ea580c)",
  other: "linear-gradient(135deg,#cbd5e1,#475569)",
};

export const KIND_LABEL: Record<ScheduleKind, string> = {
  deadline: "마감",
  document_due: "서류",
  interview: "면접",
  other: "기타",
};

// Dibut 마스코트 노란색 계열 (헤더 아이콘 등에 사용)
export const DIBUT_GRADIENT = "linear-gradient(135deg,#fde68a,#f59e0b 55%,#d97706)";
