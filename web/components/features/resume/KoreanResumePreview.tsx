"use client";

import { CheckCircle2, ChevronLeft, ChevronRight, Download, FileText } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { ResumePayload } from "@/app/my/[handle]/profile-types";
import { groupSkillsByCategory } from "@/lib/interview/tech-categories";
import { getTechLogo } from "@/lib/interview/tech-logos";
import { ResumePdfDownloadButton } from "@/components/features/resume/resume-pdf-download-button";

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

function splitParagraphs(value: string | undefined): string[] {
  // 빈 줄(\n\n) 기준으로 문단을 분리. 빈 줄이 없으면 단일 문단으로 반환.
  if (!value) return [];
  const paragraphs = value
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  return paragraphs.length > 0 ? paragraphs : [value.trim()].filter(Boolean);
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
    { ok: hasContact, label: "기본 연락처", detail: hasContact ? "이름, 이메일, 전화번호가 준비됨" : "이름, 이메일, 전화번호를 모두 입력하세요." },
    { ok: hasProfile, label: "프로필 요약", detail: hasProfile ? "첫 화면에서 강점이 보임" : "한 줄 소개나 자기소개에 직무 강점을 2문장 이상 적으세요." },
    { ok: hasSkills, label: "기술 스택", detail: hasSkills ? "핵심 기술이 충분함" : "주요 기술을 최소 4개 이상 추가하세요." },
    { ok: hasExperienceOrProjects, label: "경험 근거", detail: hasExperienceOrProjects ? "경력 또는 프로젝트가 포함됨" : "경력이나 프로젝트 중 하나는 반드시 추가하세요." },
    { ok: payload.projects.length === 0 || projectWithOutcome, label: "성과 표현", detail: projectWithOutcome ? "성과/역할 근거가 있음" : "프로젝트에 주요 성과나 역할 설명을 추가하세요." },
    { ok: hasLink, label: "검증 링크", detail: hasLink ? "GitHub 또는 블로그 링크가 있음" : "GitHub, 블로그, 포트폴리오 링크 중 하나를 권장합니다." },
    { ok: selectedSectionCount >= 3, label: "문서 구성", detail: selectedSectionCount >= 3 ? "A4 섹션 구성이 충분함" : "요약, 기술, 프로젝트/경력 등 최소 3개 섹션을 켜세요." },
    { ok: printableTextLength <= 3200, label: "분량 밀도", detail: printableTextLength <= 3200 ? "A4 출력 분량이 안정적" : "본문이 길어 인쇄 시 과밀할 수 있습니다." },
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
    { label: "요약", ok: countWords(firstPresent(info.intro, payload.selfIntroduction)) >= 12 },
    { label: "기술", ok: payload.skills.length >= 4 },
    { label: "경력", ok: payload.experience.some((item) => item.company.trim() || item.description.trim()) },
    { label: "프로젝트", ok: payload.projects.some((item) => item.name.trim() || item.description.trim()) },
  ];
}

/**
 * 본문 블록의 단위. PagedResumeDocument 가 leaf 단위로 페이지를 채우므로 entry 안의
 * 헤더/본문 라인까지 별도 블록으로 잘게 쪼개야 한 entry 가 페이지 경계에서 자연스럽게
 * 다음 페이지로 흘러갈 수 있다.
 */
interface ResumeBlock {
  key: string;
  /** 어느 섹션에 속하는지 — 연속 블록을 같은 페이지에 묶을 때 참조 */
  sectionId: string;
  /** 섹션 타이틀 블록인지 */
  isSectionTitle?: boolean;
  /**
   * 다음 블록과 같은 페이지에 두려고 시도한다 (entry header 가 본문과 분리되는 것 방지).
   * 새 페이지로 넘어가도 의미가 깨지지 않으면 무시될 수 있다.
   */
  keepWithNext?: boolean;
  node: ReactNode;
}

function SectionTitleBlock({ title }: { title: string }) {
  return (
    <h3
      data-print-title
      className="mb-1.5 border-t-2 border-slate-900/80 pt-3 text-[15px] font-black tracking-[0.14em] text-slate-950"
    >
      {title}
    </h3>
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
  // 헤더의 한 줄 소개는 personalInfo.intro 만 사용한다 (자기소개 본문 selfIntroduction
  // 은 PROFILE SUMMARY 섹션에서 표시).
  const headline = info.intro?.trim() || "";
  const contactItems = [
    info.email,
    info.phone,
    info.links.github,
    info.links.blog,
  ].filter(Boolean);

  return (
    <header className="border-b-2 border-slate-950 pb-6">
      <p className="text-[13px] font-black tracking-[0.22em] text-slate-500">
        DEVELOPER RESUME
      </p>
      <div className="mt-3 flex items-start justify-between gap-12">
        <div className="min-w-0 flex-1">
          <h1 className="text-[44px] font-black leading-[1.05] tracking-tight">
            {name}
          </h1>
          {headline ? (
            <p className="mt-4 text-[14px] font-semibold leading-[1.7] text-slate-700">
              {headline}
            </p>
          ) : title ? (
            <p className="mt-4 text-[13px] font-medium leading-[1.7] text-slate-400">
              {title}
            </p>
          ) : null}
        </div>
        {contactItems.length > 0 ? (
          <div className="max-w-[230px] shrink-0 space-y-2 pt-2 text-right text-[13px] font-semibold leading-[1.45] text-slate-600 [overflow-wrap:anywhere]">
            {contactItems.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        ) : null}
      </div>
    </header>
  );
}

/**
 * 본문을 leaf-level 블록 배열로 빌드한다. 각 블록은 개별 측정 후 누적 height 가
 * 페이지 inner height 를 초과하기 직전 새 페이지로 분기된다.
 *
 * - 섹션 헤더, entry 헤더, 각 bullet/문단을 별도 블록으로 분리한다.
 * - entry 헤더는 keepWithNext=true 로 마킹해 본문과 페이지가 갈리지 않도록 시도.
 * - 길이 제한이 없으므로 사용자의 모든 내용이 그대로 흘러간다.
 */
function buildResumeBlocks(
  payload: ResumePayload,
  options?: ResumeA4Options,
  /**
   * 라벨 → 미리 fetch 한 data URI 매핑. snapshot 모드(html2canvas) 에서 외부 SVG 가
   * 로딩되기 전에 캡쳐돼 빈칸으로 나오는 문제를 피하기 위해 chip 배경을 인라인 data
   * URI 로 바꾼다. 비-snapshot 경로(브라우저 미리보기) 는 undefined 로 호출하면 기존
   * `getTechLogo(name).src` 를 그대로 사용한다.
   */
  logoUriByLabel?: Record<string, string>,
): ResumeBlock[] {
  const sectionOptions = options || DEFAULT_RESUME_A4_OPTIONS;
  const coverLetters = payload.coverLetters ?? [];
  const blocks: ResumeBlock[] = [];

  const resolveLogoSrc = (label: string): string | null => {
    if (logoUriByLabel && logoUriByLabel[label]) return logoUriByLabel[label];
    const meta = getTechLogo(label);
    return meta ? meta.src : null;
  };

  // --- PROFILE SUMMARY ---
  if (sectionOptions.summary) {
    const sectionId = "summary";
    blocks.push({
      key: "summary-title",
      sectionId,
      isSectionTitle: true,
      keepWithNext: true,
      node: <SectionTitleBlock title="PROFILE SUMMARY" />,
    });
    const text = payload.selfIntroduction?.trim();
    if (text) {
      const paragraphs = splitParagraphs(text);
      paragraphs.forEach((para, idx) => {
        blocks.push({
          key: `summary-p-${idx}`,
          sectionId,
          node: (
            <p className="whitespace-pre-line text-[14px] font-medium leading-[1.55] text-slate-800">
              {para}
            </p>
          ),
        });
      });
    } else {
      blocks.push({
        key: "summary-empty",
        sectionId,
        node: (
          <p className="whitespace-pre-line text-[14px] font-medium leading-[1.55] text-slate-800">
            지원 직무와 관련된 핵심 역량·경험을 2~5문장으로 정리하세요.
          </p>
        ),
      });
    }
  }

  // --- TECHNICAL SKILLS — 카테고리별로 그룹핑 ---
  if (sectionOptions.skills) {
    const sectionId = "skills";
    blocks.push({
      key: "skills-title",
      sectionId,
      isSectionTitle: true,
      keepWithNext: true,
      node: <SectionTitleBlock title="TECHNICAL SKILLS" />,
    });
    if (payload.skills.length === 0) {
      blocks.push({
        key: "skills-empty",
        sectionId,
        node: (
          <p className="text-[13px] font-medium text-slate-500">
            기술 스택을 추가하세요.
          </p>
        ),
      });
    } else {
      const grouped = groupSkillsByCategory(payload.skills);
      grouped.forEach(({ category, items }) => {
        blocks.push({
          key: `skills-cat-${category.key}`,
          sectionId,
          node: (
            <div className="grid grid-cols-[120px_minmax(0,1fr)] items-baseline gap-4">
              <div className="text-[13px] font-black uppercase tracking-[0.12em] text-slate-700">
                {category.label}
              </div>
              <div className="flex flex-wrap gap-2">
                {items.map((skill, index) => {
                  const logoSrc = resolveLogoSrc(skill.name);
                  return (
                    <span
                      key={`${skill.name}-${index}`}
                      className="inline-flex h-7 items-center gap-1.5 rounded-sm border border-slate-300 bg-white pl-1.5 pr-2.5 text-[13px] font-bold text-slate-800"
                    >
                      <span
                        aria-hidden="true"
                        className="inline-flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-white"
                      >
                        {logoSrc ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={logoSrc}
                            alt=""
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <span className="text-[9px] font-black text-slate-500">
                            {skill.name.slice(0, 1).toUpperCase()}
                          </span>
                        )}
                      </span>
                      <span>{skill.name}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          ),
        });
      });
    }
  }

  // --- WORK EXPERIENCE ---
  if (sectionOptions.experience) {
    const sectionId = "experience";
    blocks.push({
      key: "experience-title",
      sectionId,
      isSectionTitle: true,
      keepWithNext: true,
      node: <SectionTitleBlock title="WORK EXPERIENCE" />,
    });
    if (payload.experience.length === 0) {
      blocks.push({
        key: "experience-empty",
        sectionId,
        node: (
          <p className="text-[11px] font-medium text-slate-500">
            경력 항목을 추가하세요.
          </p>
        ),
      });
    } else {
      payload.experience.forEach((exp, expIdx) => {
        const baseKey = exp.id || `exp-${expIdx}`;
        // 엔트리 헤더 — 회사/직책/기간
        blocks.push({
          key: `${baseKey}-header`,
          sectionId,
          keepWithNext: true,
          node: (
            <div
              data-print-entry
              className="grid grid-cols-[120px_minmax(0,1fr)] gap-6 pt-2"
            >
              <div className="text-[12.5px] font-bold leading-6 text-slate-500">
                <p>{exp.period || "기간"}</p>
              </div>
              <div className="flex flex-wrap items-baseline gap-x-2">
                <h4 className="text-[15px] font-black text-slate-950">
                  {exp.company || "회사명"}
                </h4>
                <p className="text-[12.5px] font-bold text-slate-500">
                  {exp.position || "직책"}
                </p>
              </div>
            </div>
          ),
        });
        // 본문 — 줄별로 하나의 블록 (긴 description 자연스럽게 페이지 분기)
        const lines = cleanLines(exp.description, 200);
        const fallback = ["담당 업무와 성과를 입력하세요."];
        const renderLines = lines.length > 0 ? lines : fallback;
        renderLines.forEach((line, lineIdx) => {
          blocks.push({
            key: `${baseKey}-line-${lineIdx}`,
            sectionId,
            keepWithNext: lineIdx === 0, // 첫 줄은 헤더와 함께 유지
            node: (
              <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-6">
                <div />
                <ul className="list-disc pl-4 text-[13px] font-medium leading-[1.6] text-slate-700">
                  <li>{line}</li>
                </ul>
              </div>
            ),
          });
        });
      });
    }
  }

  // --- PROJECTS ---
  if (sectionOptions.projects) {
    const sectionId = "projects";
    blocks.push({
      key: "projects-title",
      sectionId,
      isSectionTitle: true,
      keepWithNext: true,
      node: <SectionTitleBlock title="PROJECTS" />,
    });
    if (payload.projects.length === 0) {
      blocks.push({
        key: "projects-empty",
        sectionId,
        node: (
          <p className="text-[11px] font-medium text-slate-500">
            프로젝트 항목을 추가하거나 보관함에서 불러오세요.
          </p>
        ),
      });
    } else {
      payload.projects.forEach((project, projectIdx) => {
        const baseKey = project.id || `prj-${projectIdx}`;
        blocks.push({
          key: `${baseKey}-header`,
          sectionId,
          keepWithNext: true,
          node: (
            <div
              data-print-entry
              className="grid grid-cols-[120px_minmax(0,1fr)] gap-6 pt-2"
            >
              <div className="text-[12.5px] font-bold leading-6 text-slate-500">
                <p>{project.period || "기간"}</p>
              </div>
              <div className="flex flex-wrap items-baseline gap-x-2">
                <h4 className="text-[15px] font-black text-slate-950">
                  {project.name || "프로젝트명"}
                </h4>
                <p className="text-[12px] font-bold text-slate-500">
                  {project.techStack.join(" · ")}
                </p>
              </div>
            </div>
          ),
        });
        const description = firstPresent(
          project.description,
          project.role,
          project.solution,
        );
        if (description) {
          const paragraphs = splitParagraphs(description);
          paragraphs.forEach((para, paraIdx) => {
            blocks.push({
              key: `${baseKey}-desc-${paraIdx}`,
              sectionId,
              keepWithNext: paraIdx === 0,
              node: (
                <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-6">
                  <div />
                  <p className="whitespace-pre-line text-[13px] font-medium leading-[1.6] text-slate-700">
                    {para}
                  </p>
                </div>
              ),
            });
          });
        }
        (project.achievements || []).forEach((achievement, achIdx) => {
          blocks.push({
            key: `${baseKey}-ach-${achIdx}`,
            sectionId,
            node: (
              <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-6">
                <div />
                <ul className="list-disc pl-4 text-[13px] font-medium leading-[1.6] text-slate-700">
                  <li>{achievement}</li>
                </ul>
              </div>
            ),
          });
        });
      });
    }
  }

  // --- COVER LETTER ---
  if (sectionOptions.coverLetters) {
    const sectionId = "coverLetters";
    blocks.push({
      key: "cover-title",
      sectionId,
      isSectionTitle: true,
      keepWithNext: true,
      node: <SectionTitleBlock title="COVER LETTER" />,
    });
    if (coverLetters.length === 0) {
      blocks.push({
        key: "cover-empty",
        sectionId,
        node: (
          <p className="text-[11px] font-medium text-slate-500">
            연결된 자기소개서가 없습니다.
          </p>
        ),
      });
    } else {
      coverLetters.forEach((letter, letterIdx) => {
        const baseKey = letter.id || `cl-${letterIdx}`;
        const meta = [letter.company, letter.role].filter(Boolean).join(" · ");
        blocks.push({
          key: `${baseKey}-header`,
          sectionId,
          keepWithNext: true,
          node: (
            <div
              data-print-entry
              className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 pt-2"
            >
              <h4 className="text-[12px] font-black text-slate-950">
                {letter.title || "지원 자기소개서"}
              </h4>
              {meta ? (
                <span className="text-[12px] font-bold text-slate-500">{meta}</span>
              ) : null}
            </div>
          ),
        });
        const hasQuestions = (letter.questions?.length ?? 0) > 0;
        if (hasQuestions) {
          letter.questions!.forEach((question, qIdx) => {
            // 문항 타이틀 — 답변 첫 줄과 같은 페이지에 두려고 시도
            blocks.push({
              key: `${baseKey}-q-${qIdx}-title`,
              sectionId,
              keepWithNext: true,
              node: (
                <p className="mt-1 text-[13px] font-bold text-slate-950">
                  Q{qIdx + 1}. {question.title || "문항"}
                </p>
              ),
            });
            const answer = (question.answer || "").trim();
            if (answer) {
              const paragraphs = splitParagraphs(answer);
              paragraphs.forEach((para, pIdx) => {
                blocks.push({
                  key: `${baseKey}-q-${qIdx}-a-${pIdx}`,
                  sectionId,
                  keepWithNext: pIdx === 0,
                  node: (
                    <p className="whitespace-pre-line text-[13px] leading-[1.6] text-slate-700">
                      {para}
                    </p>
                  ),
                });
              });
            } else {
              blocks.push({
                key: `${baseKey}-q-${qIdx}-empty`,
                sectionId,
                node: (
                  <p className="text-[13px] leading-[1.6] text-slate-400">
                    (답변 미작성)
                  </p>
                ),
              });
            }
          });
        } else {
          const body = (letter.content || "").trim();
          if (body) {
            const paragraphs = splitParagraphs(body);
            paragraphs.forEach((para, pIdx) => {
              blocks.push({
                key: `${baseKey}-body-${pIdx}`,
                sectionId,
                node: (
                  <p className="whitespace-pre-line text-[13px] leading-[1.6] text-slate-700">
                    {para}
                  </p>
                ),
              });
            });
          } else {
            blocks.push({
              key: `${baseKey}-body-empty`,
              sectionId,
              node: (
                <p className="text-[13px] leading-[1.6] text-slate-400">
                  본문이 비어 있습니다.
                </p>
              ),
            });
          }
        }
      });
    }
  }

  return blocks;
}

/**
 * 호환: 기존에 export 되던 단순 sections 빌더. 내부적으로는 buildResumeBlocks 의 노드들을
 * 단일 ReactNode 로 묶어 반환. 외부 사용처(있다면) 가 기존 인터페이스에 의존하므로 유지.
 */
export function buildResumeSectionNodes(
  payload: ResumePayload,
  options?: ResumeA4Options,
): ReactNode[] {
  // 섹션 단위로 groupBy 해서 ReactNode[] 로 묶어 반환
  const blocks = buildResumeBlocks(payload, options);
  const sections: ReactNode[] = [];
  let currentId: string | null = null;
  let currentNodes: ReactNode[] = [];
  for (const block of blocks) {
    if (block.sectionId !== currentId) {
      if (currentNodes.length > 0) {
        sections.push(<section key={currentId || sections.length}>{currentNodes}</section>);
      }
      currentNodes = [];
      currentId = block.sectionId;
    }
    currentNodes.push(<div key={block.key}>{block.node}</div>);
  }
  if (currentNodes.length > 0) {
    sections.push(<section key={currentId || sections.length}>{currentNodes}</section>);
  }
  return sections;
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
  const blocks = useMemo(() => buildResumeBlocks(payload, options), [payload, options]);

  return (
    <article
      id={documentId}
      className={`korean-resume-a4-page print-resume bg-white px-9 py-9 text-slate-950 shadow-sm [overflow-wrap:break-word] ${className}`}
      style={style}
    >
      <KoreanResumeHeader payload={payload} title={title} />

      <div className="mt-5 space-y-2.5">
        {blocks.map((block) => (
          <div key={block.key}>{block.node}</div>
        ))}
      </div>

      <footer className="mt-8 flex items-center justify-between border-t border-slate-200 pt-3 text-[12px] font-semibold text-slate-400">
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
 * leaf-block 단위 측정 기반 다중 페이지 이력서 뷰.
 *
 * - buildResumeBlocks 가 반환한 leaf 블록(엔트리 헤더, 본문 라인 등) 각각의 height 를
 *   794px 폭에서 측정한 뒤, 누적 height 가 페이지 inner height 를 넘기 직전 새 페이지로
 *   분기한다. → 한 entry / 문항 / 자기소개 문단이 길어져도 다음 페이지로 자연스럽게
 *   흘러간다.
 * - keepWithNext 블록은 단독으로 페이지를 마감하면 다음 블록과 분리되므로, 가능하면
 *   같은 페이지에 함께 둔다.
 * - 페이지 네비게이션 UI(이전/다음 + 페이지 표시) 가 포함되어 한 번에 한 페이지만 노출된다.
 */
export function PagedResumeDocument({
  payload,
  title,
  options,
  documentId,
  className = "",
  onPageInfoChange,
  currentPageIndex,
  onCurrentPageChange,
}: {
  payload: ResumePayload;
  title?: string;
  options?: ResumeA4Options;
  documentId?: string;
  className?: string;
  /** 페이지 개수가 변할 때 호출 (외부에서 nav 컨트롤을 두려는 경우용) */
  onPageInfoChange?: (info: { totalPages: number }) => void;
  /** 외부 페이지 인덱스 컨트롤. 비제어면 내부 state 사용. */
  currentPageIndex?: number;
  onCurrentPageChange?: (next: number) => void;
}) {
  const blocks = useMemo(() => buildResumeBlocks(payload, options), [payload, options]);

  const headerRef = useRef<HTMLDivElement | null>(null);
  const blockRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [pages, setPages] = useState<number[][]>([[]]);

  useEffect(() => {
    blockRefs.current = blockRefs.current.slice(0, blocks.length);
    // blocks 길이가 줄어들었을 때 pages 가 잠시 stale 한 인덱스를 가리킬 수 있으므로
    // 즉시 클램프해서 다음 paint 에서 NPE 가 일어나지 않게 한다.
    setPages((prev) => {
      const sanitized = prev
        .map((group) => group.filter((idx) => idx < blocks.length))
        .filter((group) => group.length > 0);
      return sanitized.length > 0 ? sanitized : [[]];
    });
  }, [blocks.length]);

  const computePages = useCallback(() => {
    const PAGE_HEIGHT = 1123; // A4 height @96dpi
    const VERTICAL_PADDING = 72; // px-9 py-9 (36 + 36)
    const HEADER_GAP = 20; // mt-5 (5*4=20) — 첫 페이지 헤더와 본문 사이
    const BLOCK_GAP = 10; // space-y-2.5 (2.5*4=10)

    if (blocks.length === 0) {
      setPages([[]]);
      return;
    }

    const headerHeight = headerRef.current?.offsetHeight ?? 0;
    const heights = blockRefs.current.map((el) => el?.offsetHeight ?? 0);

    const firstPageLimit = PAGE_HEIGHT - VERTICAL_PADDING - headerHeight - HEADER_GAP;
    const restPageLimit = PAGE_HEIGHT - VERTICAL_PADDING;

    const next: number[][] = [];
    let current: number[] = [];
    let acc = 0;
    let isFirst = true;

    const limit = () => (isFirst ? firstPageLimit : restPageLimit);

    for (let i = 0; i < blocks.length; i++) {
      const h = heights[i] ?? 0;
      const cost = h + (current.length > 0 ? BLOCK_GAP : 0);

      // keepWithNext: 현재 블록이 다음 블록과 같이 있고 싶어할 때.
      // 둘 다 합쳐서 현재 페이지에 들어가지 못하면 현재 블록부터 새 페이지로 보낸다.
      const wantKeep = blocks[i].keepWithNext && i < blocks.length - 1;
      const nextH = wantKeep ? (heights[i + 1] ?? 0) + BLOCK_GAP : 0;

      if (acc + cost > limit() && current.length > 0) {
        next.push(current);
        current = [];
        acc = 0;
        isFirst = false;
      }

      // keepWithNext 가 만족되지 않으면(즉 이 블록 + 다음 블록이 현재 페이지에 못 들어감)
      // 이 블록도 새 페이지로 미룬다 — 단, 새 페이지에서도 못 들어갈 정도라면 강제 배치.
      if (
        wantKeep &&
        current.length > 0 &&
        acc + cost + nextH > limit()
      ) {
        next.push(current);
        current = [];
        acc = 0;
        isFirst = false;
      }

      current.push(i);
      acc += current.length === 1 ? h : cost;
    }
    if (current.length > 0) next.push(current);
    if (next.length === 0) next.push([]);
    setPages(next);
  }, [blocks]);

  useEffect(() => {
    computePages();
    const observer = new ResizeObserver(() => computePages());
    blockRefs.current.forEach((el) => el && observer.observe(el));
    if (headerRef.current) observer.observe(headerRef.current);
    return () => observer.disconnect();
  }, [computePages]);

  useEffect(() => {
    onPageInfoChange?.({ totalPages: pages.length });
  }, [pages.length, onPageInfoChange]);

  // 비제어/제어 페이지 인덱스 처리
  const [internalPageIndex, setInternalPageIndex] = useState(0);
  const activeIndex = currentPageIndex ?? internalPageIndex;
  const setActiveIndex = (next: number) => {
    const clamped = Math.max(0, Math.min(pages.length - 1, next));
    if (onCurrentPageChange) {
      onCurrentPageChange(clamped);
    } else {
      setInternalPageIndex(clamped);
    }
  };

  // 페이지 수가 줄어들었을 때 activeIndex 가 범위를 벗어나는 경우 클램프
  useEffect(() => {
    if (activeIndex > pages.length - 1) {
      setActiveIndex(pages.length - 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages.length]);

  return (
    <div
      className={`mx-auto w-full max-w-[794px] [container-type:inline-size] ${className}`}
    >
      {/* 측정용(보이지 않음). 모든 block 을 한 번씩 794px 폭으로 그려 height 를 잰다. */}
      <div
        aria-hidden
        className="pointer-events-none invisible absolute -z-10 h-0 overflow-hidden"
      >
        <div className="w-[794px] px-9">
          <div ref={headerRef}>
            <KoreanResumeHeader payload={payload} title={title} />
          </div>
          <div className="mt-5 space-y-2.5">
            {blocks.map((block, i) => (
              <div
                key={block.key}
                ref={(el) => {
                  blockRefs.current[i] = el;
                }}
              >
                {block.node}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 페이지 네비게이션 — 위쪽 toolbar */}
      <div className="mb-2 flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5 shadow-sm">
        <button
          type="button"
          onClick={() => setActiveIndex(activeIndex - 1)}
          disabled={activeIndex <= 0}
          className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11.5px] font-semibold text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
          aria-label="이전 페이지"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          이전
        </button>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold tabular-nums text-slate-700">
          <span>
            {activeIndex + 1} / {pages.length}
          </span>
          {pages.length > 1 ? (
            <div className="ml-1 flex items-center gap-0.5">
              {pages.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  aria-label={`${idx + 1} 페이지로 이동`}
                  className={
                    idx === activeIndex
                      ? "h-1.5 w-3 rounded-full bg-slate-900 transition-all"
                      : "h-1.5 w-1.5 rounded-full bg-slate-300 transition-all hover:bg-slate-400"
                  }
                />
              ))}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setActiveIndex(activeIndex + 1)}
          disabled={activeIndex >= pages.length - 1}
          className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11.5px] font-semibold text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
          aria-label="다음 페이지"
        >
          다음
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* 표시용 — 현재 페이지 하나만 노출. A4(794×1123) 고정 박스. */}
      <div
        className="relative overflow-hidden bg-white shadow-sm"
        style={{ height: `calc(1123px * (100cqw / 794px))` }}
      >
        {pages.map((group, pageIndex) => {
          const visible = pageIndex === activeIndex;
          return (
            <article
              key={pageIndex}
              id={pageIndex === 0 ? documentId : undefined}
              className="korean-resume-a4-page print-resume absolute left-0 top-0 w-[794px] origin-top-left bg-white px-9 py-9 text-slate-950 [overflow-wrap:break-word]"
              style={{
                transform: `scale(calc(100cqw / 794px))`,
                visibility: visible ? "visible" : "hidden",
                pointerEvents: visible ? "auto" : "none",
              }}
            >
              {pageIndex === 0 && (
                <KoreanResumeHeader payload={payload} title={title} />
              )}
              <div className={pageIndex === 0 ? "mt-5 space-y-2.5" : "space-y-2.5"}>
                {group
                  .filter((blockIdx) => blocks[blockIdx] !== undefined)
                  .map((blockIdx) => {
                    const block = blocks[blockIdx];
                    return <div key={block.key}>{block.node}</div>;
                  })}
              </div>
            </article>
          );
        })}
        {pages.length > 1 && (
          <span
            data-print-helper
            className="pointer-events-none absolute bottom-2 right-3 rounded-full bg-slate-900/70 px-2 py-0.5 text-[10px] font-bold text-white tabular-nums"
          >
            {activeIndex + 1} / {pages.length}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * 스냅샷용 — PDF 다운로드 시 html2canvas-pro 가 그대로 캡쳐할 수 있도록 모든 페이지를
 * native A4(794×1123px) 크기 그대로 세로로 쌓아 렌더한다. 페이지 네비·container-query·
 * scale transform 없음 → 캡쳐가 깨지지 않음. 각 페이지 노드는 `data-pdf-page` 로 마킹.
 */
export function KoreanResumeSnapshotDocument({
  payload,
  title,
  options,
  logoUriByLabel,
}: {
  payload: ResumePayload;
  title?: string;
  options?: ResumeA4Options;
  /** 기술 라벨 → 미리 fetch 한 SVG data URI. 로고가 캡쳐 직전에 인라인 보장. */
  logoUriByLabel?: Record<string, string>;
}) {
  const blocks = useMemo(
    () => buildResumeBlocks(payload, options, logoUriByLabel),
    [payload, options, logoUriByLabel],
  );
  const headerRef = useRef<HTMLDivElement | null>(null);
  const blockRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [pages, setPages] = useState<number[][]>([[]]);

  useEffect(() => {
    blockRefs.current = blockRefs.current.slice(0, blocks.length);
  }, [blocks.length]);

  const computePages = useCallback(() => {
    const PAGE_HEIGHT = 1123;
    const VERTICAL_PADDING = 72;
    const HEADER_GAP = 20;
    const BLOCK_GAP = 10;

    if (blocks.length === 0) {
      setPages([[]]);
      return;
    }
    const headerHeight = headerRef.current?.offsetHeight ?? 0;
    const heights = blockRefs.current.map((el) => el?.offsetHeight ?? 0);
    const firstPageLimit = PAGE_HEIGHT - VERTICAL_PADDING - headerHeight - HEADER_GAP;
    const restPageLimit = PAGE_HEIGHT - VERTICAL_PADDING;

    const next: number[][] = [];
    let current: number[] = [];
    let acc = 0;
    let isFirst = true;
    const limit = () => (isFirst ? firstPageLimit : restPageLimit);

    for (let i = 0; i < blocks.length; i++) {
      const h = heights[i] ?? 0;
      const cost = h + (current.length > 0 ? BLOCK_GAP : 0);
      const wantKeep = blocks[i].keepWithNext && i < blocks.length - 1;
      const nextH = wantKeep ? (heights[i + 1] ?? 0) + BLOCK_GAP : 0;

      if (acc + cost > limit() && current.length > 0) {
        next.push(current);
        current = [];
        acc = 0;
        isFirst = false;
      }
      if (wantKeep && current.length > 0 && acc + cost + nextH > limit()) {
        next.push(current);
        current = [];
        acc = 0;
        isFirst = false;
      }
      current.push(i);
      acc += current.length === 1 ? h : cost;
    }
    if (current.length > 0) next.push(current);
    if (next.length === 0) next.push([]);
    setPages(next);
  }, [blocks]);

  useEffect(() => {
    computePages();
  }, [computePages]);

  return (
    <div className="bg-white">
      {/* 측정용 — 모든 block 을 794px 폭에서 한 번 그려 height 잰다. */}
      <div
        aria-hidden
        className="pointer-events-none invisible absolute -z-10 h-0 overflow-hidden"
      >
        <div className="w-[794px] px-9">
          <div ref={headerRef}>
            <KoreanResumeHeader payload={payload} title={title} />
          </div>
          <div className="mt-5 space-y-2.5">
            {blocks.map((block, i) => (
              <div
                key={block.key}
                ref={(el) => {
                  blockRefs.current[i] = el;
                }}
              >
                {block.node}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 표시용 — 페이지 단위로 정확히 794×1123 박스를 세로 stack. html2canvas-pro
          가 각 박스를 그대로 캡쳐. */}
      {pages.map((group, pageIndex) => (
        <article
          key={pageIndex}
          data-pdf-page=""
          className="korean-resume-a4-page print-resume relative bg-white px-9 py-9 text-slate-950 [overflow-wrap:break-word]"
          style={{ width: 794, height: 1123, overflow: "hidden" }}
        >
          {pageIndex === 0 && <KoreanResumeHeader payload={payload} title={title} />}
          <div className={pageIndex === 0 ? "mt-5 space-y-2.5" : "space-y-2.5"}>
            {group
              .filter((blockIdx) => blocks[blockIdx] !== undefined)
              .map((blockIdx) => {
                const block = blocks[blockIdx];
                return <div key={block.key}>{block.node}</div>;
              })}
          </div>
        </article>
      ))}
    </div>
  );
}

/**
 * 썸네일용 — 첫 페이지만 한 장 보여주는 정적 뷰. 보관함 목록 카드에서 사용된다.
 * 네비게이션 UI 없이, 794×1123 A4 박스를 컨테이너 폭에 맞춰 비례 축소한다.
 */
export function ScaledKoreanResumeDocument({
  payload,
  title,
  options,
  documentId,
  className = "",
}: {
  payload: ResumePayload;
  title?: string;
  options?: ResumeA4Options;
  documentId?: string;
  className?: string;
  minHeightClass?: string;
}) {
  return (
    <div
      className={`mx-auto w-full max-w-[794px] [container-type:inline-size] ${className}`}
    >
      <div
        className="relative overflow-hidden bg-white shadow-sm"
        style={{ height: `calc(1123px * (100cqw / 794px))` }}
      >
        <div
          id={documentId}
          className="absolute left-0 top-0 w-[794px] origin-top-left"
          style={{ transform: `scale(calc(100cqw / 794px))` }}
        >
          <KoreanResumeDocument
            payload={payload}
            title={title}
            options={options}
            className="w-full shadow-none"
          />
        </div>
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
            visibility: visible !important;
            pointer-events: auto !important;
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

        {/* PDF 다운로드 + 새 탭에서 열기. 미리보기 DOM 을 그대로 캡쳐(html2canvas-pro)
            해서 PDF 로 만들기 때문에 화면과 PDF 가 완전히 동일하다. */}
        <ResumePdfDownloadButton
          resumePayload={payload}
          resumeOptions={options}
          title={title}
          fileName={title || payload.personalInfo?.name || "resume"}
          variant="default"
          size="default"
          className="mt-3 h-9 w-full gap-2"
          label="PDF로 저장 (새 탭에서 열기)"
          iconLeft={<Download className="h-4 w-4" />}
          openInNewTab
        />
        <p className="mt-1.5 text-center text-[10.5px] text-slate-400">
          저장된 PDF 가 새 탭으로 열려 바로 확인할 수 있어요
        </p>
      </div>

      {/* leaf-block 단위 측정 기반 페이지 분할 — 한 entry 안에서도 길어지면 자연스럽게
          다음 페이지로 넘어가며, 페이지 네비게이션으로 한 번에 한 페이지만 보여준다.
          좌측 입력 폼이 길어지면 우측 미리보기는 sticky 로 함께 스크롤된다.
          A4 비율(794×1123) 을 유지하면서, max-width 를 가용 viewport height 기반으로
          클램프해 항상 한 페이지(A4 1장) 가 화면 안에 들어오게 한다. 텍스트가 더 잘
          보이도록 viewport 의 거의 모든 세로 공간을 사용하도록 클램프를 살짝 완화했다. */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100 p-2">
        <div
          className="mx-auto w-full"
          style={{
            // viewport - 10rem(상단 nav + preview toolbar 등) 가 곧 A4 의 표시 높이.
            // 794/1123 비율로 환산해서 그 높이를 채울 수 있는 폭을 사용.
            maxWidth: "min(100%, calc((100vh - 10rem) * 794 / 1123))",
          }}
        >
          <PagedResumeDocument
            payload={payload}
            title={title}
            options={options}
            documentId="korean-resume-print"
          />
        </div>
      </div>
    </aside>
  );
}
