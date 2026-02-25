import { redirect } from "next/navigation";

interface InterviewRoomEntryPageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

const toSingleParam = (value: string | string[] | undefined): string | null => {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
};

export default function InterviewRoomEntryPage({ searchParams }: InterviewRoomEntryPageProps) {
  const modeParam = toSingleParam(searchParams?.mode);
  const targetPath = modeParam === "video" ? "/interview/room/video" : "/interview/room/chat";

  const query = new URLSearchParams();
  Object.entries(searchParams ?? {}).forEach(([key, value]) => {
    if (key === "mode") return;
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item != null) query.append(key, item);
      });
      return;
    }
    if (value != null) query.set(key, value);
  });

  const nextUrl = query.toString() ? `${targetPath}?${query.toString()}` : targetPath;
  redirect(nextUrl);
}
