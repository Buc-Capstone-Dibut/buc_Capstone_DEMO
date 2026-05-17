"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  Briefcase,
  Edit3,
  FileText,
  Loader2,
  Plus,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAnchoredScroll } from "@/hooks/use-anchored-scroll";
import {
  saveCoverLetterAction,
  deleteCoverLetterAction,
  type CoverLetterInput,
} from "./actions";

interface JobPostingOption {
  id: string;
  companyName: string;
  roleTitle: string;
  status: string;
}

/**
 * 자소서 카드/리스트 항목.
 * jsonb 측 CoverLetterInput 에 user_cover_letters 테이블 메타데이터를 보강.
 * - tableRowExists: 해당 id 로 user_cover_letters row 가 존재하면 true
 *   → target 변경/연결 액션은 row 가 있어야 호출 가능
 */
export type CoverLetterListItem = CoverLetterInput & {
  tableRowExists: boolean;
  targetPosting: {
    id: string;
    companyName: string;
    roleTitle: string;
    status: string;
  } | null;
  targetMeta: {
    company: string;
    division: string;
    role: string;
    deadline: string;
  } | null;
  sourceResume: { id: string; title: string } | null;
};

function buildContentFromQuestions(
  questions: NonNullable<CoverLetterInput["questions"]> = [],
): string {
  const valid = questions.filter((q) => q.title.trim() || (q.answer || "").trim());
  if (valid.length === 0) return "";
  return valid
    .map(
      (q, index) =>
        `${index + 1}. ${q.title.trim() || `문항 ${index + 1}`}\n${(q.answer || "").trim()}`,
    )
    .join("\n\n");
}

function formatDateLabel(createdAt: string): string {
  const dateObj = new Date(createdAt);
  if (Number.isNaN(dateObj.getTime())) return "---";
  return `${dateObj.getFullYear()}.${String(dateObj.getMonth() + 1).padStart(2, "0")}.${String(
    dateObj.getDate(),
  ).padStart(2, "0")}`;
}

function sourceSnapshots(letter?: Partial<CoverLetterInput>) {
  if (!letter) return [] as Array<{ id: string; title: string; tags: string[] }>;
  return (letter.sourceExperienceSnapshot || []).map((item) => ({
    id: item.id,
    title: item.title || "제목 없음",
    tags: item.tags || [],
  }));
}

export default function CoverLettersClient({
  initialLetters,
}: {
  initialLetters: CoverLetterListItem[];
}) {
  const router = useRouter();
  const [letters, setLetters] = useState<CoverLetterListItem[]>(initialLetters || []);
  const [selectedId, setSelectedId] = useState<string | null>(
    letters.length > 0 ? letters[0].id : null,
  );
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<CoverLetterInput>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"recent" | "deadline">("recent");
  const previousSelectedIdRef = useRef<string | null>(null);
  const {
    bottomRef: detailBottomRef,
    hasNewContent: hasDetailNewContent,
    handleScroll: handleDetailScroll,
    isAtBottom: isDetailAtBottom,
    requestScrollOnContentChange: requestDetailScrollOnContentChange,
    scrollContainerRef: detailScrollRef,
    scrollToBottom: scrollDetailToBottom,
  } = useAnchoredScroll<HTMLDivElement>({
    bottomThreshold: 140,
    defaultBehavior: "smooth",
  });

  const selectedLetter = useMemo(
    () => letters.find((letter) => letter.id === selectedId),
    [letters, selectedId],
  );
  const selectedSourceExperiences = useMemo(
    () => sourceSnapshots(selectedLetter),
    [selectedLetter],
  );
  const editingSourceExperiences = useMemo(
    () => sourceSnapshots(editForm),
    [editForm],
  );

  const filteredLetters = useMemo(
    () => {
      const filtered = letters.filter((letter) => {
        const keyword = searchQuery.toLowerCase();
        return (
          letter.title.toLowerCase().includes(keyword) ||
          letter.content.toLowerCase().includes(keyword) ||
          (letter.applicationTarget || "").toLowerCase().includes(keyword) ||
          (letter.company || "").toLowerCase().includes(keyword) ||
          (letter.role || "").toLowerCase().includes(keyword) ||
          (letter.workspaceName || "").toLowerCase().includes(keyword)
        );
      });

      if (sortOrder === "deadline") {
        return [...filtered].sort((a, b) => {
          const aTime = a.deadline ? new Date(a.deadline).getTime() : Number.POSITIVE_INFINITY;
          const bTime = b.deadline ? new Date(b.deadline).getTime() : Number.POSITIVE_INFINITY;
          return aTime - bTime;
        });
      }

      return [...filtered].sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
    },
    [letters, searchQuery, sortOrder],
  );

  const detailContentSignal = useMemo(() => {
    if (!selectedLetter) return "";
    const source = isEditing ? editForm : selectedLetter;
    return JSON.stringify({
      id: selectedLetter.id,
      isEditing,
      title: source.title,
      company: source.company,
      division: source.division,
      role: source.role,
      deadline: source.deadline,
      questions: source.questions || [],
      content: source.content || "",
    });
  }, [editForm, isEditing, selectedLetter]);

  useEffect(() => {
    if (!selectedLetter) return;

    if (previousSelectedIdRef.current !== selectedLetter.id) {
      previousSelectedIdRef.current = selectedLetter.id;
      detailScrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
      return;
    }

    requestDetailScrollOnContentChange({ behavior: "auto" });
  }, [
    detailContentSignal,
    detailScrollRef,
    requestDetailScrollOnContentChange,
    selectedLetter,
  ]);

  const handleCreateNew = () => {
    router.push("/career/projects");
  };

  const handleEditClick = () => {
    if (!selectedLetter) return;
    if (typeof window !== "undefined") {
      sessionStorage.setItem("wizard_cover_letter_seed", JSON.stringify(selectedLetter));
      if (Array.isArray(selectedLetter.sourceExperienceSnapshot)) {
        sessionStorage.setItem(
          "wizard_experience_snapshot",
          JSON.stringify(selectedLetter.sourceExperienceSnapshot),
        );
      }
    }
    const params = new URLSearchParams();
    params.set("coverLetterId", selectedLetter.id);
    if (selectedLetter.sourceExperienceIds?.length) {
      params.set("experienceIds", selectedLetter.sourceExperienceIds.join(","));
    }
    router.push(`/career/cover-letter-wizard?${params.toString()}`);
  };

  const handleSaveEdit = async () => {
    try {
      const nextQuestions =
        (editForm.questions || []).map((q) => ({
          ...q,
          answer: q.answer || "",
          status: ((q.answer || "").trim() ? "done" : "draft") as "done" | "draft",
          updatedAt: new Date().toISOString(),
        })) || [];
      const nextContent =
        buildContentFromQuestions(nextQuestions) || (editForm.content || "").trim();

      const payload = {
        ...(editForm as CoverLetterInput),
        questions: nextQuestions,
        content: nextContent,
      };

      const res = await saveCoverLetterAction(payload);
      if (res.success && res.coverLetter) {
        // saveCoverLetterAction 은 jsonb 측만 갱신하므로 enrichment(target, sourceResume) 는 보존.
        setLetters((prev) =>
          prev.map((letter) =>
            letter.id === res.coverLetter!.id
              ? {
                  ...letter,
                  ...res.coverLetter!,
                }
              : letter,
          ),
        );
        setSelectedId(res.coverLetter.id);
        setIsEditing(false);
      }
    } catch (error) {
      console.error(error);
      alert("저장 실패");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 이 자기소개서를 삭제하시겠습니까?")) return;
    try {
      await deleteCoverLetterAction(id);
      setLetters((prev) => prev.filter((letter) => letter.id !== id));
      if (selectedId === id) {
        setSelectedId(null);
        setIsEditing(false);
      }
    } catch (error) {
      console.error(error);
      alert("삭제 실패");
    }
  };

  const updateEditQuestion = (
    id: string,
    patch: { title?: string; maxChars?: number; answer?: string },
  ) => {
    setEditForm((prev) => ({
      ...prev,
      questions: (prev.questions || []).map((q) =>
        q.id === id
          ? {
              ...q,
              ...patch,
              status: (patch.answer ?? q.answer ?? "").trim() ? "done" : "draft",
              updatedAt: new Date().toISOString(),
            }
          : q,
      ),
    }));
  };

  const removeEditQuestion = (id: string) => {
    setEditForm((prev) => ({
      ...prev,
      questions: (prev.questions || []).filter((q) => q.id !== id),
    }));
  };

  const addEditQuestion = () => {
    const current = editForm.questions || [];
    if (current.length >= 6) return;
    setEditForm((prev) => ({
      ...prev,
      questions: [
        ...(prev.questions || []),
        {
          id: crypto.randomUUID(),
          title: "",
          maxChars: 500,
          answer: "",
          status: "draft",
          updatedAt: new Date().toISOString(),
        },
      ],
    }));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-10 md:pt-16 pb-24 animate-in fade-in duration-500">
      <div className="mb-8 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="whitespace-nowrap text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            자기소개서 관리
          </h1>
          <p className="text-[14px] text-slate-500 mt-1.5">
            왼쪽 목록에서 자소서를 고르고, 오른쪽에서 문항별로 관리하세요.
          </p>
        </div>
        <Button
          onClick={handleCreateNew}
          className="h-10 shrink-0 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-sm gap-2 text-[13px]"
        >
          <Plus className="w-4 h-4" />
          새 자소서 작성
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-16rem)] min-h-[620px]">
        <div className="w-full md:w-[340px] flex-shrink-0 flex flex-col bg-slate-50/60 border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 bg-white/70 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="자소서 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-[13px] outline-none focus:border-primary text-slate-700"
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-medium text-slate-500">정렬</span>
              <select
                value={sortOrder}
                onChange={(e) =>
                  setSortOrder(e.target.value === "deadline" ? "deadline" : "recent")
                }
                className="h-8 rounded-md border border-slate-200 bg-white px-2.5 text-[12px] text-slate-700 outline-none focus:border-primary"
              >
                <option value="recent">최신 생성순</option>
                <option value="deadline">마감일 임박순</option>
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 no-scrollbar">
            {filteredLetters.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">검색 결과가 없습니다.</div>
            ) : (
              filteredLetters.map((letter) => {
                const isActive = selectedId === letter.id;
                return (
                  <button
                    key={letter.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(letter.id);
                      setIsEditing(false);
                    }}
                    className={`w-full p-4 rounded-xl text-left transition-all border ${
                      isActive
                        ? "bg-white border-primary/30 shadow-sm ring-1 ring-primary/20"
                        : "bg-transparent border-transparent hover:bg-slate-100"
                    }`}
                  >
                    <h3
                      className={`font-semibold text-[14px] line-clamp-2 ${
                        isActive ? "text-primary" : "text-slate-700"
                      }`}
                    >
                      {letter.title || "(제목 없음)"}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                      {(letter.company || "").trim()} {letter.role ? `· ${letter.role}` : ""}
                    </p>
                    {(letter.targetPosting || letter.sourceResume) && (
                      <div className="mt-2 flex flex-wrap items-center gap-1">
                        {letter.targetPosting && (
                          <span
                            className="inline-flex max-w-full items-center gap-1 truncate rounded-full border border-primary/20 bg-primary/5 px-1.5 py-0.5 text-[9px] font-semibold text-primary"
                            title={`지원 대상: ${letter.targetPosting.companyName} · ${letter.targetPosting.roleTitle}`}
                          >
                            <Briefcase className="h-2.5 w-2.5 shrink-0" />
                            <span className="truncate">{letter.targetPosting.companyName}</span>
                          </span>
                        )}
                        {letter.sourceResume && (
                          <span
                            className="inline-flex max-w-full items-center gap-1 truncate rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-semibold text-slate-600"
                            title={`기반 이력서: ${letter.sourceResume.title}`}
                          >
                            <FileText className="h-2.5 w-2.5 shrink-0" />
                            <span className="truncate">{letter.sourceResume.title}</span>
                          </span>
                        )}
                      </div>
                    )}
                    <div className="mt-2 flex items-center justify-between gap-3 text-[10px] text-slate-500">
                      <span className="truncate">
                        생성 {formatDateLabel(letter.createdAt)}
                      </span>
                      <span className="truncate">
                        마감 {letter.deadline || "---"}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="flex-1 bg-white border border-slate-200 rounded-2xl flex flex-col overflow-hidden shadow-sm relative">
          {selectedLetter ? (
            <div className="flex flex-col h-full animate-in fade-in">
              <div className="absolute top-4 right-4 flex items-center gap-2">
                {!isEditing && (
                  <button
                    onClick={handleEditClick}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 text-[12px] font-semibold border border-slate-200"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    AI 편집
                  </button>
                )}
                {isEditing && (
                  <button
                    onClick={handleSaveEdit}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-[12px] font-semibold border border-primary/20"
                  >
                    <Save className="w-3.5 h-3.5" />
                    저장
                  </button>
                )}
                <button
                  onClick={() => handleDelete(selectedLetter.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-[12px] font-semibold border border-red-100"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  삭제
                </button>
              </div>

              <div className="px-8 pt-10 pb-6 border-b border-slate-100 mt-2">
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.title || ""}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full text-xl font-bold bg-transparent border-b border-slate-300 focus:border-primary outline-none text-slate-900 pb-1"
                    placeholder="자기소개서 제목을 입력하세요"
                  />
                ) : (
                  <h2 className="text-xl font-bold text-slate-900 leading-tight max-w-2xl">
                    {selectedLetter.title || "(제목 없음)"}
                  </h2>
                )}

                <div className="flex items-center gap-3 mt-4 text-[13px] text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    생성일:{" "}
                    {selectedLetter.createdAt ? formatDateLabel(selectedLetter.createdAt) : "---"}
                  </span>
                  <span>•</span>
                  <span>기업: {selectedLetter.company || "미입력"}</span>
                  <span>•</span>
                  <span>직무: {selectedLetter.role || "미입력"}</span>
                </div>

                <div className="mt-4 flex flex-wrap items-start gap-x-4 gap-y-3">
                  <CoverLetterTargetSection
                    coverLetterId={selectedLetter.id}
                    canEditTarget={selectedLetter.tableRowExists}
                    targetPosting={selectedLetter.targetPosting}
                    targetMeta={selectedLetter.targetMeta}
                    onChanged={(next) => {
                      setLetters((prev) =>
                        prev.map((l) =>
                          l.id === selectedLetter.id
                            ? {
                                ...l,
                                targetPosting: next.targetPosting,
                                targetMeta: next.targetMeta,
                              }
                            : l,
                        ),
                      );
                    }}
                  />
                  {selectedLetter.sourceResume && (
                    <button
                      type="button"
                      onClick={() => router.push("/career/resumes")}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600 transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                      title={`기반 이력서: ${selectedLetter.sourceResume.title}`}
                    >
                      <FileText className="h-3 w-3" />
                      <span className="max-w-[200px] truncate">
                        기반 이력서: {selectedLetter.sourceResume.title}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              <div
                ref={detailScrollRef}
                className="flex-1 overflow-y-auto overscroll-contain scroll-smooth no-scrollbar px-8 py-8"
                onScroll={handleDetailScroll}
              >
                <div className="space-y-10">
                  <section className="space-y-4">
                    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                      <div className="border-b border-slate-200 pb-2">
                        <h4 className="text-[13px] font-semibold tracking-[0.12em] text-slate-500 uppercase">
                          기업 / 직무 정보
                        </h4>
                      </div>
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <h4 className="text-[13px] font-semibold tracking-[0.12em] text-slate-500 uppercase">
                          기반 프로젝트
                        </h4>
                        <span className="text-[12px] font-semibold text-slate-500">
                          {(isEditing ? editingSourceExperiences : selectedSourceExperiences).length}개
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                      <div className="divide-y divide-slate-100 border-y border-slate-200">
                        {isEditing ? (
                          <>
                            <div className="grid grid-cols-[96px_1fr] items-center gap-4 py-3 text-xs">
                              <span className="text-slate-500">기업</span>
                              <input
                                type="text"
                                value={editForm.company || ""}
                                onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                                className="h-9 w-full border-0 border-b border-slate-300 bg-transparent px-0 text-sm text-slate-800 outline-none focus:border-primary"
                                placeholder="기업"
                              />
                            </div>
                            <div className="grid grid-cols-[96px_1fr] items-center gap-4 py-3 text-xs">
                              <span className="text-slate-500">사업부</span>
                              <input
                                type="text"
                                value={editForm.division || ""}
                                onChange={(e) => setEditForm({ ...editForm, division: e.target.value })}
                                className="h-9 w-full border-0 border-b border-slate-300 bg-transparent px-0 text-sm text-slate-800 outline-none focus:border-primary"
                                placeholder="사업부 (선택)"
                              />
                            </div>
                            <div className="grid grid-cols-[96px_1fr] items-center gap-4 py-3 text-xs">
                              <span className="text-slate-500">직무</span>
                              <input
                                type="text"
                                value={editForm.role || ""}
                                onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                                className="h-9 w-full border-0 border-b border-slate-300 bg-transparent px-0 text-sm text-slate-800 outline-none focus:border-primary"
                                placeholder="직무"
                              />
                            </div>
                            <div className="grid grid-cols-[96px_1fr] items-center gap-4 py-3 text-xs">
                              <span className="text-slate-500">마감일</span>
                              <input
                                type="date"
                                value={editForm.deadline || ""}
                                onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })}
                                className="h-9 w-full border-0 border-b border-slate-300 bg-transparent px-0 text-sm text-slate-800 outline-none focus:border-primary"
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="grid grid-cols-[96px_1fr] items-center gap-4 py-3 text-xs">
                              <span className="text-slate-500">기업</span>
                              <span className="font-medium text-slate-800">{selectedLetter.company || "미입력"}</span>
                            </div>
                            <div className="grid grid-cols-[96px_1fr] items-center gap-4 py-3 text-xs">
                              <span className="text-slate-500">사업부</span>
                              <span className="font-medium text-slate-800">{selectedLetter.division || "미입력"}</span>
                            </div>
                            <div className="grid grid-cols-[96px_1fr] items-center gap-4 py-3 text-xs">
                              <span className="text-slate-500">직무</span>
                              <span className="font-medium text-slate-800">{selectedLetter.role || "미입력"}</span>
                            </div>
                            <div className="grid grid-cols-[96px_1fr] items-center gap-4 py-3 text-xs">
                              <span className="text-slate-500">마감일</span>
                              <span className="font-medium text-slate-800">{selectedLetter.deadline || "미입력"}</span>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="space-y-3 self-start">
                        {(isEditing ? editingSourceExperiences : selectedSourceExperiences).length > 0 ? (
                          <div className="space-y-3">
                            {(isEditing ? editingSourceExperiences : selectedSourceExperiences).map((exp) => (
                              <div key={exp.id} className="border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
                                <p className="text-sm font-medium text-slate-800">{exp.title}</p>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {exp.tags.slice(0, 5).map((tag) => (
                                    <span
                                      key={`${exp.id}-${tag}`}
                                      className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] text-slate-600"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500">연결된 프로젝트 정보가 없습니다.</p>
                        )}
                      </div>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <h4 className="text-[13px] font-semibold tracking-[0.12em] text-slate-500 uppercase">
                        문항별 답안
                      </h4>
                      {isEditing && (
                        <button
                          type="button"
                          onClick={addEditQuestion}
                          disabled={(editForm.questions || []).length >= 6}
                          className="text-xs font-medium text-primary disabled:text-slate-400"
                        >
                          + 문항 추가
                        </button>
                      )}
                    </div>
                    {(isEditing ? editForm.questions : selectedLetter.questions || [])?.length ? (
                      <div className="divide-y divide-slate-200 border-y border-slate-200">
                        {(isEditing ? editForm.questions : selectedLetter.questions || [])?.map(
                          (q, index) => (
                            <article key={q.id} className="py-5">
                              {isEditing ? (
                                <div className="space-y-3">
                                  <div className="grid grid-cols-12 gap-3 items-end">
                                    <input
                                      type="text"
                                      value={q.title}
                                      onChange={(e) =>
                                        updateEditQuestion(q.id, { title: e.target.value })
                                      }
                                      className="col-span-8 border-0 border-b border-slate-300 bg-transparent px-0 py-2 text-sm font-medium text-slate-800 outline-none focus:border-primary"
                                      placeholder={`문항 ${index + 1}`}
                                    />
                                    <input
                                      type="number"
                                      min={1}
                                      value={q.maxChars}
                                      onChange={(e) =>
                                        updateEditQuestion(q.id, {
                                          maxChars: Number(e.target.value || 0),
                                        })
                                      }
                                      className="col-span-3 border-0 border-b border-slate-300 bg-transparent px-0 py-2 text-sm text-slate-700 outline-none focus:border-primary"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => removeEditQuestion(q.id)}
                                      className="col-span-1 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                  <Textarea
                                    value={q.answer || ""}
                                    onChange={(e) =>
                                      updateEditQuestion(q.id, { answer: e.target.value })
                                    }
                                    className="min-h-[120px] border-slate-200 bg-white/80 text-sm"
                                    placeholder="문항 답안을 입력하세요."
                                  />
                                  <p className="text-right text-[11px] text-slate-500">
                                    {(q.answer || "").length}/{q.maxChars}자
                                  </p>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between gap-3">
                                    <p className="text-sm font-semibold text-slate-800">
                                      {index + 1}. {q.title}
                                    </p>
                                    <span className="shrink-0 text-[11px] text-slate-500">
                                      {(q.answer || "").length}/{q.maxChars}자
                                    </span>
                                  </div>
                                  <div className="whitespace-pre-wrap text-[15px] leading-7 text-slate-700">
                                    {(q.answer || "").trim() || "아직 작성된 답안이 없습니다."}
                                  </div>
                                </div>
                              )}
                            </article>
                          ),
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">등록된 문항이 없습니다.</p>
                    )}
                  </section>

                  <div ref={detailBottomRef} />
                </div>
              </div>

              {hasDetailNewContent && !isDetailAtBottom ? (
                <div className="pointer-events-none absolute bottom-5 right-5 z-10">
                  <Button
                    type="button"
                    size="sm"
                    className="pointer-events-auto h-8 rounded-full bg-slate-900 px-3 text-xs text-white shadow-lg hover:bg-slate-800"
                    onClick={() => scrollDetailToBottom("smooth")}
                  >
                    <ArrowDown className="mr-1.5 h-3.5 w-3.5" />
                    최신 내용 보기
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center animate-in fade-in">
              <FileText className="w-12 h-12 mb-4 opacity-30" />
              <h3 className="text-lg font-semibold text-slate-500 mb-2">
                선택된 자기소개서가 없습니다.
              </h3>
              <p className="text-[13px] text-slate-500 max-w-md">
                좌측 목록에서 항목을 선택하거나, 새 자소서를 작성해보세요.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 자소서 디테일의 "지원 대상" 섹션.
 * - target_posting(FK) 있으면 정규화된 공고 정보 표시 + 클릭 시 공고 페이지 이동
 * - 없고 target_meta 있으면 free-form 정보 표시
 * - 둘 다 없으면 "공고 연결" 버튼만
 *
 * 변경 액션은 PATCH /api/my/cover-letters/{id} 호출. user_cover_letters 테이블에
 * 해당 row 가 있어야 함 (canEditTarget=true). jsonb 전용 자소서는 표시만.
 */
function CoverLetterTargetSection({
  coverLetterId,
  canEditTarget,
  targetPosting,
  targetMeta,
  onChanged,
}: {
  coverLetterId: string;
  canEditTarget: boolean;
  targetPosting: CoverLetterListItem["targetPosting"];
  targetMeta: CoverLetterListItem["targetMeta"];
  onChanged: (next: {
    targetPosting: CoverLetterListItem["targetPosting"];
    targetMeta: CoverLetterListItem["targetMeta"];
  }) => void;
}) {
  const router = useRouter();
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkPostings, setLinkPostings] = useState<JobPostingOption[]>([]);
  const [linkLoading, setLinkLoading] = useState(false);
  const [linking, setLinking] = useState(false);

  const openLinkPicker = async () => {
    setLinkOpen((prev) => !prev);
    if (linkPostings.length > 0) return;
    setLinkLoading(true);
    try {
      const res = await fetch("/api/my/job-postings?pageSize=50&sort=newest", {
        cache: "no-store",
      });
      const json = await res.json();
      if (json?.success) {
        setLinkPostings((json.data?.items ?? []) as JobPostingOption[]);
      }
    } finally {
      setLinkLoading(false);
    }
  };

  const linkToPosting = async (postingId: string | null) => {
    setLinking(true);
    try {
      const res = await fetch(`/api/my/cover-letters/${coverLetterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetJobPostingId: postingId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "연결 실패");
      const selected = postingId
        ? linkPostings.find((p) => p.id === postingId) ?? null
        : null;
      onChanged({
        targetPosting: selected
          ? {
              id: selected.id,
              companyName: selected.companyName,
              roleTitle: selected.roleTitle,
              status: selected.status,
            }
          : null,
        targetMeta: postingId ? null : targetMeta,
      });
      setLinkOpen(false);
    } catch (err) {
      console.error(err);
      alert("공고 연결에 실패했습니다.");
    } finally {
      setLinking(false);
    }
  };

  const hasAny = Boolean(targetPosting || (targetMeta && (targetMeta.company || targetMeta.role)));

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        {targetPosting ? (
          <button
            type="button"
            onClick={() => router.push(`/my/job-postings/${targetPosting.id}`)}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/10"
            title={`지원 대상: ${targetPosting.companyName} · ${targetPosting.roleTitle}`}
          >
            <Briefcase className="h-3 w-3" />
            <span className="max-w-[160px] truncate">{targetPosting.companyName}</span>
            <span className="text-primary/60">·</span>
            <span className="max-w-[120px] truncate text-primary/80">{targetPosting.roleTitle}</span>
          </button>
        ) : targetMeta && (targetMeta.company || targetMeta.role) ? (
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-slate-300 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600"
            title="직접 입력된 정보. 공고에 연결하면 동기화됩니다."
          >
            <Briefcase className="h-3 w-3" />
            <span className="max-w-[160px] truncate">{targetMeta.company || "기업 미입력"}</span>
            {targetMeta.role && (
              <>
                <span className="text-slate-400">·</span>
                <span className="max-w-[120px] truncate text-slate-500">{targetMeta.role}</span>
              </>
            )}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-slate-300 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-400">
            <Briefcase className="h-3 w-3" />
            지원 대상 없음
          </span>
        )}

        {canEditTarget && (
          <button
            type="button"
            onClick={openLinkPicker}
            className="text-[11px] font-semibold text-slate-400 transition-colors hover:text-primary"
          >
            {hasAny ? "변경" : "공고 연결"}
          </button>
        )}
      </div>

      {linkOpen && (
        <div className="absolute left-0 top-full z-20 mt-2 max-h-60 w-72 overflow-y-auto rounded-md border bg-white p-1 shadow-md">
          {linkLoading ? (
            <div className="flex items-center gap-1.5 px-2 py-2 text-[11px] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> 불러오는 중…
            </div>
          ) : linkPostings.length === 0 ? (
            <p className="px-2 py-2 text-[11px] text-muted-foreground">
              등록된 공고가 없습니다.
            </p>
          ) : (
            <>
              {hasAny && (
                <button
                  type="button"
                  onClick={() => void linkToPosting(null)}
                  disabled={linking}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-[11px] text-slate-500 transition-colors hover:bg-muted disabled:opacity-50"
                >
                  연결 해제
                </button>
              )}
              {linkPostings.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => void linkToPosting(p.id)}
                  disabled={linking || p.id === targetPosting?.id}
                  className="flex w-full flex-col items-start gap-0 rounded-sm px-2 py-1.5 text-left transition-colors hover:bg-muted disabled:opacity-50"
                >
                  <span className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">
                    {p.companyName}
                  </span>
                  <span className="truncate text-[12px] font-bold text-foreground">
                    {p.roleTitle}
                  </span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
