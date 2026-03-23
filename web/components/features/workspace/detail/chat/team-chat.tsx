"use client";

import { useState, useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Send, Hash, Lock, Plus } from "lucide-react";
import { useSocketStore } from "../../store/socket-store";
import { useAuth } from "@/hooks/use-auth";
import { SmartInput } from "../../common/smart-input";
import { useWorkspaceStore } from "../../store/mock-data";
import useSWR from "swr";
import { toast } from "sonner";
import { WorkspaceUserAvatar } from "@/components/features/workspace/common/workspace-user-avatar";

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
  const {
    messages,
    activeChannelId,
    sendMessage,
    channels,
    createChannel,
  } = useSocketStore();
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

  const handleCreateDefaultChannel = () => {
    if (isReadOnly) {
      toast.error("종료된 팀 공간은 읽기 전용입니다.");
      return;
    }
    if (!user) {
      toast.error("채널 생성에는 로그인이 필요합니다.");
      return;
    }

    createChannel(
      projectId,
      "general",
      "팀 전체 공지와 대화를 위한 기본 채널",
      user.id,
    );
    toast.success("기본 채널을 만들고 있습니다.");
  };

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
    const hasChannels = channels.length > 0;
    return (
      <div className="h-full flex items-center justify-center px-6">
          <div className="w-full max-w-md rounded-2xl border border-dashed bg-muted/20 p-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-background shadow-sm">
              <Hash className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="text-base font-semibold">
            {hasChannels ? "채널을 선택해 대화를 시작하세요" : "첫 채널을 열어보세요"}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {hasChannels
                ? "왼쪽 사이드바에서 채팅 채널을 선택하면 대화와 멘션, 태스크 링크를 바로 이어갈 수 있습니다."
                : isReadOnly
                  ? "종료된 팀 공간이라 새 채널을 만들 수 없습니다."
                : "왼쪽에서 채널을 열거나 추가하세요."}
            </p>
          {!hasChannels && !isReadOnly && (
            <Button
              type="button"
              className="mt-4 rounded-xl"
              onClick={handleCreateDefaultChannel}
            >
              <Plus className="mr-2 h-4 w-4" />
              기본 채널 만들기
            </Button>
          )}
        </div>
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
          {activeChannel?.name || "채널"}
        </div>
        {isReadOnly && (
          <div className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" />
            읽기 전용
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden relative">
        <ScrollArea className="h-full px-6 py-4">
          {messages.length === 0 ? (
            <div className="flex min-h-full items-center justify-center py-10">
              <div className="w-full max-w-lg rounded-2xl border bg-muted/20 p-6">
                <div className="text-sm font-semibold text-foreground">
                  아직 대화가 없습니다
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  이 채널은 작업 조율과 빠른 논의를 위한 공간입니다. <span className="font-medium text-foreground">@이름</span>으로 멤버를 호출하고, <span className="font-medium text-foreground">#태스크명</span>으로 작업을 연결해보세요.
                </p>
                <div className="mt-4 rounded-xl border bg-background px-4 py-3 text-xs text-muted-foreground">
                  예시: <span className="font-medium text-foreground">@Junghwan 오늘 #대시보드 개선 마감 확인 부탁해요</span>
                </div>
              </div>
            </div>
          ) : (
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
                  <WorkspaceUserAvatar
                    name={msg.sender.nickname}
                    avatarUrl={msg.sender.avatar_url}
                    className="mt-0.5 h-10 w-10"
                  />
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
          )}
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
                placeholder={`#${activeChannel?.name || "채널"}에 메시지 입력`}
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
              전송
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
