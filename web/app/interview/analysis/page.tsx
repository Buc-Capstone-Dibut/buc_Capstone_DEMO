"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    TrendingUp,
    Calendar,
    Award,
    ChevronRight,
    Search,
    Filter,
    ArrowUpRight,
    Clock,
    LayoutDashboard
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from "recharts";
import { motion } from "framer-motion";
import { MOCK_INTERVIEW_LIST } from "@/mocks/interview-data";
import { GlobalHeader } from "@/components/layout/global-header";

export default function InterviewAnalysisPage() {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");

    // Calculate stats from mock data
    const totalInterviews = MOCK_INTERVIEW_LIST.length;
    const averageScore = Math.round(
        MOCK_INTERVIEW_LIST.reduce((acc, curr) => acc + curr.score, 0) / totalInterviews
    );
    const topScore = Math.max(...MOCK_INTERVIEW_LIST.map(s => s.score));

    // Chart data
    const chartData = [...MOCK_INTERVIEW_LIST].reverse().map(session => ({
        date: session.date.split('-').slice(1).join('/'),
        score: session.score,
        company: session.company
    }));

    const filteredList = MOCK_INTERVIEW_LIST.filter(s =>
        s.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.role.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <GlobalHeader />

            <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full space-y-10">
                {/* Header Section */}
                <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-2">
                        <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
                            <LayoutDashboard className="w-10 h-10 text-primary" />
                            나의 면접 분석
                        </h1>
                        <p className="text-muted-foreground text-lg">
                            지금까지의 면접 기록을 분석하고 실력 향상 추이를 확인하세요.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <input
                                type="text"
                                placeholder="기업 또는 직무 검색..."
                                className="pl-10 pr-4 h-11 w-64 bg-muted/50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl">
                            <Filter className="w-4 h-4" />
                        </Button>
                    </div>
                </section>

                {/* Stats Summary Cards */}
                <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { label: "총 면접 횟수", value: `${totalInterviews}회`, icon: Calendar, color: "text-blue-500", bg: "bg-blue-500/10" },
                        { label: "평균 점수", value: `${averageScore}점`, icon: TrendingUp, color: "text-primary", bg: "bg-primary/10" },
                        { label: "최고 점수", value: `${topScore}점`, icon: Award, color: "text-orange-500", bg: "bg-orange-500/10" },
                        { label: "성장률", value: "+12%", icon: ArrowUpRight, color: "text-purple-500", bg: "bg-purple-500/10" },
                    ].map((stat, i) => (
                        <Card key={i} className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
                            <CardContent className="p-6 flex items-center gap-5">
                                <div className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center`}>
                                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                                    <p className="text-2xl font-bold">{stat.value}</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </section>

                {/* Growth Chart Section */}
                <section className="grid lg:grid-cols-3 gap-8">
                    <Card className="lg:col-span-2 border-2 shadow-lg rounded-3xl overflow-hidden bg-card">
                        <CardHeader className="flex flex-row items-center justify-between pb-8">
                            <div>
                                <CardTitle className="text-xl font-bold italic font-serif flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-primary" /> 면접 점수 변화
                                </CardTitle>
                                <CardDescription>최근 진행한 면접들의 점수 변화 추이입니다.</CardDescription>
                            </div>
                            <Badge variant="outline" className="h-8 px-4 rounded-full border-primary/20 text-primary">최근 5회차</Badge>
                        </CardHeader>
                        <CardContent className="h-[350px] pl-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} dy={10} />
                                    <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                                    <Tooltip
                                        contentStyle={{
                                            borderRadius: '16px',
                                            border: 'none',
                                            boxShadow: '0 10px 30px -5px rgba(0,0,0,0.1)',
                                            padding: '12px'
                                        }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="score"
                                        stroke="hsl(var(--primary))"
                                        strokeWidth={4}
                                        fillOpacity={1}
                                        fill="url(#colorScore)"
                                        dot={{ r: 6, fill: '#fff', stroke: 'hsl(var(--primary))', strokeWidth: 3 }}
                                        activeDot={{ r: 8, strokeWidth: 0 }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Tips / Insights Panel */}
                    <Card className="border-none bg-primary/5 rounded-3xl p-6 space-y-6">
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Award className="w-5 h-5 text-primary" /> 오늘의 인사이트
                            </h3>
                            <div className="space-y-4">
                                <div className="bg-white dark:bg-slate-900/50 p-4 rounded-2xl shadow-sm border border-primary/10">
                                    <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">BEST SKILL</p>
                                    <p className="text-sm font-medium">React Hooks 활용 능력이 매우 뛰어납니다.</p>
                                </div>
                                <div className="bg-white dark:bg-slate-900/50 p-4 rounded-2xl shadow-sm border border-orange-100">
                                    <p className="text-xs font-bold text-orange-600 uppercase tracking-widest mb-1">NEEDS FOCUS</p>
                                    <p className="text-sm font-medium">비즈니스 로직 설명 시 수치 인용이 필요합니다.</p>
                                </div>
                            </div>
                        </div>
                        <Separator className="bg-primary/10" />
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Clock className="w-5 h-5 text-primary" /> 면접 준비 팁
                            </h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                최근 면접에서 사용자의 <strong>아이...</strong> 같은 간투어 사용 빈도가 15% 감소했습니다.
                                대화의 리듬을 유지하는 데 집중해 보세요.
                            </p>
                            <Button variant="ghost" className="w-full text-primary hover:bg-primary/5 rounded-xl text-xs font-bold">
                                모든 코칭 메시지 보기 &rarr;
                            </Button>
                        </div>
                    </Card>
                </section>

                {/* Interview History List */}
                <section className="space-y-6">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Clock className="w-6 h-6 text-muted-foreground" /> 최근 면접 세션
                    </h2>

                    <div className="grid gap-4">
                        {filteredList.map((session, idx) => (
                            <motion.div
                                key={session.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                            >
                                <Card
                                    className="group hover:border-primary/30 transition-all cursor-pointer shadow-sm hover:shadow-md rounded-2xl overflow-hidden"
                                    onClick={() => router.push(`/interview/result?id=${session.id}`)}
                                >
                                    <CardContent className="p-0">
                                        <div className="flex flex-col md:flex-row md:items-center">
                                            {/* Left: Score Badge */}
                                            <div className="bg-muted/30 md:w-32 py-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r group-hover:bg-primary/5 transition-colors">
                                                <span className="text-3xl font-black text-primary">{session.score}</span>
                                                <span className="text-[10px] font-bold text-muted-foreground opacity-60 uppercase tracking-widest">Score</span>
                                            </div>

                                            {/* Middle: Info */}
                                            <div className="flex-1 p-6 space-y-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Badge variant="secondary" className="bg-primary/5 text-primary border-none"># {session.role}</Badge>
                                                    <span className="text-sm text-muted-foreground flex items-center gap-1.5 ml-auto md:ml-0 md:order-last">
                                                        <Calendar className="w-3.5 h-3.5" /> {session.date}
                                                    </span>
                                                </div>
                                                <h3 className="text-xl font-bold group-hover:text-primary transition-colors">{session.company} - 모의 면접 세션</h3>
                                                <p className="text-sm text-muted-foreground line-clamp-1">{session.analysis.feedback.strengths[0]}</p>
                                            </div>

                                            {/* Right: Actions */}
                                            <div className="p-6 md:pr-10 flex items-center justify-end">
                                                <Button variant="ghost" className="rounded-full h-12 w-12 group-hover:bg-primary group-hover:text-white transition-all shadow-none">
                                                    <ChevronRight className="w-6 h-6" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}

                        {filteredList.length === 0 && (
                            <div className="py-20 text-center space-y-4 bg-muted/20 rounded-3xl border-2 border-dashed">
                                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto opacity-30">
                                    <Search className="w-8 h-8" />
                                </div>
                                <p className="text-muted-foreground font-medium">검색 결과에 맞는 면접 이력이 없습니다.</p>
                                <Button variant="outline" onClick={() => setSearchTerm("")}>필터 초기화</Button>
                            </div>
                        )}
                    </div>
                </section>
            </main>

            {/* Footer / CTA */}
            <footer className="p-10 text-center border-t bg-muted/10">
                <p className="text-muted-foreground text-sm mb-6">충분한 연습은 합격으로 가는 가장 빠른 지름길입니다.</p>
                <Button
                    size="lg"
                    className="h-14 px-10 rounded-full font-bold shadow-xl shadow-primary/20 hover:scale-105 transition-all"
                    onClick={() => router.push('/interview')}
                >
                    새로운 면접 시작하기
                </Button>
            </footer>
        </div>
    );
}

function Separator({ className }: { className?: string }) {
    return <div className={`h-[1px] w-full ${className}`} />;
}
