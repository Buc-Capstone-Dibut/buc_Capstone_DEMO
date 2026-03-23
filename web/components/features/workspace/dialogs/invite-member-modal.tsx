"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, Loader2, X, Users } from "lucide-react";
import { toast } from "sonner";
import useSWRMutation from "swr/mutation";
import { Badge } from "@/components/ui/badge";
import { normalizeWorkspaceTeamRole } from "@/lib/workspace-team-roles";
import { TeamRolePickerDialog } from "@/components/features/workspace/dialogs/team-role-picker-dialog";

interface User {
  id: string;
  nickname: string;
  email: string;
  avatar_url: string | null;
}

interface InviteMemberModalProps {
  workspaceId: string;
  isOpen: boolean;
  onClose: () => void;
}

async function sendInvite(
  url: string,
  { arg }: { arg: { targetUserId: string; teamRole?: string | null } },
) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to invite user");
  }
  return res.json();
}

export function InviteMemberModal({
  workspaceId,
  isOpen,
  onClose,
}: InviteMemberModalProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [teamRole, setTeamRole] = useState("");
  const [teamRoleDialogOpen, setTeamRoleDialogOpen] = useState(false);

  const resetState = () => {
    setQuery("");
    setDebouncedQuery("");
    setSelectedUsers([]);
    setUsers([]);
    setTeamRole("");
    setTeamRoleDialogOpen(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // Debounce query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Search Users
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setUsers([]);
      return;
    }

    const searchUsers = async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `/api/users/search?q=${encodeURIComponent(debouncedQuery)}`,
        );
        const data = await res.json();
        setUsers(data.users || []);
      } catch (error) {
        console.error("Search failed", error);
      } finally {
        setIsSearching(false);
      }
    };

    searchUsers();
  }, [debouncedQuery]);

  // Invite Mutation
  const { trigger, isMutating } = useSWRMutation(
    `/api/workspaces/${workspaceId}/invite`,
    sendInvite,
  );

  const handleInvite = async () => {
    if (selectedUsers.length === 0) return;
    const normalizedTeamRole = normalizeWorkspaceTeamRole(teamRole);

    try {
      await Promise.all(
        selectedUsers.map((user) =>
          trigger({ targetUserId: user.id, teamRole: normalizedTeamRole }),
        ),
      );
      toast.success(
        selectedUsers.length > 1
          ? `${selectedUsers[0].nickname}님 외 ${selectedUsers.length - 1}명을 초대했습니다.`
          : `${selectedUsers[0].nickname}님을 초대했습니다.`,
      );
      handleClose();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const toggleUserSelection = (user: User) => {
    setSelectedUsers((prev) => {
      const isSelected = prev.some((u) => u.id === user.id);
      if (isSelected) {
        return prev.filter((u) => u.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
    // Immediately clear query and search results to prevent layout overlap
    setQuery("");
    setDebouncedQuery("");
    setUsers([]);
  };

  const removeUser = (userId: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) handleClose();
        }}
      >
        <DialogContent className="sm:max-w-[600px] w-full max-h-[90vh] flex flex-col overflow-hidden bg-background border-none shadow-2xl rounded-2xl">
          <DialogHeader className="pt-4 pb-2 px-6">
            <DialogTitle className="text-xl font-semibold tracking-tight">새로운 팀원 초대</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
              사용자의 닉네임이나 이메일을 검색하여 선택하세요. 팀 역할은 협업 시 서로를 구분하기 위한 표시입니다. 권한에는 영향을 주지 않습니다.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 px-6 space-y-5 flex-1 overflow-y-auto w-full max-w-full">

            {/* User Search Area */}
            <div className="space-y-3">
              <Command
                className="rounded-xl border border-muted-foreground/15 shadow-sm bg-background w-full transition-all duration-300 ease-in-out flex flex-col overflow-hidden"
                shouldFilter={false}
              >
                <CommandInput
                  placeholder="이름 또는 이메일로 팀원 검색..."
                  value={query}
                  onValueChange={(val) => {
                    setQuery(val);
                    if (val === "") {
                      setUsers([]);
                      setDebouncedQuery("");
                    }
                  }}
                  className="h-12 w-full border-0 bg-transparent placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 shrink-0 px-4 text-sm"
                />

                {(query.length > 0 || isSearching || selectedUsers.length === 0) && (
                  <CommandList className="max-h-[240px] w-full overflow-y-auto overflow-x-hidden p-1 border-t border-muted-foreground/10 transition-all duration-300">
                    {isSearching && query.length >= 2 && (
                      <div className="py-6 flex flex-col items-center justify-center text-sm text-muted-foreground gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        <span>사용자를 찾는 중...</span>
                      </div>
                    )}

                    {!isSearching && query.length > 0 && query.length < 2 && (
                      <div className="py-6 flex items-center justify-center text-sm text-muted-foreground">
                        최소 2글자 이상 입력해주세요.
                      </div>
                    )}

                    {!isSearching && query.length >= 2 && users.length === 0 && (
                      <CommandEmpty className="py-6 flex flex-col items-center justify-center text-sm">
                        <Users className="h-6 w-6 mb-2 text-muted-foreground/40" />
                        <p className="text-muted-foreground">검색 결과가 없습니다.</p>
                      </CommandEmpty>
                    )}

                    {!isSearching && query.length === 0 && selectedUsers.length === 0 && (
                      <div className="py-6 flex flex-col items-center justify-center text-sm text-muted-foreground">
                         <span className="opacity-70">팀원의 이름이나 이메일을 검색하세요</span>
                      </div>
                    )}

                    {query.length > 0 && users.length > 0 && !isSearching && (
                      <CommandGroup heading="검색 결과" className="text-xs text-muted-foreground px-1 pb-1">
                        {users.map((user) => {
                          const isSelected = selectedUsers.some((u) => u.id === user.id);

                          return (
                            <CommandItem
                              key={user.id}
                              onSelect={() => toggleUserSelection(user)}
                              className={`flex items-center gap-3 cursor-pointer py-2.5 px-3 rounded-lg transition-colors mt-1 hover:bg-muted/50 ${isSelected ? "opacity-60 bg-muted/30" : ""}`}
                            >
                              <Avatar className="h-7 w-7 ring-1 ring-border/50 shadow-sm">
                                <AvatarImage src={user.avatar_url || ""} />
                                <AvatarFallback className="bg-primary/5 text-primary text-[10px] font-medium">
                                  {user.nickname[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col flex-1 min-w-0">
                                <span className="text-sm font-medium text-foreground truncate">
                                  {user.nickname}
                                </span>
                                <span className="text-xs text-muted-foreground truncate">
                                  {user.email}
                                </span>
                              </div>
                              <div className="shrink-0 w-5 h-5 flex items-center justify-center">
                                {isSelected && (
                                  <Check className="w-4 h-4 text-foreground/70" />
                                )}
                              </div>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    )}
                  </CommandList>
                )}
              </Command>

              {/* Selected Users Area (Chips) */}
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/20 border border-muted-foreground/15 rounded-xl min-h-[52px]">
                  <span className="text-xs font-semibold text-muted-foreground/70 mr-1">
                    초대 대상
                  </span>
                  {selectedUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-1.5 bg-background border border-muted-foreground/20 shadow-sm hover:bg-secondary text-foreground px-2.5 py-1.5 rounded-full text-sm font-medium transition-colors"
                    >
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={user.avatar_url || ""} />
                        <AvatarFallback className="text-[10px] bg-primary/10">
                          {user.nickname[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="max-w-[120px] truncate text-xs">
                        {user.nickname}
                      </span>
                      <button
                         onClick={() => removeUser(user.id)}
                         className="ml-0.5 rounded-full p-0.5 text-muted-foreground hover:bg-black/10 dark:hover:bg-white/10 hover:text-foreground transition-colors"
                      >
                         <X className="h-3 w-3" />
                         <span className="sr-only">Remove</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Team Role Setting Area (Subordinate) */}
            <div className="rounded-xl border border-muted-foreground/15 bg-muted/20 p-5 mt-4 transition-colors hover:bg-muted/30 w-full">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">팀 역할</p>
                    {normalizeWorkspaceTeamRole(teamRole) && (
                      <Badge variant="secondary" className="font-normal text-xs px-2 py-0 h-5 rounded hover:bg-secondary text-muted-foreground">
                        {normalizeWorkspaceTeamRole(teamRole)}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                    초대할 팀원의 프로필에 표시될 역할입니다.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-lg text-xs h-8 px-3 font-medium bg-background shadow-sm shrink-0"
                  onClick={() => setTeamRoleDialogOpen(true)}
                >
                  {normalizeWorkspaceTeamRole(teamRole) ? "역할 변경" : "역할 지정"}
                </Button>
              </div>
            </div>

          </div>

          <DialogFooter className="px-6 py-4 border-t border-muted-foreground/10 bg-muted/5 sm:justify-between items-center sm:flex-row flex-col-reverse gap-3">
            <span className="text-xs text-muted-foreground w-full sm:w-auto text-center sm:text-left">
              {selectedUsers.length > 0 ? `${selectedUsers.length}명을 선택했습니다.` : "팀원을 검색 후 선택해주세요."}
            </span>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="ghost" onClick={handleClose} disabled={isMutating} className="flex-1 sm:flex-none">
                취소
              </Button>
              <Button
                onClick={handleInvite}
                disabled={selectedUsers.length === 0 || isMutating}
                className="gap-2 min-w-[120px] flex-1 sm:flex-none rounded-lg font-medium shadow-sm transition-transform active:scale-95"
              >
                {isMutating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin opacity-70" />
                    처리 중...
                  </>
                ) : (
                  "초대 보내기"
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TeamRolePickerDialog
        open={teamRoleDialogOpen}
        onOpenChange={setTeamRoleDialogOpen}
        value={teamRole}
        submitLabel="완료"
        description="초대받는 팀원에게 표시될 역할입니다. 팀 내 협업을 위한 라벨로 쓰입니다."
        onSave={(nextRole) => {
          setTeamRole(nextRole ?? "");
        }}
      />
    </>
  );
}
