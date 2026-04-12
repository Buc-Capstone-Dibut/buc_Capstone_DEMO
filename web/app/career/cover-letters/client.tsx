"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Edit3, FileText, Plus, Save, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  saveCoverLetterAction,
  deleteCoverLetterAction,
  type CoverLetterInput,
} from "./actions";

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
  initialLetters: CoverLetterInput[];
}) {
  const router = useRouter();
  const [letters, setLetters] = useState<CoverLetterInput[]>(initialLetters || []);
  const [selectedId, setSelectedId] = useState<string | null>(
    letters.length > 0 ? letters[0].id : null,
  );
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<CoverLetterInput>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"recent" | "deadline">("recent");

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

  const handleCreateNew = () => {
    router.push("/career/experiences");
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
        setLetters((prev) =>
          prev.map((letter) => (letter.id === res.coverLetter!.id ? res.coverLetter! : letter)),
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            자기소개서 관리
          </h1>
          <p className="text-[14px] text-slate-500 mt-1.5">
            왼쪽 목록에서 자소서를 고르고, 오른쪽에서 문항별로 관리하세요.
          </p>
        </div>
        <Button
          onClick={handleCreateNew}
          className="h-10 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-sm gap-2 text-[13px]"
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
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar px-8 py-8">
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
                          기반 경험
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
                          <p className="text-xs text-slate-500">연결된 경험 정보가 없습니다.</p>
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

                </div>
              </div>
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
