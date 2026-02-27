"use client";

import { useState, useRef, useEffect } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Hash } from "lucide-react";

interface SmartInputMember {
  id: string;
  nickname?: string | null;
  name?: string | null;
}

interface SmartInputTask {
  id: string;
  title?: string | null;
}

const MIN_TEXTAREA_HEIGHT = 36;
const MAX_TEXTAREA_HEIGHT = 140;

interface SmartInputProps {
  value: string;
  onChange: (value: string) => void;
  onEnter?: () => void;
  placeholder?: string;
  className?: string;
  multiline?: boolean;
  projectId?: string;
  members?: SmartInputMember[];
  tasks?: SmartInputTask[];
}

export function SmartInput({
  value,
  onChange,
  onEnter,
  placeholder,
  className,
  multiline,
  projectId,
  members = [],
  tasks = [],
}: SmartInputProps) {
  const [open, setOpen] = useState(false);
  const [triggerType, setTriggerType] = useState<"user" | "task" | null>(null);
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" && !open) {
      if (multiline) {
        // Chat UX: Enter sends, Shift+Enter inserts newline.
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
    setCursorPos(newPos);
    onChange(newVal);

    if (multiline && e.target instanceof HTMLTextAreaElement) {
      resizeTextarea(e.target);
    }

    // Check for triggers
    const lastChar = newVal.slice(newPos - 1, newPos);
    if (lastChar === "@" && projectId) {
      setTriggerType("user");
      setOpen(true);
    } else if (lastChar === "#" && projectId) {
      setTriggerType("task");
      setOpen(true);
    } else {
      // Close popover if user backspaces the trigger or types space
      if (open && (lastChar === " " || lastChar === "")) {
        setOpen(false);
      }
    }
  };

  const insertTag = (tag: string) => {
    const before = value.slice(0, cursorPos);
    const after = value.slice(cursorPos);

    // Remove the Trigger char (@ or #)
    const newBefore = before.slice(0, -1);
    const newValue = `${newBefore}${tag} ${after}`;

    const nextCursorPos = newBefore.length + tag.length + 1; // +1 for the added space

    onChange(newValue);
    setOpen(false);

    // Attempt to restore focus and set cursor position
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(nextCursorPos, nextCursorPos);
      }
    }, 0);
  };

  // Shared classes
  const inputClasses = `block w-full bg-transparent border-none focus:ring-0 placeholder:text-muted-foreground ${className}`;

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
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className={`${inputClasses} box-border h-9 resize-none min-h-[36px] max-h-[140px] leading-5`}
            />
          ) : (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className={inputClasses}
            />
          )}
        </div>
      </PopoverAnchor>
      <PopoverContent
        className="p-0 w-[200px]"
        align="start"
        side="top"
        onOpenAutoFocus={(e) => e.preventDefault()} // Prevent stealing focus from input
      >
        <Command>
          <CommandInput
            placeholder={
              triggerType === "user" ? "Select user..." : "Select task..."
            }
          />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup
              heading={triggerType === "user" ? "Members" : "Tasks"}
            >
              {triggerType === "user" &&
                members.map((member) => (
                  <CommandItem
                    key={member.id}
                    value={`${member.nickname || member.name}-${member.id}`}
                    onSelect={() =>
                      // Clean insertion: [@Name]
                      insertTag(`[@${member.nickname || member.name}]`)
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
              {triggerType === "task" &&
                tasks.map((task) => (
                  <CommandItem
                    key={task.id}
                    value={`${task.title}-${task.id}`}
                    onSelect={() => insertTag(`[#${task.title}]`)}
                  >
                    <Hash className="h-4 w-4 mr-2 shrink-0 opacity-70" />
                    <span className="font-medium">{task.title}</span>
                  </CommandItem>
                ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
