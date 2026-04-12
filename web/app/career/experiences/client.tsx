"use client";

import type { ExperienceInput } from "./actions";
import { ExperienceTimelineScreen } from "@/components/features/career/experience-timeline/experience-timeline-screen";

export default function CareerTimelineClient({
  initialExperiences,
}: {
  initialExperiences: ExperienceInput[];
}) {
  return <ExperienceTimelineScreen initialExperiences={initialExperiences} />;
}
