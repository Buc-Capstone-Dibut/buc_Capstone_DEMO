import { redirect } from "next/navigation";

interface PortfolioDefenseRoomRedirectPageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

export default function PortfolioDefenseRoomRedirectPage({
  searchParams,
}: PortfolioDefenseRoomRedirectPageProps) {
  const query = new URLSearchParams();

  Object.entries(searchParams ?? {}).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item != null) query.append(key, item);
      });
      return;
    }
    if (value != null) query.set(key, value);
  });

  query.set("sessionType", "portfolio_defense");
  query.set("mode", "video");

  redirect(`/interview/room/video?${query.toString()}`);
}
