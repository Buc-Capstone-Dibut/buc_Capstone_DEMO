"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  AtSign,
  Check,
  FileText,
  Hash,
  ImagePlus,
  Loader2,
  Lock,
  MoreHorizontal,
  PencilLine,
  Plus,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { useSocketStore } from "../../store/socket-store";
import { useAuth } from "@/hooks/use-auth";
import { SmartInput, type SmartInputHandle } from "../../common/smart-input";
import { useWorkspaceStore } from "../../store/mock-data";
import useSWR from "swr";
import { toast } from "sonner";
import { WorkspaceUserAvatar } from "@/components/features/workspace/common/workspace-user-avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";

interface TeamChatProps {
  projectId: string;
  onNavigateToDoc?: (docId: string) => void;
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

interface WorkspaceDoc {
  id: string;
  kind?: string | null;
  title?: string | null;
  emoji?: string | null;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch data");
  return res.json();
};

function formatMessageTime(message: {
  createdAt?: string;
  updatedAt?: string;
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

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function serializeMessageContent(
  rawContent: string,
  members: BoardMember[],
  tasks: BoardTask[],
  docs: WorkspaceDoc[],
) {
  let contentToSend = rawContent;
  const placeholders: Record<string, string> = {};

  const registerPlaceholder = (
    pattern: RegExp,
    placeholderPrefix: string,
    replacement: string,
  ) => {
    const placeholder = `__${placeholderPrefix}_${Math.random().toString(36).slice(2, 11)}__`;
    const nextContent = contentToSend.replace(pattern, placeholder);

    if (nextContent !== contentToSend) {
      placeholders[placeholder] = replacement;
      contentToSend = nextContent;
    }
  };

  [...members]
    .sort((a, b) => {
      const nameA = a.nickname || a.name || "";
      const nameB = b.nickname || b.name || "";
      return nameB.length - nameA.length;
    })
    .forEach((member) => {
      const name = member.nickname || member.name;
      if (!name) return;

      const escapedName = escapeRegExp(name);
      registerPlaceholder(
        new RegExp(`(\\[@${escapedName}\\]|@${escapedName})`, "g"),
        `MENTION_${member.id}`,
        `[@${member.id}:${name}]`,
      );
    });

  [...tasks]
    .sort((a, b) => (b.title?.length || 0) - (a.title?.length || 0))
    .forEach((task) => {
      const title = task.title;
      if (!title) return;

      const escapedTitle = escapeRegExp(title);
      registerPlaceholder(
        new RegExp(`(\\[#${escapedTitle}\\]|#${escapedTitle})`, "g"),
        `TASK_${task.id}`,
        `[#${task.id}:${title}]`,
      );
    });

  [...docs]
    .sort((a, b) => (b.title?.length || 0) - (a.title?.length || 0))
    .forEach((doc) => {
      const title = doc.title;
      if (!title) return;

      const escapedTitle = escapeRegExp(title);
      registerPlaceholder(
        new RegExp(`(\\[!${escapedTitle}\\]|!${escapedTitle})`, "g"),
        `DOC_${doc.id}`,
        `[!${doc.id}:${title}]`,
      );
    });

  Object.entries(placeholders).forEach(([placeholder, replacement]) => {
    contentToSend = contentToSend.replace(
      new RegExp(escapeRegExp(placeholder), "g"),
      replacement,
    );
  });

  return contentToSend;
}

function toEditableMessageContent(content: string) {
  return content
    .replace(/\[@([^:]+):([^\]]+)\]/g, "@$2")
    .replace(/\[#([^:]+):([^\]]+)\]/g, "#$2")
    .replace(/\[!([^:]+):([^\]]+)\]/g, "!$2");
}

function isEditedMessage(message: {
  isEdited?: boolean;
  createdAt?: string;
  updatedAt?: string;
}) {
  if (message.isEdited) return true;
  return Boolean(
    message.updatedAt &&
      message.createdAt &&
      message.updatedAt !== message.createdAt,
  );
}

export function TeamChat({ projectId, onNavigateToDoc }: TeamChatProps) {
  const {
    messages,
    activeChannelId,
    sendMessage,
    editMessage,
    deleteMessage,
    channels,
    createChannel,
  } = useSocketStore();
  const { user } = useAuth({ loadProfile: false });
  const { setActiveTaskId } = useWorkspaceStore();
  const router = useRouter();

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
  const { data: docsData } = useSWR<WorkspaceDoc[]>(
    `/api/workspaces/${projectId}/docs`,
    fetcher,
    swrOptions,
  );
  const members: BoardMember[] = boardData?.members || [];
  const tasks: BoardTask[] = boardData?.tasks || [];
  const docs: WorkspaceDoc[] = (docsData || []).filter(
    (doc) => (doc.kind ?? "page") === "page",
  );
  const isReadOnly = Boolean(boardData?.workspace?.readOnly);

  const [inputValue, setInputValue] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [isMutatingMessage, setIsMutatingMessage] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<SmartInputHandle>(null);
  const editInputRef = useRef<SmartInputHandle>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (!editingMessageId) return;

    const targetMessage = messages.find((message) => message.id === editingMessageId);
    if (!targetMessage) {
      setEditingMessageId(null);
      setEditingValue("");
    }
  }, [editingMessageId, messages]);

  useEffect(() => {
    setEditingMessageId(null);
    setEditingValue("");
  }, [activeChannelId]);

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

    const contentToSend = serializeMessageContent(inputValue, members, tasks, docs);

    sendMessage(activeChannelId, contentToSend, user.id);
    setInputValue("");
  };

  const parseContent = (content: string) => {
    const regex = /(!\[([^\]]*)\]\(([^)]+)\)|\[([#@!])(.*?):(.*?)(?:\]))/g;

    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index));
      }

      if (match[2] !== undefined && match[3] !== undefined) {
        const alt = match[2] || "채팅 이미지";
        const src = match[3];

        parts.push(
          <span
            key={`image-${match.index}`}
            className="my-2 block overflow-hidden rounded-2xl border bg-muted/20"
          >
            <Image
              src={src}
              alt={alt}
              width={1200}
              height={900}
              unoptimized
              className="h-auto max-h-[360px] w-full object-contain bg-background"
            />
          </span>,
        );
        lastIndex = regex.lastIndex;
        continue;
      }

      const type = match[4];
      const id = match[5];
      const label = match[6];

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
      } else if (type === "!") {
        parts.push(
          <span
            key={match.index}
            onClick={(e) => {
              e.stopPropagation();
              onNavigateToDoc?.(id);
              if (!onNavigateToDoc) {
                router.push(`/workspace/${projectId}?tab=docs&doc=${id}`);
              }
            }}
            className="text-amber-700 font-medium inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 ml-0.5 mr-0.5 cursor-pointer hover:bg-amber-200 transition-colors"
            role="button"
            tabIndex={0}
          >
            <FileText className="h-3 w-3" />
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

  const handleInsertTrigger = (trigger: "@" | "#" | "!") => {
    if (isReadOnly) {
      toast.error("종료된 팀 공간은 읽기 전용입니다.");
      return;
    }

    inputRef.current?.insertTrigger(trigger);
  };

  const handleImageButtonClick = () => {
    if (isReadOnly) {
      toast.error("종료된 팀 공간은 읽기 전용입니다.");
      return;
    }

    imageInputRef.current?.click();
  };

  const handleImageInputChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (isReadOnly) {
      toast.error("종료된 팀 공간은 읽기 전용입니다.");
      event.target.value = "";
      return;
    }

    try {
      setIsUploadingImage(true);
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/workspaces/${projectId}/chat/assets`, {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "이미지 업로드에 실패했습니다.");
      }

      setInputValue((prev) => {
        const prefix = prev.trim() ? `${prev.replace(/\s*$/, "")}\n` : "";
        return `${prefix}${payload.markdown}`;
      });
      toast.success("이미지를 첨부했습니다.");
      setTimeout(() => inputRef.current?.focus(), 0);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "이미지 업로드에 실패했습니다.",
      );
    } finally {
      setIsUploadingImage(false);
      event.target.value = "";
    }
  };

  const handleStartEdit = (messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setEditingValue(toEditableMessageContent(content));
    setTimeout(() => {
      editInputRef.current?.focus();
    }, 0);
  };

  const handleCancelEdit = () => {
    if (isMutatingMessage) return;
    setEditingMessageId(null);
    setEditingValue("");
  };

  const handleSaveEdit = async () => {
    if (
      !editingMessageId ||
      !activeChannelId ||
      !user ||
      !editingValue.trim()
    ) {
      return;
    }

    const serializedContent = serializeMessageContent(
      editingValue,
      members,
      tasks,
      docs,
    );

    setIsMutatingMessage(true);
    const result = await editMessage(
      activeChannelId,
      editingMessageId,
      serializedContent,
      user.id,
    );
    setIsMutatingMessage(false);

    if (!result.success) {
      toast.error(result.error || "메시지 수정에 실패했습니다.");
      return;
    }

    toast.success("메시지를 수정했습니다.");
    setEditingMessageId(null);
    setEditingValue("");
  };

  const handleDeleteOwnMessage = async (messageId: string) => {
    if (!activeChannelId || !user) return;

    const confirmed = window.confirm("이 메시지를 삭제할까요?");
    if (!confirmed) return;

    setIsMutatingMessage(true);
    const result = await deleteMessage(activeChannelId, messageId, user.id);
    setIsMutatingMessage(false);

    if (!result.success) {
      toast.error(result.error || "메시지 삭제에 실패했습니다.");
      return;
    }

    if (editingMessageId === messageId) {
      setEditingMessageId(null);
      setEditingValue("");
    }

    toast.success("메시지를 삭제했습니다.");
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
                  이 채널은 작업 조율과 빠른 논의를 위한 공간입니다. <span className="font-medium text-foreground">@이름</span>으로 멤버를 호출하고, <span className="font-medium text-foreground">#태스크명</span>으로 작업을 연결하고, <span className="font-medium text-foreground">!문서명</span>으로 문서를 바로 불러올 수 있습니다.
                </p>
                <div className="mt-4 rounded-xl border bg-background px-4 py-3 text-xs text-muted-foreground">
                  예시: <span className="font-medium text-foreground">@Junghwan 오늘 #대시보드 개선 확인하고 !회의록 초안도 같이 봐주세요</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
            {messages.map((msg) => {
              const isSystem = msg.type === "system";
              const isOwnMessage = msg.senderId === user?.id;
              const isEditing = editingMessageId === msg.id;

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
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">
                        {msg.sender.nickname || "Unknown"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatMessageTime(msg)}
                      </span>
                      {isEditedMessage(msg) && (
                        <span className="text-[11px] text-muted-foreground">
                          (수정됨)
                        </span>
                      )}
                      {isOwnMessage && !isReadOnly && !isEditing && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="ml-auto h-7 w-7 rounded-md opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleStartEdit(msg.id, msg.content)}
                            >
                              <PencilLine className="mr-2 h-4 w-4" />
                              수정
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => void handleDeleteOwnMessage(msg.id)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              삭제
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    {isEditing ? (
                      <div className="mt-2 rounded-2xl border bg-muted/20 p-2">
                        <SmartInput
                          ref={editInputRef}
                          value={editingValue}
                          onChange={setEditingValue}
                          onEnter={handleSaveEdit}
                          multiline
                          disabled={isReadOnly || isMutatingMessage}
                          className="px-3 py-[8px] text-sm"
                          placeholder="메시지 수정"
                          projectId={projectId}
                          members={members}
                          tasks={tasks}
                          docs={docs}
                        />
                        <div className="mt-2 flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8"
                            onClick={handleCancelEdit}
                            disabled={isMutatingMessage}
                          >
                            <X className="mr-1 h-3.5 w-3.5" />
                            취소
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="h-8"
                            onClick={() => void handleSaveEdit()}
                            disabled={isMutatingMessage || !editingValue.trim()}
                          >
                            {isMutatingMessage ? (
                              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="mr-1 h-3.5 w-3.5" />
                            )}
                            저장
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm mt-1 text-foreground/90 leading-relaxed whitespace-pre-wrap break-words">
                        {parseContent(msg.content)}
                      </div>
                    )}
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
        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleImageInputChange}
        />
        {isReadOnly && (
          <div className="mb-2 rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            이 팀 공간은 종료되어 채팅을 보낼 수 없습니다.
          </div>
        )}
        <div className="border rounded-xl shadow-sm bg-muted/30 focus-within:ring-1 ring-primary/30 transition-shadow px-2 py-2">
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <SmartInput
                ref={inputRef}
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
                docs={docs}
              />
            </div>
            <TooltipProvider delayDuration={100}>
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 rounded-lg"
                      onClick={() => handleInsertTrigger("@")}
                      disabled={isReadOnly}
                    >
                      <AtSign className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>멤버 언급</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 rounded-lg"
                      onClick={() => handleInsertTrigger("#")}
                      disabled={isReadOnly}
                    >
                      <Hash className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>태스크 언급</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 rounded-lg"
                      onClick={() => handleInsertTrigger("!")}
                      disabled={isReadOnly}
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>문서 언급</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 rounded-lg"
                      onClick={handleImageButtonClick}
                      disabled={isReadOnly || isUploadingImage}
                    >
                      {isUploadingImage ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ImagePlus className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>이미지 첨부</TooltipContent>
                </Tooltip>
                <Button
                  size="sm"
                  onClick={handleSend}
                  disabled={isReadOnly || !inputValue.trim() || isUploadingImage}
                  className={`h-9 shrink-0 ${!inputValue.trim() ? "opacity-50" : ""}`}
                >
                  <Send className="h-4 w-4 mr-2" />
                  전송
                </Button>
              </div>
            </TooltipProvider>
          </div>
        </div>
      </div>
    </div>
  );
}
