// 발표 시연용 협업 워크스페이스 데이터. 최초 입력(Supabase SQL)과 시연 후 초기화가 같은 정의를 쓴다.
// 팀원 3명은 로그인할 수 없는 시연용 auth.users/profiles 행이 먼저 있어야 한다(DEMO_TEAMMATES_SQL).

export const DEMO_OWNER_ID = "a0a02026-2026-4dbb-8e6e-000000000001";
export const DEMO_WORKSPACE_ID = "de000000-2026-4acb-8000-000000000001";

const id = (suffix: string) => `de000000-2026-4acb-8000-${suffix.padStart(12, "0")}`;

const U = {
  owner: DEMO_OWNER_ID,
  seoyeon: id("a1"),
  doyun: id("a2"),
  minjun: id("a3"),
};

export const DEMO_TEAMMATES = [
  { id: U.seoyeon, email: "seoyeon.park@demo.dibut.kr", handle: "demo-seoyeon", nickname: "박서연", techStack: ["React", "Next.js", "TypeScript"] },
  { id: U.doyun, email: "doyun.lee@demo.dibut.kr", handle: "demo-doyun", nickname: "이도윤", techStack: ["Figma", "UX Research"] },
  { id: U.minjun, email: "minjun.choi@demo.dibut.kr", handle: "demo-minjun", nickname: "최민준", techStack: ["Java", "Spring", "PostgreSQL"] },
];

const MEMBERS = [
  { userId: U.owner, role: "owner", teamRole: "PM · 백엔드", joinedAt: "2026-10-05 23:00:00" },
  { userId: U.seoyeon, role: "member", teamRole: "프론트엔드", joinedAt: "2026-10-05 23:20:00" },
  { userId: U.doyun, role: "member", teamRole: "디자인", joinedAt: "2026-10-05 23:31:00" },
  { userId: U.minjun, role: "member", teamRole: "백엔드", joinedAt: "2026-10-06 00:02:00" },
];

const COL = { todo: id("c1"), doing: id("c2"), done: id("c3") };
const COLUMNS = [
  { id: COL.todo, title: "할 일", category: "todo", order: 0 },
  { id: COL.doing, title: "진행 중", category: "in-progress", order: 1 },
  { id: COL.done, title: "완료", category: "done", order: 2 },
];

const TAG = { plan: id("b1"), design: id("b2"), dev: id("b3"), ui: id("b4"), urgent: id("b5") };
const TAGS = [
  { id: TAG.plan, name: "기획", color: "blue" },
  { id: TAG.design, name: "설계", color: "purple" },
  { id: TAG.dev, name: "개발", color: "green" },
  { id: TAG.ui, name: "디자인", color: "pink" },
  { id: TAG.urgent, name: "긴급", color: "red" },
];

const DOC = {
  planFolder: id("d0"),
  requirements: id("d1"),
  interviews: id("d2"),
  review: id("d3"),
  designFolder: id("d4"),
  nextStep: id("d5"),
};

const T = {
  interviews: id("e1"),
  legacyFlow: id("e2"),
  usecase: id("e3"),
  requirements: id("e4"),
  review: id("e5"),
  erd: id("e6"),
  apiSpec: id("e7"),
  conflict: id("e8"),
  wireframe: id("e9"),
  prereq: id("ea"),
  frontendSetup: id("eb"),
  midterm: id("ec"),
};

type DemoTask = {
  id: string;
  column: string;
  order: number;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  tags: string[];
  start: string;
  end: string;
  assignees: string[];
  docs?: { docId: string; primary?: boolean }[];
};

// "완료"는 요구사항 분석 단계, "진행 중"·"할 일"은 다음 단계인 설계·개발 착수.
const TASKS: DemoTask[] = [
  { id: T.interviews, column: COL.done, order: 0, title: "재학생 사용자 인터뷰 12명 진행·정리", description: "수강신청에서 겪은 불편을 인터뷰로 수집했다. 9/12명이 '신청 직전에야 시간표 충돌을 안다'고 답했다.", priority: "medium", tags: [TAG.plan], start: "2026-10-06", end: "2026-10-10", assignees: [U.doyun], docs: [{ docId: DOC.interviews, primary: true }] },
  { id: T.legacyFlow, column: COL.done, order: 1, title: "기존 학사시스템 수강신청 흐름 분석", description: "장바구니 단계에는 검증이 없고, 신청 버튼을 누를 때 서버에서 한 번에 검증하는 구조임을 확인했다.", priority: "medium", tags: [TAG.plan], start: "2026-10-07", end: "2026-10-11", assignees: [U.minjun] },
  { id: T.usecase, column: COL.done, order: 2, title: "유스케이스 다이어그램·시나리오 작성", description: "학생·조교 두 액터 기준으로 장바구니 담기, 충돌 확인, 신청 확정 시나리오를 정리했다.", priority: "medium", tags: [TAG.plan], start: "2026-10-10", end: "2026-10-15", assignees: [U.seoyeon] },
  { id: T.requirements, column: COL.done, order: 3, title: "요구사항 정의서 v1.0 작성 (기능 14 · 비기능 5)", description: "인터뷰와 흐름 분석 결과를 기능 요구사항 14개, 비기능 요구사항 5개로 정리했다.", priority: "high", tags: [TAG.plan], start: "2026-10-08", end: "2026-10-16", assignees: [U.owner], docs: [{ docId: DOC.requirements, primary: true }] },
  { id: T.review, column: COL.done, order: 4, title: "요구사항 리뷰 회의 · 우선순위(MoSCoW) 확정", description: "Must 5개(FR-01~05)를 1차 개발 범위로 확정했다.", priority: "high", tags: [TAG.plan], start: "2026-10-17", end: "2026-10-17", assignees: [U.owner, U.seoyeon], docs: [{ docId: DOC.review, primary: true }] },
  { id: T.erd, column: COL.doing, order: 0, title: "ERD 설계 — 강의·시간표·장바구니·선수과목", description: "lecture, lecture_time, cart_item, prerequisite, enrollment 테이블 초안. 정원 동시성을 위해 신청 인원을 별도 컬럼으로 관리한다.", priority: "high", tags: [TAG.design], start: "2026-10-20", end: "2026-10-24", assignees: [U.minjun, U.owner], docs: [{ docId: DOC.nextStep }] },
  { id: T.apiSpec, column: COL.doing, order: 1, title: "장바구니 사전검사 API 명세 초안", description: "POST /cart/items 응답에 충돌 과목·선수과목 미이수·학점 초과 경고를 함께 내려주는 형태로 설계한다.", priority: "high", tags: [TAG.design], start: "2026-10-21", end: "2026-10-25", assignees: [U.owner], docs: [{ docId: DOC.nextStep, primary: true }] },
  { id: T.conflict, column: COL.todo, order: 0, title: "시간표 충돌 검사 로직 프로토타입", description: "요일·교시 구간 겹침을 O(n log n)으로 검사하는 로직을 먼저 만들고, 장바구니 API에 붙인다.", priority: "high", tags: [TAG.dev, TAG.urgent], start: "2026-10-24", end: "2026-10-30", assignees: [U.owner] },
  { id: T.prereq, column: COL.todo, order: 1, title: "선수과목 조건 검사 규칙 정리", description: "학과 교육과정표 기준 선수과목·동일과목 재수강 규칙을 정리한다.", priority: "medium", tags: [TAG.design], start: "2026-10-22", end: "2026-10-27", assignees: [U.minjun] },
  { id: T.wireframe, column: COL.todo, order: 2, title: "화면 설계 — 장바구니·충돌 알림 와이어프레임", description: "ERD 확정 후 장바구니 화면과 충돌 알림 컴포넌트 와이어프레임을 그린다.", priority: "medium", tags: [TAG.ui], start: "2026-10-23", end: "2026-10-29", assignees: [U.doyun] },
  { id: T.frontendSetup, column: COL.todo, order: 3, title: "프론트엔드 초기 세팅 (Next.js · 디자인 토큰)", description: "프로젝트 구조, 린트, 디자인 토큰을 먼저 준비한다.", priority: "low", tags: [TAG.dev], start: "2026-10-27", end: "2026-10-31", assignees: [U.seoyeon] },
  { id: T.midterm, column: COL.todo, order: 4, title: "중간발표 자료 준비", description: "요구사항 → 설계 산출물과 프로토타입 시연 흐름으로 구성한다.", priority: "medium", tags: [TAG.plan], start: "2026-11-03", end: "2026-11-07", assignees: [U.owner, U.seoyeon, U.doyun, U.minjun] },
];

type Block =
  | { type: "heading"; props: { level: 1 | 2 | 3 }; content: string }
  | { type: "paragraph" | "bulletListItem" | "numberedListItem"; content: string }
  | { type: "checkListItem"; props: { checked: boolean }; content: string };

const h = (level: 1 | 2 | 3, content: string): Block => ({ type: "heading", props: { level }, content });
const p = (content: string): Block => ({ type: "paragraph", content });
const li = (content: string): Block => ({ type: "bulletListItem", content });
const check = (checked: boolean, content: string): Block => ({ type: "checkListItem", props: { checked }, content });

type DemoDoc = {
  id: string;
  kind: "page" | "folder";
  title: string;
  emoji: string | null;
  parentId: string | null;
  sortOrder: number;
  authorId: string;
  updatedAt: string;
  content: Block[] | null;
};

const DOCS: DemoDoc[] = [
  { id: DOC.planFolder, kind: "folder", title: "01. 기획", emoji: "📁", parentId: null, sortOrder: 0, authorId: U.owner, updatedAt: "2026-10-17 09:40:00", content: null },
  { id: DOC.designFolder, kind: "folder", title: "02. 설계", emoji: "📁", parentId: null, sortOrder: 1, authorId: U.owner, updatedAt: "2026-10-20 00:50:00", content: null },
  {
    id: DOC.requirements, kind: "page", title: "요구사항 정의서 v1.0", emoji: "📋", parentId: DOC.planFolder, sortOrder: 0, authorId: U.owner, updatedAt: "2026-10-16 12:40:00",
    content: [
      h(1, "캠퍼스 수강신청 도우미 — 요구사항 정의서 v1.0"),
      p("작성: 김디벗 · 검토: 박서연, 이도윤, 최민준 · 2026.10.16"),
      h(2, "1. 배경"),
      p("재학생 인터뷰 12명 중 9명이 '장바구니에 담은 과목의 시간표 충돌을 신청 직전에야 알게 된다'고 답했다. 기존 학사시스템은 신청 버튼을 누를 때 서버에서 한 번에 검증하기 때문에, 수강신청 마감 직전 실패와 문의가 몰린다."),
      h(2, "2. 기능 요구사항 — Must"),
      li("FR-01 장바구니에 과목을 담는 즉시 기존 과목과의 시간표 충돌을 표시한다."),
      li("FR-02 선수과목 미이수 과목을 담으면 경고와 함께 필요한 선수과목을 안내한다."),
      li("FR-03 학기 최대 신청 학점을 초과하면 담기 단계에서 경고한다."),
      li("FR-04 충돌이 있는 과목 대신 들을 수 있는 같은 과목의 다른 분반을 추천한다."),
      li("FR-05 신청 확정 시 정원 초과를 DB 단에서 원자적으로 차단한다."),
      h(2, "3. 기능 요구사항 — Should / Could"),
      li("FR-06 장바구니 시간표를 주간 그리드로 미리 보여준다."),
      li("FR-07 관심 과목 정원 변동 알림 (Could)"),
      li("FR-08 ~ FR-14: 조교 공지, 분반 비교, 학점 계산기 등 (부록 참고)"),
      h(2, "4. 비기능 요구사항"),
      li("NFR-01 수강신청 오픈 시 동시 접속 3,000명 기준 장바구니 검사 응답 1초 이내"),
      li("NFR-02 정원 정합성 100% — 동시 요청에서도 초과 신청 0건"),
      li("NFR-03 학사시스템 원본 데이터는 읽기 전용으로만 연동"),
      li("NFR-04 모바일 웹 우선 반응형"),
      li("NFR-05 모든 검사 결과에 근거(충돌 과목명·교시)를 함께 표시"),
      h(2, "5. 제외 범위"),
      p("실제 수강신청 확정(학사시스템 원본 쓰기)은 이번 학기 범위에서 제외하고, 모의 신청으로 검증한다."),
    ],
  },
  {
    id: DOC.interviews, kind: "page", title: "사용자 인터뷰 결과 요약 (재학생 12명)", emoji: "🎤", parentId: DOC.planFolder, sortOrder: 1, authorId: U.doyun, updatedAt: "2026-10-16 05:05:00",
    content: [
      h(1, "사용자 인터뷰 결과 요약"),
      p("대상: 컴퓨터소프트웨어과 2~4학년 12명 · 기간: 10/06 ~ 10/10 · 진행: 이도윤"),
      h(2, "가장 많이 나온 불편 TOP 3"),
      li("신청 직전에야 시간표 충돌을 안다 — 9명"),
      li("선수과목 조건을 신청 실패 메시지로 처음 안다 — 6명"),
      li("인기 과목 마감 후 대체 분반을 찾느라 시간을 날린다 — 5명"),
      h(2, "인상 깊은 한마디"),
      p("\"장바구니가 그냥 메모장이에요. 담을 때 미리 말해 주면 좋겠어요.\" — 3학년 A"),
    ],
  },
  {
    id: DOC.review, kind: "page", title: "10/17 요구사항 리뷰 회의록", emoji: "📝", parentId: DOC.planFolder, sortOrder: 2, authorId: U.seoyeon, updatedAt: "2026-10-17 09:30:00",
    content: [
      h(1, "10/17 요구사항 리뷰 회의록"),
      p("참석: 김디벗, 박서연, 이도윤, 최민준 · 기록: 박서연"),
      h(2, "결정 사항"),
      li("1차 개발 범위는 Must FR-01 ~ FR-05로 확정"),
      li("정원 차단(FR-05)은 조건부 UPDATE + 유니크 제약으로 DB에서 처리"),
      li("요구사항 분석 단계 종료 → 10/20부터 설계 단계 착수"),
      h(2, "액션 아이템"),
      check(true, "요구사항 정의서 v1.0 확정본 공유 — 김디벗"),
      check(false, "ERD 초안 — 최민준, 김디벗 (10/24)"),
      check(false, "장바구니 사전검사 API 명세 — 김디벗 (10/25)"),
      check(false, "와이어프레임 — 이도윤 (10/29)"),
    ],
  },
  {
    id: DOC.nextStep, kind: "page", title: "다음 단계: 설계 착수 계획", emoji: "🧭", parentId: DOC.designFolder, sortOrder: 0, authorId: U.owner, updatedAt: "2026-10-20 01:00:00",
    content: [
      h(1, "다음 단계: 설계 착수 계획 (10/20 ~ 10/31)"),
      p("요구사항 분석이 끝났으니, 이번 단계의 목표는 Must 요구사항 5개를 바로 구현할 수 있는 설계 산출물을 만드는 것이다."),
      h(2, "산출물과 일정"),
      check(false, "ERD — 강의·시간표·장바구니·선수과목·신청 (최민준, 김디벗 · 10/24)"),
      check(false, "장바구니 사전검사 API 명세 (김디벗 · 10/25)"),
      check(false, "장바구니·충돌 알림 와이어프레임 (이도윤 · 10/29)"),
      check(false, "시간표 충돌 검사 로직 프로토타입 (김디벗 · 10/30)"),
      h(2, "설계 원칙"),
      li("검사 결과는 항상 근거(충돌 과목·교시)와 함께 내려준다 — NFR-05"),
      li("정원 같은 절대 틀리면 안 되는 값은 애플리케이션이 아니라 DB가 최종 판단한다"),
      h(2, "리스크"),
      li("학사시스템 원본 데이터 형식 미확정 → 샘플 데이터로 먼저 설계하고 어댑터로 분리"),
    ],
  },
];

const CH = { general: id("f1"), devlog: id("f2") };
const CHANNELS = [
  { id: CH.general, name: "general", description: "팀 공지와 기본 대화를 나누는 채널" },
  { id: CH.devlog, name: "dev-log", description: "작업 진행 상황과 개발 메모를 공유하는 채널" },
];

const mention = (userId: string, name: string) => `[@${userId}:${name}]`;
const taskRef = (taskId: string) => `[#${taskId}:${TASKS.find((task) => task.id === taskId)!.title}]`;
const docRef = (docId: string) => `[!${docId}:${DOCS.find((doc) => doc.id === docId)!.title}]`;

// 시각은 UTC(timestamp without time zone 컬럼). KST = UTC + 9.
const MESSAGES: { id: string; channel: string; sender: string; at: string; content: string }[] = [
  { id: id("1001"), channel: CH.general, sender: U.doyun, at: "2026-10-16 05:05:00", content: `인터뷰 12명 정리 끝났습니다! 가장 많이 나온 불편은 '신청 직전에야 시간표 충돌을 안다'(9/12명)였어요. 요약 올려뒀어요 ${docRef(DOC.interviews)}` },
  { id: id("1002"), channel: CH.general, sender: U.minjun, at: "2026-10-16 05:12:00", content: "학사시스템 흐름 분석해 보니 장바구니 단계엔 검사가 전혀 없고, 신청 버튼 누를 때 한 번에 검증하더라고요. 그래서 마감 직전에 실패 문의가 몰리는 구조예요." },
  { id: id("1003"), channel: CH.general, sender: U.owner, at: "2026-10-16 12:40:00", content: `요구사항 정의서 v1.0 올렸습니다 ${docRef(DOC.requirements)} 기능 14개 / 비기능 5개로 정리했고, 내일 리뷰 때 우선순위 같이 정해요.` },
  { id: id("1004"), channel: CH.general, sender: U.seoyeon, at: "2026-10-17 09:30:00", content: `오늘 리뷰 회의록 정리했어요 ${docRef(DOC.review)} Must는 FR-01~05로 확정!` },
  { id: id("1005"), channel: CH.general, sender: U.owner, at: "2026-10-20 01:02:00", content: `요구사항 분석 단계는 여기서 마감할게요 🎉 이번 주부터 설계 단계 들어갑니다. 계획은 ${docRef(DOC.nextStep)} 에 정리했어요.` },
  { id: id("1006"), channel: CH.general, sender: U.owner, at: "2026-10-20 01:05:00", content: `${mention(U.minjun, "최민준")} 님이랑 ERD 먼저 잡고 ${taskRef(T.erd)}, 저는 사전검사 API 명세 초안 맡을게요 ${taskRef(T.apiSpec)}` },
  { id: id("1007"), channel: CH.general, sender: U.minjun, at: "2026-10-20 01:11:00", content: "넵! 수강신청 테이블은 정원 동시성 때문에 신청 인원 컬럼 따로 둘게요. 오늘 저녁에 초안 공유드릴게요" },
  { id: id("1008"), channel: CH.general, sender: U.doyun, at: "2026-10-20 01:20:00", content: "ERD 나오면 바로 장바구니 화면 와이어프레임 시작할게요 ✏️" },
  { id: id("1009"), channel: CH.general, sender: U.seoyeon, at: "2026-10-20 01:24:00", content: "저는 그동안 Next.js 세팅이랑 디자인 토큰 먼저 준비해 둘게요" },
  { id: id("1010"), channel: CH.general, sender: U.owner, at: "2026-10-21 00:15:00", content: `${mention(U.seoyeon, "박서연")} ${mention(U.doyun, "이도윤")} 오늘 15시에 설계 킥오프 15분만 할게요. 다음 할 일은 ${taskRef(T.conflict)} 이에요.` },
  { id: id("1011"), channel: CH.general, sender: U.seoyeon, at: "2026-10-21 00:18:00", content: "좋아요 👍" },
  { id: id("2001"), channel: CH.devlog, sender: U.minjun, at: "2026-10-15 14:10:00", content: "[분석] 학사시스템 수강신청 화면 6개 캡처 & 흐름도 정리 완료 — 검증 시점은 신청 버튼(서버) 1회뿐" },
  { id: id("2002"), channel: CH.devlog, sender: U.owner, at: "2026-10-16 13:00:00", content: "[요구사항] FR-01 담기 즉시 시간표 충돌 표시 / FR-02 선수과목 미이수 경고 / FR-03 학점 상한 초과 경고 / FR-04 대체 분반 추천 / FR-05 정원 원자적 차단 — v1.0 반영" },
  { id: id("2003"), channel: CH.devlog, sender: U.minjun, at: "2026-10-20 10:40:00", content: "[설계] ERD 초안 v0.1 — lecture, lecture_time, cart_item, prerequisite, enrollment(신청 인원 컬럼 분리). 리뷰 부탁드려요" },
];

// ---- SQL 렌더링 ----
const q = (value: string | null) => (value === null ? "NULL" : `'${value.replace(/'/g, "''")}'`);
const arr = (values: string[]) => `ARRAY[${values.map(q).join(", ")}]::text[]`;
const W = q(DEMO_WORKSPACE_ID);

/** 시연용 팀원 계정(로그인 불가). 한 번만 실행한다. */
export function buildDemoTeammatesSql(): string[] {
  return DEMO_TEAMMATES.flatMap((mate) => [
    `INSERT INTO auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('00000000-0000-0000-0000-000000000000', ${q(mate.id)}, 'authenticated', 'authenticated', ${q(mate.email)}, now(), '{"provider":"email","providers":["email"]}'::jsonb, ${q(JSON.stringify({ nickname: mate.nickname }))}::jsonb, now(), now()) ON CONFLICT (id) DO NOTHING`,
    `INSERT INTO public.profiles (id, handle, nickname, tech_stack) VALUES (${q(mate.id)}, ${q(mate.handle)}, ${q(mate.nickname)}, ${arr(mate.techStack)}) ON CONFLICT (id) DO UPDATE SET handle = EXCLUDED.handle, nickname = EXCLUDED.nickname, tech_stack = EXCLUDED.tech_stack`,
  ]);
}

/** 워크스페이스 전체를 시연 시작 상태로 되돌린다(멱등). */
export function buildWorkspaceDemoSql(): string[] {
  const statements: string[] = [
    `INSERT INTO public.workspaces (id, name, description, category, space_status, activated_at, lifecycle_status, created_at, updated_at) VALUES (${W}, '캠퍼스 수강신청 도우미', '장바구니 단계에서 시간표 충돌·선수과목·학점 초과를 미리 검사해 주는 수강신청 보조 서비스 (부천대 SW 팀 프로젝트)', 'project', 'ACTIVE', '2026-10-05 23:00:00', 'IN_PROGRESS', '2026-10-05 23:00:00', '2026-10-21 00:18:00') ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, category = EXCLUDED.category, space_status = 'ACTIVE', lifecycle_status = 'IN_PROGRESS', completed_at = NULL, updated_at = EXCLUDED.updated_at`,
    `DELETE FROM public.kanban_columns WHERE workspace_id = ${W}`,
    `DELETE FROM public.kanban_tags WHERE workspace_id = ${W}`,
    `DELETE FROM public.workspace_views WHERE workspace_id = ${W}`,
    `DELETE FROM public.workspace_doc_comments WHERE workspace_id = ${W}`,
    `DELETE FROM public.workspace_docs WHERE workspace_id = ${W}`,
    `DELETE FROM public.workspace_channels WHERE workspace_id = ${W}`,
  ];

  for (const member of MEMBERS) {
    statements.push(
      `INSERT INTO public.workspace_members (workspace_id, user_id, role, team_role, joined_at) VALUES (${W}, ${q(member.userId)}, ${q(member.role)}, ${q(member.teamRole)}, ${q(member.joinedAt)}) ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = EXCLUDED.role, team_role = EXCLUDED.team_role, joined_at = EXCLUDED.joined_at`,
    );
  }
  for (const column of COLUMNS) {
    statements.push(
      `INSERT INTO public.kanban_columns (id, workspace_id, title, category, "order") VALUES (${q(column.id)}, ${W}, ${q(column.title)}, ${q(column.category)}, ${column.order})`,
    );
  }
  for (const tag of TAGS) {
    statements.push(
      `INSERT INTO public.kanban_tags (id, workspace_id, name, color, created_at) VALUES (${q(tag.id)}, ${W}, ${q(tag.name)}, ${q(tag.color)}, '2026-10-05 23:00:00')`,
    );
  }
  for (const doc of DOCS) {
    statements.push(
      `INSERT INTO public.workspace_docs (id, workspace_id, kind, title, content, emoji, parent_id, sort_order, is_archived, author_id, created_at, updated_at) VALUES (${q(doc.id)}, ${W}, ${q(doc.kind)}, ${q(doc.title)}, ${doc.content ? `${q(JSON.stringify(doc.content))}::json` : "NULL"}, ${q(doc.emoji)}, ${q(doc.parentId)}, ${doc.sortOrder}, false, ${q(doc.authorId)}, ${q(doc.updatedAt)}, ${q(doc.updatedAt)})`,
    );
  }
  for (const task of TASKS) {
    statements.push(
      `INSERT INTO public.kanban_tasks (id, column_id, title, description, priority, tags, "order", start_date, end_date, created_at, updated_at) VALUES (${q(task.id)}, ${q(task.column)}, ${q(task.title)}, ${q(task.description)}, ${q(task.priority)}, ${arr(task.tags)}, ${task.order}, ${q(task.start)}, ${q(task.end)}, ${q(`${task.start} 00:00:00`)}, ${q(`${task.end} 09:00:00`)})`,
    );
    task.assignees.forEach((userId, position) => {
      statements.push(
        `INSERT INTO public.kanban_task_assignees (task_id, user_id, assigned_by, assigned_at, position) VALUES (${q(task.id)}, ${q(userId)}, ${q(U.owner)}, ${q(`${task.start} 00:00:00+00`)}, ${position})`,
      );
    });
    for (const link of task.docs ?? []) {
      statements.push(
        `INSERT INTO public.kanban_task_documents (workspace_id, task_id, doc_id, relation_type, is_primary, created_by) VALUES (${W}, ${q(task.id)}, ${q(link.docId)}, 'reference', ${link.primary ? "true" : "false"}, ${q(U.owner)})`,
      );
    }
  }
  for (const channel of CHANNELS) {
    statements.push(
      `INSERT INTO public.workspace_channels (id, workspace_id, name, description, type, created_at, updated_at) VALUES (${q(channel.id)}, ${W}, ${q(channel.name)}, ${q(channel.description)}, 'PUBLIC', '2026-10-05 23:00:00', '2026-10-05 23:00:00')`,
    );
  }
  for (const message of MESSAGES) {
    // updated_at = created_at 이어야 "수정됨" 표시가 붙지 않는다.
    statements.push(
      `INSERT INTO public.workspace_messages (id, channel_id, sender_id, content, type, created_at, updated_at) VALUES (${q(message.id)}, ${q(message.channel)}, ${q(message.sender)}, ${q(message.content)}, 'TEXT', ${q(message.at)}, ${q(message.at)})`,
    );
  }
  return statements;
}
