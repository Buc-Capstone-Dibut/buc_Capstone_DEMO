export function SidebarLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col w-full">
      <div className="flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
}
