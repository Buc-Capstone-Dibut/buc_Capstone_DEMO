"use client";

import {
  useCallback,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FileText, Hash } from "lucide-react";

interface SmartInputMember {
  id: string;
  nickname?: string | null;
  name?: string | null;
}

interface SmartInputTask {
  id: string;
  title?: string | null;
}

interface SmartInputDoc {
  id: string;
  title?: string | null;
  kind?: string | null;
  emoji?: string | null;
}

const MIN_TEXTAREA_HEIGHT = 36;
const MAX_TEXTAREA_HEIGHT = 140;

type TriggerType = "user" | "task" | "doc";
type TriggerChar = "@" | "#" | "!";

type TriggerContext = {
  type: TriggerType;
  start: number;
  end: number;
  query: string;
};

const TRIGGER_PATTERN = /(^|\s)([@#!])([^\s\[\]]*)$/;

function mapTriggerChar(trigger: TriggerChar): TriggerType {
  if (trigger === "@") return "user";
  if (trigger === "#") return "task";
  return "doc";
}

function detectTriggerContext(
  value: string,
  cursorPosition: number,
): TriggerContext | null {
  const beforeCursor = value.slice(0, cursorPosition);
  const match = beforeCursor.match(TRIGGER_PATTERN);
  if (!match) return null;

  const trigger = match[2] as TriggerChar;
  const query = match[3] ?? "";

  return {
    type: mapTriggerChar(trigger),
    start: beforeCursor.length - (query.length + 1),
    end: cursorPosition,
    query,
  };
}

interface SmartInputProps {
  value: string;
  onChange: (value: string) => void;
  onEnter?: () => void;
  placeholder?: string;
  className?: string;
  multiline?: boolean;
  disabled?: boolean;
  projectId?: string;
  members?: SmartInputMember[];
  tasks?: SmartInputTask[];
  docs?: SmartInputDoc[];
}

export interface SmartInputHandle {
  focus: () => void;
  insertText: (text: string) => void;
  insertTrigger: (trigger: TriggerChar) => void;
}

export const SmartInput = forwardRef<SmartInputHandle, SmartInputProps>(
  function SmartInput(
    {
      value,
      onChange,
      onEnter,
      placeholder,
      className,
      multiline,
      disabled = false,
      projectId,
      members = [],
      tasks = [],
      docs = [],
    }: SmartInputProps,
    ref,
  ) {
    const [open, setOpen] = useState(false);
    const [triggerContext, setTriggerContext] = useState<TriggerContext | null>(
      null,
    );
    const [cursorPos, setCursorPos] = useState(0);
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

    const resizeTextarea = (el: HTMLTextAreaElement) => {
      el.style.height = "0px";
      const nextHeight = Math.max(
        MIN_TEXTAREA_HEIGHT,
        Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT),
      );
      el.style.height = `${nextHeight}px`;
      el.style.overflowY =
        el.scrollHeight > MAX_TEXTAREA_HEIGHT ? "auto" : "hidden";
    };

    useEffect(() => {
      if (!multiline) return;
      const el = inputRef.current;
      if (!el || !(el instanceof HTMLTextAreaElement)) return;
      resizeTextarea(el);
    }, [value, multiline]);

    const syncTriggerState = useCallback(
      (nextValue: string, nextCursorPos: number) => {
        const context = detectTriggerContext(nextValue, nextCursorPos);
        const hasProjectId = Boolean(projectId);
        const canOpen =
          hasProjectId &&
          Boolean(context) &&
          ((context?.type === "user" && members.length > 0) ||
            (context?.type === "task" && tasks.length > 0) ||
            (context?.type === "doc" &&
              docs.some((doc) => (doc.kind ?? "page") === "page")));

        setCursorPos(nextCursorPos);
        setTriggerContext(canOpen ? context : null);
        setOpen(Boolean(canOpen));
      },
      [docs, members.length, projectId, tasks.length],
    );

    const restoreCursor = useCallback((nextCursorPos: number) => {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.setSelectionRange(nextCursorPos, nextCursorPos);
        }
      }, 0);
    }, []);

    const insertTextAtSelection = useCallback(
      (text: string) => {
        const element = inputRef.current;
        const selectionStart = element?.selectionStart ?? cursorPos;
        const selectionEnd = element?.selectionEnd ?? selectionStart;
        const nextValue =
          value.slice(0, selectionStart) + text + value.slice(selectionEnd);
        const nextCursorPos = selectionStart + text.length;

        onChange(nextValue);
        syncTriggerState(nextValue, nextCursorPos);
        restoreCursor(nextCursorPos);
      },
      [cursorPos, onChange, restoreCursor, syncTriggerState, value],
    );

    useImperativeHandle(
      ref,
      () => ({
        focus: () => inputRef.current?.focus(),
        insertText: (text: string) => {
          insertTextAtSelection(text);
        },
        insertTrigger: (trigger: TriggerChar) => {
          const element = inputRef.current;
          const selectionStart = element?.selectionStart ?? cursorPos;
          const previousChar =
            selectionStart > 0 ? value[selectionStart - 1] : "";
          const needsSpace = Boolean(previousChar && !/\s/.test(previousChar));

          insertTextAtSelection(`${needsSpace ? " " : ""}${trigger}`);
        },
      }),
      [cursorPos, insertTextAtSelection, value],
    );

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.nativeEvent.isComposing) return;
      if (e.key === "Enter" && !open) {
        if (multiline) {
          if (e.shiftKey) return;
          e.preventDefault();
          onEnter?.();
          return;
        }

        if (!multiline) {
          e.preventDefault();
          onEnter?.();
        }
      }
    };

    const handleChange = (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
      const newVal = e.target.value;
      const newPos = e.target.selectionStart || 0;
      onChange(newVal);

      if (multiline && e.target instanceof HTMLTextAreaElement) {
        resizeTextarea(e.target);
      }

      syncTriggerState(newVal, newPos);
    };

    const handleSelect = (
      e: React.SyntheticEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
      const position = e.currentTarget.selectionStart || 0;
      syncTriggerState(value, position);
    };

    const insertTag = (tag: string) => {
      if (!triggerContext) return;

      const before = value.slice(0, triggerContext.start);
      const after = value.slice(triggerContext.end);
      const spacer = /^\s/.test(after) ? "" : " ";
      const newValue = `${before}${tag}${spacer}${after}`;
      const nextCursorPos = before.length + tag.length + spacer.length;

      onChange(newValue);
      setTriggerContext(null);
      setOpen(false);
      setCursorPos(nextCursorPos);
      restoreCursor(nextCursorPos);
    };

    const normalizedQuery = triggerContext?.query.trim().toLowerCase() ?? "";
    const filteredMembers = useMemo(() => {
      if (triggerContext?.type !== "user") return [];

      return members.filter((member) => {
        const label = (member.nickname || member.name || "").toLowerCase();
        return !normalizedQuery || label.includes(normalizedQuery);
      });
    }, [members, normalizedQuery, triggerContext?.type]);

    const filteredTasks = useMemo(() => {
      if (triggerContext?.type !== "task") return [];

      return tasks.filter((task) => {
        const label = (task.title || "").toLowerCase();
        return !normalizedQuery || label.includes(normalizedQuery);
      });
    }, [normalizedQuery, tasks, triggerContext?.type]);

    const filteredDocs = useMemo(() => {
      if (triggerContext?.type !== "doc") return [];

      return docs.filter((doc) => {
        if ((doc.kind ?? "page") !== "page") return false;
        const label = (doc.title || "").toLowerCase();
        return !normalizedQuery || label.includes(normalizedQuery);
      });
    }, [docs, normalizedQuery, triggerContext?.type]);

    const inputClasses = `block w-full bg-transparent border-none focus:ring-0 placeholder:text-muted-foreground disabled:opacity-60 disabled:cursor-not-allowed ${className}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className="w-full relative">
          {multiline ? (
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              rows={1}
              value={value}
              onChange={handleChange}
              onSelect={handleSelect}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              className={`${inputClasses} box-border h-9 resize-none min-h-[36px] max-h-[140px] leading-5`}
            />
          ) : (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              value={value}
              onChange={handleChange}
              onSelect={handleSelect}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              className={inputClasses}
            />
          )}
        </div>
      </PopoverAnchor>
      <PopoverContent
        className="w-[280px] p-0"
        align="start"
        side="top"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command>
          <CommandList>
            <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>
            <CommandGroup
              heading={
                triggerContext?.type === "user"
                  ? "멤버"
                  : triggerContext?.type === "task"
                    ? "태스크"
                    : "문서"
              }
            >
              {triggerContext?.type === "user" &&
                filteredMembers.map((member) => (
                  <CommandItem
                    key={member.id}
                    value={`${member.nickname || member.name}-${member.id}`}
                    onSelect={() =>
                      insertTag(`[@${member.nickname || member.name || "멤버"}]`)
                    }
                  >
                    <Avatar className="h-4 w-4 mr-2">
                      <AvatarFallback>
                        {(member.nickname || member.name)?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                    {member.nickname || member.name}
                  </CommandItem>
                ))}
              {triggerContext?.type === "task" &&
                filteredTasks.map((task) => (
                  <CommandItem
                    key={task.id}
                    value={`${task.title || "task"}-${task.id}`}
                    onSelect={() => insertTag(`[#${task.title || "태스크"}]`)}
                  >
                    <Hash className="h-4 w-4 mr-2 shrink-0 opacity-70" />
                    <span className="font-medium">{task.title || "제목 없는 태스크"}</span>
                  </CommandItem>
                ))}
              {triggerContext?.type === "doc" &&
                filteredDocs.map((doc) => (
                  <CommandItem
                    key={doc.id}
                    value={`${doc.title || "doc"}-${doc.id}`}
                    onSelect={() => insertTag(`[!${doc.title || "제목 없음"}]`)}
                  >
                    <div className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded bg-amber-100 text-amber-700">
                      {doc.emoji ? (
                        <span className="text-xs leading-none">{doc.emoji}</span>
                      ) : (
                        <FileText className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <span className="font-medium">{doc.title || "제목 없는 문서"}</span>
                  </CommandItem>
                ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
  },
);
