import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8 p-8">
      <h1 className="text-4xl font-bold tracking-tight">Dibut</h1>
      <p className="text-xl text-muted-foreground">Tech Blog + AI Interview + Sync Workspace</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-4xl">
        <LinkCard href="/insights/tech-blog" title="Tech Blog" desc="All your tech news in one place" />
        <LinkCard href="/interview" title="AI Interview" desc="Practice with AI Avatar" />
        <LinkCard href="/workspace" title="Workspace" desc="Collaborate on projects" />
        <LinkCard href="/career" title="Career" desc="Find jobs and events" />
        <LinkCard href="/community" title="Community" desc="Ask and share knowledge" />
      </div>
    </div>
  );
}

function LinkCard({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link href={href} className="group block p-6 border rounded-lg hover:border-primary transition-colors">
      <h3 className="font-semibold text-lg group-hover:text-primary">{title}</h3>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </Link>
  );
}
