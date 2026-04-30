"use client";

import type { ExperienceInput } from "./actions";
import { ProjectArchiveScreen } from "@/components/features/career/project-archive/project-archive-screen";

export default function CareerTimelineClient({
  initialExperiences,
}: {
  initialExperiences: ExperienceInput[];
}) {
  return <ProjectArchiveScreen initialProjects={initialExperiences} />;
}
