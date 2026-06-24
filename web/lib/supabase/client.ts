import { createBrowserClient } from "@supabase/ssr";
import { Database } from "@/lib/database.types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// @supabase/ssr 기반 브라우저 클라이언트 (싱글톤).
export const supabase = createBrowserClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
);

/** @deprecated auth-helpers 호환용. 신규 코드는 supabase 싱글톤 import. */
export function createClientComponentClient<_T = Database>() {
  return supabase;
}
