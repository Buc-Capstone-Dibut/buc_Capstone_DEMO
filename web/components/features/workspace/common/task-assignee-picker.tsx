"use client";

import { Check, UserRoundX, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { WorkspaceUserAvatar } from "@/components/features/workspace/common/workspace-user-avatar";
import { cn } from "@/lib/utils";

export interface TaskAssigneeOption {
  id: string;
  name?: string | null;
  avatar?: string | null;
}

interface TaskAssigneeAvatarsProps {
  assignees: TaskAssigneeOption[];
  max?: number;
  className?: string;
  avatarClassName?: string;
}

export function TaskAssigneeAvatars({
  assignees,
  max = 3,
  className,
  avatarClassName = "h-5 w-5",
}: TaskAssigneeAvatarsProps) {
  const visible = assignees.slice(0, max);
  if (visible.length === 0) return null;

  return (
    <div
      className={cn("flex -space-x-1.5", className)}
      title={assignees.map((assignee) => assignee.name || "이름 없음").join(", ")}
    >
      {visible.map((assignee) => (
        <WorkspaceUserAvatar
          key={assignee.id}
          name={assignee.name}
          avatarUrl={assignee.avatar}
          className={cn("border border-background", avatarClassName)}
          fallbackClassName="text-[8px]"
        />
      ))}
      {assignees.length > max ? (
        <span
          className={cn(
            "relative inline-flex items-center justify-center rounded-full border border-background bg-muted text-[8px] font-semibold text-muted-foreground",
            avatarClassName,
          )}
        >
          +{assignees.length - max}
        </span>
      ) : null}
    </div>
  );
}

interface TaskAssigneePickerProps {
  members: TaskAssigneeOption[];
  value: string[];
  onValueChange: (ids: string[]) => void;
  disabled?: boolean;
  className?: string;
  contentClassName?: string;
  placeholder?: string;
}

export function TaskAssigneePicker({
  members,
  value,
  onValueChange,
  disabled,
  className,
  contentClassName,
  placeholder = "담당자 없음",
}: TaskAssigneePickerProps) {
  const selected = members.filter((member) => value.includes(member.id));
  const toggle = (memberId: string) => {
    onValueChange(
      value.includes(memberId)
        ? value.filter((id) => id !== memberId)
        : [...value, memberId],
    );
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled}
          className={cn("h-9 w-full justify-start gap-2 px-3 font-normal", className)}
        >
          {selected.length > 0 ? (
            <>
              <TaskAssigneeAvatars assignees={selected} max={3} />
              <span className="min-w-0 truncate text-xs">
                {selected.length === 1
                  ? selected[0].name || "이름 없음"
                  : `${selected.length}명 담당`}
              </span>
            </>
          ) : (
            <>
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{placeholder}</span>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className={cn("w-64 p-1", contentClassName)}>
        <Button
          type="button"
          variant="ghost"
          className="h-8 w-full justify-start gap-2 px-2 text-xs text-muted-foreground"
          onClick={() => onValueChange([])}
        >
          <UserRoundX className="h-4 w-4" />
          담당자 모두 해제
        </Button>
        <div className="my-1 h-px bg-border" />
        <div className="max-h-56 overflow-y-auto">
          {members.map((member) => {
            const checked = value.includes(member.id);
            return (
              <Button
                key={member.id}
                type="button"
                variant="ghost"
                aria-pressed={checked}
                className="h-9 w-full justify-start gap-2 px-2 text-xs"
                onClick={() => toggle(member.id)}
              >
                <span className="flex h-4 w-4 items-center justify-center rounded border">
                  {checked ? <Check className="h-3 w-3" /> : null}
                </span>
                <WorkspaceUserAvatar
                  name={member.name}
                  avatarUrl={member.avatar}
                  className="h-5 w-5"
                />
                <span className="truncate">{member.name || "이름 없음"}</span>
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
