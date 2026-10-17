import "../config/env";
import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var workspacePrisma: PrismaClient | undefined;
}

// Supabase 트랜잭션 풀러(6543)는 prepared statement를 공유하지 않으므로
// pgbouncer=true가 빠지면 $queryRaw가 "prepared statement does not exist"로 간헐 실패한다.
function withPgbouncerFlag(url: string | undefined) {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    if (parsed.port === "6543" && !parsed.searchParams.has("pgbouncer")) {
      parsed.searchParams.set("pgbouncer", "true");
      return parsed.toString();
    }
  } catch {
    // 파싱할 수 없는 URL은 Prisma가 원래대로 처리하게 둔다.
  }
  return url;
}

const databaseUrl = withPgbouncerFlag(process.env.DATABASE_URL);

export const prisma =
  globalThis.workspacePrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    ...(databaseUrl ? { datasources: { db: { url: databaseUrl } } } : {}),
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.workspacePrisma = prisma;
}
