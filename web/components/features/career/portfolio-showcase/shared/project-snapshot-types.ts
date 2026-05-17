import type { ResumePayload } from "@/app/my/[handle]/profile-types";

// A project snapshot is a deep copy of one resume_payload.timeline item
// taken at the moment the user selects it. We DO NOT keep a foreign key to
// the live timeline — see spec §4.
export type ProjectSnapshot = NonNullable<ResumePayload["timeline"]>[number];
