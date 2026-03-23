"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Sparkles } from "lucide-react";
import {
  WORKSPACE_TEAM_ROLE_SUGGESTIONS,
  normalizeWorkspaceTeamRole,
} from "@/lib/workspace-team-roles";

interface TeamRolePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  value?: string | null;
  submitLabel?: string;
  pending?: boolean;
  onSave: (value: string | null) => Promise<boolean | void> | boolean | void;
}

export function TeamRolePickerDialog({
  open,
  onOpenChange,
  title = "팀 역할 설정",
  description = "팀 내에서 구분하기 위한 텍스트입니다. 권한에는 영향을 주지 않습니다.",
  value,
  submitLabel = "저장",
  pending = false,
  onSave,
}: TeamRolePickerDialogProps) {
  const [selectedRole, setSelectedRole] = useState(value ?? "");
  const [customRoleInput, setCustomRoleInput] = useState("");
  const [customRoles, setCustomRoles] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setSelectedRole(value ?? "");
    setCustomRoleInput("");
  }, [open, value]);

  const allRoles = useMemo(() => {
    return Array.from(
      new Set([
        ...WORKSPACE_TEAM_ROLE_SUGGESTIONS,
        ...customRoles,
        ...(value ? [value] : []),
      ]),
    );
  }, [customRoles, value]);

  const handleAddCustomRole = () => {
    const normalized = normalizeWorkspaceTeamRole(customRoleInput);
    if (!normalized) return;

    setCustomRoles((prev) =>
      prev.includes(normalized) ? prev : [...prev, normalized],
    );
    setSelectedRole(normalized);
    setCustomRoleInput("");
  };

  const handleSave = async () => {
    const result = await onSave(normalizeWorkspaceTeamRole(selectedRole));
    if (result !== false) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="rounded-xl border bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              현재 선택
            </div>
            <div className="mt-3">
              {normalizeWorkspaceTeamRole(selectedRole) ? (
                <Badge className="rounded-full px-3 py-1 text-sm">
                  {normalizeWorkspaceTeamRole(selectedRole)}
                </Badge>
              ) : (
                <span className="text-sm text-muted-foreground">
                  아직 지정된 팀 역할이 없습니다.
                </span>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">추천 역할</p>
              <p className="text-xs text-muted-foreground">
                자주 쓰는 역할을 바로 선택할 수 있습니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {allRoles.map((role) => (
                <Button
                  key={role}
                  type="button"
                  size="sm"
                  variant={selectedRole === role ? "default" : "outline"}
                  className="h-8 rounded-full px-3 text-xs"
                  onClick={() => setSelectedRole(role)}
                >
                  {role}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">직접 추가</p>
              <p className="text-xs text-muted-foreground">
                우리 팀만 쓰는 역할명을 자유롭게 추가할 수 있습니다.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <Input
                value={customRoleInput}
                onChange={(event) => setCustomRoleInput(event.target.value)}
                placeholder="예: 발표 담당, 리서치, QA"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddCustomRole}
                disabled={!normalizeWorkspaceTeamRole(customRoleInput)}
              >
                <Plus className="mr-1 h-4 w-4" />
                추가
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">직접 입력</p>
            <Textarea
              value={selectedRole}
              onChange={(event) => setSelectedRole(event.target.value)}
              placeholder="팀원들이 서로를 구분할 수 있는 역할명을 입력하세요."
              className="min-h-[72px] resize-none"
            />
            <p className="text-xs text-muted-foreground">
              하나의 짧은 역할명만 저장됩니다. 권한과는 별개로 표시에만
              사용됩니다.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setSelectedRole("")}
            disabled={pending}
          >
            역할 비우기
          </Button>
          <Button type="button" onClick={handleSave} disabled={pending}>
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
