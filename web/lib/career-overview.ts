export type CareerOverviewSectionKey =
  | "projects"
  | "workExperiences"
  | "resumes"
  | "coverLetters"
  | "portfolios"
  | "jobPostings";

export interface CareerOverviewItem {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
  href: string;
}

export interface CareerOverviewSection {
  total: number;
  items: CareerOverviewItem[];
}

export interface CareerOverviewData {
  sections: Record<CareerOverviewSectionKey, CareerOverviewSection>;
}
