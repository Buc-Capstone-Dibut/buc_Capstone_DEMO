"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { UserMenu } from "@/components/auth/user-menu";
import { AuthModal } from "@/components/auth/auth-modal";
import { isFlutterWebView } from "@/lib/webview-bridge";
import { cn } from "@/lib/utils";
import React, { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { NotificationCenter } from "@/components/features/notification/notification-center";
import {
  Newspaper,
  Terminal,
  MessageSquare,
  Users,
  UserPlus,
  LayoutDashboard,
  Wrench,
  Video,
  PieChart,
  DoorOpen,
  Calendar,
  FileText,
  Briefcase
} from "lucide-react";
// 메뉴 구조 정의
// 메뉴 구조 정의
const MENUS: Record<string, { label: string; href: string; activePath?: string; submenus: any[] }> = {
  insights: {
    label: "인사이트",
    href: "/insights/tech-blog",
    activePath: "/insights",
    submenus: [
      { href: "/insights/tech-blog", label: "기술 블로그", icon: Newspaper },
      { href: "/insights/activities", label: "대외활동", icon: Calendar },
      { href: "/insights/ctp", label: "CTP", icon: Terminal },
    ],
  },
  community: {
    label: "커뮤니티",
    href: "/community",
    submenus: [
      { href: "/community/board", label: "자유 게시판", icon: MessageSquare },
      { href: "/community/squad", label: "팀원 모집", icon: UserPlus },
    ],
  },
  workspace: {
    label: "워크스페이스",
    href: "/workspace",
    submenus: [],
  },
  career: {
    label: "커리어 관리",
    href: "/career",
    submenus: [],
  },
  interview: {
    label: "AI 면접",
    href: "/interview",
    submenus: [
      { href: "/interview", label: "AI 모의 면접", icon: Video },
      { href: "/interview/training", label: "면접 훈련 센터", icon: Wrench },
      { href: "/interview/analysis", label: "면접 분석", icon: PieChart },
    ],
  },
};

export function GlobalHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [hoveredMenu, setHoveredMenu] = useState<string | null>(null);


  // 현재 활성화된 메인 카테고리 찾기
  // 하위 메뉴 중 하나라도 일치하면 해당 카테고리를 활성 상태로 간주
  const currentCategory = Object.keys(MENUS).find((key) => {
    const menu = MENUS[key as keyof typeof MENUS];
    if (pathname === "/") return false;
    return (
      pathname.startsWith(menu.href) ||
      menu.submenus.some((sub) => pathname.startsWith(sub.href))
    );
  });

  const submenus = currentCategory
    ? MENUS[currentCategory as keyof typeof MENUS].submenus
    : [];

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm border-b border-neutral-200 dark:border-slate-800 transition-all duration-300">
        {/* Main Header Bar */}
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 w-full relative">
          {/* Logo - Left */}
          <Link
            href="/"
            className="text-[15px] font-bold tracking-tight text-neutral-900 dark:text-white hover:opacity-80 transition-opacity"
          >
            Dibut
          </Link>

          {/* Desktop Main Navigation - Center */}
          <nav
            className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2"
            onMouseLeave={() => setHoveredMenu(null)}
          >
            {Object.entries(MENUS).map(([key, menu]) => {
              const isActive = pathname !== "/" && pathname.startsWith(menu.activePath || menu.href);
              const isHovered = hoveredMenu === key;

              return (
                <div
                  key={key}
                  className="relative py-4"
                  onMouseEnter={() => setHoveredMenu(key)}
                >
                  <Link href={menu.href}>
                    <Button
                      variant="ghost"
                      className={cn(
                        "relative px-3 py-1.5 text-[13px] font-bold transition-all duration-200",
                        isActive
                          ? "text-primary bg-transparent hover:!bg-neutral-100 dark:hover:!bg-slate-800 hover:text-primary" // 선택됨: 평소 투명, 호버 시 회색 박스 + 초록색 강제 유지
                          : "text-neutral-600 dark:text-slate-400 bg-transparent hover:!bg-neutral-100 dark:hover:!bg-slate-800 hover:text-neutral-900 dark:hover:text-white" // 일반: 평소 투명, 호버 시 동일 회색 박스 + 진한 텍스트
                      )}
                    >
                      {menu.label}
                    </Button>
                  </Link>

                  {/* Sleek Dropdown Submenu - Only show if there are submenus */}
                  {isHovered && menu.submenus.length > 0 && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2">
                      <div className="w-48 overflow-hidden rounded-2xl bg-white dark:bg-slate-900 p-2 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] border border-neutral-100 dark:border-slate-800">
                        {menu.submenus.map((sub) => {
                          const Icon = sub.icon;
                          return (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-neutral-800 dark:text-slate-200 transition-all hover:bg-neutral-50 dark:hover:bg-slate-800 hover:text-primary"
                            >
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-50 group-hover:bg-primary/10 transition-colors">
                                <Icon className="h-4 w-4 text-neutral-500 group-hover:text-primary transition-colors" />
                              </div>
                              {sub.label}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <NotificationCenter />
            <ThemeToggle />
            {!isFlutterWebView() && (
              <UserMenu onLoginClick={() => setIsAuthModalOpen(true)} />
            )}
          </div>
        </div>

        {/* Mobile Sub Navigation Bar - Only for mobile */}
        {submenus.length > 0 && (
          <div className="w-full border-t border-border/30 bg-muted/20 md:hidden">
            <div className="max-w-7xl mx-auto px-4">
              <nav className="flex items-center h-10 overflow-x-auto no-scrollbar gap-6">
                {submenus.map((submenu) => {
                  // 단순 startsWith 비교보다 정확한 활성화 로직
                  // 예: /community/board 가 /community/board-detail 도 포함하도록
                  const isSubActive =
                    pathname === submenu.href ||
                    pathname.startsWith(submenu.href + "/");
                  return (
                    <Link
                      key={submenu.href}
                      href={submenu.href}
                      className={cn(
                        "text-sm font-medium whitespace-nowrap transition-colors relative py-1",
                        isSubActive
                          ? "text-primary"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {submenu.label}
                      {isSubActive && (
                        <span className="absolute -bottom-[9px] md:-bottom-[11px] left-0 w-full h-[2px] bg-primary rounded-t-full" />
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

      </header>

      {/* Spacer to prevent content overlap - Height depends on header state */}
      <div
        className={cn(
          "w-full transition-all duration-300",
          submenus.length > 0 ? "h-24 md:h-14" : "h-14",
        )}
      />

      <AuthModal open={isAuthModalOpen} onOpenChange={setIsAuthModalOpen} />
    </>
  );
}
