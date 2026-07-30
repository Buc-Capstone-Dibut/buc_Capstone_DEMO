import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

let loaded = false;

function parseEnvValue(raw: string): string {
  const value = raw.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function loadEnvFile(filepath: string): boolean {
  if (!existsSync(filepath)) return false;

  const content = readFileSync(filepath, "utf8");
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    const value = parseEnvValue(trimmed.slice(eqIndex + 1));
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }

  return true;
}

export function loadEnvIfNeeded() {
  if (loaded) return;
  loaded = true;

  const workspaceRoot = resolve(__dirname, "..", "..");
  const candidates = [
    resolve(workspaceRoot, ".env"),
    resolve(workspaceRoot, ".env.local"),
    resolve(workspaceRoot, "..", "web", ".env.local"),
    resolve(workspaceRoot, "..", "web", ".env"),
  ];

  for (const file of candidates) {
    loadEnvFile(file);
  }

  if (!process.env.DATABASE_URL) {
    console.warn(
      "[env] DATABASE_URL is missing. Set workspace-server/.env or process env.",
    );
  }
}

loadEnvIfNeeded();

// workspace-server 환경 변수 (process.env로 접근)
// 실제 값은 .env 파일에서 로드됨
export const PORT = process.env.PORT || "4000";

// Next.js BFF URL (whiteboard 저장/로드 API 호출용)
export const BFF_URL = process.env.BFF_URL || "http://localhost:3000";

// 서버 간 내부 통신 인증 시크릿
// Next.js BFF의 INTERNAL_API_SECRET 값과 반드시 일치해야 함
export const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET || "";
export const COLLAB_TOKEN_SECRET =
  process.env.COLLAB_TOKEN_SECRET || INTERNAL_API_SECRET;

export const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
export const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

function parseAllowedOrigins(value: string | undefined) {
  const configured = (value || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  const bffOrigin = (() => {
    try {
      return new URL(BFF_URL).origin;
    } catch {
      return "";
    }
  })();

  return Array.from(
    new Set(
      [...DEFAULT_ALLOWED_ORIGINS, bffOrigin, ...configured].filter(Boolean),
    ),
  );
}

export const ALLOWED_ORIGINS = parseAllowedOrigins(process.env.ALLOWED_ORIGINS);

export const env = {
  PORT: Number(PORT),
  DATABASE_URL: process.env.DATABASE_URL || "",
  BFF_URL,
  INTERNAL_API_SECRET,
  COLLAB_TOKEN_SECRET,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  ALLOWED_ORIGINS,
};

export function isAllowedOrigin(origin: string | undefined) {
  if (!origin) {
    return process.env.NODE_ENV !== "production";
  }
  return ALLOWED_ORIGINS.includes(origin);
}
