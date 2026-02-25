"use client";

import { CTP_DATA } from "@/lib/ctp-curriculum";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, BookOpen, Layers, Zap, Code } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function CTPPage() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">

      {/* 1. Hero Section */}
      <section className="pt-24 pb-16 px-6 text-center max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-tight text-foreground pt-8">
            코드가 <span className="text-transparent bg-clip-text bg-gradient-to-br from-blue-600 to-purple-600">살아 움직이는 순간.</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            눈으로 보고, 손으로 익히는 인터랙티브 알고리즘 마스터 클래스.<br/>
            기초부터 심화까지, 단 4개의 모듈로 완성합니다.
          </p>
          <div className="flex justify-center pt-2">
            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
              학습 난이도 : 부천대학교 3학년 1학기 알고리즘 개론
            </span>
          </div>

          <div className="pt-4">
             <Link
                href={`/insights/ctp/${CTP_DATA[0].id}/${CTP_DATA[0].concepts[0].id}`}
                className="h-12 px-8 rounded-full bg-primary text-primary-foreground text-base font-bold inline-flex items-center shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:scale-105 transition-all"
             >
                학습 시작하기 <ArrowRight className="ml-2 w-4 h-4" />
             </Link>
          </div>
        </motion.div>
      </section>

      {/* 2. Module Grid Layout (2 Columns) */}
      <section className="max-w-screen-2xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {CTP_DATA.map((category, idx) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
              className="group relative flex flex-col overflow-hidden rounded-3xl bg-card border border-border/60 hover:border-primary/40 transition-colors shadow-sm"
            >
              {/* Module Header */}
              <div className="p-8 pb-6 border-b border-border/30 bg-muted/20">
                <div className="flex items-start justify-between mb-4">
                   <div className="flex items-center gap-4">
                      <span className="flex items-center justify-center w-12 h-12 rounded-xl bg-background border border-border text-2xl font-black font-mono text-muted-foreground/40 shadow-sm">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold uppercase tracking-wider text-primary/80">Module</span>
                        <h2 className="text-2xl font-black tracking-tight text-foreground">
                          {category.title.split(" (")[0]}
                        </h2>
                      </div>
                   </div>
                   {/* Icon */}
                   <div className="text-muted-foreground/5 group-hover:text-primary/10 transition-colors">
                      {idx === 0 && <Layers size={64} />}
                      {idx === 1 && <Zap size={64} />}
                      {idx === 2 && <Code size={64} />}
                      {idx === 3 && <BookOpen size={64} />}
                   </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed pl-1 max-w-md">
                   {category.description}
                </p>
              </div>

              {/* Module Content (Grid of Cards) */}
              <div className="flex-1 p-6 bg-background/50">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {category.concepts.map((concept, cIdx) => (
                       <Link
                         key={concept.id}
                         href={`/insights/ctp/${category.id}/${concept.id}`}
                         className="group/card flex flex-col p-4 rounded-2xl bg-card border border-border/50 hover:border-primary/50 hover:shadow-md transition-all h-full"
                       >
                          {/* Top Row: Title & Arrow */}
                          <div className="flex items-start justify-between mb-2">
                             <h3 className="font-bold text-base leading-tight group-hover/card:text-primary transition-colors pr-2">
                               {concept.title}
                            </h3>
                             <ArrowRight className="w-5 h-5 text-muted-foreground/20 group-hover/card:text-primary -rotate-45 group-hover/card:rotate-0 transition-all duration-300 flex-shrink-0" />
                          </div>

                          {/* Middle: Description */}
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
                              {concept.description}
                          </p>

                          {/* Bottom: Numbering */}
                          <div className="mt-auto pt-3 border-t border-border/30 flex items-center justify-between">
                            <span className="text-[10px] font-mono font-medium text-muted-foreground/40">
                              {String(idx + 1).padStart(2, '0')}-{String(cIdx + 1).padStart(2, '0')}
                            </span>
                            {/* Optional: Status indicator or small dot */}
                            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/20 group-hover/card:bg-primary transition-colors" />
                          </div>
                       </Link>
                    ))}
                 </div>
              </div>

              {/* Footer Gradient Line */}
              <div className={`h-1.5 w-full bg-gradient-to-r ${category.color} opacity-80`} />
            </motion.div>
          ))}
        </div>
      </section>

      {/* Bottom Spacer */}
      <div className="h-12" />
    </div>
  );
}
