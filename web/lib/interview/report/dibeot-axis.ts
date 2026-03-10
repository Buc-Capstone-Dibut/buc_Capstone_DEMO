import { DibeotAxisKey, DibeotAxisPolarity, DibeotAxisScores } from "@/lib/interview/report/report-types";

export interface DibeotAxisDefinition {
  key: DibeotAxisKey;
  label: string;
  left: string;
  right: string;
  description: string;
}

export const DIBEOT_AXES: DibeotAxisDefinition[] = [
  {
    key: "approach",
    label: "문제 접근 방식",
    left: "구조형",
    right: "탐색형",
    description: "설계와 분석부터 시작하는지, 실험과 구현부터 시작하는지 봅니다.",
  },
  {
    key: "scope",
    label: "사고 범위",
    left: "시스템형",
    right: "구현형",
    description: "시스템 구조를 먼저 보는지, 코드 구현을 먼저 설명하는지 봅니다.",
  },
  {
    key: "decision",
    label: "의사결정 전략",
    left: "안정형",
    right: "실험형",
    description: "리스크 최소화와 검증을 우선하는지, 빠른 실험을 우선하는지 봅니다.",
  },
  {
    key: "execution",
    label: "실행 방식",
    left: "구축형",
    right: "조정형",
    description: "직접 구현을 강조하는지, 구조와 협업 조율을 강조하는지 봅니다.",
  },
];

const TYPE_NAMES: Record<
  `${DibeotAxisPolarity}${DibeotAxisPolarity}${DibeotAxisPolarity}${DibeotAxisPolarity}`,
  string
> = {
  AAAA: "시스템 엔지니어형",
  AAAB: "아키텍트형",
  AABA: "혁신 엔지니어형",
  AABB: "전략가형",
  ABAA: "장인형 개발자",
  ABAB: "코드 아키텍트형",
  ABBA: "실험적 빌더형",
  ABBB: "기술 전략가형",
  BAAA: "인프라 엔지니어형",
  BAAB: "운영 설계형",
  BABA: "플랫폼 빌더형",
  BABB: "플랫폼 전략형",
  BBAA: "디버깅 전문가형",
  BBAB: "운영 개발자형",
  BBBA: "빌더형",
  BBBB: "스타트업 엔지니어형",
};

export function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function getAxisLabel(axisKey: DibeotAxisKey, value: number): string {
  const axis = DIBEOT_AXES.find((item) => item.key === axisKey);
  if (!axis) return "";
  return value >= 50 ? axis.left : axis.right;
}

export function getTypeCode(axes: DibeotAxisScores): `${DibeotAxisPolarity}${DibeotAxisPolarity}${DibeotAxisPolarity}${DibeotAxisPolarity}` {
  const approach = axes.approach >= 50 ? "A" : "B";
  const scope = axes.scope >= 50 ? "A" : "B";
  const decision = axes.decision >= 50 ? "A" : "B";
  const execution = axes.execution >= 50 ? "A" : "B";
  return `${approach}${scope}${decision}${execution}`;
}

export function getTypeName(axes: DibeotAxisScores): string {
  return TYPE_NAMES[getTypeCode(axes)];
}

export function getTypeLabels(axes: DibeotAxisScores): string[] {
  return DIBEOT_AXES.map((axis) => getAxisLabel(axis.key, axes[axis.key]));
}
