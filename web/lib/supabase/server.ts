import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Database } from "@/lib/database.types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// @supabase/ssr 기반 서버 클라이언트.
// 쿠키는 next/headers 에서 읽고/쓴다(getAll/setAll). 서버 컴포넌트에서는 set 이
// 불가하므로 try/catch 로 무시하고, 실제 토큰 갱신은 미들웨어가 담당한다.
function buildServerClient() {
  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      async getAll() {
        return (await cookies()).getAll();
      },
      async setAll(cookiesToSet) {
        try {
          const store = await cookies();
          cookiesToSet.forEach(({ name, value, options }) => {
            store.set(name, value, options);
          });
        } catch {
          // 서버 컴포넌트 렌더 중에는 쿠키를 set 할 수 없다 — 미들웨어가 세션을 갱신한다.
        }
      },
    },
  });
}

/** 서버 컴포넌트/route handler 공용 Supabase 클라이언트. */
export async function createClient() {
  return buildServerClient();
}

// ───────────────────────────────────────────────────────────────────
// auth-helpers 호환 shim — 기존 호출부(import 경로만 이 파일로 바꿈)가 그대로 동작하도록.
// 인자({ cookies })는 무시하고 next/headers 기반으로 통일한다.
// ───────────────────────────────────────────────────────────────────

/** @deprecated auth-helpers 호환용. 신규 코드는 createClient() 사용. */
export function createRouteHandlerClient<_T = Database>(_opts?: unknown) {
  return buildServerClient();
}

/** @deprecated auth-helpers 호환용. 신규 코드는 createClient() 사용. */
export function createServerComponentClient<_T = Database>(_opts?: unknown) {
  return buildServerClient();
}

/** @deprecated auth-helpers 호환용. 신규 코드는 createClient() 사용. */
export function createServerActionClient<_T = Database>(_opts?: unknown) {
  return buildServerClient();
}
