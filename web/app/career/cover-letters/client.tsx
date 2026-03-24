"use client";

import { useState } from "react";
import { Plus, Edit3, Trash2, Search, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveCoverLetterAction, deleteCoverLetterAction, type CoverLetterInput } from "./actions";

export default function CoverLettersClient({ initialLetters }: { initialLetters: CoverLetterInput[] }) {
  const [letters, setLetters] = useState<CoverLetterInput[]>(initialLetters || []);
  const [selectedId, setSelectedId] = useState<string | null>(letters.length > 0 ? letters[0].id : null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<CoverLetterInput>>({});
  const [searchQuery, setSearchQuery] = useState("");

  const selectedLetter = letters.find(l => l.id === selectedId);

  const filteredLetters = letters.filter(l => 
    l.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    l.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateNew = async () => {
    try {
      const newLetter: CoverLetterInput = {
        id: "", // Will be assigned by server
        title: "새로운 자기소개서",
        content: "내용을 입력하세요...",
        createdAt: new Date().toISOString(),
        sourceExperienceIds: []
      };
      
      const res = await saveCoverLetterAction(newLetter);
      if (res.success && res.coverLetter) {
        setLetters([res.coverLetter, ...letters]);
        setSelectedId(res.coverLetter.id);
        setIsEditing(true);
        setEditForm(res.coverLetter);
      }
    } catch (err) {
      console.error(err);
      alert("생성 실패");
    }
  };

  const handleEditClick = () => {
    if (selectedLetter) {
      setEditForm(selectedLetter);
      setIsEditing(true);
    }
  };

  const handleSaveEdit = async () => {
    try {
      const res = await saveCoverLetterAction(editForm as CoverLetterInput);
      if (res.success && res.coverLetter) {
        setLetters(prev => prev.map(l => l.id === res.coverLetter!.id ? res.coverLetter! : l));
        setIsEditing(false);
      }
    } catch (err) {
      console.error(err);
      alert("저장 실패");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 이 자기소개서를 삭제하시겠습니까?")) return;
    try {
      await deleteCoverLetterAction(id);
      setLetters(prev => prev.filter(l => l.id !== id));
      if (selectedId === id) {
        setSelectedId(null);
        setIsEditing(false);
      }
    } catch (err) {
      console.error(err);
      alert("삭제 실패");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-10 md:pt-16 pb-24 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">자기소개서 관리</h1>
          <p className="text-[14px] text-slate-500 mt-1.5">선택한 자소서를 우측 창에서 바로 읽고 편집하세요.</p>
        </div>
        <Button onClick={handleCreateNew} className="h-10 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 dark:text-slate-900 text-white font-semibold shadow-sm gap-2 transition-all text-[13px]">
          <Plus className="w-4 h-4" /> 새 자소서 작성
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-16rem)] min-h-[600px]">
        {/* Left Pane: List */}
        <div className="w-full md:w-[340px] flex-shrink-0 flex flex-col bg-slate-50/50 dark:bg-[#111]/50 border border-slate-200 dark:border-slate-800/60 rounded-2xl overflow-hidden shadow-sm">
          
          <div className="p-4 border-b border-slate-200 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="자소서 검색..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-[13px] outline-none focus:border-primary transition-colors text-slate-700 dark:text-slate-200"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 no-scrollbar">
            {filteredLetters.length === 0 ? (
               <div className="p-8 text-center text-slate-400 text-sm">
                 검색 결과가 없습니다.
               </div>
            ) : filteredLetters.map((letter) => {
              const isActive = selectedId === letter.id;
              const dateObj = new Date(letter.createdAt);
              const dateStr = !isNaN(dateObj.getTime()) ? `${dateObj.getFullYear()}.${String(dateObj.getMonth() + 1).padStart(2, '0')}.${String(dateObj.getDate()).padStart(2, '0')}` : "---";
              
              return (
                <div 
                  key={letter.id}
                  onClick={() => { setSelectedId(letter.id); setIsEditing(false); }}
                  className={`p-4 rounded-xl cursor-pointer transition-all border ${isActive ? 'bg-white dark:bg-slate-900 border-primary/30 shadow-sm ring-1 ring-primary/20' : 'bg-transparent border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}
                >
                  <h3 className={`font-semibold text-[14px] line-clamp-2 ${isActive ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}>
                    {letter.title || "(제목 없음)"}
                  </h3>
                  <p className="text-[12px] text-slate-500 mt-1.5 line-clamp-1">{letter.content || "내용이 없습니다."}</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200/50 dark:border-slate-700/50">{dateStr}</span>
                    {letter.sourceExperienceIds?.length > 0 && (
                      <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">{letter.sourceExperienceIds.length}개의 바탕 경험</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Pane: Preview / Editor */}
        <div className="flex-1 bg-white dark:bg-[#111] border border-slate-200 dark:border-slate-800/60 rounded-2xl flex flex-col overflow-hidden shadow-sm relative">
          
          {selectedLetter ? (
            <div className="flex flex-col h-full animate-in fade-in">
              {/* Toolbar */}
              <div className="absolute top-4 right-4 flex items-center gap-2">
                {!isEditing && (
                  <button onClick={handleEditClick} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-[12px] font-semibold transition-colors border border-slate-200 dark:border-slate-700">
                    <Edit3 className="w-3.5 h-3.5" /> 편집
                  </button>
                )}
                {isEditing && (
                  <button onClick={handleSaveEdit} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 dark:bg-primary/20 dark:hover:bg-primary/30 text-primary text-[12px] font-semibold transition-colors border border-primary/20">
                    저장
                  </button>
                )}
                <button onClick={() => handleDelete(selectedLetter.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 text-[12px] font-semibold transition-colors border border-red-100 dark:border-red-900/50">
                  <Trash2 className="w-3.5 h-3.5" /> 삭제
                </button>
              </div>

              {/* Editor Header */}
              <div className="px-8 pt-10 pb-6 border-b border-slate-100 dark:border-slate-800/80 mt-2">
                {isEditing ? (
                  <input 
                    type="text" 
                    value={editForm.title || ""} 
                    onChange={e => setEditForm({...editForm, title: e.target.value})}
                    className="w-full text-xl font-bold bg-transparent border-b border-slate-300 dark:border-slate-700 focus:border-primary outline-none text-slate-900 dark:text-white pb-1"
                    placeholder="자기소개서 제목을 입력하세요"
                  />
                ) : (
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight max-w-2xl">
                    {selectedLetter.title || "(제목 없음)"}
                  </h2>
                )}
                
                <div className="flex items-center gap-3 mt-4 text-[13px] text-slate-500">
                  <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> 생성일: {selectedLetter.createdAt ? new Date(selectedLetter.createdAt).toLocaleDateString() : "---"}</span>
                  <span>•</span>
                  <span>글자수: {(isEditing ? editForm.content?.length : selectedLetter.content?.length) || 0}자</span>
                </div>
              </div>
              
              {/* Editor Content */}
              <div className="p-8 flex-1 overflow-y-auto no-scrollbar">
                {isEditing ? (
                   <textarea 
                     value={editForm.content || ""}
                     onChange={e => setEditForm({...editForm, content: e.target.value})}
                     className="w-full h-full min-h-[400px] resize-none bg-transparent outline-none prose prose-slate dark:prose-invert prose-sm max-w-3xl leading-loose text-[14px] text-slate-700 dark:text-slate-300 placeholder:text-slate-300 dark:placeholder:text-slate-600"
                     placeholder="자기소개서 내용을 작성해주세요..."
                   />
                ) : (
                  <div className="prose prose-slate dark:prose-invert prose-sm max-w-3xl leading-loose text-[14px] text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {selectedLetter.content || "저장된 내용이 없습니다."}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center animate-in fade-in">
              <FileText className="w-12 h-12 mb-4 opacity-30" />
              <h3 className="text-lg font-semibold text-slate-500 mb-2">선택된 자기소개서가 없습니다.</h3>
              <p className="text-[13px] text-slate-500 max-w-md">좌측 목록에서 항목을 선택하거나, 새 자소서를 작성해보세요.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
