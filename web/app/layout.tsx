import type { Metadata } from "next";
import "./globals.css";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { Analytics } from "@vercel/analytics/next";
import { GlobalHeader } from "@/components/layout/global-header";
import { GlobalMobileNav } from "@/components/layout/mobile-nav";
import { Suspense } from "react";
import { AppSWRProvider } from "@/components/providers/swr-provider";
import { VoiceManager } from "@/components/features/workspace/voice/voice-manager";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://dibut.dev";

export const metadata: Metadata = {
  title: {
    default: "Dibut (디벗_Buddy for Developers)",
    template: "%s | Dibut",
  },
  description:
    "Integrated platform for Tech Blogs, AI Interview Practice, and Project Collaboration.",
  keywords: [
    "Tech Blog",
    "AI Interview",
    "Developer Tools",
    "Dibut",
    "디벗",
    "Collaboration",
  ],
  authors: [{ name: "Dibut Team" }],
  creator: "Dibut",
  publisher: "Dibut",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: SITE_URL,
    title: "Dibut (디벗_Buddy for Developers)",
    description: "Developer Productivity Platform",
    siteName: "Dibut",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard-dynamic-subset.min.css"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
      </head>
      <body
        suppressHydrationWarning
        className="min-h-screen bg-background font-sans antialiased"
      >
        <AppSWRProvider>
          <VoiceManager>
            <div className="relative flex min-h-screen flex-col">
              <Suspense
                fallback={
                  <div className="h-14 border-b border-slate-200/50 bg-white/80" />
                }
              >
                <GlobalHeader />
              </Suspense>
              <div className="flex flex-1 flex-col">{children}</div>
              <GlobalMobileNav />
            </div>
          </VoiceManager>
          <Toaster />
          <SonnerToaster />
          <Analytics />
        </AppSWRProvider>
      </body>
    </html>
  );
}
