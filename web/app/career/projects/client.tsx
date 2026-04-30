"use client";

import { ProjectArchiveScreen } from "@/components/features/career/project-archive/project-archive-screen";
import type { ProjectInput } from "./types";

export default function CareerProjectsClient({
  initialProjects,
}: {
  initialProjects: ProjectInput[];
}) {
  return <ProjectArchiveScreen initialProjects={initialProjects} />;
}
