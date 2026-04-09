import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ReportInsightListCard({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: string[];
}) {
  return (
    <Card className="rounded-[28px] border border-[#e7ebf1] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {items.map((item, index) => (
          <div
            key={`${title}-${index}`}
            className="rounded-[18px] border border-[#e7ebf1] bg-[#fbfcfe] px-4 py-3 text-sm leading-6 text-foreground"
          >
            {item}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
