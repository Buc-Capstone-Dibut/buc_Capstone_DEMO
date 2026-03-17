export default function RoleInterviewSetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-[calc(100vh-64px)] w-full overflow-hidden bg-background">
      <main className="h-full overflow-y-auto relative">
        {children}
      </main>
    </div>
  );
}

