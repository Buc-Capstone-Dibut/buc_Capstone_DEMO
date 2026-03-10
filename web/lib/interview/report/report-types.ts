export type DibeotAxisKey = "approach" | "scope" | "decision" | "execution";
export type DibeotAxisPolarity = "A" | "B";

export interface DibeotAxisScores {
  approach: number;
  scope: number;
  decision: number;
  execution: number;
}

export interface ReportMetric {
  label: string;
  value: string;
}

export interface ReportMetaItem {
  label: string;
  value: string;
  href?: string;
  hrefLabel?: string;
}

export interface ReportAxisEvidence {
  axisKey: DibeotAxisKey;
  title: string;
  description: string;
}

export interface ReportHighlight {
  label: string;
  title: string;
  summary: string;
  detail?: string;
  tone?: "positive" | "caution" | "neutral";
}

export interface FooterAction {
  label: string;
  href?: string;
  variant?: "default" | "outline" | "ghost";
}

export interface ReportShellModel {
  badgeLabel: string;
  typeName: string;
  typeLabels: string[];
  summary: string;
  heroMetrics: ReportMetric[];
  metaItems: ReportMetaItem[];
  axes: DibeotAxisScores;
  axisEvidence: ReportAxisEvidence[];
  strengths: string[];
  weaknesses: string[];
  focusPoint: string;
  nextActions: string[];
}

export interface MockInterviewReportModel extends ReportShellModel {
  fitSummary: string;
  questionHighlights: ReportHighlight[];
  deliveryInsights: string[];
  habits: {
    habit: string;
    count: number;
    severity: "low" | "medium" | "high";
  }[];
  footerActions: FooterAction[];
}

export interface PortfolioDefenseReportModel extends ReportShellModel {
  defenseSummary: string;
  narrativeHighlights: ReportHighlight[];
  topicCoverage: {
    covered: number;
    total: number;
    items: Array<{ label: string; covered: boolean }>;
  };
  contributionInsights: string[];
  transcriptHighlights: Array<{ role: "user" | "model"; text: string }>;
  footerActions: FooterAction[];
}
