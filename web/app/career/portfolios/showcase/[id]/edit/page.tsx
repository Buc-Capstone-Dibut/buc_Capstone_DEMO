import { redirect } from "next/navigation";

export default function ShowcaseLegacyEditPage({ params }: { params: { id: string } }) {
  redirect(`/career/portfolios/showcase-wizard?id=${encodeURIComponent(params.id)}`);
}
