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
        <DialogContent className="sm:max-w-[600px] w-full max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="pt-2">
            <DialogTitle className="text-xl">새로운 팀원 초대</DialogTitle>
            <DialogDescription>
              사용자의 닉네이나 이메일을 검색하여 선택하세요. 여러 명을 한
              번에 초대할 수 있습니다. 팀 역할은 권한과 무관한 구분용
              텍스트입니다.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-4">
            <div className="rounded-xl border bg-muted/30 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium">팀 역할</p>
                  <p className="text-xs text-muted-foreground">
                    권한과 무관하게, 팀원들이 서로를 구분하기 위한 텍스트입니다.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setTeamRoleDialogOpen(true)}
                >
                  {normalizeWorkspaceTeamRole(teamRole) ? "변경" : "설정"}
                </Button>
              </div>
              <div className="mt-3">
                {normalizeWorkspaceTeamRole(teamRole) ? (
                  <Badge variant="secondary" className="rounded-full px-3 py-1">
                    {normalizeWorkspaceTeamRole(teamRole)}
                  </Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    아직 지정된 팀 역할이 없습니다.
                  </span>
                )}
              </div>
            </div>

            {/* Selected Users Area (Chips) */}
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/30 border rounded-md">
                <span className="text-xs font-semibold text-muted-foreground mr-1">
                  초대 대상:
                </span>
                {selectedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-1.5 bg-background border shadow-sm hover:bg-secondary text-foreground px-2 py-1 rounded-full text-sm font-medium transition-colors"
                  >
                    <Avatar className="h-4 w-4">
                      <AvatarImage src={user.avatar_url || ""} />
                      <AvatarFallback className="text-[10px] bg-primary/10">
                        {user.nickname[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="max-w-[100px] truncate">
                      {user.nickname}
                    </span>
                    <button
                      onClick={() => removeUser(user.id)}
                      className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                    >
                      <X className="h-3 w-3" />
                      <span className="sr-only">Remove</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <Command
              className="rounded-lg border shadow-sm bg-background w-full min-h-[150px] max-h-[350px] transition-all duration-300 ease-in-out flex flex-col overflow-hidden"
              shouldFilter={false}
            >
            {/* Search Input Area */}
            <CommandInput
              placeholder="이름 또는 이메일로 팀원 검색..."
              value={query}
              onValueChange={(val) => {
                setQuery(val);
                if (val === "") {
                  setUsers([]); // Clear instantly when erasing string
                  setDebouncedQuery(""); // Force debounce reset
                }
              }}
              className="h-12 w-full border-0 bg-transparent placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 shrink-0"
            />

            {/* Results List */}
            <CommandList className="flex-1 w-full overflow-y-auto overflow-x-hidden p-0 transition-all duration-300">
              {isSearching && query.length >= 2 && (
                <div className="py-6 flex flex-col items-center justify-center text-sm text-muted-foreground gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span>사용자를 찾는 중...</span>
                </div>
              )}

              {!isSearching && query.length > 0 && query.length < 2 && (
                <div className="py-6 flex items-center justify-center text-sm text-muted-foreground">
                  최소 2글자 이상 입력해주세요.
                </div>
              )}

              {!isSearching && query.length >= 2 && users.length === 0 && (
                <CommandEmpty className="py-6 flex flex-col items-center justify-center text-sm sm:text-base">
                  <Users className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-muted-foreground">검색 결과가 없습니다.</p>
                  <p className="text-xs text-muted-foreground/80 mt-1">
                    이름이나 이메일 주소를 다시 확인해주세요.
                  </p>
                </CommandEmpty>
              )}

              {query.length === 0 && selectedUsers.length > 0 && (
                <div className="py-6 flex flex-col items-center justify-center text-sm text-muted-foreground">
                  <Users className="h-6 w-6 mb-2 opacity-30" />
                  <span>이름이나 이메일을 검색해 추가로 초대하세요.</span>
                </div>
              )}

              {query.length === 0 && selectedUsers.length === 0 && (
                <div className="py-6 flex flex-col items-center justify-center text-sm text-muted-foreground">
                  <Users className="h-6 w-6 mb-2 opacity-30" />
                  <span>초대할 사용자의 닉네임이나 이메일을 검색하세요.</span>
                </div>
              )}

              {query.length > 0 && users.length > 0 && !isSearching && (
                <CommandGroup heading="검색 결과" className="p-1">
                  {users.map((user) => {
                    const isSelected = selectedUsers.some(
                      (u) => u.id === user.id,
                    );

                    return (
                      <CommandItem
                        key={user.id}
                        onSelect={() => toggleUserSelection(user)}
                        className={`flex items-center gap-3 cursor-pointer py-3 px-3 rounded-md transition-colors ${isSelected ? "opacity-70" : ""}`}
                      >
                        <Avatar className="h-8 w-8 ring-1 ring-border shadow-sm">
                          <AvatarImage src={user.avatar_url || ""} />
                          <AvatarFallback className="bg-primary/5 text-primary text-xs font-medium">
                            {user.nickname[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="text-sm font-medium truncate">
                            {user.nickname}
                          </span>
                          <span className="text-xs text-muted-foreground truncate">
                            {user.email}
                          </span>
                        </div>
                        <div className="shrink-0 w-5 h-5 flex items-center justify-center">
                          {isSelected && (
                            <Check className="w-4 h-4 text-primary" />
                          )}
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </CommandList>
            </Command>
          </div>

          <DialogFooter className="mt-2 pt-2 shrink-0">
            <Button variant="outline" onClick={handleClose} disabled={isMutating}>
              취소
            </Button>
            <Button
              onClick={handleInvite}
              disabled={selectedUsers.length === 0 || isMutating}
              className="gap-2 min-w-[120px]"
            >
              {isMutating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  처리 중...
                </>
              ) : (
                `팀원 초대하기 ${selectedUsers.length > 0 ? `(${selectedUsers.length})` : ""}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TeamRolePickerDialog
        open={teamRoleDialogOpen}
        onOpenChange={setTeamRoleDialogOpen}
        value={teamRole}
        submitLabel="초대 역할 적용"
        description="초대받는 팀원에게 표시될 역할입니다. 권한과는 관계없는 구분용 텍스트입니다."
        onSave={(nextRole) => {
          setTeamRole(nextRole ?? "");
        }}
      />
    </>
  );
}
