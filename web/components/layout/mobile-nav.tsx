"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookOpen, Mic, Layout, Calendar, Users } from "lucide-react"
import { Button } from "@/components/ui/button"

export function GlobalMobileNav() {
  const pathname = usePathname()

  const navItems = [
    { label: "Insights", href: "/insights", icon: BookOpen },
    { label: "Interview", href: "/interview", icon: Mic },
    { label: "Workspace", href: "/workspace", icon: Layout },
    { label: "Activities", href: "/insights/activities", icon: Calendar },
    { label: "Community", href: "/community", icon: Users },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t md:hidden">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 h-auto py-2 px-2 transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px]">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
