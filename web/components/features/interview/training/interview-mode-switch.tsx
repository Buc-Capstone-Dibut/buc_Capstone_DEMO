import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type InterviewMode = "chat" | "video";

const MODE_LABEL: Record<InterviewMode, string> = {
  chat: "채팅",
  video: "화상",
};

const MODE_BADGE: Record<InterviewMode, string> = {
  chat: "Available",
  video: "LiveKit Beta",
};

interface InterviewModeSwitchProps {
  mode: InterviewMode;
  onModeChange: (mode: InterviewMode) => void;
}

export function InterviewModeSwitch({ mode, onModeChange }: InterviewModeSwitchProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(MODE_LABEL) as InterviewMode[]).map((key) => (
          <Button
            key={key}
            type="button"
            variant={mode === key ? "default" : "outline"}
            className="rounded-full"
            onClick={() => onModeChange(key)}
          >
            {MODE_LABEL[key]}
          </Button>
        ))}
      </div>

      <div className="text-xs text-muted-foreground inline-flex items-center gap-2">
        <Badge variant="outline" className="border-primary/20 text-primary">
          {MODE_BADGE[mode]}
        </Badge>
        <span>
          {mode === "chat"
            ? "현재 즉시 사용 가능한 모드입니다."
            : "화상 모드는 LiveKit 연결로 미리 체험할 수 있는 베타 단계입니다."}
        </span>
      </div>
    </div>
  );
}
