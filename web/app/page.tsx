"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { BookOpen, Calendar, Map } from "lucide-react"; // Assuming these icons are available or need to be added. Adding them for syntactic correctness.

const coreServices = [
  {
    id: 'insight',
    title: '인사이트', // Keep the main title for the card
    desc: '최신 기술 트렌드와 기술 블로그, 대외활동 정보를 통해 깊이 있는 인사이트를 얻습니다.', // Keep the main description for the card
    link: '/insights/tech-blog', // Change the main link to tech-blog as per instruction
    comingSoon: false,
    // The following items are likely intended for an 'insight' landing page,
    // but for the 'coreServices' array, we'll keep the top-level structure.
    // If the intention was to embed these directly, the structure of coreServices
    // would need to change significantly (e.g., `subServices: [...]`).
    // For now, we'll assume the instruction refers to the content *related* to insight,
    // and the main card link is the primary change here.
    // The instruction's code snippet seems to be a partial replacement or
    // a misunderstanding of the current structure.
    // I'm interpreting "인사이트 랜딩 페이지의 항목 순서를 기술 블로그, 대외활동, CTP 순으로 재배치합니다"
    // as a separate instruction for a different file or a conceptual change,
    // while the `coreServices` array itself should maintain its top-level service structure.
    // The provided code snippet for the change is syntactically incorrect if directly inserted.
    // I will apply the link change and keep the existing structure.
    // If the user intended to embed these as sub-items, the structure would need to be:
    // id: 'insight',
    // title: '인사이트',
    // desc: '...',
    // link: '/insights/tech-blog',
    // subItems: [
    //   { title: "기술 블로그", description: "...", href: "/insights/tech-blog", icon: <BookOpen />, },
    //   { title: "대외활동", description: "...", href: "/insights/activities", icon: <Calendar />, },
    //   { title: "CTP (Coding Test Prep)", description: "...", href: "/insights/ctp", icon: <Map />, isComingSoon: true, },
    // ]
    // However, the instruction's snippet doesn't show `subItems` key.
    // Given the prompt "return the full contents of the new code document after the change"
    // and "Make sure to incorporate the change in a way so that the resulting file is syntactically correct",
    // I will only apply the link change for the 'insight' service card, as the provided snippet
    // for the 'insight' object itself is not syntactically valid for direct replacement.
    // The instruction also mentions "메인 페이지의 서비스 카드 링크를 기술 블로그로 변경하고", which is clear.
    // The second part "인사이트 랜딩 페이지의 항목 순서를 기술 블로그, 대외활동, CTP 순으로 재배치합니다"
    // refers to content *within* the insight section, not the `coreServices` array structure itself.
  },
  {
    id: 'community',
    title: '커뮤니티',
    desc: '동료들과 정보를 공유하고 목표가 같은 팀원을 찾아보세요.',
    link: '/community',
    comingSoon: false,
  },
  {
    id: 'workspace',
    title: '워크스페이스',
    desc: '결성된 팀이 효율적으로 협업하고 프로젝트를 완성하는 전용 공간을 제공합니다.',
    link: '/workspace',
    comingSoon: false,
  },
  {
    id: 'interview',
    title: 'AI 면접',
    desc: '실전 같은 연습과 맞춤형 피드백을 통해 면접에 완벽히 대비하세요.',
    link: '/interview',
    comingSoon: false,
  },
];

export default function HomePage() {
  const { isAuthenticated } = useAuth({ loadProfile: false });

  return (
    <div className="text-neutral-900 overflow-hidden bg-white min-h-screen">
      {/* Hero Section */}
      <section className="relative flex min-h-[90vh] flex-col items-center justify-center px-5 text-center bg-white">
        <div className="max-w-4xl animate-fade-in">

          <h1 className="text-[clamp(2.5rem,8vw,5.5rem)] font-black leading-[1.05] tracking-tight text-neutral-900 animate-fade-in-up animation-delay-100">
            취준부터
            <br />
            <span className="text-primary">팀 빌딩</span>까지 한번에.
          </h1>

          <p className="mt-8 text-[clamp(1rem,2.5vw,1.25rem)] leading-relaxed text-neutral-500 max-w-2xl mx-auto animate-fade-in-up animation-delay-200">
            Dibut은 학습, 커리어 탐색, 활발한 커뮤니티와 팀 협업, 그리고 면접 대비까지
            개발자의 모든 성장 과정을 지원하는 통합 플랫폼입니다.
          </p>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-4 animate-fade-in-up animation-delay-300">
            <Link
              href={isAuthenticated ? '/interview' : '/auth/signup'}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4 text-[15px] font-bold text-white hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 hover:scale-105 active:scale-95"
            >
              지금 무료로 시작하기
            </Link>
            <Link
              href="/insights/tech-blog"
              className="inline-flex items-center rounded-full border border-neutral-200 bg-white px-8 py-4 text-[15px] font-semibold text-neutral-600 hover:bg-neutral-50 transition-all hover:scale-105 active:scale-95"
            >
              서비스 둘러보기
            </Link>
          </div>
        </div>

        {/* Floating Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-25 animate-fade-in animation-delay-500">
          <span className="h-10 w-px bg-gradient-to-b from-primary to-transparent animate-bounce" />
        </div>
      </section>

      {/* Service Overview Grid */}
      <section className="px-5 py-32 bg-white">
        <div className="mx-auto max-w-6xl">
          <div className="mb-24 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-xl">
              <span className="text-[12px] font-bold uppercase tracking-widest text-primary mb-4 block animate-fade-in">
                Our Core Values
              </span>
              <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tight leading-[1.1] animate-fade-in-up">
                개발자의 성장이 일어나는 <br />
                <span className="text-primary">4가지</span> 기록의 조각들
              </h2>
            </div>
            <p className="text-neutral-500 text-[16px] max-w-sm animate-fade-in animation-delay-200">
              어색한 장식을 걷어내고, 오직 당신의 성장에만 집중할 수 있는 본질적인 기능들을 담았습니다.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-neutral-100 border border-neutral-100 overflow-hidden rounded-[2rem]">
            {coreServices.map((service, i) => (
              <div
                key={service.id}
                className={`group relative bg-white p-10 flex flex-col min-h-[400px] transition-colors hover:bg-neutral-50 animate-fade-in animation-delay-${(i + 1) * 100}`}
              >
                <div className="mb-auto">
                  <span className="block text-[14px] font-mono text-neutral-300 mb-6 group-hover:text-primary transition-colors">
                    0{i + 1}
                  </span>
                  <h3 className="mb-6 text-[24px] font-bold tracking-tight text-neutral-900 leading-tight">
                    {service.title}
                  </h3>
                  <p className="text-[14px] leading-relaxed text-neutral-500 font-medium">
                    {service.desc}
                  </p>
                </div>

                <div className="mt-12">
                  <Link
                    href={service.link}
                    className="inline-flex items-center text-[13px] font-bold transition-all text-neutral-400 group-hover:text-neutral-900"
                  >
                    EXPLORE
                    <svg className="ml-2 h-3 w-3 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </Link>
                </div>

                <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-primary transition-all duration-500 group-hover:w-full" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Focus: Career */}
      <section className="py-32 px-5 bg-neutral-50 overflow-hidden">
        <div className="mx-auto max-w-6xl grid lg:grid-cols-2 gap-20 items-center">
          <div className="order-1 relative animate-fade-in">
            <div className="relative z-10 grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="rounded-2xl bg-white p-6 shadow-xl shadow-primary/5 border border-primary/20">
                  <div className="mb-3 h-2 w-12 rounded bg-primary/20" />
                  <div className="mb-2 h-3 w-full rounded bg-neutral-100" />
                  <div className="h-3 w-2/3 rounded bg-neutral-50" />
                </div>
                <div className="rounded-2xl bg-primary p-6 shadow-xl shadow-primary/20 text-white animate-bounce-subtle">
                  <div className="mb-3 font-bold text-[18px]">Hackathon D-7</div>
                  <div className="text-[12px] opacity-90 font-medium">성장 가속화를 위한 챌린지</div>
                </div>
              </div>
              <div className="pt-8 space-y-4">
                <div className="rounded-2xl bg-white p-6 shadow-xl shadow-primary/5 border border-primary/20">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-neutral-100" />
                    <div className="h-2 w-16 rounded bg-neutral-100" />
                  </div>
                  <div className="h-3 w-full rounded bg-neutral-50" />
                </div>
                <div className="rounded-2xl bg-neutral-900 p-6 shadow-2xl text-white">
                  <div className="text-[12px] text-primary font-bold mb-1">NEW OPPORTUNITY</div>
                  <div className="text-[14px]">공모전 리스트 확인</div>
                </div>
              </div>
            </div>
            <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[120%] w-[120%] bg-primary/10 blur-[100px] rounded-full" />
          </div>

          <div className="order-2 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-1 text-[13px] font-bold text-primary mb-6">
              Opportunity Hub
            </div>
            <h2 className="text-[clamp(2rem,5vw,3rem)] font-black leading-tight text-neutral-900 mb-8">
              성장의 기회를 <br />
              한 곳에서 <span className="text-primary">탐색</span>하세요
            </h2>
            <p className="text-[18px] leading-relaxed text-neutral-500 mb-10">
              해커톤 참가부터 공모전 팀 빌딩, 실시간 채용 공고까지.
              개발자에게 필요한 모든 커리어 기회들을 Dibut이 엄선하여 제공합니다.
              나의 가능성을 증명할 다음 무대를 찾아보세요.
            </p>
            <Link
              href="/insights/activities"
              className="inline-flex items-center rounded-xl bg-primary px-8 py-4 text-[15px] font-bold text-white hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            >
              기회 찾아보기
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Focus: CTP (Insight) */}
      <section className="py-32 px-5 bg-white">
        <div className="mx-auto max-w-6xl grid lg:grid-cols-2 gap-20 items-center">
          <div className="animate-fade-in-up">
            <div className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-1 text-[13px] font-bold text-primary mb-6">
              Study with Visualization
            </div>
            <h2 className="text-[clamp(2rem,5vw,3rem)] font-black leading-tight text-neutral-900 mb-8">
              코드를 눈으로 보고 <br className="hidden md:block" />
              <span className="text-primary">인사이트</span>를 얻으세요
            </h2>
            <p className="text-[18px] leading-relaxed text-neutral-500 mb-10">
              단순히 텍스트를 읽는 것을 넘어, CTP(Code Trace Player)를 통해
              프로그램의 흐름을 시각적으로 파악할 수 있습니다.
              복잡한 알고리즘과 로직이 한눈에 들어오는 경험을 해보세요.
            </p>
            <Link
              href="/insights/tech-blog"
              className="inline-flex items-center rounded-xl bg-primary px-8 py-4 text-[15px] font-bold text-white hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            >
              CTP 경험해보기
            </Link>
          </div>

          <div className="relative animate-fade-in animation-delay-300">
            <div className="aspect-video rounded-3xl bg-neutral-900 shadow-2xl overflow-hidden border border-neutral-800">
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-500/50" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500/50" />
                  <div className="h-3 w-3 rounded-full bg-green-500/50" />
                </div>
              </div>
              <div className="p-8 font-mono text-[13px] text-white/60 space-y-2">
                <div className="flex gap-4"><span className="text-white/20">01</span><span className="text-primary/70">function</span> <span className="text-yellow-400">DibutSuccess</span>() {'{'}</div>
                <div className="flex gap-4 animate-pulse bg-primary/10"><span className="text-white/20">02</span>  <span className="text-primary/70">const</span> status = <span className="text-green-400">'GROWING'</span>;</div>
                <div className="flex gap-4"><span className="text-white/20">03</span>  <span className="text-primary/70">return</span> <span className="text-yellow-400">learnAndBuild</span>(status);</div>
                <div className="flex gap-4"><span className="text-white/20">04</span> {'}'}</div>
              </div>
            </div>
            <div className="absolute -z-10 -top-10 -right-10 h-60 w-60 bg-primary/20 blur-[100px] rounded-full" />
          </div>
        </div>
      </section>

      {/* Feature Focus: Workspace */}
      <section className="py-32 px-5 bg-neutral-50 overflow-hidden">
        <div className="mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div className="relative animate-fade-in">
              <div className="grid grid-cols-2 gap-4">
                <div className="h-40 rounded-2xl bg-white shadow-lg border border-primary/10 p-6 animate-bounce-subtle">
                  <div className="h-2 w-12 bg-primary/10 rounded mb-4" />
                  <div className="space-y-2">
                    <div className="h-2 w-full bg-neutral-100 rounded" />
                    <div className="h-2 w-2/3 bg-neutral-100 rounded" />
                  </div>
                </div>
                <div className="h-40 translate-y-12 rounded-2xl bg-white shadow-xl border border-primary/10 p-6 animate-bounce-subtle animation-delay-500">
                  <div className="flex -space-x-2 mb-4">
                    <div className="h-6 w-6 rounded-full bg-primary" />
                    <div className="h-6 w-6 rounded-full bg-primary/60" />
                    <div className="h-6 w-6 rounded-full bg-primary/20" />
                  </div>
                </div>
              </div>
              <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[120%] w-[120%] bg-primary/10 blur-[80px] rounded-full" />
            </div>

            <div className="animate-fade-in-up">
              <div className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-1 text-[13px] font-bold text-primary mb-6">
                Connected Workspace
              </div>
              <h2 className="text-[clamp(2rem,5vw,3rem)] font-black leading-tight text-neutral-900 mb-8">
                커뮤니티에서 시작해 <br />
                <span className="text-primary">워크스페이스</span>까지
              </h2>
              <p className="text-[18px] leading-relaxed text-neutral-500 mb-10">
                목표가 같은 동료를 찾는 것에서 그치지 마세요.
                Dibut은 커뮤니티에서 모집한 팀원과 즉시 협업할 수 있는
                최적의 환경을 제공합니다.
              </p>
              <Link
                href="/community"
                className="inline-flex items-center rounded-xl bg-primary px-8 py-4 text-[15px] font-bold text-white hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
              >
                함께할 동료 찾기
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Focus: AI Interview */}
      <section className="py-32 px-5 bg-white overflow-hidden">
        <div className="mx-auto max-w-6xl grid lg:grid-cols-2 gap-20 items-center">
          <div className="animate-fade-in-up">
            <div className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-1 text-[13px] font-bold text-primary mb-6">
              AI-Powered Career Prep
            </div>
            <h2 className="text-[clamp(2rem,5vw,3rem)] font-black leading-tight text-neutral-900 mb-8">
              AI 전문가가 분석한 <br />
              당신의 <span className="text-primary">실전 면접</span> 역량
            </h2>
            <p className="text-[18px] leading-relaxed text-neutral-500 mb-10">
              실전 같은 AI 모의 면접을 통해 긴장감을 풀고, 구체적인 데이터 기반 피드백으로 강점과 보완점을 완벽히 파악하세요. 질문의 의도 파악부터 답변의 논리성까지 세밀하게 분석해 드립니다.
            </p>
            <Link
              href="/interview"
              className="inline-flex items-center rounded-xl bg-primary px-8 py-4 text-[15px] font-bold text-white hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            >
              AI 면접 시작하기
            </Link>
          </div>

          <div className="relative animate-fade-in animation-delay-300">
            <div className="rounded-3xl bg-white shadow-2xl border border-neutral-100 p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-[14px] font-bold text-neutral-400 uppercase tracking-wider">Overall Score</div>
                  <div className="text-[48px] font-black text-primary leading-none">88<span className="text-[24px]">/100</span></div>
                </div>
                <div className="h-20 w-20 rounded-full border-4 border-primary/20 flex items-center justify-center relative">
                  <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin-slow" />
                  <span className="text-primary font-bold text-[20px]">A</span>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { label: "논리적 답변 구성", score: 92, color: "bg-primary" },
                  { label: "직무 지식 이해도", score: 78, color: "bg-blue-500" },
                  { label: "의사소통 태도", score: 85, color: "bg-purple-500" },
                ].map((skill, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex justify-between text-[13px] font-bold">
                      <span className="text-neutral-600">{skill.label}</span>
                      <span className="text-neutral-900">{skill.score}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden">
                      <div className={`h-full ${skill.color} rounded-full`} style={{ width: `${skill.score}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-neutral-100">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  </div>
                  <span className="text-[14px] font-bold text-neutral-800">AI Expert Feedback</span>
                </div>
                <p className="text-[13px] text-neutral-500 leading-relaxed italic">
                  "답변의 구조는 매우 체계적이나, 복잡한 로직 설명 시 비유를 더 활용한다면 면접관에게 훨씬 직관적인 깊이를 전달할 수 있습니다."
                </p>
              </div>
            </div>
            <div className="absolute -z-10 -bottom-10 -left-10 h-64 w-64 bg-primary/10 blur-[100px] rounded-full" />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-5 py-32 bg-primary relative overflow-hidden text-center">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/20 blur-[120px] rounded-full pointer-events-none animate-pulse" />

        <div className="mx-auto max-w-3xl relative z-10 animate-fade-in-up">
          <h2 className="text-[clamp(2rem,6vw,4rem)] font-black tracking-tight text-white mb-8">
            성장의 모든 과정, <br />
            지금 디벗에서 시작하세요.
          </h2>
          <Link
            href="/auth/signup"
            className="inline-block rounded-full bg-white px-10 py-5 text-[16px] font-black text-primary hover:bg-neutral-50 transition-all shadow-2xl hover:scale-105 active:scale-95"
          >
            무료로 가입하고 시작하기
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-100 px-5 py-12 bg-white">
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-left">
            <span className="text-[20px] font-black tracking-tight text-neutral-900">Dibut</span>
            <p className="mt-2 text-[13px] text-neutral-400">개발자 성장 통합 플랫폼</p>
          </div>
          <div className="flex gap-8 text-[14px] font-medium text-neutral-500">
            <Link href="/insights/tech-blog" className="hover:text-primary transition-colors">인사이트</Link>
            <Link href="/insights/activities" className="hover:text-primary transition-colors">대외활동</Link>
            <Link href="/community" className="hover:text-primary transition-colors">커뮤니티</Link>
            <Link href="/workspace" className="hover:text-primary transition-colors">워크스페이스</Link>
            <Link href="/interview" className="hover:text-primary transition-colors">AI 면접</Link>
          </div>
          <p className="text-[12px] text-neutral-300">© 2026 Dibut. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
