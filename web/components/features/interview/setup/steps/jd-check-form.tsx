"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Plus, Trash2, Building2, Briefcase, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { JobData } from "@/store/interview-setup-store";
import { TechLogoChip } from "@/components/features/interview/tech-logo-chip";
import { InlineRow } from "./resume-check-form";

interface JdCheckFormProps {
  jobData: JobData;
  updateJobData: (data: Partial<JobData>) => void;
}

type ListField = "requirements" | "responsibilities" | "teamCulture";

export function JdCheckForm({ jobData, updateJobData }: JdCheckFormProps) {
  const [newTech, setNewTech] = useState("");
  const [newReq, setNewReq] = useState("");
  const [newResp, setNewResp] = useState("");
  const [newCulture, setNewCulture] = useState("");

  const techCount = jobData.techStack?.length ?? 0;
  const respCount = jobData.responsibilities?.length ?? 0;
  const reqCount = jobData.requirements?.length ?? 0;
  const cultureCount = (jobData.teamCulture ?? []).length;

  const addToList = (
    value: string,
    field: ListField | "techStack",
    setter: (v: string) => void,
  ) => {
    if (!value.trim()) return;
    const current = (jobData as unknown as Record<string, unknown>)[field] as string[] | undefined;
    updateJobData({ [field]: [...(current ?? []), value.trim()] } as Partial<JobData>);
    setter("");
  };

  const removeFromList = (index: number, field: ListField | "techStack") => {
    const current = (jobData as unknown as Record<string, unknown>)[field] as string[] | undefined;
    const next = [...(current ?? [])];
    next.splice(index, 1);
    updateJobData({ [field]: next } as Partial<JobData>);
  };

  const updateListItem = (
    index: number,
    value: string,
    field: ListField,
  ) => {
    const current = (jobData as unknown as Record<string, unknown>)[field] as string[] | undefined;
    const next = [...(current ?? [])];
    next[index] = value;
    updateJobData({ [field]: next } as Partial<JobData>);
  };

  return (
    <div className="grid gap-4">
      {/* 1. 기본 정보 */}
      <Card>
        <CardHeader className="border-b pb-3 pt-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden />
            기본 정보 & 기업 소개
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y p-2">
          <InlineRow
            label="포지션"
            value={jobData.role}
            onChange={(v) => updateJobData({ role: v })}
            placeholder="예: 백엔드 엔지니어"
          />
          <InlineRow
            label="기업명"
            value={jobData.company}
            onChange={(v) => updateJobData({ company: v })}
            placeholder="예: 토스"
          />
          <InlineRow
            label="기업 소개"
            multiline
            value={jobData.companyDescription || ""}
            onChange={(v) => updateJobData({ companyDescription: v })}
            placeholder="이 기업은 어떤 서비스를 만들고 있나요?"
          />
        </CardContent>
      </Card>

      {/* 2. 기술 스택 */}
      <Card>
        <CardHeader className="border-b pb-3 pt-4">
          <CardTitle className="flex items-center gap-2 text-base">
            기술 스택
            {techCount > 0 && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {techCount}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          {techCount > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              <AnimatePresence>
                {jobData.techStack.map((tech, i) => (
                  <motion.div
                    key={`${tech}-${i}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    <TechLogoChip
                      label={tech}
                      onRemove={() => removeFromList(i, "techStack")}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <p className="rounded-md border border-dashed bg-muted/30 px-3 py-3 text-xs text-muted-foreground">
              등록된 기술이 없습니다. 아래에서 추가하세요.
            </p>
          )}
          <div className="flex gap-2">
            <Input
              placeholder="예: Next.js, FastAPI… (Enter로 추가)"
              value={newTech}
              onChange={(e) => setNewTech(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addToList(newTech, "techStack", setNewTech);
                }
              }}
              className="h-9 text-sm"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => addToList(newTech, "techStack", setNewTech)}
              disabled={!newTech.trim()}
            >
              <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
              추가
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 3. 주요 업무 */}
      <ChipListCard
        icon={<Briefcase className="h-4 w-4 text-muted-foreground" aria-hidden />}
        title="주요 업무"
        description="지원 포지션에서 수행하게 될 업무입니다."
        items={jobData.responsibilities}
        count={respCount}
        newValue={newResp}
        setNewValue={setNewResp}
        onUpdate={(i, v) => updateListItem(i, v, "responsibilities")}
        onRemove={(i) => removeFromList(i, "responsibilities")}
        onAdd={() => addToList(newResp, "responsibilities", setNewResp)}
        placeholder="예: 결제 시스템 운영 및 신규 기능 개발"
      />

      {/* 4. 자격 요건 */}
      <ChipListCard
        icon={<Briefcase className="h-4 w-4 text-muted-foreground" aria-hidden />}
        title="자격 요건"
        description="필수적으로 요구되는 경험이나 역량입니다."
        items={jobData.requirements}
        count={reqCount}
        newValue={newReq}
        setNewValue={setNewReq}
        onUpdate={(i, v) => updateListItem(i, v, "requirements")}
        onRemove={(i) => removeFromList(i, "requirements")}
        onAdd={() => addToList(newReq, "requirements", setNewReq)}
        placeholder="예: 컴퓨터공학 학사 또는 동등 수준"
      />

      {/* 5. 인재상 / 조직문화 */}
      <ChipListCard
        icon={<Users className="h-4 w-4 text-muted-foreground" aria-hidden />}
        title="인재상 · 조직문화"
        description="기업이 추구하는 가치나 일하는 방식. 비워둬도 OK."
        items={jobData.teamCulture ?? []}
        count={cultureCount}
        newValue={newCulture}
        setNewValue={setNewCulture}
        onUpdate={(i, v) => updateListItem(i, v, "teamCulture")}
        onRemove={(i) => removeFromList(i, "teamCulture")}
        onAdd={() => addToList(newCulture, "teamCulture", setNewCulture)}
        placeholder="예: 사용자 가치를 최우선으로 생각하는 분"
      />
    </div>
  );
}

/** 한 줄짜리 텍스트 항목 리스트 카드 (주요 업무, 자격 요건, 인재상 등 공통). */
function ChipListCard({
  icon,
  title,
  description,
  items,
  count,
  newValue,
  setNewValue,
  onUpdate,
  onRemove,
  onAdd,
  placeholder,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  items: string[];
  count: number;
  newValue: string;
  setNewValue: (v: string) => void;
  onUpdate: (index: number, value: string) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
  placeholder: string;
}) {
  return (
    <Card>
      <CardHeader className="border-b pb-3 pt-4">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
          {count > 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {count}
            </span>
          )}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-2 pt-3">
        {items.length === 0 ? (
          <p className="rounded-md border border-dashed bg-muted/30 px-3 py-3 text-xs text-muted-foreground">
            등록된 항목이 없습니다. 아래에서 추가하세요.
          </p>
        ) : (
          <ul className="divide-y rounded-md border bg-card">
            {items.map((item, i) => (
              <li key={i} className="group flex items-center gap-1 px-2 py-1">
                <Input
                  value={item}
                  onChange={(e) => onUpdate(i, e.target.value)}
                  className="h-8 border-transparent bg-transparent text-sm shadow-none hover:border-input/60 focus:border-input focus:bg-background focus:shadow-sm"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 focus:opacity-100"
                  onClick={() => onRemove(i)}
                  aria-label="이 항목 삭제"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2 pt-1">
          <Input
            placeholder={placeholder}
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onAdd();
              }
            }}
            className="h-9 text-sm"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onAdd}
            disabled={!newValue.trim()}
          >
            <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
            추가
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
