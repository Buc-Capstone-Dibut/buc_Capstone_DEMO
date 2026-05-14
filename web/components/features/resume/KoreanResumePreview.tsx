"use client";

import { CheckCircle2, Download, FileText, Printer } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { ResumePayload } from "@/app/my/[handle]/profile-types";

export type ResumeA4SectionKey =
  | "summary"
  | "skills"
  | "experience"
  | "projects"
  | "selfIntroduction"
  | "coverLetters";

export type ResumeA4Options = Record<ResumeA4SectionKey, boolean>;

export const DEFAULT_RESUME_A4_OPTIONS: ResumeA4Options = {
  summary: true,
  skills: true,
  experience: true,
  projects: true,
  selfIntroduction: true,
  coverLetters: false,
};

const SECTION_LABELS: Array<{ key: ResumeA4SectionKey; label: string; hint: string }> = [
  { key: "summary", label: "요약", hint: "한 줄 소개" },
  { key: "skills", label: "기술", hint: "스택/역량" },
  { key: "experience", label: "경력", hint: "회사/역할" },
  { key: "projects", label: "프로젝트", hint: "성과/기술" },
  { key: "selfIntroduction", label: "자기소개", hint: "본문" },
  { key: "coverLetters", label: "자소서", hint: "문항/답변" },
];

function cleanLines(value: string | undefined, limit = 4) {
  return (value || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, limit);
}

function firstPresent(...values: Array<string | undefined>) {
  return values.find((value) => value && value.trim())?.trim() || "";
}

function countWords(value: string | undefined) {
  return (value || "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean).length;
}

export function getResumeReadiness(payload: ResumePayload, options: ResumeA4Options) {
  const info = payload.personalInfo;
  const hasContact = Boolean(info.name?.trim() && info.email?.trim() && info.phone?.trim());
  const hasProfile = countWords(firstPresent(info.intro, payload.selfIntroduction)) >= 12;
  const hasSkills = payload.skills.length >= 4;
  const hasExperienceOrProjects = payload.experience.length > 0 || payload.projects.length > 0;
  const projectWithOutcome = payload.projects.some(
    (project) => project.achievements.length > 0 || countWords(project.description) >= 12,
  );
  const hasLink = Boolean(info.links.github || info.links.blog);
  const selectedSectionCount = Object.values(options).filter(Boolean).length;
  const printableTextLength = [
    info.intro,
    payload.selfIntroduction,
    ...payload.experience.map((item) => item.description),
    ...payload.projects.map((item) => item.description),
    ...payload.projects.flatMap((item) => item.achievements),
  ].join(" ").length;

  const items = [
    {
      ok: hasContact,
      label: "기본 연락처",
      detail: hasContact ? "이름, 이메일, 전화번호가 준비됨" : "이름, 이메일, 전화번호를 모두 입력하세요.",
    },
    {
      ok: hasProfile,
      label: "프로필 요약",
      detail: hasProfile ? "첫 화면에서 강점이 보임" : "한 줄 소개나 자기소개에 직무 강점을 2문장 이상 적으세요.",
    },
    {
      ok: hasSkills,
      label: "기술 스택",
      detail: hasSkills ? "핵심 기술이 충분함" : "주요 기술을 최소 4개 이상 추가하세요.",
    },
    {
      ok: hasExperienceOrProjects,
      label: "경험 근거",
      detail: hasExperienceOrProjects ? "경력 또는 프로젝트가 포함됨" : "경력이나 프로젝트 중 하나는 반드시 추가하세요.",
    },
    {
      ok: payload.projects.length === 0 || projectWithOutcome,
      label: "성과 표현",
      detail: projectWithOutcome ? "성과/역할 근거가 있음" : "프로젝트에 주요 성과나 역할 설명을 추가하세요.",
    },
    {
      ok: hasLink,
      label: "검증 링크",
      detail: hasLink ? "GitHub 또는 블로그 링크가 있음" : "GitHub, 블로그, 포트폴리오 링크 중 하나를 권장합니다.",
    },
    {
      ok: selectedSectionCount >= 3,
      label: "문서 구성",
      detail: selectedSectionCount >= 3 ? "A4 섹션 구성이 충분함" : "요약, 기술, 프로젝트/경력 등 최소 3개 섹션을 켜세요.",
    },
    {
      ok: printableTextLength <= 3200,
      label: "분량 밀도",
      detail: printableTextLength <= 3200 ? "A4 출력 분량이 안정적" : "본문이 길어 인쇄 시 과밀할 수 있습니다.",
    },
  ];

  return {
    items,
    score: Math.round((items.filter((item) => item.ok).length / items.length) * 100),
    warnings: items.filter((item) => !item.ok),
  };
}

export function getResumeCompletionItems(payload: ResumePayload) {
  const info = payload.personalInfo;

  return [
    {
      label: "요약",
      ok: countWords(firstPresent(info.intro, payload.selfIntroduction)) >= 12,
    },
    {
      label: "기술",
      ok: payload.skills.length >= 4,
    },
    {
      label: "경력",
      ok: payload.experience.some((item) => item.company.trim() || item.description.trim()),
    },
    {
      label: "프로젝트",
      ok: payload.projects.some((item) => item.name.trim() || item.description.trim()),
    },
  ];
}

function ResumeSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      data-print-section
      className="border-t border-slate-900/80 pt-3"
    >
      <h3
        data-print-title
        className="mb-2 text-[12px] font-black tracking-[0.16em] text-slate-950"
      >
        {title}
      </h3>
      {children}
    </section>
  );
}

/**
 * 이력서 페이지 헤더 — 이름·연락처·헤드라인.
 * PagedResumeDocument 에서는 첫 페이지에만 렌더된다.
 */
export function KoreanResumeHeader({
  payload,
  title,
}: {
  payload: ResumePayload;
  title?: string;
}) {
  const info = payload.personalInfo;
  const name = info.name || "이름";
  const headline = firstPresent(
    info.intro,
    title,
    "지원 직무와 강점을 요약해 주세요.",
  );
  const contactItems = [
    info.email,
    info.phone,
    info.links.github,
    info.links.blog,
  ].filter(Boolean);

  return (
    <header className="border-b-2 border-slate-950 pb-5">
      <div className="flex items-end justify-between gap-8">
        <div>
          <p className="text-[12px] font-black tracking-[0.18em] text-slate-500">
            DEVELOPER RESUME
          </p>
          <h1 className="mt-2 text-[34px] font-black leading-none tracking-normal">
            {name}
          </h1>
        </div>
        <div className="max-w-[320px] break-all text-right text-[11px] font-semibold leading-5 text-slate-600">
          {contactItems.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </div>
      </div>
      <p className="mt-4 text-[14px] font-bold leading-6 text-slate-800">
        {headline}
      </p>
    </header>
  );
}

/**
 * KoreanResumeDocument 의 본문 sections 를 ResumeSection JSX 배열로 빌드한다.
 * PagedResumeDocument 에서 페이지 단위 그룹핑을 위해 각 section 의 height 를
 * 측정하려면 sections 가 명확한 React.ReactNode 배열로 분리되어야 한다.
 */
export function buildResumeSectionNodes(
  payload: ResumePayload,
  options?: ResumeA4Options,
): React.ReactNode[] {
  const sectionOptions = options || DEFAULT_RESUME_A4_OPTIONS;
  const coverLetters = payload.coverLetters ?? [];
  const nodes: React.ReactNode[] = [];

  if (sectionOptions.summary) {
    nodes.push(
      <ResumeSection key="summary" title="PROFILE SUMMARY">
        <p className="whitespace-pre-line text-[12px] font-medium leading-6 text-slate-800">
          {(payload.personalInfo.intro || payload.selfIntroduction || "").trim() ||
            "핵심 역량과 지원 포지션에 맞는 강점을 입력하세요."}
        </p>
      </ResumeSection>,
    );
  }

  if (sectionOptions.skills) {
    nodes.push(
      <ResumeSection key="skills" title="TECHNICAL SKILLS">
        <div className="flex flex-wrap gap-1.5">
          {(payload.skills.length
            ? payload.skills
            : [{ name: "기술 스택", level: "Intermediate" }]
          )
            .slice(0, 24)
            .map((skill, index) => (
              <Badge
                key={`${skill.name}-${index}`}
                variant="outline"
                className="rounded-sm border-slate-300 px-2 py-0.5 text-[10px] font-bold text-slate-800"
              >
                {skill.name}
              </Badge>
            ))}
        </div>
      </ResumeSection>,
    );
  }

  if (sectionOptions.experience) {
    nodes.push(
      <ResumeSection key="experience" title="WORK EXPERIENCE">
        <div className="space-y-4">
          {payload.experience.length ? (
            payload.experience.map((exp, index) => (
              <div
                key={exp.id || index}
                data-print-entry
                className="grid grid-cols-[128px_minmax(0,1fr)] gap-5"
              >
                <div className="text-[11px] font-bold leading-5 text-slate-500">
                  <p>{exp.period || "기간"}</p>
                </div>
                <div>
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <h4 className="text-[13px] font-black text-slate-950">
                      {exp.company || "회사명"}
                    </h4>
                    <p className="text-[11px] font-bold text-slate-500">
                      {exp.position || "직책"}
                    </p>
                  </div>
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] font-medium leading-5 text-slate-700">
                    {(cleanLines(exp.description, 100).length
                      ? cleanLines(exp.description, 100)
                      : ["담당 업무와 성과를 입력하세요."]
                    ).map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))
          ) : (
            <p className="text-[11px] font-medium text-slate-500">
              경력 항목을 추가하세요.
            </p>
          )}
        </div>
      </ResumeSection>,
    );
  }

  if (sectionOptions.projects) {
    nodes.push(
      <ResumeSection key="projects" title="PROJECTS">
        <div className="space-y-4">
          {payload.projects.length ? (
            payload.projects.map((project, index) => (
              <div
                key={project.id || index}
                data-print-entry
                className="grid grid-cols-[128px_minmax(0,1fr)] gap-5"
              >
                <div className="text-[11px] font-bold leading-5 text-slate-500">
                  <p>{project.period || "기간"}</p>
                </div>
                <div>
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <h4 className="text-[13px] font-black text-slate-950">
                      {project.name || "프로젝트명"}
                    </h4>
                    <p className="text-[10px] font-bold text-slate-500">
                      {project.techStack.join(" · ")}
                    </p>
                  </div>
                  <p className="mt-1 whitespace-pre-line text-[11px] font-medium leading-5 text-slate-700">
                    {firstPresent(
                      project.description,
                      project.role,
                      project.solution,
                    ) || "프로젝트 개요와 본인 역할을 입력하세요."}
                  </p>
                  {project.achievements.length ? (
                    <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] font-medium leading-5 text-slate-700">
                      {project.achievements.map((achievement) => (
                        <li key={achievement}>{achievement}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <p className="text-[11px] font-medium text-slate-500">
              프로젝트 항목을 추가하거나 보관함에서 불러오세요.
            </p>
          )}
        </div>
      </ResumeSection>,
    );
  }

  if (sectionOptions.selfIntroduction && payload.selfIntroduction?.trim()) {
    nodes.push(
      <ResumeSection key="selfIntroduction" title="자기소개">
        <p className="whitespace-pre-line text-[11px] font-medium leading-5 text-slate-700">
          {payload.selfIntroduction}
        </p>
      </ResumeSection>,
    );
  }

  if (sectionOptions.coverLetters) {
    nodes.push(
      <ResumeSection key="coverLetters" title="COVER LETTER">
        {coverLetters.length ? (
          <div className="space-y-5">
            {coverLetters.map((letter) => {
              const meta = [letter.company, letter.role]
                .filter(Boolean)
                .join(" · ");
              const hasQuestions = (letter.questions?.length ?? 0) > 0;
              return (
                <div key={letter.id} data-print-entry className="space-y-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <h4 className="text-[12px] font-black text-slate-950">
                      {letter.title || "지원 자기소개서"}
                    </h4>
                    {meta ? (
                      <span className="text-[10px] font-bold text-slate-500">
                        {meta}
                      </span>
                    ) : null}
                  </div>
                  {hasQuestions ? (
                    <div className="space-y-3">
                      {letter.questions!.map((question, index) => {
                        const answer = (question.answer || "").trim();
                        return (
                          <div key={question.id} data-print-entry>
                            <p className="mb-1 text-[11px] font-bold text-slate-950">
                              Q{index + 1}. {question.title || "문항"}
                            </p>
                            {answer ? (
                              <p className="whitespace-pre-line text-[10.5px] leading-5 text-slate-700">
                                {answer}
                              </p>
                            ) : (
                              <p className="text-[10.5px] leading-5 text-slate-400">
                                (답변 미작성)
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="whitespace-pre-line text-[10.5px] leading-5 text-slate-700">
                      {(letter.content || "").trim() || "본문이 비어 있습니다."}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-[11px] font-medium text-slate-500">
            연결된 자기소개서가 없습니다.
          </p>
        )}
      </ResumeSection>,
    );
  }

  return nodes;
}

export function KoreanResumeDocument({
  payload,
  title,
  options,
  documentId,
  className = "",
  style,
}: {
  payload: ResumePayload;
  title?: string;
  options?: ResumeA4Options;
  documentId?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const info = payload.personalInfo;
  const name = info.name || "이름";
  const sections = buildResumeSectionNodes(payload, options);

  return (
    <article
      id={documentId}
      className={`korean-resume-a4-page print-resume bg-white px-11 py-11 text-slate-950 shadow-sm [overflow-wrap:break-word] ${className}`}
      style={style}
    >
      <KoreanResumeHeader payload={payload} title={title} />

      <div className="mt-5 space-y-5">{sections}</div>

      <footer className="mt-8 flex items-center justify-between border-t border-slate-200 pt-3 text-[10px] font-semibold text-slate-400">
        <span>{title || `${name} 이력서`}</span>
        <span className="inline-flex items-center gap-1">
          <Download className="h-3 w-3" />
          A4 PDF Ready
        </span>
      </footer>
    </article>
  );
}

/**
 * 본문을 "고정 규격 A4 페이지" 단위로 분할해서 보여준다.
 *
 * - 각 페이지는 794×1123 의 고정 박스. 한 페이지가 동적으로 늘어나지 않는다.
 * - 본문이 1페이지를 넘으면 새 A4 박스가 아래에 추가되며 위에서 아래로 쌓인다.
 * - 컨테이너 너비에 맞춰 각 페이지가 비례 축소(scale) 된다.
 *
 * 구현:
 *   1) 보이지 않는 측정용 컨테이너에 원본 본문을 한 번 그려 ResizeObserver 로
 *      전체 height 를 잰다.
 *   2) ceil(height / 1123) 개수만큼 표시용 A4 박스를 생성한다.
 *   3) 각 박스 내부에는 동일한 본문을 absolute 로 두고, 자기 페이지에 해당하는
 *      구간만 보이게 `translateY(-pageIndex * 1123px)` 로 끌어올린다.
 *      overflow-hidden 으로 페이지 박스 바깥 콘텐츠는 자동 마스킹.
 */
export function ScaledKoreanResumeDocument({
  payload,
  title,
  options,
  documentId,
  className = "",
  minHeightClass = "min-h-[360px]",
}: {
  payload: ResumePayload;
  title?: string;
  options?: ResumeA4Options;
  documentId?: string;
  className?: string;
  minHeightClass?: string;
}) {
  const measureRef = useRef<HTMLDivElement | null>(null);
  const [pageCount, setPageCount] = useState(1);

  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const update = () => {
      const height = el.scrollHeight;
      const pages = Math.max(1, Math.ceil(height / 1123));
      setPageCount(pages);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [payload, options]);

  return (
    <div
      className={`mx-auto w-full max-w-[794px] [container-type:inline-size] space-y-3 ${className}`}
    >
      {/* 측정용(보이지 않음) — 794px 원본 폭에서 전체 본문을 한 번 그려 height 를 잰다. */}
      <div
        aria-hidden
        className="pointer-events-none invisible h-0 overflow-hidden"
      >
        <div ref={measureRef} className="w-[794px]">
          <KoreanResumeDocument
            payload={payload}
            title={title}
            options={options}
            className="w-full"
          />
        </div>
      </div>

      {/* 표시용 페이지 박스들. 각 박스는 794×1123 의 고정 A4 규격. */}
      {Array.from({ length: pageCount }, (_, i) => (
        <div
          key={i}
          className={`relative overflow-hidden bg-white shadow-sm ${
            i === 0 ? minHeightClass : ""
          }`}
          style={{
            height: `calc(1123px * (100cqw / 794px))`,
          }}
        >
          <div
            id={i === 0 ? documentId : undefined}
            className="absolute left-0 top-0 w-[794px] origin-top-left"
            style={{
              // scale 먼저 적용 → 그 뒤 translate. 결과적으로 i 번째 페이지의 본문만 박스에 보인다.
              transform: `scale(calc(100cqw / 794px)) translateY(-${
                i * 1123
              }px)`,
            }}
          >
            <KoreanResumeDocument
              payload={payload}
              title={title}
              options={options}
              className="w-full"
            />
          </div>
          {/* 페이지 번호 표시 (페이지가 2개 이상일 때만) */}
          {pageCount > 1 && (
            <span
              data-print-helper
              className="pointer-events-none absolute bottom-2 right-3 rounded-full bg-slate-900/70 px-2 py-0.5 text-[10px] font-bold text-white tabular-nums"
            >
              {i + 1} / {pageCount}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * HTML 기반 미리보기 — KoreanResumeDocument 를 컨테이너 폭에 맞게 그대로 보여준다.
 *
 * 본문이 길어지면 동적으로 카드가 함께 늘어나며, 페이지 단위 분할은 측정 기반으로
 * 추가될 예정이다. 현재는 단일 카드(높이 auto) + 인쇄 시 print CSS 의
 * `break-inside: avoid` / `break-after: avoid` 가 페이지 break 자연 분기를 담당한다.
 *
 * PDFViewer(react-pdf) 미리보기 경로는 무거워 사용성을 해쳐 제거했으며, 다운로드는
 * 별도 `ResumePdfDownloadButton` 으로 분리되어 있다.
 */
function PagedResumePreview({
  payload,
  title,
  options,
  documentId,
}: {
  payload: ResumePayload;
  title?: string;
  options?: ResumeA4Options;
  documentId?: string;
}) {
  return (
    <div className="mx-auto w-full max-w-[794px]">
      <KoreanResumeDocument
        payload={payload}
        title={title}
        options={options}
        documentId={documentId}
        className="w-full"
      />
    </div>
  );
}

export function KoreanResumePreview({
  payload,
  title,
  options,
  onOptionsChange,
  formOpen,
  onToggleForm,
}: {
  payload: ResumePayload;
  title?: string;
  options: ResumeA4Options;
  onOptionsChange: (options: ResumeA4Options) => void;
  formOpen?: boolean;
  onToggleForm?: () => void;
}) {
  const completionItems = getResumeCompletionItems(payload);

  return (
    <aside className="space-y-3">
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }

          body * {
            visibility: hidden;
          }

          #korean-resume-print,
          #korean-resume-print * {
            visibility: visible;
          }

          #korean-resume-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 210mm;
            background: white;
          }

          .korean-resume-a4-page {
            width: 210mm !important;
            min-height: 297mm !important;
            height: auto !important;
            margin: 0 !important;
            padding: 15mm !important;
            box-shadow: none !important;
            border: 0 !important;
            border-radius: 0 !important;
            transform: none !important;
          }

          .korean-resume-scale-frame {
            height: auto !important;
            overflow: visible !important;
          }
        }
      `}</style>

      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex items-start gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-950 text-white">
            <FileText className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-black text-slate-950">한국식 A4 이력서</h2>
              {onToggleForm ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-7 shrink-0 rounded-md px-2 text-[11px] font-black"
                  onClick={onToggleForm}
                >
                  {formOpen ? "입력폼 접기" : "입력폼 열기"}
                </Button>
              ) : null}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {completionItems.map((item) => (
                <span
                  key={item.label}
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black ${
                    item.ok
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-slate-50 text-slate-400"
                  }`}
                >
                  {item.ok ? <CheckCircle2 className="h-3 w-3" /> : null}
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {SECTION_LABELS.map((section) => (
            <label
              key={section.key}
              className="flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5"
            >
              <Checkbox
                checked={options[section.key]}
                onCheckedChange={(checked) =>
                  onOptionsChange({ ...options, [section.key]: checked === true })
                }
                className="h-3.5 w-3.5"
              />
              <span className="min-w-0">
                <span className="block text-xs font-black text-slate-800">{section.label}</span>
              </span>
            </label>
          ))}
        </div>

        <Button
          type="button"
          className="mt-3 h-9 w-full gap-2"
          onClick={() => window.print()}
        >
          <Printer className="h-4 w-4" />
          PDF로 저장 / 인쇄
        </Button>
      </div>

      {/* HTML 미리보기 — 측정 기반 페이지 분할로 페이지 경계에서 블록(섹션/entry)이
          자연스럽게 다음 페이지로 넘어간다. PDF 다운로드는 별도 react-pdf 경로. */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100 p-3">
        <PagedResumePreview
          payload={payload}
          title={title}
          options={options}
          documentId="korean-resume-print"
        />
      </div>
    </aside>
  );
}
