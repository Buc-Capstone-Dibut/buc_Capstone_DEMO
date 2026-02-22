import { CTP_DATA } from "@/lib/ctp-curriculum";
import { CTPWikiLayout } from "@/components/features/ctp/layout/ctp-wiki-layout";
import { getCtpContent } from "@/lib/ctp-content-registry";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface PageProps {
  params: {
    categoryId: string;
    conceptId: string;
  };
}

export default function CTPDetailPage({ params }: PageProps) {
  const { categoryId, conceptId } = params;

  // 1. Find Metadata
  const category = CTP_DATA.find((c) => c.id === categoryId);
  const concept = category?.concepts.find((c) => c.id === conceptId);

  if (!category || !concept) {
    notFound();
  }

  // 2. Get Content Component
  const ContentComponent = getCtpContent(categoryId, conceptId);
  if (!ContentComponent) {
    notFound();
  }

  return (
    <CTPWikiLayout>
      {/* Back Link (Mobile only mostly, or top nav) */}
      <div className="mb-6 lg:hidden">
        <Link href="/insights/ctp" className="text-sm text-muted-foreground flex items-center hover:text-primary">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Curriculum
        </Link>
      </div>

      <ContentComponent />
    </CTPWikiLayout>
  );
}
