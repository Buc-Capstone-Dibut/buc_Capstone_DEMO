export interface Blendshapes { [name: string]: number | undefined }
export interface Gaze { gazeX: number; gazeY: number; blink: number }
export interface HeadPose { yaw: number; pitch: number; roll: number }
export interface Baseline { gazeX0: number; gazeY0: number; yaw0: number; pitch0: number }
export interface FaceSample { tMs: number; gazeX: number; gazeY: number; yaw: number; pitch: number; away: boolean; expr: string }

const g = (b: Blendshapes, k: string) => b[k] ?? 0;

export function gazeFromBlendshapes(b: Blendshapes): Gaze {
  const gazeX = ((g(b, "eyeLookInLeft") + g(b, "eyeLookOutRight")) - (g(b, "eyeLookOutLeft") + g(b, "eyeLookInRight"))) / 2;
  const gazeY = ((g(b, "eyeLookUpLeft") + g(b, "eyeLookUpRight")) - (g(b, "eyeLookDownLeft") + g(b, "eyeLookDownRight"))) / 2;
  const blink = (g(b, "eyeBlinkLeft") + g(b, "eyeBlinkRight")) / 2;
  return { gazeX, gazeY, blink };
}

export function headPoseFromMatrix(m: ArrayLike<number> | null | undefined): HeadPose | null {
  if (!m || m.length < 16) return null;
  const R = (r: number, c: number) => m[c * 4 + r];
  const R00 = R(0,0), R10 = R(1,0), R20 = R(2,0), R21 = R(2,1), R22 = R(2,2), R12 = R(1,2), R11 = R(1,1);
  const sy = Math.hypot(R00, R10);
  let pitch, yaw, roll;
  if (sy > 1e-6) { pitch = Math.atan2(R21, R22); yaw = Math.atan2(-R20, sy); roll = Math.atan2(R10, R00); }
  else { pitch = Math.atan2(-R12, R11); yaw = Math.atan2(-R20, sy); roll = 0; }
  const deg = (r: number) => (r * 180) / Math.PI;
  return { yaw: deg(yaw), pitch: deg(pitch), roll: deg(roll) };
}

export function calibrateBaseline(frames: Array<{ gazeX: number; gazeY: number; yaw: number; pitch: number }>): Baseline {
  const n = Math.max(1, frames.length);
  const avg = (k: "gazeX" | "gazeY" | "yaw" | "pitch") => frames.reduce((s, x) => s + x[k], 0) / n;
  return { gazeX0: avg("gazeX"), gazeY0: avg("gazeY"), yaw0: avg("yaw"), pitch0: avg("pitch") };
}

const TH = { gazeX: 0.30, gazeY: 0.30, yaw: 15, pitch: 12, blink: 0.5 };

export function isLookingAway(cur: { gazeX: number; gazeY: number; yaw: number; pitch: number; blink: number }, base: Baseline): boolean {
  if (cur.blink > TH.blink) return false;
  return (
    Math.abs(cur.gazeX - base.gazeX0) > TH.gazeX ||
    Math.abs(cur.gazeY - base.gazeY0) > TH.gazeY ||
    Math.abs(cur.yaw - base.yaw0) > TH.yaw ||
    Math.abs(cur.pitch - base.pitch0) > TH.pitch
  );
}

export function expressionLabel(b: Blendshapes): string {
  const smile = (g(b, "mouthSmileLeft") + g(b, "mouthSmileRight")) / 2;
  const browDown = (g(b, "browDownLeft") + g(b, "browDownRight")) / 2;
  const browUp = g(b, "browInnerUp");
  if (smile > 0.4) return "여유";
  if (browDown > 0.4) return "긴장";
  if (browUp > 0.5) return "당황";
  return "중립";
}

export function aggregateSamples(samples: FaceSample[]) {
  const total = samples.length || 1;
  const awayCount = samples.filter((s) => s.away).length;
  const awaySegments: Array<[number, number]> = [];
  let start: number | null = null;
  for (let i = 0; i < samples.length; i++) {
    if (samples[i].away && start === null) start = samples[i].tMs;
    if (!samples[i].away && start !== null) { awaySegments.push([start, samples[i - 1].tMs]); start = null; }
  }
  if (start !== null) awaySegments.push([start, samples[samples.length - 1].tMs]);
  const expressionHistogram: Record<string, number> = {};
  for (const s of samples) expressionHistogram[s.expr] = (expressionHistogram[s.expr] ?? 0) + 1;
  return { awayRatio: awayCount / total, awaySegments, expressionHistogram, sampleCount: samples.length };
}
