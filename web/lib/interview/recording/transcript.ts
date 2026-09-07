import { z } from "zod";

export const recordingTranscriptSchema = z.object({
  version: z.literal(1),
  entries: z
    .array(
      z
        .object({
          id: z.string().min(1).max(256),
          turnId: z.string().max(256),
          role: z.enum(["ai", "user"]),
          text: z.string().max(30000),
          startMs: z.number().int().nonnegative().nullable(),
          endMs: z.number().int().nonnegative().nullable(),
        })
        .refine(
          (e) =>
            (e.startMs === null && e.endMs === null) ||
            (e.startMs !== null && e.endMs !== null && e.endMs >= e.startMs),
        ),
    )
    .max(500),
});

export type RecordingTranscript = z.infer<typeof recordingTranscriptSchema>;
export type RecordingTranscriptEntry = RecordingTranscript["entries"][number];
export interface RecordingAudioSpan {
  role: "ai" | "user";
  turnId: string;
  startTimeMs: number;
  endTimeMs: number;
}

interface CapturedTurn extends RecordingTranscriptEntry {
  bound?: boolean;
}

// Audio playback and microphone capture use the same monotonic browser clock as recording.
export class RecordingTranscriptClock {
  private origin: number | null = null;
  private turns = new Map<string, CapturedTurn>();
  private userBindings = new Map<string, string>();

  start(atMs: number) {
    this.origin = atMs;
    this.turns.clear();
    this.userBindings.clear();
  }

  audio(span: RecordingAudioSpan) {
    if (this.origin === null || span.endTimeMs < this.origin) return;
    const key = `${span.role}:${span.turnId}`;
    const startMs = Math.max(0, Math.round(span.startTimeMs - this.origin));
    const endMs = Math.max(startMs, Math.round(span.endTimeMs - this.origin));
    const previous = this.turns.get(key);
    this.turns.set(key, {
      id: key,
      turnId: span.role === "ai" ? span.turnId : "",
      role: span.role,
      text: "",
      ...previous,
      startMs: Math.min(previous?.startMs ?? startMs, startMs),
      endMs: Math.max(previous?.endMs ?? endMs, endMs),
    });
  }

  text(role: "ai" | "user", turnId: string, text: string) {
    if (this.origin === null || !text.trim() || !turnId) return;
    let key = `${role}:${turnId}`;
    if (role === "user") {
      const bound = this.userBindings.get(turnId);
      const capture = [...this.turns.values()].find(
        (entry) =>
          entry.role === "user" && !entry.bound && entry.startMs !== null,
      );
      key = bound || capture?.id || key;
      this.userBindings.set(turnId, key);
    }
    const previous = this.turns.get(key);
    this.turns.set(key, {
      id: key,
      role,
      startMs: null,
      endMs: null,
      ...previous,
      turnId,
      text: text.trim(),
      bound: true,
    });
  }

  cancelAnswer(captureId: string) {
    const key = `user:${captureId}`;
    this.turns.delete(key);
    for (const [id, value] of this.userBindings) {
      if (value === key) this.userBindings.delete(id);
    }
  }

  snapshot(durationMs: number): RecordingTranscript {
    return {
      version: 1,
      entries: [...this.turns.values()]
        .filter((e) => e.text && (e.startMs === null || e.startMs < durationMs))
        .map(({ id, turnId, role, text, startMs, endMs }) => ({
          id,
          turnId,
          role,
          text,
          startMs,
          endMs:
            endMs === null ? null : Math.min(Math.round(durationMs), endMs),
        })),
    };
  }
}
