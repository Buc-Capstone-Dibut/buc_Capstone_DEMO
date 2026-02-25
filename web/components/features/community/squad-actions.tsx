"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useState } from "react";

interface SquadActionsProps {
  squadId: string;
  isLeader: boolean;
  status: string; // "recruiting" | "closed" | "active"
  children?: React.ReactNode;
  closedUI?: React.ReactNode;
}

export default function SquadActions({
  squadId,
  isLeader,
  status,
  children,
  closedUI,
}: SquadActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (!isLeader) return null;

  const handleCloseRecruitment = async () => {
    if (!confirm("모집을 마감하시겠습니까?")) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/squads/${squadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "closed" }),
      });

      if (response.ok) {
        toast.success("모집이 마감되었습니다.");
        router.refresh();
      } else {
        toast.error("상태 변경 실패");
      }
    } catch (e) {
      toast.error("오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {status === "recruiting" && (
        <Button
          onClick={handleCloseRecruitment}
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 text-white"
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          모집 마감
        </Button>
      )}

      {status === "closed" &&
        (closedUI ? (
          <div className="h-full cursor-not-allowed opacity-70">{closedUI}</div>
        ) : (
          <Button variant="secondary" disabled className="w-full opacity-70">
            <CheckCircle className="w-4 h-4 mr-2" />
            모집 마감됨
          </Button>
        ))}
    </>
  );
}
