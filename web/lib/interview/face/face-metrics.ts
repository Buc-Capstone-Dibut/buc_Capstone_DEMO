export interface Blendshapes { [name: string]: number | undefined }
export interface Gaze { gazeX: number; gazeY: number; blink: number }
export interface HeadPose { yaw: number; pitch: number; roll: number }
export interface Baseline { gazeX0: number; gazeY0: number; yaw0: number; pitch0: number }
// 관찰 가능한 행동만 기록한다(감정 추측 없음): away=시선 이탈, smile=미소 여부.
// 고개 움직임(자세 안정성)은 yaw/pitch에서 집계 시 계산한다.
export interface FaceSample { tMs: number; gazeX: number; gazeY: number; yaw: number; pitch: number; away: boolean; smile: boolean }

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

const TH = { gazeX: 0.30, gazeY: 0.30, yaw: 15, pitch: 12, blink: 0.5, smile: 0.35 };

export function isLookingAway(cur: { gazeX: number; gazeY: number; yaw: number; pitch: number; blink: number }, base: Baseline): boolean {
  if (cur.blink > TH.blink) return false;
  return (
    Math.abs(cur.gazeX - base.gazeX0) > TH.gazeX ||
    Math.abs(cur.gazeY - base.gazeY0) > TH.gazeY ||
    Math.abs(cur.yaw - base.yaw0) > TH.yaw ||
    Math.abs(cur.pitch - base.pitch0) > TH.pitch
  );
}

// 관찰 가능 행동: 미소 여부. mouthSmile은 ARKit blendshape 중 신뢰도가 높은 축이다.
// (기존 눈썹 기반 감정 라벨(긴장/당황)은 근거가 약한 "추측"이라 제거했다.)
export function isSmiling(b: Blendshapes): boolean {
  return (g(b, "mouthSmileLeft") + g(b, "mouthSmileRight")) / 2 > TH.smile;
}

// 고개 움직임(자세 안정성) 수준 — yaw/pitch 표준편차(도) 기준. 데모 튜너블.
const MOVE_TH = { low: 4, medium: 9 };

export interface HeadMovement { yawStd: number; pitchStd: number; level: "낮음" | "보통" | "높음" }

function stddev(values: number[]): number {
  const n = values.length;
  if (n === 0) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / n;
  return Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / n);
}

export function headMovementFromSamples(samples: Array<{ yaw: number; pitch: number }>): HeadMovement {
  const yawStd = stddev(samples.map((s) => s.yaw));
  const pitchStd = stddev(samples.map((s) => s.pitch));
  const m = Math.max(yawStd, pitchStd);
  const level = m < MOVE_TH.low ? "낮음" : m < MOVE_TH.medium ? "보통" : "높음";
  return { yawStd, pitchStd, level };
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
  const smileCount = samples.filter((s) => s.smile).length;
  const headMovement = headMovementFromSamples(samples);
  return {
    awayRatio: awayCount / total,
    awaySegments,
    smileRatio: smileCount / total,
    headMovement,
    sampleCount: samples.length,
  };
}
