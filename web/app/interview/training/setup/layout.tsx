export default function PortfolioDefenseSetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-[calc(100vh-64px)] w-full overflow-hidden bg-background">
      <main className="relative h-full overflow-y-auto">{children}</main>
    </div>
  );
}
