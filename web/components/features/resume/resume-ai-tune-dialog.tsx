"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import type { ResumePayload } from "@/app/my/[handle]/profile-types";

// =====================
// Option types
// =====================

export type Tone = "formal" | "casual" | "impact" | "custom";
export type Length = "concise" | "standard" | "detailed";
export type HighlightArea = "skills" | "experience" | "projects" | "selfIntro" | "education";
export type SelfIntroStyle =
  | "growth"
  | "challenge"
  | "collaboration"
  | "achievement"
  | "custom";
export type Strength = "polish" | "enhance" | "rewrite";

export interface NormalizeOptions {
  tone: Tone;
  toneCustom?: string;
  length: Length;
  highlights: HighlightArea[];
  targetRole?: string;
  selfIntroStyle: SelfIntroStyle;
  selfIntroStyleCustom?: string;
  strength: Strength;
  notes?: string;
}

export interface ResumeAiTuneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPayload: ResumePayload;
  /**
   * AI 가공 완료 시 호출. 이전 payload 복원(Undo)은 호출 쪽이 책임진다.
   */
  onApply: (newPayload: ResumePayload, summary: string) => void;
}

// =====================
// Constants
// =====================

const TONE_OPTIONS: Array<{ value: Tone; label: string; hint?: string }> = [
  { value: "formal", label: "격식체", hint: "정중하고 공식적인 문체" },
  { value: "casual", label: "캐주얼", hint: "자연스럽고 친근한 문체" },
  { value: "impact", label: "임팩트 있게", hint: "강하고 명료한 문체" },
  { value: "custom", label: "직접 입력", hint: "원하는 톤을 자유롭게" },
];

const LENGTH_OPTIONS: Array<{ value: Length; label: string; hint: string }> = [
  { value: "concise", label: "1페이지로 압축", hint: "핵심만 담는 짧은 분량" },
  { value: "standard", label: "2페이지 표준", hint: "균형 잡힌 표준 분량" },
  { value: "detailed", label: "3페이지+ 상세", hint: "경험·성과까지 자세히" },
];

const HIGHLIGHT_OPTIONS: Array<{ value: HighlightArea; label: string }> = [
  { value: "skills", label: "기술 스택" },
  { value: "experience", label: "경력" },
  { value: "projects", label: "프로젝트" },
  { value: "selfIntro", label: "자기소개" },
  { value: "education", label: "학력" },
];

const SELF_INTRO_STYLE_OPTIONS: Array<{
  value: SelfIntroStyle;
  label: string;
  hint?: string;
}> = [
  { value: "growth", label: "성장 중심", hint: "꾸준한 성장과 학습 강조" },
  { value: "challenge", label: "도전 중심", hint: "새로운 시도와 변화 강조" },
  { value: "collaboration", label: "협업 중심", hint: "팀워크·커뮤니케이션 강조" },
  { value: "achievement", label: "성과 중심", hint: "구체적 결과·임팩트 강조" },
  { value: "custom", label: "직접 입력", hint: "원하는 방향을 직접" },
];

const STRENGTH_OPTIONS: Array<{ value: Strength; label: string; hint: string }> = [
  { value: "polish", label: "가볍게 다듬기", hint: "오타·문법만 정리합니다." },
  { value: "enhance", label: "표현 보강", hint: "구조는 유지하고 표현만 다듬습니다." },
  {
    value: "rewrite",
    label: "전면 재작성",
    hint: "사실은 보존하되 톤·구조를 크게 바꿉니다.",
  },
];

// =====================
// Presets
// =====================

interface Preset {
  id: "junior" | "senior" | "career-change";
  title: string;
  description: string;
  options: NormalizeOptions;
}

const PRESETS: Preset[] = [
  {
    id: "junior",
    title: "신입",
    description: "1페이지, 성장 중심, 가볍게",
    options: {
      tone: "formal",
      length: "concise",
      highlights: ["skills", "education", "selfIntro"],
      selfIntroStyle: "growth",
      strength: "polish",
    },
  },
  {
    id: "senior",
    title: "경력",
    description: "2페이지 표준, 성과 중심",
    options: {
      tone: "formal",
      length: "standard",
      highlights: ["experience", "projects", "skills"],
      selfIntroStyle: "achievement",
      strength: "enhance",
    },
  },
  {
    id: "career-change",
    title: "도전 직무",
    description: "상세 분량, 도전 중심, 재작성",
    options: {
      tone: "impact",
      length: "detailed",
      highlights: ["projects", "selfIntro", "experience"],
      selfIntroStyle: "challenge",
      strength: "rewrite",
    },
  },
];

// =====================
// Label maps (for summary)
// =====================

const TONE_LABEL: Record<Tone, string> = {
  formal: "격식체",
  casual: "캐주얼 톤",
  impact: "임팩트 톤",
  custom: "맞춤 톤",
};

const LENGTH_LABEL: Record<Length, string> = {
  concise: "1페이지 압축",
  standard: "표준 길이",
  detailed: "상세 분량",
};

const HIGHLIGHT_LABEL: Record<HighlightArea, string> = {
  skills: "기술",
  experience: "경력",
  projects: "프로젝트",
  selfIntro: "자기소개",
  education: "학력",
};

const SELF_INTRO_STYLE_LABEL: Record<SelfIntroStyle, string> = {
  growth: "성장 중심",
  challenge: "도전 중심",
  collaboration: "협업 중심",
  achievement: "성과 중심",
  custom: "맞춤 스타일",
};

const STRENGTH_LABEL: Record<Strength, string> = {
  polish: "가볍게 다듬기",
  enhance: "표현 보강",
  rewrite: "전면 재작성",
};

function generateSummary(options: NormalizeOptions): string {
  const parts: string[] = [];
  parts.push(LENGTH_LABEL[options.length]);
  parts.push(TONE_LABEL[options.tone]);
  if (options.highlights.length > 0) {
    const labels = options.highlights.map((h) => HIGHLIGHT_LABEL[h]);
    parts.push(`${labels.join("/")} 강조`);
  }
  parts.push(STRENGTH_LABEL[options.strength]);
  if (options.targetRole && options.targetRole.trim()) {
    parts.push(`타겟: ${options.targetRole.trim()}`);
  }
  return parts.join(" · ");
}

// =====================
// Component
// =====================

export function ResumeAiTuneDialog({
  open,
  onOpenChange,
  currentPayload,
  onApply,
}: ResumeAiTuneDialogProps) {
  const [tone, setTone] = useState<Tone>("formal");
  const [toneCustom, setToneCustom] = useState("");
  const [length, setLength] = useState<Length>("standard");
  const [highlights, setHighlights] = useState<HighlightArea[]>([
    "experience",
    "projects",
    "skills",
  ]);
  const [targetRole, setTargetRole] = useState("");
  const [selfIntroStyle, setSelfIntroStyle] = useState<SelfIntroStyle>("growth");
  const [selfIntroStyleCustom, setSelfIntroStyleCustom] = useState("");
  const [strength, setStrength] = useState<Strength>("enhance");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<Preset["id"] | null>(null);

  const applyPreset = (preset: Preset) => {
    setSelectedPreset(preset.id);
    setTone(preset.options.tone);
    setToneCustom("");
    setLength(preset.options.length);
    setHighlights(preset.options.highlights);
    setSelfIntroStyle(preset.options.selfIntroStyle);
    setSelfIntroStyleCustom("");
    setStrength(preset.options.strength);
  };

  const toggleHighlight = (value: HighlightArea, checked: boolean) => {
    setSelectedPreset(null);
    setHighlights((prev) =>
      checked ? Array.from(new Set([...prev, value])) : prev.filter((h) => h !== value),
    );
  };

  const collectOptions = (): NormalizeOptions => ({
    tone,
    toneCustom: tone === "custom" ? toneCustom.trim() || undefined : undefined,
    length,
    highlights,
    targetRole: targetRole.trim() || undefined,
    selfIntroStyle,
    selfIntroStyleCustom:
      selfIntroStyle === "custom" ? selfIntroStyleCustom.trim() || undefined : undefined,
    strength,
    notes: notes.trim() || undefined,
  });

  const handleSubmit = async () => {
    setError(null);
    const options = collectOptions();
    setSubmitting(true);
    try {
      const res = await fetch("/api/career/resumes/normalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: currentPayload, options }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json || json.success !== true || !json.data) {
        const message =
          (json && typeof json.error === "string" && json.error) ||
          "AI 가공에 실패했습니다.";
        throw new Error(message);
      }
      onApply(json.data as ResumePayload, generateSummary(options));
      onOpenChange(false);
    } catch (e) {
      const message = e instanceof Error ? e.message : "AI 가공 중 오류가 발생했습니다.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (submitting) return; // 로딩 중 닫기 방지
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            이력서 AI 정렬
          </DialogTitle>
          <DialogDescription>
            한국식 A4 양식에 맞게 본문을 다듬어 드릴게요. 톤·길이·강조 영역을 골라
            나만의 가공 결과를 만들어보세요.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          {/* 1) 추천 프리셋 */}
          <section className="space-y-2">
            <Label className="text-sm font-medium">추천 프리셋</Label>
            <p className="text-xs text-muted-foreground">
              빠르게 시작하려면 아래 프리셋 하나를 선택하세요. 이후 자유롭게 수정할 수
              있습니다.
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {PRESETS.map((preset) => {
                const active = selectedPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className={cn(
                      "rounded-lg border p-3 text-left transition-colors",
                      "hover:border-primary/60 hover:bg-primary/5",
                      active
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card",
                    )}
                  >
                    <div className="text-sm font-semibold">{preset.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {preset.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <Separator />

          {/* 2) 톤 */}
          <section className="space-y-2">
            <Label className="text-sm font-medium">톤</Label>
            <RadioGroup
              value={tone}
              onValueChange={(v) => {
                setSelectedPreset(null);
                setTone(v as Tone);
              }}
              className="grid grid-cols-2 gap-2"
            >
              {TONE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={cn(
                    "flex items-start gap-2 rounded-md border p-2.5 cursor-pointer transition-colors",
                    tone === opt.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50",
                  )}
                >
                  <RadioGroupItem value={opt.value} id={`tone-${opt.value}`} className="mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{opt.label}</div>
                    {opt.hint && (
                      <div className="text-xs text-muted-foreground">{opt.hint}</div>
                    )}
                  </div>
                </label>
              ))}
            </RadioGroup>
            {tone === "custom" && (
              <Textarea
                rows={2}
                value={toneCustom}
                onChange={(e) => setToneCustom(e.target.value)}
                placeholder="원하는 톤을 자유롭게 입력하세요. (예: '간결하고 단호한 어조')"
              />
            )}
          </section>

          {/* 3) 길이 */}
          <section className="space-y-2">
            <Label className="text-sm font-medium">길이</Label>
            <RadioGroup
              value={length}
              onValueChange={(v) => {
                setSelectedPreset(null);
                setLength(v as Length);
              }}
              className="grid grid-cols-1 gap-2 sm:grid-cols-3"
            >
              {LENGTH_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={cn(
                    "flex items-start gap-2 rounded-md border p-2.5 cursor-pointer transition-colors",
                    length === opt.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50",
                  )}
                >
                  <RadioGroupItem value={opt.value} id={`length-${opt.value}`} className="mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{opt.label}</div>
                    <div className="text-xs text-muted-foreground">{opt.hint}</div>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </section>

          {/* 4) 강조 영역 */}
          <section className="space-y-2">
            <Label className="text-sm font-medium">강조 영역</Label>
            <p className="text-xs text-muted-foreground">
              가공 시 더 비중 있게 다룰 영역을 선택하세요. (다중 선택)
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {HIGHLIGHT_OPTIONS.map((opt) => {
                const checked = highlights.includes(opt.value);
                return (
                  <label
                    key={opt.value}
                    className={cn(
                      "flex items-center gap-2 rounded-md border p-2.5 cursor-pointer transition-colors",
                      checked
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50",
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => toggleHighlight(opt.value, v === true)}
                      id={`highlight-${opt.value}`}
                    />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                );
              })}
            </div>
          </section>

          {/* 5) 타겟 직무 */}
          <section className="space-y-2">
            <Label htmlFor="target-role" className="text-sm font-medium">
              타겟 직무 (선택)
            </Label>
            <Input
              id="target-role"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="예: 백엔드 개발자, 프론트엔드 신입"
            />
          </section>

          {/* 6) 자기소개 스타일 */}
          <section className="space-y-2">
            <Label className="text-sm font-medium">자기소개 스타일</Label>
            <RadioGroup
              value={selfIntroStyle}
              onValueChange={(v) => {
                setSelectedPreset(null);
                setSelfIntroStyle(v as SelfIntroStyle);
              }}
              className="grid grid-cols-1 gap-2 sm:grid-cols-2"
            >
              {SELF_INTRO_STYLE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={cn(
                    "flex items-start gap-2 rounded-md border p-2.5 cursor-pointer transition-colors",
                    selfIntroStyle === opt.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50",
                  )}
                >
                  <RadioGroupItem
                    value={opt.value}
                    id={`self-intro-${opt.value}`}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{opt.label}</div>
                    {opt.hint && (
                      <div className="text-xs text-muted-foreground">{opt.hint}</div>
                    )}
                  </div>
                </label>
              ))}
            </RadioGroup>
            {selfIntroStyle === "custom" && (
              <Textarea
                rows={2}
                value={selfIntroStyleCustom}
                onChange={(e) => setSelfIntroStyleCustom(e.target.value)}
                placeholder="자기소개에 담고 싶은 방향을 자유롭게 입력하세요."
              />
            )}
          </section>

          {/* 7) 가공 강도 */}
          <section className="space-y-2">
            <Label className="text-sm font-medium">가공 강도</Label>
            <RadioGroup
              value={strength}
              onValueChange={(v) => {
                setSelectedPreset(null);
                setStrength(v as Strength);
              }}
              className="grid gap-2"
            >
              {STRENGTH_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={cn(
                    "flex items-start gap-2 rounded-md border p-2.5 cursor-pointer transition-colors",
                    strength === opt.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50",
                  )}
                >
                  <RadioGroupItem
                    value={opt.value}
                    id={`strength-${opt.value}`}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{opt.label}</div>
                    <div className="text-xs text-muted-foreground">{opt.hint}</div>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </section>

          {/* 8) 사용자 메모 */}
          <section className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              사용자 메모 (선택)
            </Label>
            <Textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="특별히 강조하고 싶은 내용이나 요청사항을 자유롭게 적어주세요. (예: '데이터 분석 경험을 강조해주세요')"
            />
          </section>

          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            취소
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                가공 중...
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                AI로 가공하기
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ResumeAiTuneDialog;
