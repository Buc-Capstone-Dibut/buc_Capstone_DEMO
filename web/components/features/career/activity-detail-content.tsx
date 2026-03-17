import { DevEvent } from "@/lib/types/dev-event";
import {
  Sparkles,
  Target,
  CreditCard,
  CalendarClock,
  Gift,
  ExternalLink,
  Users,
  Plus,
  ChevronRight,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { SquadCard } from "@/components/features/community/squad-card";

interface ActivityDetailContentProps {
  event: DevEvent;
  relatedSquads?: any[];
}

export function ActivityDetailContent({ event, relatedSquads = [] }: ActivityDetailContentProps) {
  const hasStructuredData =
    event.summary ||
    (event.target_audience && event.target_audience.length > 0) ||
    (event.schedule && event.schedule.length > 0);

  return (
    <div className="container mx-auto px-4 max-w-5xl py-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Main Content (Left, 2 cols) */}
        <div className="lg:col-span-2 space-y-10">
          {/* 1. Summary Section */}
          {event.summary && (
            <div className="bg-purple-50 dark:bg-purple-900/10 p-6 rounded-2xl border border-purple-100 dark:border-purple-900 mb-8">
              <h3 className="font-bold text-purple-700 dark:text-purple-300 mb-2 flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                행사 요약
              </h3>
              <p className="text-purple-900 dark:text-purple-100 leading-relaxed">
                {event.summary}
              </p>
            </div>
          )}

          {/* 2. Structured Content */}
          {hasStructuredData ? (
            <div className="space-y-12 animate-in fade-in duration-500">
              {/* Target Audience */}
              {event.target_audience &&
                Array.isArray(event.target_audience) &&
                event.target_audience.length > 0 && (
                  <section>
                    <SectionHeader
                      icon={<Target className="w-6 h-6 text-green-500" />}
                      title="참가 대상"
                    />
                    <div className="flex flex-wrap gap-2">
                      {event.target_audience.map((target, idx) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="px-3 py-1.5 text-sm bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-300 border-green-200 dark:border-green-800"
                        >
                          {target}
                        </Badge>
                      ))}
                    </div>
                  </section>
                )}

              {/* Fee */}
              {event.fee && (
                <section>
                  <SectionHeader
                    icon={<CreditCard className="w-6 h-6 text-blue-500" />}
                    title="참가비"
                  />
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 inline-block">
                    <span className="font-semibold text-lg">{event.fee}</span>
                  </div>
                </section>
              )}

              {/* Schedule */}
              {event.schedule &&
                Array.isArray(event.schedule) &&
                event.schedule.length > 0 && (
                  <section>
                    <SectionHeader
                      icon={
                        <CalendarClock className="w-6 h-6 text-orange-500" />
                      }
                      title="주요 일정"
                    />
                    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                        {event.schedule.map((item, idx) => (
                          <li
                            key={idx}
                            className="p-4 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                          >
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center text-xs font-bold mt-0.5">
                              {idx + 1}
                            </span>
                            <span className="text-slate-700 dark:text-slate-300 leading-relaxed">
                              {item}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </section>
                )}

              {/* Benefits */}
              {event.benefits &&
                Array.isArray(event.benefits) &&
                event.benefits.length > 0 && (
                  <section>
                    <SectionHeader
                      icon={<Gift className="w-6 h-6 text-pink-500" />}
                      title="혜택 및 지원"
                    />
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {event.benefits.map((benefit, idx) => (
                        <li
                          key={idx}
                          className="flex items-center gap-2 p-3 bg-pink-50 dark:bg-pink-900/10 rounded-lg text-pink-900 dark:text-pink-100 text-sm"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-pink-500" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
            </div>
          ) : null}

          {/* Legacy/Markdown Content Fallback (Always show if present, maybe below structured data) */}
          {event.content && (
            <section className="pt-8 border-t border-slate-200 dark:border-slate-800">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <span className="text-2xl">📝</span> 상세 내용
              </h3>
              <article
                className="prose prose-lg dark:prose-invert max-w-none 
                 prose-headings:font-bold prose-headings:tracking-tight
                 prose-p:leading-relaxed prose-p:text-slate-600 dark:prose-p:text-slate-300
                 prose-img:rounded-xl prose-img:shadow-lg
               "
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {event.content}
                </ReactMarkdown>
              </article>
            </section>
          )}


          {/* Empty State */}
          {!hasStructuredData && !event.content && (
            <div className="text-center py-20 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
              <p className="text-xl font-medium text-slate-900 dark:text-slate-100 mb-2">
                상세 정보가 없습니다.
              </p>
              <p className="text-muted-foreground mb-6">
                공식 홈페이지에서 자세한 내용을 확인해 주세요.
              </p>
              <Link
                href={event.link}
                target="_blank"
                className="inline-flex items-center px-6 py-3 bg-primary text-white font-bold rounded-full hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
              >
                공식 홈페이지 바로가기 <ExternalLink className="w-4 h-4 ml-2" />
              </Link>
            </div>
          )}
        </div>

        {/* Right Sidebar (Sticky Options) - e.g. Quick Apply, etc. */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-6">
            <div className="p-6 bg-white dark:bg-neutral-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <h4 className="font-bold text-lg mb-4">공식 홈페이지</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                더 자세한 정보와 신청 방법은 공식 홈페이지에서 확인하세요.
              </p>
              <Link
                href={event.link}
                target="_blank"
                className="block w-full text-center py-3 bg-slate-900 dark:bg-white text-white dark:text-black font-bold rounded-xl hover:opacity-90 transition-opacity"
              >
                신청하러 가기
              </Link>
            </div>

            {/* Related Squads Section (Relocated to Sidebar) */}
            <div className="p-6 bg-white dark:bg-neutral-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h4 className="font-bold text-lg">
                  팀원 모집
                </h4>
                <Link
                  href={`/community/squad?activityId=${event.id}`}
                  className="text-xs font-bold text-slate-400 hover:text-primary transition-colors flex items-center gap-1"
                >
                  더보기 <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              {relatedSquads.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {relatedSquads.map((squad) => (
                    <Link
                      key={squad.id}
                      href={`/community/squad/${squad.id}`}
                      className="block py-4 first:pt-0 last:pb-0 group border-b border-slate-100 last:border-0 dark:border-slate-800"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h5 className="text-sm font-semibold mb-1 group-hover:text-primary transition-colors line-clamp-1">
                            {squad.title}
                          </h5>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {squad.recruited_count}/{squad.capacity}
                            </span>
                            <span>·</span>
                            <span>{squad.place_type === "online" ? "온라인" : "오프라인"}</span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary transition-colors flex-shrink-0" />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                  <p className="text-xs text-slate-500 mb-4">아직 모집 중인 팀원이 없습니다.</p>
                  <Link
                    href={`/community/squad/write?activityId=${event.id}&activityTitle=${encodeURIComponent(event.title)}`}
                    className="text-xs font-bold px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors inline-block"
                  >
                    팀원 모집 시작하기
                  </Link>
                </div>
              )}
            </div>

            {/* Tag Cloud */}
            {event.tags && event.tags.length > 0 && (
              <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl">
                <h4 className="font-bold text-sm text-slate-500 mb-4 uppercase tracking-wider">
                  Related Tags
                </h4>
                <div className="flex flex-wrap gap-2">
                  {event.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2.5 py-1 bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-full text-slate-600 dark:text-slate-400"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-3">
      <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
        {icon}
      </div>
      {title}
    </h3>
  );
}
