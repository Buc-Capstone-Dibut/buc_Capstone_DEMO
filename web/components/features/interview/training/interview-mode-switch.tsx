import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type InterviewMode = "voice" | "video";

const MODE_LABEL: Record<InterviewMode, string> = {
  voice: "음성",
  video: "화상",
};

const MODE_BADGE: Record<InterviewMode, string> = {
  voice: "STT/TTS Beta",
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
          {mode === "voice"
            ? "음성 모드는 STT/TTS 기반으로 답변 연습을 진행하는 베타 단계입니다."
            : "화상 모드는 LiveKit 연결로 실제 면접 환경을 체험하는 베타 단계입니다."}
        </span>
      </div>
    </div>
  );
}
