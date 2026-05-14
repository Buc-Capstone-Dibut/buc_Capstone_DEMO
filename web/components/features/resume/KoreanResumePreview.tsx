"use client";

import { CheckCircle2, Download, FileText, Printer } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
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

function compactText(value: string | undefined, maxLength = 220) {
  const text = (value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}...`;
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
    <section className="border-t border-slate-900/80 pt-3">
      <h3 className="mb-2 text-[12px] font-black tracking-[0.16em] text-slate-950">{title}</h3>
      {children}
    </section>
  );
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
  const sectionOptions = options || DEFAULT_RESUME_A4_OPTIONS;
  const info = payload.personalInfo;
  const name = info.name || "이름";
  const headline = firstPresent(info.intro, title, "지원 직무와 강점을 요약해 주세요.");
  const latestCoverLetter = payload.coverLetters?.[0];
  const contactItems = [
    info.email,
    info.phone,
    info.links.github,
    info.links.blog,
  ].filter(Boolean);

  return (
    <article
      id={documentId}
      className={`korean-resume-a4-page bg-white px-11 py-11 text-slate-950 shadow-sm [word-break:keep-all] ${className}`}
      style={style}
    >
      <header className="border-b-2 border-slate-950 pb-5">
        <div className="flex items-end justify-between gap-8">
          <div>
            <p className="text-[12px] font-black tracking-[0.18em] text-slate-500">DEVELOPER RESUME</p>
            <h1 className="mt-2 text-[34px] font-black leading-none tracking-normal">{name}</h1>
          </div>
          <div className="max-w-[320px] break-all text-right text-[11px] font-semibold leading-5 text-slate-600">
            {contactItems.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        </div>
        <p className="mt-4 text-[14px] font-bold leading-6 text-slate-800">{headline}</p>
      </header>

      <div className="mt-5 space-y-5">
        {sectionOptions.summary ? (
          <ResumeSection title="PROFILE SUMMARY">
            <p className="text-[12px] font-medium leading-6 text-slate-800">
              {compactText(info.intro || payload.selfIntroduction, 260) || "핵심 역량과 지원 포지션에 맞는 강점을 입력하세요."}
            </p>
          </ResumeSection>
        ) : null}

        {sectionOptions.skills ? (
          <ResumeSection title="TECHNICAL SKILLS">
            <div className="flex flex-wrap gap-1.5">
              {(payload.skills.length ? payload.skills : [{ name: "기술 스택", level: "Intermediate" }]).slice(0, 24).map((skill, index) => (
                <Badge key={`${skill.name}-${index}`} variant="outline" className="rounded-sm border-slate-300 px-2 py-0.5 text-[10px] font-bold text-slate-800">
                  {skill.name}
                </Badge>
              ))}
            </div>
          </ResumeSection>
        ) : null}

        {sectionOptions.experience ? (
          <ResumeSection title="WORK EXPERIENCE">
            <div className="space-y-4">
              {payload.experience.length ? payload.experience.slice(0, 4).map((exp, index) => (
                <div key={exp.id || index} className="grid grid-cols-[128px_minmax(0,1fr)] gap-5">
                  <div className="text-[11px] font-bold leading-5 text-slate-500">
                    <p>{exp.period || "기간"}</p>
                  </div>
                  <div>
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <h4 className="text-[13px] font-black text-slate-950">{exp.company || "회사명"}</h4>
                      <p className="text-[11px] font-bold text-slate-500">{exp.position || "직책"}</p>
                    </div>
                    <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] font-medium leading-5 text-slate-700">
                      {(cleanLines(exp.description, 3).length ? cleanLines(exp.description, 3) : ["담당 업무와 성과를 입력하세요."]).map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )) : (
                <p className="text-[11px] font-medium text-slate-500">경력 항목을 추가하세요.</p>
              )}
            </div>
          </ResumeSection>
        ) : null}

        {sectionOptions.projects ? (
          <ResumeSection title="PROJECTS">
            <div className="space-y-4">
              {payload.projects.length ? payload.projects.slice(0, 5).map((project, index) => (
                <div key={project.id || index} className="grid grid-cols-[128px_minmax(0,1fr)] gap-5">
                  <div className="text-[11px] font-bold leading-5 text-slate-500">
                    <p>{project.period || "기간"}</p>
                  </div>
                  <div>
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <h4 className="text-[13px] font-black text-slate-950">{project.name || "프로젝트명"}</h4>
                      <p className="text-[10px] font-bold text-slate-500">{project.techStack.slice(0, 6).join(" · ")}</p>
                    </div>
                    <p className="mt-1 text-[11px] font-medium leading-5 text-slate-700">
                      {compactText(firstPresent(project.description, project.role, project.solution), 190) || "프로젝트 개요와 본인 역할을 입력하세요."}
                    </p>
                    {project.achievements.length ? (
                      <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] font-medium leading-5 text-slate-700">
                        {project.achievements.slice(0, 3).map((achievement) => (
                          <li key={achievement}>{achievement}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>
              )) : (
                <p className="text-[11px] font-medium text-slate-500">프로젝트 항목을 추가하거나 보관함에서 불러오세요.</p>
              )}
            </div>
          </ResumeSection>
        ) : null}

        {sectionOptions.selfIntroduction && payload.selfIntroduction?.trim() ? (
          <ResumeSection title="자기소개">
            <p className="whitespace-pre-line text-[11px] font-medium leading-5 text-slate-700">
              {compactText(payload.selfIntroduction, 520)}
            </p>
          </ResumeSection>
        ) : null}

        {sectionOptions.coverLetters ? (
          <ResumeSection title="COVER LETTER">
            {latestCoverLetter ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <h4 className="text-[12px] font-black text-slate-950">{latestCoverLetter.title}</h4>
                  <span className="text-[10px] font-bold text-slate-500">
                    {[latestCoverLetter.company, latestCoverLetter.role].filter(Boolean).join(" · ")}
                  </span>
                </div>
                {latestCoverLetter.questions?.length ? (
                  latestCoverLetter.questions.slice(0, 2).map((question) => (
                    <div key={question.id}>
                      <p className="text-[11px] font-black text-slate-800">{question.title}</p>
                      <p className="mt-1 whitespace-pre-line text-[11px] font-medium leading-5 text-slate-700">
                        {compactText(question.answer, 260) || "답변을 입력하세요."}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="whitespace-pre-line text-[11px] font-medium leading-5 text-slate-700">
                    {compactText(latestCoverLetter.content, 360)}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-[11px] font-medium text-slate-500">연결된 자기소개서가 없습니다.</p>
            )}
          </ResumeSection>
        ) : null}
      </div>

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
  return (
    <div className={`mx-auto w-full max-w-[794px] [container-type:inline-size] ${className}`}>
      <div className={`relative h-[calc(1123px*(100cqw/794px))] overflow-hidden ${minHeightClass}`}>
        <KoreanResumeDocument
          payload={payload}
          title={title}
          options={options}
          documentId={documentId}
          className="absolute left-0 top-0 h-[1123px] min-h-[1123px] w-[794px] origin-top-left"
          style={{ transform: "scale(calc(100cqw / 794px))" }}
        />
      </div>
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

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100 p-3">
        <ScaledKoreanResumeDocument
          payload={payload}
          title={title}
          options={options}
          documentId="korean-resume-print"
          className="korean-resume-scale-frame"
        />
      </div>
    </aside>
  );
}
