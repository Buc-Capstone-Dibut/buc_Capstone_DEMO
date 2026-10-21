// 종료된 워크스페이스를 프로젝트 경험으로 불러올 때 'AI가 STAR로 정리한' 시연용 초안.
// 실제 워크스페이스 기록(완료 작업, 종료 시 입력한 태그·기간·메모)을 문장 안에 그대로 녹인다.
import type { ResumePayload } from "@/app/my/[handle]/profile-types";
import type { WorkspaceCareerImportCandidate } from "@/lib/server/workspace-career-import";

type ExperienceDraft = Partial<NonNullable<ResumePayload["timeline"]>[number]>;

const DEBUT_TECH_STACK = ["Next.js", "TypeScript", "FastAPI", "Supabase", "PostgreSQL", "Gemini Live", "Socket.IO", "Tailwind CSS"];
const DEBUT_TAGS = ["졸업작품", "팀장", "풀스택", "AI 모의면접", "협업 워크스페이스"];

function quoteTasks(titles: string[]): string {
  return titles.slice(0, 3).map((title) => `‘${title}’`).join(", ");
}

function mergeTags(...groups: (string[] | undefined)[]): string[] {
  const seen = new Set<string>();
  for (const group of groups) {
    for (const tag of group ?? []) {
      const value = tag.trim();
      if (value) seen.add(value);
    }
  }
  return [...seen].slice(0, 8);
}

export function buildCareerDemoWorkspaceDraft(
  candidate: WorkspaceCareerImportCandidate,
  base: ExperienceDraft,
): ExperienceDraft {
  const tasks = candidate.completedTaskTitles;
  const taskLine = tasks.length
    ? ` 워크스페이스에서 완료한 작업 ${tasks.length}건 중 ${quoteTasks(tasks)}${tasks.length > 3 ? " 등" : ""}을 직접 마무리했습니다.`
    : "";
  const role = candidate.teamRole?.trim() || base.role || "팀장 · 풀스택";

  if (/디벗|debut|졸업/i.test(candidate.workspaceName)) {
    return {
      ...base,
      position: role,
      description:
        candidate.resultNote?.trim() ||
        "대외활동 탐색, 팀 협업, 커리어 서류, AI 모의면접까지 개발자 취업 준비의 전 과정을 하나로 잇는 플랫폼 'Debut'를 졸업작품으로 개발했습니다.",
      tags: mergeTags(candidate.focusTags, DEBUT_TAGS),
      techStack: base.techStack?.length ? base.techStack : DEBUT_TECH_STACK,
      situation:
        "취업 준비생은 대외활동은 커뮤니티에서, 협업은 노션·슬랙·지라에서, 서류는 문서 도구에서, 면접 연습은 별도 서비스에서 하느라 같은 경험을 매번 처음부터 다시 정리해야 했습니다.",
      role: `${role}으로서 요구사항 정의와 일정 관리를 맡고, 워크스페이스·커리어 관리·AI 면접 기능을 풀스택으로 구현했습니다.`,
      solution:
        `Next.js BFF와 FastAPI AI 서버로 구조를 나누고, 워크스페이스 활동 → 프로젝트 경험 → 이력서·자소서·포트폴리오 → 공고 기반 AI 면접으로 같은 경험 데이터가 이어지도록 설계했습니다. 칸반·문서·채팅·화상회의를 한 공간에 모으고, 종료된 워크스페이스는 STAR 경험으로 바로 불러오게 했습니다.${taskLine}`,
      difficulty:
        "실시간 음성 면접에서 AI 음성·자막·녹화의 타이밍을 맞추는 일과, 여러 기능이 하나의 경험 데이터를 공유하도록 데이터 모델을 통일하는 일이 가장 까다로웠습니다.",
      result:
        "대외활동 탐색부터 AI 모의면접 리포트까지 끊김 없이 이어지는 플랫폼을 배포했고, 한 번 정리한 프로젝트 경험이 서류와 면접 준비에 그대로 재사용되도록 만들었습니다.",
      lesson:
        "기능 개수보다 사용자가 한 번 정리한 경험이 끝까지 재사용되는 흐름을 설계하는 것이 제품의 가치를 만든다는 것을 배웠습니다.",
    };
  }

  return {
    ...base,
    position: role,
    description: candidate.resultNote?.trim() || `${candidate.workspaceName} 팀 프로젝트를 워크스페이스에서 진행하고 마무리했습니다.`,
    tags: mergeTags(candidate.focusTags, base.tags, ["팀 프로젝트", "협업"]),
    situation: `${candidate.workspaceName} 프로젝트는 팀원마다 맡은 작업과 산출물이 흩어지기 쉬워, 진행 상황을 한곳에서 맞춰 보는 체계가 필요했습니다.`,
    role: `${role}을 맡아 담당 작업을 책임지고 팀의 진행 상황을 함께 관리했습니다.`,
    solution: `칸반으로 작업 상태와 담당자를 관리하고, 작업마다 관련 문서를 연결해 결정 사항이 흩어지지 않도록 했습니다.${taskLine}`,
    difficulty: "일정 안에 품질을 지키면서 팀원 간 작업이 겹치거나 빠지지 않도록 조율하는 것이 가장 어려웠습니다.",
    result: base.result || "계획한 작업을 일정 안에 마무리하고 결과물을 정리했습니다.",
    lesson: "작업과 문서를 연결해 두면 팀이 같은 정보를 보고 빠르게 결정할 수 있다는 것을 배웠습니다.",
  };
}
