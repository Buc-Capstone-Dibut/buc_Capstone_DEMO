"use client";

import { useState, useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Hash } from "lucide-react";
import { useSocketStore } from "../../store/socket-store";
import { useAuth } from "@/hooks/use-auth";
import { SmartInput } from "../../common/smart-input";
import { useWorkspaceStore } from "../../store/mock-data";
import useSWR from "swr";
import { toast } from "sonner";

interface TeamChatProps {
  projectId: string;
}

interface BoardMember {
  id: string;
  nickname?: string | null;
  name?: string | null;
}

interface BoardTask {
  id: string;
  title?: string | null;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch data");
  return res.json();
};

function formatMessageTime(message: {
  createdAt?: string;
  fullTimestamp?: string;
  timestamp?: string;
}) {
  const raw = message.createdAt || message.fullTimestamp || message.timestamp;
  if (!raw) return "";

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  return message.timestamp || "";
}

export function TeamChat({ projectId }: TeamChatProps) {
  const { messages, activeChannelId, sendMessage, channels } = useSocketStore();
  const { user } = useAuth({ loadProfile: false });
  const { setActiveTaskId } = useWorkspaceStore();

  const activeChannel = channels.find((c) => c.id === activeChannelId);

  const swrOptions = {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  } as const;

  // Fetch members for mention parsing
  const { data: boardData } = useSWR(
    `/api/workspaces/${projectId}/board`,
    fetcher,
    swrOptions,
  );
  const members: BoardMember[] = boardData?.members || [];
  const tasks: BoardTask[] = boardData?.tasks || [];
  const isReadOnly = Boolean(boardData?.workspace?.readOnly);

  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = () => {
    if (isReadOnly) {
      toast.error("종료된 팀 공간은 읽기 전용입니다.");
      return;
    }
    if (!inputValue.trim() || !activeChannelId || !user) return;

    let contentToSend = inputValue;
    const placeholders: Record<string, string> = {};

    // Parse Mentions & Tasks: Replace @Name with [@ID:Name] and #Task with [#ID:Task]
    // Strategy: Replace matches with unique placeholders first to prevent
    // shorter matches inside longer ones or already replaced tags.

    // 1. Process Members
    if (members.length > 0) {
      const sortedMembers = [...members].sort((a, b) => {
        const nameA = a.nickname || a.name || "";
        const nameB = b.nickname || b.name || "";
        return nameB.length - nameA.length;
      });

      sortedMembers.forEach((member) => {
        const name = member.nickname || member.name;
        if (!name) return;

        const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        // Match both @Name (if typed manually) and [@Name] (from selection)
        // Order matters: match bracketed first if possible or use generic approach
        // Actually, let's look for `\[@${escapedName}\]` OR `@${escapedName}`
        const regex = new RegExp(
          `(\\[@${escapedName}\\]|@${escapedName})`,
          "g",
        );

        const placeholder = `__MENTION_${member.id}_${Math.random().toString(36).substr(2, 9)}__`;

        if (regex.test(contentToSend)) {
          placeholders[placeholder] = `[@${member.id}:${name}]`;
          contentToSend = contentToSend.replace(regex, placeholder);
        }
      });
    }

    // 2. Process Tasks
    if (tasks.length > 0) {
      const sortedTasks = [...tasks].sort((a, b) => {
        return (b.title?.length || 0) - (a.title?.length || 0);
      });

      sortedTasks.forEach((task) => {
        const title = task.title;
        if (!title) return;

        const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        // Match both #Title (if typed manually) and [#Title] (from selection)
        const regex = new RegExp(
          `(\\[#${escapedTitle}\\]|#${escapedTitle})`,
          "g",
        );

        const placeholder = `__TASK_${task.id}_${Math.random().toString(36).substr(2, 9)}__`;

        if (regex.test(contentToSend)) {
          placeholders[placeholder] = `[#${task.id}:${title}]`;
          contentToSend = contentToSend.replace(regex, placeholder);
        }
      });
    }

    // Restore placeholders
    Object.keys(placeholders).forEach((ph) => {
      contentToSend = contentToSend.replace(
        new RegExp(ph, "g"),
        placeholders[ph],
      );
    });

    sendMessage(activeChannelId, contentToSend, user.id);
    setInputValue("");
  };

  const parseContent = (content: string) => {
    // Regex for both tasks and mentions
    // Mentions: [@userId:userName]
    // Tasks: [#taskId:taskTitle]
    const regex = /(\[([#@])(.*?):(.*?)(?:\]))/g;

    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index));
      }

      const type = match[2]; // # or @
      const id = match[3];
      const label = match[4];

      if (type === "#") {
        parts.push(
          <span
            key={match.index}
            onClick={(e) => {
              e.stopPropagation();
              console.log("[TeamChat] CLICKED TASK HASH:", id);
              setActiveTaskId(id);
              console.log("[TeamChat] Called setActiveTaskId with:", id);
            }}
            className="text-primary font-medium inline-flex items-center gap-1 bg-primary/10 px-1.5 py-0.5 rounded cursor-pointer hover:bg-primary/20 hover:underline transition-all"
            role="button"
            tabIndex={0}
          >
            <Hash className="h-3 w-3" />
            {label}
          </span>,
        );
      } else if (type === "@") {
        parts.push(
          <span
            key={match.index}
            className="text-blue-600 font-medium inline-flex items-center gap-1 bg-blue-50 px-1.5 py-0.5 rounded ml-0.5 mr-0.5"
          >
            <span className="text-xs">@</span>
            {label}
          </span>,
        );
      } else {
        parts.push(match[0]);
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex));
    }

    return parts.length > 0 ? parts : content;
  };

  if (!activeChannelId) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        Select a channel to start chatting
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full bg-background relative"
      style={{ height: "calc(100vh - 4rem)" }}
    >
      {/* Header */}
      <div className="h-14 border-b flex items-center px-6 justify-between flex-shrink-0">
        <div className="flex items-center gap-2 font-bold text-lg">
          <Hash className="h-5 w-5 text-muted-foreground" />
          {activeChannel?.name || "Channel"}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden relative">
        <ScrollArea className="h-full px-6 py-4">
          <div className="space-y-6">
            {messages.map((msg) => {
              const isSystem = msg.type === "system";

              if (isSystem) {
                return (
                  <div key={msg.id} className="flex justify-center my-4">
                    <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full border">
                      <span dangerouslySetInnerHTML={{ __html: msg.content }} />
                      <span className="ml-2 opacity-70">
                        {formatMessageTime(msg)}
                      </span>
                    </span>
                  </div>
                );
              }

              return (
                <div key={msg.id} className="flex gap-4 group">
                  <Avatar className="h-10 w-10 mt-0.5">
                    <AvatarImage src={msg.sender.avatar_url || ""} />
                    <AvatarFallback>
                      {msg.sender.nickname?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">
                        {msg.sender.nickname || "Unknown"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatMessageTime(msg)}
                      </span>
                    </div>
                    <p className="text-sm mt-1 text-foreground/90 leading-relaxed whitespace-pre-wrap">
                      {parseContent(msg.content)}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>
      </div>

      <div className="p-4 border-t bg-background mt-auto">
        {isReadOnly && (
          <div className="mb-2 rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            이 팀 공간은 종료되어 채팅을 보낼 수 없습니다.
          </div>
        )}
        <div className="border rounded-xl shadow-sm bg-muted/30 focus-within:ring-1 ring-primary/30 transition-shadow px-2 py-2">
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <SmartInput
                value={inputValue}
                onChange={setInputValue}
                onEnter={handleSend}
                multiline
                disabled={isReadOnly}
                className="px-3 py-[8px] text-sm"
                placeholder={`Message #${activeChannel?.name || "chat"}`}
                projectId={projectId}
                members={members}
                tasks={tasks}
              />
            </div>
            <Button
              size="sm"
              onClick={handleSend}
              disabled={isReadOnly || !inputValue.trim()}
              className={`h-9 shrink-0 ${!inputValue.trim() ? "opacity-50" : ""}`}
            >
              <Send className="h-4 w-4 mr-2" />
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
