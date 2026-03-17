"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { MessageSquareOff, Mic, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const clampDurationMinute = (raw: string | null): 5 | 10 | 15 => {
  const parsed = Number(raw);
  if (parsed === 5 || parsed === 10 || parsed === 15) return parsed;
  return 10;
};

export default function InterviewChatRoomStubPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const duration = clampDurationMinute(searchParams.get("duration"));
  const track = searchParams.get("track") || "posting";

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-[#f6f7fb] px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <Card className="rounded-[32px] border border-[#e7ebf1] bg-white shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
          <CardHeader className="space-y-4 p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#eef4ff] text-primary">
              <MessageSquareOff className="h-7 w-7" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold">채팅 면접은 현재 비활성화되어 있습니다</CardTitle>
              <CardDescription className="text-base leading-7 text-muted-foreground">
                면접 엔진을 `Gemini Live` 단일 실시간 파이프라인으로 재구축하면서
                제품 경로는 음성 기반 면접만 유지합니다.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 px-8 pb-8">
            <div className="rounded-[24px] border border-[#e7ebf1] bg-[#fbfcfe] p-5">
              <div className="flex items-center gap-3 text-sm text-foreground">
                <Video className="h-4 w-4 text-primary" />
                질문은 음성으로 제공되고, AI 자막은 실시간으로 표시됩니다.
              </div>
              <div className="mt-3 flex items-center gap-3 text-sm text-foreground">
                <Mic className="h-4 w-4 text-primary" />
                사용자 답변은 음성으로만 진행되며 결과 리포트는 종료 후 생성됩니다.
              </div>
            </div>

            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Button
                className="rounded-full px-6"
                onClick={() => router.push(`/interview/room/video?duration=${duration}&track=${track}`)}
              >
                실시간 음성 면접으로 이동
              </Button>
              <Button variant="outline" className="rounded-full px-6" onClick={() => router.push("/interview")}>
                면접 메인으로
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
