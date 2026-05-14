"use client";

/**
 * 이력서 데이터(`resume_payload`)를 한국식 폼/표 톤으로 미리보기 렌더링한다.
 * 면접 셋업의 "내 이력서" 탭에서 선택된 항목을 표시하는 우측 패널.
 */
type Link = { label?: string; url?: string };
type PersonalInfo = {
  name?: string;
  email?: string;
  phone?: string;
  intro?: string;
  links?: Link[];
};
type Education = {
  school?: string;
  major?: string;
  period?: string;
  degree?: string;
};
type Experience = {
  company?: string;
  position?: string;
  period?: string;
  description?: string;
  achievements?: string[];
};
type Project = {
  name?: string;
  period?: string;
  description?: string;
  techStack?: string[];
  achievements?: string[];
};
type Skill = { name?: string; category?: string; level?: string };

export interface ResumePayloadShape {
  personalInfo?: PersonalInfo;
  education?: Education[];
  experience?: Experience[];
  projects?: Project[];
  skills?: Skill[];
}

export function ResumePreviewPanel({
  payload,
  title,
  updatedAt,
}: {
  payload: ResumePayloadShape;
  title?: string;
  updatedAt?: string;
}) {
  const pi = payload.personalInfo ?? {};
  const hasAny =
    !!pi.name ||
    !!pi.intro ||
    (payload.experience?.length ?? 0) > 0 ||
    (payload.projects?.length ?? 0) > 0 ||
    (payload.education?.length ?? 0) > 0 ||
    (payload.skills?.length ?? 0) > 0;

  if (!hasAny) {
    return (
      <div className="flex h-full items-center justify-center rounded-md border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
        선택된 이력서에 내용이 없습니다.
      </div>
    );
  }

  return (
    <article className="rounded-md border bg-background">
      <header className="border-b bg-muted/40 px-4 py-3">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="truncate text-sm font-semibold">{pi.name || title || "이력서"}</h3>
          {updatedAt && (
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {new Date(updatedAt).toLocaleDateString("ko-KR")}
            </span>
          )}
        </div>
        {(pi.email || pi.phone) && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {[pi.email, pi.phone].filter(Boolean).join(" · ")}
          </p>
        )}
        {pi.intro && (
          <p className="mt-2 line-clamp-3 whitespace-pre-line text-xs leading-relaxed text-foreground/80">
            {pi.intro}
          </p>
        )}
      </header>

      <div className="divide-y">
        {payload.experience?.length ? (
          <Section title="경력">
            <ul className="space-y-2.5">
              {payload.experience.map((e, i) => (
                <li key={i}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-xs font-semibold">
                      {[e.company, e.position].filter(Boolean).join(" · ")}
                    </span>
                    {e.period && (
                      <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                        {e.period}
                      </span>
                    )}
                  </div>
                  {e.description && (
                    <p className="mt-0.5 whitespace-pre-line text-[11.5px] leading-relaxed text-foreground/80">
                      {e.description}
                    </p>
                  )}
                  {e.achievements && e.achievements.length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {e.achievements.map((a, j) => (
                        <li
                          key={j}
                          className="flex gap-1.5 text-[11.5px] leading-relaxed text-foreground/80"
                        >
                          <span aria-hidden className="mt-2 inline-block h-0.5 w-0.5 shrink-0 rounded-full bg-muted-foreground" />
                          <span>{a}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {payload.projects?.length ? (
          <Section title="프로젝트">
            <ul className="space-y-2.5">
              {payload.projects.map((p, i) => (
                <li key={i}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-xs font-semibold">{p.name}</span>
                    {p.period && (
                      <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                        {p.period}
                      </span>
                    )}
                  </div>
                  {p.description && (
                    <p className="mt-0.5 whitespace-pre-line text-[11.5px] leading-relaxed text-foreground/80">
                      {p.description}
                    </p>
                  )}
                  {p.techStack && p.techStack.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {p.techStack.slice(0, 6).map((t) => (
                        <span
                          key={t}
                          className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] text-foreground/70"
                        >
                          {t}
                        </span>
                      ))}
                      {p.techStack.length > 6 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{p.techStack.length - 6}
                        </span>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {payload.education?.length ? (
          <Section title="학력">
            <ul className="space-y-1.5">
              {payload.education.map((e, i) => (
                <li
                  key={i}
                  className="flex items-baseline justify-between gap-2 text-xs"
                >
                  <span className="truncate text-foreground">
                    {[e.school, e.major].filter(Boolean).join(" · ")}
                    {e.degree && <span className="text-muted-foreground"> ({e.degree})</span>}
                  </span>
                  {e.period && (
                    <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                      {e.period}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {payload.skills?.length ? (
          <Section title="기술">
            <div className="flex flex-wrap gap-1">
              {payload.skills.map((s, i) => (
                <span
                  key={i}
                  className="rounded-sm bg-muted px-1.5 py-0.5 text-[11px] text-foreground/80"
                >
                  {s.name}
                  {s.level ? ` · ${s.level}` : ""}
                </span>
              ))}
            </div>
          </Section>
        ) : null}
      </div>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="px-4 py-3">
      <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h4>
      {children}
    </section>
  );
}
