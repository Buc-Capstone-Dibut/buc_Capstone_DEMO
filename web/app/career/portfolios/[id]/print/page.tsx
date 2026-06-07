import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  normalizePortfolioRowDocument,
  portfolioDelegate,
} from "@/lib/server/career-portfolios";
import { PortfolioPrintClient } from "./client";

export const dynamic = "force-dynamic";

/**
 * PDF 출력 전용 페이지.
 * 관리 페이지의 "PDF 다운로드" 버튼이 새 탭으로 이걸 열면
 * 클라이언트가 마운트 후 자동으로 window.print() 트리거.
 * 사용자는 인쇄 대화상자에서 "PDF로 저장" 선택.
 */
export default async function PortfolioPrintPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect(`/login?next=/career/portfolios/${params.id}/print`);
  }

  const row = await portfolioDelegate().findFirst({
    where: { id: params.id, user_id: session.user.id },
  });

  if (!row) {
    redirect("/career/portfolios");
  }

  const document = normalizePortfolioRowDocument(row);

  return <PortfolioPrintClient document={document} />;
}
