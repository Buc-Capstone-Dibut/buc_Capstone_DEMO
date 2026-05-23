import { Suspense } from "react";
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

// CTP concepts are known at build time from the static curriculum tree.
// Pre-rendering each (categoryId, conceptId) lets Vercel cache the HTML
// shell at the edge — only the dynamic-imported module chunk runs at hydrate.
export function generateStaticParams() {
  return CTP_DATA.flatMap((category) =>
    category.concepts.map((concept) => ({
      categoryId: category.id,
      conceptId: concept.id,
    })),
  );
}

// All curriculum content is bundled — no upstream data fetch, no need to
// revalidate. Marking the route static guarantees pure SSG output.
export const dynamic = "force-static";
export const dynamicParams = false;

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
    <Suspense>
      <CTPWikiLayout>
        {/* Back Link (Mobile only mostly, or top nav) */}
        <div className="mb-6 lg:hidden">
          <Link href="/insights/ctp" className="text-sm text-muted-foreground flex items-center hover:text-primary">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Curriculum
          </Link>
        </div>

        <ContentComponent />
      </CTPWikiLayout>
    </Suspense>
  );
}
