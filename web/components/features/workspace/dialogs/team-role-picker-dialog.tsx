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
      <DialogContent className="sm:max-w-[480px] bg-background border-none shadow-2xl rounded-2xl p-0 overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-muted-foreground/10">
          <DialogTitle className="text-lg font-semibold tracking-tight">{title}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
            {description}
          </DialogDescription>
        </div>

        <div className="p-6 space-y-6">
          {/* Current Selection */}
          <div className="rounded-xl border border-muted-foreground/15 bg-muted/20 p-4 transition-colors">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              평상시 표시될 역할
            </div>
            <div className="mt-2.5">
              {normalizeWorkspaceTeamRole(selectedRole) ? (
                <Badge variant="secondary" className="font-normal text-sm px-3 py-0.5 rounded-md hover:bg-secondary text-muted-foreground bg-background border shadow-sm">
                  {normalizeWorkspaceTeamRole(selectedRole)}
                </Badge>
              ) : (
                <span className="text-sm text-muted-foreground opacity-80">
                  선택된 역할이 없습니다.
                </span>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {/* Suggested Roles */}
            <div className="space-y-2.5">
              <p className="text-sm font-medium text-foreground">추천 역할</p>
              <div className="flex flex-wrap gap-2">
                {allRoles.map((role) => (
                  <Button
                    key={role}
                    type="button"
                    size="sm"
                    variant={selectedRole === role ? "secondary" : "outline"}
                    className={`h-7 rounded-md px-3 text-xs font-medium transition-all ${
                      selectedRole === role
                        ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/15"
                        : "text-muted-foreground border-muted-foreground/20 hover:bg-muted/30"
                    }`}
                    onClick={() => setSelectedRole(role)}
                  >
                    {role}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Role Input */}
            <div className="space-y-2.5 pt-2">
              <p className="text-sm font-medium text-foreground">직접 추가</p>
              <div className="flex items-center gap-2">
                <Input
                  value={customRoleInput}
                  onChange={(event) => setCustomRoleInput(event.target.value)}
                  placeholder="예: 발표 담당, 리서치, QA"
                  className="flex-1 h-9 bg-muted/10 border-muted-foreground/20 text-sm focus-visible:ring-1 focus-visible:ring-primary/30"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomRole();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="h-9 px-3 text-xs font-medium shadow-sm transition-transform active:scale-95"
                  onClick={handleAddCustomRole}
                  disabled={!normalizeWorkspaceTeamRole(customRoleInput)}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  추가
                </Button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-muted-foreground/10 bg-muted/5 sm:justify-between items-center flex-row">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground h-8 px-2"
            onClick={() => setSelectedRole("")}
            disabled={pending}
          >
            역할 비우기
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={pending}
            className="rounded-lg font-medium shadow-sm transition-transform active:scale-95 px-6"
          >
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
