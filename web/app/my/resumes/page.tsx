"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResumeTab } from "../[handle]/tabs/resume-tab";

export default function MyResumesPage() {
    const router = useRouter();
    const supabase = createClientComponentClient();
    const [loading, setLoading] = useState(true);
    const [authenticated, setAuthenticated] = useState(false);

    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push("/");
            } else {
                setAuthenticated(true);
            }
            setLoading(false);
        };
        checkUser();
    }, [supabase, router]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!authenticated) return null;

    return (
        <div className="min-h-screen bg-slate-50/30">
            <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
                <div className="max-w-5xl mx-auto px-4 h-16 flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.back()}
                        className="hover:bg-slate-100"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <h1 className="text-lg font-bold">이력서 관리 센터</h1>
                </div>
            </header>

            <main className="max-w-5xl mx-auto p-4 sm:p-8">
                <div className="bg-white rounded-2xl shadow-sm border p-6 min-h-[600px]">
                    <ResumeTab isOwner={true} />
                </div>
            </main>
        </div>
    );
}
