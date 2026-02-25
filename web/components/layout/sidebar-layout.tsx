export function SidebarLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
}
