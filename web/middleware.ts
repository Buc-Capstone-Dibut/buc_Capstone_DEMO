import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function middleware(req: NextRequest) {
  // 응답 객체를 만들고, ssr 클라이언트가 갱신한 쿠키를 req/res 양쪽에 반영해
  // 같은 요청의 서버 컴포넌트/route handler 가 새 세션을 읽을 수 있게 한다.
  let res = NextResponse.next({ request: req });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        cookiesToSet.forEach(({ name, value, options }) =>
          res.cookies.set(name, value, options),
        );
      },
    },
  });

  // getUser() 가 토큰 만료 시 refresh 를 트리거하고, setAll 로 갱신 쿠키를 심는다.
  await supabase.auth.getUser();

  return res;
}

export const config = {
  // 정적 자원/이미지를 제외한 모든 경로에서 세션을 갱신한다.
  // (기존엔 /my, /workspace 만 갱신해 다른 페이지에서 토큰이 만료되곤 했다.)
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
