import { clampScore, getTypeLabels, getTypeName } from "@/lib/interview/report/dibeot-axis";
import { DibeotAxisScores, PortfolioDefenseReportModel } from "@/lib/interview/report/report-types";

export interface PortfolioRubricSnapshot {
  designIntent: number;
  codeQuality: number;
  aiUsage: number;
  totalWeightedScore: number;
}

export function buildPortfolioDefenseReportModel({
  rubric,
  repoUrl,
  mode,
  createdAt,
  strengths,
  improvements,
  nextActions,
  coverage,
  turns,
}: {
  rubric: PortfolioRubricSnapshot;
  repoUrl: string;
  mode: "voice" | "video";
  createdAt?: number;
  strengths: string[];
  improvements: string[];
  nextActions: string[];
  coverage: { covered: number; total: number; items: Array<{ label: string; covered: boolean }> };
  turns: Array<{ role: "user" | "model"; text: string }>;
}): PortfolioDefenseReportModel {
  const coverageRatio = coverage.total > 0 ? coverage.covered / coverage.total : 0;
  const axes: DibeotAxisScores = {
    approach: clampScore(rubric.designIntent * 0.72 + 10),
    scope: clampScore(rubric.designIntent * 0.45 + coverageRatio * 35 + 20),
    decision: clampScore(rubric.designIntent * 0.32 + rubric.codeQuality * 0.22 + (100 - rubric.aiUsage) * 0.16 + 18),
    execution: clampScore(rubric.codeQuality * 0.42 + rubric.aiUsage * 0.18 + Math.min(12, turns.length)),
  };

  const typeName = getTypeName(axes);
  const typeLabels = getTypeLabels(axes);
  const primaryImprovement = improvements[0] || "개인 기여와 설계 근거를 더 또렷하게 말해보세요.";

  return {
    badgeLabel: "이번 디펜스의 디벗 유형",
    typeName,
    typeLabels,
    summary: `설계 의도와 구조 설명은 안정적이었습니다. 다만 ${primaryImprovement}`,
    heroMetrics: [
      { label: "디펜스 점수", value: `${Math.round(rubric.totalWeightedScore)}점` },
      { label: "설명 완성도", value: `${rubric.designIntent}점` },
      { label: "설계 방어력", value: `${Math.round((rubric.designIntent + rubric.codeQuality) / 2)}점` },
    ],
    metaItems: [
      { label: "대상 레포", value: repoUrl || "레포 정보 없음" },
      { label: "진행 방식", value: mode === "video" ? "화상 디펜스" : "음성 디펜스" },
      {
        label: "일시",
        value: createdAt
          ? new Date(createdAt * 1000).toLocaleString("ko-KR", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "-",
      },
      { label: "토픽 커버리지", value: `${coverage.covered} / ${coverage.total}` },
    ],
    axes,
    axisEvidence: [
      {
        axisKey: "approach",
        title: "문제 접근 방식",
        description: `설계 의도 설명 ${rubric.designIntent}점으로, 프로젝트를 바로 구현 이야기보다 구조와 선택 배경부터 설명하는 흐름이 두드러졌습니다.`,
      },
      {
        axisKey: "scope",
        title: "사고 범위",
        description: `토픽 커버리지가 ${coverage.covered}/${coverage.total}였기 때문에, 세부 코드보다 시스템 맥락을 먼저 짚는 성향이 강했습니다.`,
      },
      {
        axisKey: "decision",
        title: "의사결정 전략",
        description: `AI 활용 ${rubric.aiUsage}점과 코드 품질 ${rubric.codeQuality}점을 함께 보면, 실험보다는 검증과 설명의 안정성이 조금 더 앞섰습니다.`,
      },
      {
        axisKey: "execution",
        title: "실행 방식",
        description: `이번 디펜스는 구현 자체보다 구조와 협업 의사결정을 설명하는 장면이 더 강하게 드러났습니다.`,
      },
    ],
    strengths: (strengths.length > 0 ? strengths : ["강점 데이터가 아직 없습니다."]).slice(0, 3),
    weaknesses: (improvements.length > 0 ? improvements : ["개선 포인트 데이터가 아직 없습니다."]).slice(0, 3),
    focusPoint: primaryImprovement,
    nextActions: (nextActions.length > 0
      ? nextActions
      : [
          "프로젝트 소개 초반에 내 역할을 먼저 말하기",
          "기술 선택 이유를 대안 비교로 설명하기",
          "결과를 수치나 운영 지표로 연결하기",
        ]).slice(0, 3),
    defenseSummary: `프로젝트 전체 구조를 설명하는 흐름은 안정적이었습니다. 이제는 왜 이 선택을 했고, 내가 직접 무엇을 바꿨는지를 더 선명하게 보여줘야 합니다.`,
    narrativeHighlights: [
      {
        label: "프로젝트 설명",
        title: "문제 정의와 구조 설명",
        summary: "프로젝트의 큰 흐름과 설계 방향을 먼저 설명한 점은 강점입니다.",
        tone: "positive",
      },
      {
        label: "디펜스 방어",
        title: "개인 기여도와 대안 비교",
        summary: primaryImprovement,
        tone: "caution",
      },
    ],
    topicCoverage: coverage,
    contributionInsights: [
      "팀 전체 설명보다 내가 직접 설계·구현한 장면을 먼저 드러내는 것이 좋습니다.",
      "기술 선택 이유는 항상 버린 대안과 함께 말해야 설득력이 생깁니다.",
      "구조 설명 뒤에 실제 운영 경험이나 장애 대응 경험을 붙이면 방어력이 올라갑니다.",
    ],
    transcriptHighlights: turns.slice(-6),
    footerActions: [
      { label: "훈련 센터로", href: "/interview/training", variant: "outline" },
      { label: "같은 레포로 다시 디펜스", href: `/interview/training/portfolio?repoUrl=${encodeURIComponent(repoUrl)}&mode=${mode}&duration=10` },
    ],
  };
}
