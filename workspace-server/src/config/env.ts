// workspace-server 환경 변수 (process.env로 접근)
// 실제 값은 .env 파일에서 로드됨

export const PORT = process.env.PORT || "4000";

// Next.js BFF URL (whiteboard 저장/로드 API 호출용)
export const BFF_URL = process.env.BFF_URL || "http://localhost:3000";

// 서버 간 내부 통신 인증 시크릿
// Next.js BFF의 INTERNAL_API_SECRET 값과 반드시 일치해야 함
export const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET || "";
