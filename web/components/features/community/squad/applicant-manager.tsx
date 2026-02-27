"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
// import { acceptApplicant, rejectApplicant } from "@/lib/actions/community"; // Unused now
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Check, X, UserPlus, MessageSquare } from "lucide-react";

interface Applicant {
  id: string; // Application ID
  user_id: string;
  message: string;
  created_at: string;
  user: {
    id: string;
    nickname: string;
    avatar_url: string;
    tier: string;
    handle?: string | null;
  };
}

interface ApplicantManagerProps {
  squadId: string;
  initialApplications: Applicant[];
}

export default function ApplicantManager({
  squadId,
  initialApplications,
}: ApplicantManagerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [applications, setApplications] =
    useState<Applicant[]>(initialApplications);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Fetch applications when dialog opens if we don't have them (or if we want fresh data)
  // Since we rely on this component for Client Side Leader View (where server passed 0 props),
  // we should fetch on mount or open.

  const fetchApplications = useCallback(async () => {
    try {
      const res = await fetch(`/api/squads/applications?squad_id=${squadId}`);
      const json = await res.json();
      if (json.applications) {
        setApplications(json.applications);
      }
    } catch (e) {
      console.error(e);
    }
  }, [squadId]);

  // If initialApplications is empty, we force fetch on open
  // Or we just expose a button to refresh.
  // Using useEffect on open state change is good.

  // Actually, we can just fetch in useEffect when 'open' becomes true.
  // But we need 'import { useEffect } from "react"'.

  // Let's modify imports in next block if needed, but 'useState' is there.
  // I need to add useEffect import.

  useEffect(() => {
    if (open && applications.length === 0) {
      fetchApplications();
    }
  }, [open, applications.length, fetchApplications]);

  const handleAccept = async (appId: string, userId: string) => {
    if (!confirm("이 팀원을 수락하시겠습니까?")) return;

    setProcessingId(appId);
    try {
      const response = await fetch("/api/squads/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "accept",
          squad_id: squadId,
          user_id: userId, // applicant user id
        }),
      });

      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error);
      }

      toast.success("팀원을 수락했습니다.");
      setApplications((prev) => prev.filter((app) => app.id !== appId)); // Remove from list
      router.refresh();
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "처리 중 오류가 발생했습니다.",
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (appId: string, userId: string) => {
    if (!confirm("이 지원을 거절하시겠습니까?")) return;

    setProcessingId(appId);
    try {
      const response = await fetch("/api/squads/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject",
          squad_id: squadId,
          user_id: userId,
        }),
      });

      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error);
      }

      toast.success("지원을 거절했습니다.");
      setApplications((prev) => prev.filter((app) => app.id !== appId));
      router.refresh();
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "처리 중 오류가 발생했습니다.",
      );
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full" variant="secondary">
          <UserPlus className="mr-2 w-4 h-4" />
          신청자 관리
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>팀원 신청 현황</DialogTitle>
          <DialogDescription>
            지원자의 메시지를 확인하고 수락 여부를 결정하세요.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          {applications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
              <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
              <p>대기 중인 신청자가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map((app) => (
                <div
                  key={app.id}
                  className="border rounded-lg p-4 space-y-3 bg-card"
                >
                  {/* User Profile */}
                  <div className="flex items-center gap-3">
                    {app.user.handle ? (
                      <Link
                        href={`/my/${encodeURIComponent(app.user.handle)}`}
                        className="flex items-center gap-3 hover:underline"
                      >
                        <Avatar>
                          <AvatarImage src={app.user.avatar_url} />
                          <AvatarFallback>{app.user.nickname[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-sm">
                            {app.user.nickname}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {app.user.tier}
                          </p>
                        </div>
                      </Link>
                    ) : (
                      <>
                        <Avatar>
                          <AvatarImage src={app.user.avatar_url} />
                          <AvatarFallback>{app.user.nickname[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-sm">
                            {app.user.nickname}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {app.user.tier}
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Message */}
                  <div className="bg-muted/50 p-3 rounded-md text-sm whitespace-pre-wrap">
                    {app.message || "메시지가 없습니다."}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      size="sm"
                      onClick={() => handleAccept(app.id, app.user_id)}
                      disabled={processingId === app.id}
                    >
                      <Check className="w-4 h-4 mr-1" /> 수락
                    </Button>
                    <Button
                      className="flex-1"
                      variant="outline"
                      size="sm"
                      onClick={() => handleReject(app.id, app.user_id)}
                      disabled={processingId === app.id}
                    >
                      <X className="w-4 h-4 mr-1" /> 거절
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
