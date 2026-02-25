import { fetchDevEventById } from "@/lib/server/dev-events";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ActivityDetailHeader } from "@/components/features/career/activity-detail-header";
import { ActivityDetailContent } from "@/components/features/career/activity-detail-content";

export const dynamic = "force-dynamic";

export default async function ActivityDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = await params;
  const event = await fetchDevEventById(id);

  if (!event) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <ActivityDetailHeader event={event} />

      {/* Main Content */}
      <ActivityDetailContent event={event} />
    </div>
  );
}
