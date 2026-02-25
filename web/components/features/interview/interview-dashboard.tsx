import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BrainCircuit, GitBranch, Plus, Video, Zap } from "lucide-react";
import { MOCK_COMMUNITY_POSTS } from "@/mocks/interview-data";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { PostCard } from "@/components/features/community/post-card";

interface InterviewDashboardProps {
   onStartNew: () => void;
   onOpenTraining?: () => void;
   onImportFromMyPage?: () => void;
}

export function InterviewDashboard({ onStartNew, onOpenTraining, onImportFromMyPage }: InterviewDashboardProps) {
   return (
      <div className="p-8 max-w-6xl mx-auto space-y-12">
         {/* 1. Hero Section */}
         <section className="text-center space-y-6 py-10">
            <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.5 }}
               className="space-y-4"
            >
               <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent pb-2">
                  면접의 A to Z,<br className="hidden md:block" /> AI와 완벽하게 준비하세요.
               </h1>
               <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                  채용 공고 분석부터 이력서 매칭, 그리고 실전 모의 면접까지.<br />
                  당신의 합격 확률을 높여줄 맞춤형 코칭을 경험해 보세요.
               </p>
            </motion.div>

            <motion.div
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               transition={{ delay: 0.2, duration: 0.4 }}
               className="flex flex-col sm:flex-row gap-3 justify-center"
            >
               <Button size="lg" className="h-14 px-8 text-lg rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:scale-105 transition-all" onClick={onStartNew}>
                  <Plus className="mr-2 w-5 h-5" /> 새 면접 시작하기
               </Button>
               <Button
                  size="lg"
                  variant="outline"
                  className="h-14 px-8 text-lg rounded-full border-primary/30 text-primary hover:bg-primary/5"
                  onClick={onImportFromMyPage}
               >
                  <BrainCircuit className="mr-2 w-5 h-5" /> 마이페이지에서 불러오기
               </Button>
            </motion.div>
         </section>

         {/* 2. Process Introduction (Minimal Typography Design) */}
         <section className="grid md:grid-cols-3 gap-8">
            <Card className="group relative overflow-hidden border-none shadow-sm bg-muted/20 hover:bg-muted/30 transition-all duration-500 rounded-3xl p-4">
               <CardHeader className="relative z-10 space-y-4">
                  <span className="text-4xl font-black text-primary/70 group-hover:text-primary transition-colors duration-500 font-serif">01</span>
                  <div className="space-y-2">
                     <CardTitle className="text-xl font-bold tracking-tight group-hover:text-primary transition-colors">JD 분석 & 매칭</CardTitle>
                     <CardDescription className="text-sm leading-relaxed text-muted-foreground/80">
                        지원하려는 공고의 핵심 요구사항을 분석하고 내 이력서와의 매칭률을 정밀하게 확인합니다.
                     </CardDescription>
                  </div>
               </CardHeader>
               <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-primary/0 via-primary/40 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </Card>

            <Card className="group relative overflow-hidden border-none shadow-sm bg-muted/20 hover:bg-muted/30 transition-all duration-500 rounded-3xl p-4">
               <CardHeader className="relative z-10 space-y-4">
                  <span className="text-4xl font-black text-primary/70 group-hover:text-primary transition-colors duration-500 font-serif">02</span>
                  <div className="space-y-2">
                     <CardTitle className="text-xl font-bold tracking-tight group-hover:text-primary transition-colors">맞춤형 질문 생성</CardTitle>
                     <CardDescription className="text-sm leading-relaxed text-muted-foreground/80">
                        내 경험과 직무 스킬셋을 기반으로 실제 면접관이 물어볼 만한 핵심 예상 질문을 도출합니다.
                     </CardDescription>
                  </div>
               </CardHeader>
               <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-primary/0 via-primary/40 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </Card>

            <Card className="group relative overflow-hidden border-none shadow-sm bg-muted/20 hover:bg-muted/30 transition-all duration-500 rounded-3xl p-4">
               <CardHeader className="relative z-10 space-y-4">
                  <span className="text-4xl font-black text-primary/70 group-hover:text-primary transition-colors duration-500 font-serif">03</span>
                  <div className="space-y-2">
                     <CardTitle className="text-xl font-bold tracking-tight group-hover:text-primary transition-colors">실전 모의 면접</CardTitle>
                     <CardDescription className="text-sm leading-relaxed text-muted-foreground/80">
                        실제 면접장과 같은 긴장감 속에서 답변을 연습하고, AI의 데이터 기반 피드백을 받아보세요.
                     </CardDescription>
                  </div>
               </CardHeader>
               <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-primary/0 via-primary/40 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </Card>
         </section>

         {/* 3. Training Center Preview */}
         <section className="space-y-6 rounded-3xl border bg-card/40 p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
               <div className="space-y-1">
                  <h2 className="text-2xl font-bold tracking-tight">면접 훈련 센터</h2>
                  <p className="text-muted-foreground">
                     리포트 기반으로 약점을 빠르게 보완하는 집중 훈련 공간입니다.
                  </p>
               </div>
               <Button variant="outline" className="w-fit border-primary/20 text-primary hover:bg-primary/5" onClick={onOpenTraining}>
                  훈련 센터 열기
               </Button>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
               {[
                  {
                     icon: GitBranch,
                     title: "포트폴리오 디펜스",
                     desc: "공개 Git 레포를 기반으로 아키텍처와 인프라 설계 의도를 설명하는 면접을 진행합니다.",
                     badge: "Public Repo",
                  },
                  {
                     icon: Video,
                     title: "화상 디펜스 모드",
                     desc: "LiveKit 화상 연결로 실제 면접 환경에 가까운 훈련을 제공합니다.",
                     badge: "LiveKit Beta",
                  },
                  {
                     icon: BrainCircuit,
                     title: "설계 의도 집중 질문",
                     desc: "AI 시대 면접의 핵심인 '왜 이렇게 설계했는가'를 집중 검증하는 질문 흐름을 제공합니다.",
                     badge: "Design Intent",
                  },
               ].map((item) => (
                  <Card key={item.title} className={cn("border border-primary/10 bg-background/70")}>
                     <CardHeader className="space-y-3">
                        <div className="flex items-center justify-between">
                           <item.icon className="w-5 h-5 text-primary" />
                           <Badge variant="outline" className="text-[10px] border-primary/20 text-primary">
                              {item.badge}
                           </Badge>
                        </div>
                        <CardTitle className="text-lg">{item.title}</CardTitle>
                        <CardDescription className="leading-relaxed">{item.desc}</CardDescription>
                     </CardHeader>
                  </Card>
               ))}
            </div>
         </section>

         {/* 3. Community / Tips Section */}
         <section className="space-y-6 pt-8 border-t">
            <div className="flex items-center justify-between">
               <div className="space-y-1">
                  <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                     <Zap className="w-5 h-5 text-yellow-500 fill-yellow-500" /> 오늘의 면접 꿀팁
                  </h2>
                  <p className="text-muted-foreground">먼저 취업한 선배들의 노하우와 합격 후기를 확인해 보세요.</p>
               </div>
               <Button variant="ghost" className="text-muted-foreground">더보기</Button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
               {MOCK_COMMUNITY_POSTS.map((post) => (
                  // @ts-ignore - MockPost type compatibility with Database Post type
                  <PostCard key={post.id} post={post as any} href={`/community/post/${post.id}`} />
               ))}
            </div>
         </section>
      </div>
   );
}
