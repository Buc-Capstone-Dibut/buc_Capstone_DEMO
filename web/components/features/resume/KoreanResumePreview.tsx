"use client";

import { CheckCircle2, ChevronDown, Download, FileText, Minus, Plus } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { ResumePayload } from "@/app/my/[handle]/profile-types";
import { groupSkillsByCategory } from "@/lib/interview/tech-categories";
import { getTechLogo } from "@/lib/interview/tech-logos";
import { EDUCATION_STATUS_LABELS, formatEducationPeriod, getVisibleEducation } from "@/lib/resume/education";

export type ResumeA4SectionKey =
  | "summary"
  | "skills"
  | "education"
  | "experience"
  | "projects"
  | "selfIntroduction"
  | "coverLetters";

export type ResumeA4Options = Record<ResumeA4SectionKey, boolean>;

export const DEFAULT_RESUME_A4_OPTIONS: ResumeA4Options = {
  summary: true,
  skills: true,
  education: true,
  experience: true,
  projects: true,
  selfIntroduction: true,
  coverLetters: false,
};

const SECTION_LABELS: Array<{ key: ResumeA4SectionKey; label: string; hint: string }> = [
  { key: "summary", label: "요약", hint: "한 줄 소개" },
  { key: "skills", label: "기술", hint: "스택/역량" },
  { key: "education", label: "학력", hint: "학교/전공" },
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
    { label: "학력", ok: getVisibleEducation(payload.education).length > 0 },
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
  const sectionOptions = { ...DEFAULT_RESUME_A4_OPTIONS, ...options };
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

  // --- EDUCATION — 학교명·기간을 한 블록에 담아 페이지 경계에서도 함께 배치 ---
  const education = getVisibleEducation(payload.education);
  if (sectionOptions.education && education.length > 0) {
    const sectionId = "education";
    blocks.push({
      key: "education-title",
      sectionId,
      isSectionTitle: true,
      keepWithNext: true,
      node: <SectionTitleBlock title="EDUCATION" />,
    });
    education.forEach((item) => {
      blocks.push({
        key: `education-${item.id}`,
        sectionId,
        node: (
          <div className="flex items-start justify-between gap-6 py-1">
            <div className="min-w-0">
              <p className="text-[14px] font-black text-slate-950">{item.school}</p>
              {item.major ? <p className="mt-1 text-[13px] font-medium text-slate-700">{item.major}</p> : null}
            </div>
            <div className="shrink-0 text-right text-[12px] font-semibold leading-[1.7] text-slate-600">
              {formatEducationPeriod(item) ? <p>{formatEducationPeriod(item)}</p> : null}
              <p>{EDUCATION_STATUS_LABELS[item.status]}</p>
            </div>
          </div>
        ),
      });
    });
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

const PREVIEW_ZOOM_MIN = 0.5;
const PREVIEW_ZOOM_MAX = 1;
const PREVIEW_ZOOM_STEP = 0.25;

function clampPreviewZoom(value: number) {
  const stepped = Math.round(value / PREVIEW_ZOOM_STEP) * PREVIEW_ZOOM_STEP;
  return Math.min(PREVIEW_ZOOM_MAX, Math.max(PREVIEW_ZOOM_MIN, Number(stepped.toFixed(2))));
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
 * - 화면에서는 Chrome PDF 뷰어처럼 A4 페이지를 세로로 쌓아 스크롤한다.
 */
export function PagedResumeDocument({
  payload,
  title,
  options,
  documentId,
  className = "",
  onPageInfoChange,
  zoom = 1,
}: {
  payload: ResumePayload;
  title?: string;
  options?: ResumeA4Options;
  documentId?: string;
  className?: string;
  /** 페이지 개수가 변할 때 호출 (외부에서 nav 컨트롤을 두려는 경우용) */
  onPageInfoChange?: (info: { totalPages: number }) => void;
  /** 1이면 미리보기 너비에 맞춘다. 커지면 가로 스크롤이 생긴다. */
  zoom?: number;
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

  return (
    <div
      className={`mx-auto [container-type:inline-size] ${className}`}
      style={{ width: `${zoom * 100}%` }}
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

      {/* 표시용 — A4 페이지를 세로로 쌓는다. 스크롤은 바깥 미리보기 영역이 담당한다. */}
      <div className="flex flex-col gap-4">
        {pages.map((group, pageIndex) => (
          <div
            key={pageIndex}
            className="relative w-full bg-white shadow-md [container-type:inline-size]"
            style={{ height: `calc(1123px * (100cqw / 794px))` }}
          >
            <article
              id={pageIndex === 0 ? documentId : undefined}
              className="korean-resume-a4-page print-resume absolute left-0 top-0 w-[794px] origin-top-left bg-white px-9 py-9 text-slate-950 [overflow-wrap:break-word]"
              style={{ transform: `scale(calc(100cqw / 794px))` }}
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
            {pages.length > 1 && (
              <span
                data-print-helper
                className="pointer-events-none absolute bottom-2 right-3 rounded-full bg-slate-900/70 px-2 py-0.5 text-[10px] font-bold text-white tabular-nums"
              >
                {pageIndex + 1} / {pages.length}
              </span>
            )}
          </div>
        ))}
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

  // 첫 렌더는 본문 없는 빈 1페이지다. 폰트까지 반영해 페이지를 나눈 뒤에야 pending 을 내려,
  // snapshotReactTreeToPdf 가 그 전에 캡쳐해 머리글만 찍히는 일이 없게 한다.
  const [paginated, setPaginated] = useState(false);
  useEffect(() => {
    let cancelled = false;
    computePages();
    const fontsReady = typeof document !== "undefined" && document.fonts ? document.fonts.ready : Promise.resolve();
    fontsReady
      .catch(() => undefined)
      .then(() => {
        if (cancelled) return;
        computePages();
        setPaginated(true);
      });
    return () => {
      cancelled = true;
    };
  }, [computePages]);

  return (
    <div className="bg-white" data-pdf-pending={paginated ? undefined : ""}>
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
  activeEditorSectionLabel,
  formOpen,
  onToggleForm,
  overlay,
}: {
  payload: ResumePayload;
  title?: string;
  options: ResumeA4Options;
  onOptionsChange: (options: ResumeA4Options) => void;
  activeEditorSectionLabel?: string;
  formOpen?: boolean;
  onToggleForm?: () => void;
  /** A4 미리보기 영역 위에만 덮을 오버레이(예: AI 다듬기 중 표시). 상단 컨트롤 카드는 제외. */
  overlay?: ReactNode;
}) {
  const completionItems = getResumeCompletionItems(payload);
  const [controlsOpen, setControlsOpen] = useState(true);
  const [previewZoom, setPreviewZoom] = useState(PREVIEW_ZOOM_MIN);
  const previewScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const pane = previewScrollRef.current;
    if (!pane) return;

    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      setPreviewZoom((current) =>
        clampPreviewZoom(current + (event.deltaY < 0 ? PREVIEW_ZOOM_STEP : -PREVIEW_ZOOM_STEP)),
      );
    };

    pane.addEventListener("wheel", onWheel, { passive: false });
    return () => pane.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <aside className="flex h-full min-h-0 flex-col gap-3">
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }

          html,
          body {
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            overflow: hidden !important;
            background: white !important;
          }

          body * {
            visibility: hidden !important;
          }

          #korean-resume-print,
          #korean-resume-print * {
            visibility: visible !important;
          }

          #korean-resume-print {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            min-height: 297mm !important;
            height: 297mm !important;
            margin: 0 !important;
            background: white !important;
            break-before: avoid !important;
            break-after: avoid !important;
            page-break-before: avoid !important;
            page-break-after: avoid !important;
            overflow: hidden !important;
          }

          .korean-resume-a4-page {
            width: 210mm !important;
            min-height: 297mm !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 15mm !important;
            box-shadow: none !important;
            border: 0 !important;
            border-radius: 0 !important;
            transform: none !important;
            visibility: visible !important;
            pointer-events: auto !important;
          }

          .korean-resume-scale-frame,
          .korean-resume-scale-frame > div {
            width: 210mm !important;
            max-width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            transform: none !important;
          }
        }
      `}</style>

      {controlsOpen ? (
        <div className="shrink-0 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-start gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-950 text-white">
              <FileText className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="min-w-0 flex-1 text-sm font-black text-slate-950">한국식 A4 이력서</h2>
                <Button
                  type="button"
                  variant="outline"
                  className="h-7 shrink-0 gap-1 rounded-md px-2 text-[11px] font-black"
                  aria-expanded
                  onClick={() => setControlsOpen(false)}
                >
                  <ChevronDown className="h-3.5 w-3.5 rotate-180" />
                  접기
                </Button>
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
              {activeEditorSectionLabel ? (
                <p className="mt-2 rounded-md bg-primary/5 px-2 py-1 text-[11px] font-bold text-primary">
                  현재 편집 중: {activeEditorSectionLabel}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-3 flex gap-1.5">
            {SECTION_LABELS.map((section) => (
              <label
                key={section.key}
                className="flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-1.5"
              >
                <Checkbox
                  checked={options[section.key]}
                  onCheckedChange={(checked) =>
                    onOptionsChange({ ...options, [section.key]: checked === true })
                  }
                  className="h-3.5 w-3.5 shrink-0"
                />
                <span className="truncate text-xs font-black text-slate-800">{section.label}</span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {/* 페이지를 A4로 나눠 세로로 쌓고, 이 영역이 미리보기 칸의 남은 높이를 채운 뒤 그 안에서 스크롤한다. */}
      <div className="relative min-h-[70vh] flex-1 xl:min-h-0">
        <div
          ref={previewScrollRef}
          className="h-full min-h-[70vh] overflow-auto overscroll-contain rounded-lg border border-slate-200 bg-slate-200 p-3 xl:absolute xl:inset-0 xl:min-h-0"
        >
          <PagedResumeDocument
            payload={payload}
            title={title}
            options={options}
            documentId="korean-resume-print"
            zoom={previewZoom}
          />
          {overlay}
        </div>
        {!controlsOpen ? (
          <div className="absolute right-3 top-3 z-20">
            <Button
              type="button"
              variant="outline"
              className="h-7 gap-1 rounded-md bg-white px-2 text-[11px] font-black shadow-sm"
              aria-expanded={false}
              onClick={() => setControlsOpen(true)}
            >
              <ChevronDown className="h-3.5 w-3.5" />
              펼치기
            </Button>
          </div>
        ) : null}
        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center">
          <div className="pointer-events-auto flex items-center gap-0.5 rounded-full border border-slate-200 bg-white/95 px-1 py-1 shadow-md">
            <Button
              type="button"
              variant="ghost"
              className="h-7 w-7 rounded-full p-0"
              aria-label="축소"
              disabled={previewZoom <= PREVIEW_ZOOM_MIN}
              onClick={() => setPreviewZoom((current) => clampPreviewZoom(current - PREVIEW_ZOOM_STEP))}
            >
              <Minus className="h-3.5 w-3.5" />
            </Button>
            <button
              type="button"
              className="h-7 min-w-12 rounded-full px-1 text-[11px] font-black tabular-nums text-slate-700 hover:bg-slate-100"
              aria-label="배율 100%로 되돌리기"
              onClick={() => setPreviewZoom(1)}
            >
              {Math.round(previewZoom * 100)}%
            </button>
            <Button
              type="button"
              variant="ghost"
              className="h-7 w-7 rounded-full p-0"
              aria-label="확대"
              disabled={previewZoom >= PREVIEW_ZOOM_MAX}
              onClick={() => setPreviewZoom((current) => clampPreviewZoom(current + PREVIEW_ZOOM_STEP))}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
