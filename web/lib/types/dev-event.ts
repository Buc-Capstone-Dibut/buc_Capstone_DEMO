import { Database } from "@/lib/database.types";

export type DevEventRow = Database["public"]["Tables"]["dev_events"]["Row"];

export type DevEventStatus =
  | "recruiting"
  | "upcoming"
  | "closed"
  | (string & {});

export type DevEvent = Omit<
  DevEventRow,
  "tags" | "target_audience" | "schedule" | "benefits" | "status"
> & {
  tags: string[];
  target_audience: string[];
  schedule: string[];
  benefits: string[];
  status: DevEventStatus;
};
