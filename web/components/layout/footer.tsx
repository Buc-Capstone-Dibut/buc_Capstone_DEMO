import Link from "next/link";

const PRIMARY_LINKS = [
  { href: "/insights/tech-blog", label: "인사이트" },
  { href: "/community", label: "커뮤니티" },
  { href: "/workspace", label: "워크스페이스" },
  { href: "/interview", label: "AI 면접" },
] as const;

export function Footer() {
  return (
    <footer className="mt-auto border-t border-neutral-100 bg-transparent">
      <div className="mx-auto max-w-6xl px-5 py-12 pb-24 md:pb-12">
        <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
          <div className="text-center md:text-left">
            <span className="text-[20px] font-black tracking-tight text-neutral-900">
              Dibut
            </span>
            <p className="mt-2 text-[13px] text-neutral-400">
              개발자 성장 통합 플랫폼
            </p>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[14px] font-medium text-neutral-500">
            {PRIMARY_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-primary"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <p className="text-center text-[12px] text-neutral-300 md:text-right">
            © 2026 Dibut. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
