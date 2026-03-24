"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MessageSquare, Users } from "lucide-react";
import { CommunitySidebar } from "@/components/features/community/community-sidebar";
import { Footer } from "@/components/layout/footer";

export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const tabs = [
    {
      name: "자유게시판",
      href: "/community/board",
      icon: MessageSquare,
      active: pathname?.startsWith("/community/board"),
    },
    {
      name: "팀 찾기",
      href: "/community/squad",
      icon: Users,
      active: pathname?.startsWith("/community/squad"),
    },
  ];

  const isSquadDetail =
    pathname?.startsWith("/community/squad/") &&
    pathname !== "/community/squad";
  const showSidebar = !isSquadDetail;

  return (
    <div className="flex min-h-full flex-col">
      <div className="container mx-auto max-w-7xl flex-1 px-4 py-8">
        <div className="flex flex-col gap-8">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-2">
                커뮤니티
              </h1>
              <p className="text-muted-foreground">
                개발자들의 소통, 성장, 그리고 실제 협업을 위한 공간입니다.
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b">
            <nav className="flex gap-6" aria-label="Tabs">
              {tabs.map((tab) => (
                <Link
                  key={tab.name}
                  href={tab.href}
                  className={cn(
                    "flex items-center gap-2 py-4 text-sm font-medium border-b-2 transition-colors",
                    tab.active
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted",
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.name}
                </Link>
              ))}
            </nav>
          </div>

          {/* Content with Sidebar Grid */}
          <div
            className={cn(
              "grid grid-cols-1 gap-8",
              showSidebar && "lg:grid-cols-4",
            )}
          >
            {/* Main Content */}
            <div
              className={cn(
                "min-h-[500px]",
                showSidebar ? "lg:col-span-3" : "w-full",
              )}
            >
              {children}
            </div>

            {/* Sidebar (1/4) */}
            {showSidebar && (
              <div className="hidden lg:block lg:col-span-1">
                <CommunitySidebar />
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
