import { BookOpen, Loader2, ChevronLeft } from "lucide-react";
import { useEffect, useState } from "react";
import type { PublicResumeSummary, ResumePayload } from "../profile-types";
import { ResumeEditor } from "./resume-editor";
import { ResumeList } from "./resume-list";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { normalizeResumePayload } from "../profile-utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ResumeTabProps {
  isOwner: boolean;
}

export function ResumeTab({ isOwner }: ResumeTabProps) {
  const [viewMode, setViewMode] = useState<"list" | "editor">("list");
  const [resumes, setResumes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [currentPayload, setCurrentPayload] = useState<ResumePayload | null>(null);
  const [currentTitle, setCurrentTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [resumeSummary, setResumeSummary] = useState<PublicResumeSummary | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingResumeId, setPendingResumeId] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const fetchResumes = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/my/resume", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "목록을 불러오지 못했습니다.");
      setResumes(json.data.items || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchResumeDetail = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/my/resume/${id}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "상세 내용을 불러오지 못했습니다.");
      setSelectedResumeId(id);
      
      const payload = json.data.resume_payload || json.data.resumePayload;
      setCurrentPayload(normalizeResumePayload(payload));
      
      setCurrentTitle(json.data.title || "");
      setResumeSummary(json.data.public_summary);
      setViewMode("editor");
    } catch (err: any) {
      toast({ title: "불러오기 실패", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOwner) {
      fetchResumes();
    }
  }, [isOwner]);

  const handleSelectItem = (id: string) => {
    fetchResumeDetail(id);
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/my/resume/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("삭제 중 오류가 발생했습니다.");
      setResumes((prev) => prev.filter((r) => r.id !== id));
      toast({ title: "이력서 삭제됨" });
    } catch (err: any) {
      toast({ title: "삭제 실패", description: err.message, variant: "destructive" });
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    // If we are making one public, check if another is already public
    if (!currentStatus) {
      const activeResume = resumes.find(r => r.is_active && r.id !== id);
      if (activeResume) {
        setPendingResumeId(id);
        setConfirmOpen(true);
        return;
      }
    }

    // Otherwise proceed with direct toggle
    await executeToggle(id, currentStatus);
  };

  const executeToggle = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/my/resume/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus })
      });
      if (!res.ok) throw new Error("상태 변경 중 오류가 발생했습니다.");

      // Update local state for immediate feedback
      setResumes((prev) =>
        prev.map((r) => {
          if (r.id === id) return { ...r, is_active: !currentStatus };
          // If we just made one active, all others must become inactive
          if (!currentStatus && r.id !== id) return { ...r, is_active: false };
          return r;
        })
      );

      toast({
        title: !currentStatus ? "이력서가 공개되었습니다." : "이력서가 비공개 처리되었습니다.",
        description: !currentStatus ? "프로필 페이지에 노출됩니다." : "프로필 페이지에서 숨겨집니다."
      });
    } catch (err: any) {
      toast({ title: "변경 실패", description: err.message, variant: "destructive" });
    }
  };

  const handleCreateNew = () => {
    router.push("/resume?mode=setup");
  };

  const handleSave = async () => {
    if (!currentPayload) return;
    setSaving(true);
    try {
      const url = selectedResumeId ? `/api/my/resume/${selectedResumeId}` : "/api/my/resume";
      const method = selectedResumeId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: currentTitle.trim() || (currentPayload.personalInfo.name ? `${currentPayload.personalInfo.name}의 이력서` : "제목 없는 이력서"),
          resumePayload: currentPayload
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "저장 실패");

      toast({ title: "이력서가 저장되었습니다." });
      setViewMode("list");
      fetchResumes();
    } catch (err: any) {
      toast({ title: "저장 실패", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!isOwner) {
    // Read-only public summary view (simplified)
    return (
      <div className="rounded-xl border bg-card px-5 py-6">
        <p className="text-sm text-muted-foreground text-center">공개된 이력서가 없습니다.</p>
      </div>
    );
  }

  if (loading && viewMode === "list") {
    return (
      <div className="flex items-center justify-center py-14 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        이력서를 불러오는 중...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {viewMode === "editor" ? (
        <div className="space-y-4">
          <button
            onClick={() => setViewMode("list")}
            className="flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ChevronLeft className="w-3 h-3 mr-1" /> 목록으로 돌아가기
          </button>
          {currentPayload && (
            <ResumeEditor
              payload={currentPayload}
              onChange={setCurrentPayload}
              onSave={handleSave}
              saving={saving}
              onGoSetup={() => { }}
              title={currentTitle}
              onTitleChange={setCurrentTitle}
            />
          )}
        </div>
      ) : (
        <ResumeList
          items={resumes}
          onSelectItem={handleSelectItem}
          onDeleteItem={handleDeleteItem}
          onToggleActive={handleToggleActive}
          onCreateNew={handleCreateNew}
        />
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>공개 이력서 전환</AlertDialogTitle>
            <AlertDialogDescription>
              이미 공개된 다른 이력서가 있습니다. 이 이력서를 공개하면 기존 이력서는 비공개로 변경됩니다. 계속하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingResumeId) {
                  executeToggle(pendingResumeId, false); // false means currently inactive, so we're making it active
                  setPendingResumeId(null);
                }
              }}
            >
              확인
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
