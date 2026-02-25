import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Start seeding...");

  // 1. 테스트 유저 생성 (고정 UUID)
  const userId = "00000000-0000-0000-0000-000000000001";
  const email = "test@example.com";

  // 유저 존재 여부 확인
  const existingUser = await prisma.users.findUnique({
    where: { id: userId },
  });

  if (!existingUser) {
    await prisma.users.create({
      data: {
        id: userId,
        email: email,
        aud: "authenticated",
        role: "authenticated",
        email_confirmed_at: new Date(),
        raw_user_meta_data: {},
        phone: "01012345678",
      },
    });
    console.log("테스트 유저 생성:", email);
  } else {
    console.log("테스트 유저가 이미 존재합니다.");
  }

  // 2. 프로필 생성 (없으면 생성)
  const existingProfile = await prisma.profiles.findUnique({
    where: { id: userId },
  });

  if (!existingProfile) {
    await prisma.profiles.create({
      data: {
        id: userId,
        handle: "test-user-0001",
        nickname: "코딩하는대학생",
        bio: "백엔드 개발자를 꿈꾸는 컴퓨터공학과 4학년입니다. NestJS와 Supabase에 관심이 많습니다.",
        tier: "Gold",
        tech_stack: ["React", "Next.js", "TypeScript", "NestJS", "Supabase"],
        avatar_url: "https://github.com/shadcn.png",
      },
    });
    console.log("프로필 생성 완료");
  }

  // 3. 게시글 (Posts) 데이터 생성
  const postsData = [
    {
      title: "졸업작품 주제로 Supabase 어떤가요?",
      content:
        "이번에 캡스톤 디자인으로 웹 서비스를 만들려고 하는데, 백엔드를 직접 구축하는 것보다 Supabase를 쓰는 게 효율적일까요? 실시간 채팅 기능도 넣고 싶습니다.",
      category: "질문게시판",
      tags: ["졸업작품", "Supabase", "진로상담"],
      author_id: userId,
      views: 120,
      likes: 15,
    },
    {
      title: "Next.js 14 서버 액션 찍먹 후기",
      content:
        "확실히 API 라우트 따로 안 파도 되니까 편하긴 하네요. 근데 클라이언트 컴포넌트랑 섞어 쓸 때 주의할 점이 꽤 있는 것 같습니다. 특히 캐싱 정책...",
      category: "정보공유",
      tags: ["Next.js", "React", "후기"],
      author_id: userId,
      views: 85,
      likes: 8,
    },
    {
      title: "프론트엔드 취업 시장 요즘 빡센가요?",
      content:
        "이제 막 리액트 공부 시작했는데 주변에서 다들 백엔드 하라고 하네요. 신입 프론트엔드 포트폴리오 어느 정도 수준이어야 서류 통과할까요?",
      category: "커리어",
      tags: ["취업", "프론트엔드", "고민"],
      author_id: userId,
      views: 230,
      likes: 42,
    },
    {
      title: "타입스크립트 제네릭 너무 어렵습니다 ㅠㅠ",
      content:
        "유틸리티 타입까지는 이해하겠는데, 라이브러리 뜯어보면 infer 키워드 나오고 난리도 아니네요. 효율적인 공부 방법 있을까요?",
      category: "질문게시판",
      tags: ["TypeScript", "공부법"],
      author_id: userId,
      views: 56,
      likes: 3,
    },
    {
      title: "[팁] VS Code 추천 익스텐션 모음",
      content:
        "1. Pretty TypeScript Errors\n2. Console Ninja\n3. GitLens\n\n이거 3개는 꼭 써보세요. 디버깅 삶의 질이 달라집니다.",
      category: "정보공유",
      tags: ["VSCode", "개발툴", "생산성"],
      author_id: userId,
      views: 150,
      likes: 25,
    },
    {
      title: "AWS 자격증 따신 분 있나요?",
      content:
        "SAA(Solutions Architect Associate) 준비 중인데 덤프만 봐도 될까요? 아니면 이론 강의를 제대로 듣는 게 나을까요?",
      category: "자격증",
      tags: ["AWS", "자격증", "클라우드"],
      author_id: userId,
      views: 102,
      likes: 10,
    },
    {
      title: "사이드 프로젝트 팀원 구할 때 팁",
      content:
        "지인끼리 하는 게 제일 좋긴 한데, 모르는 사람들이랑 할 때는 '중도 하차 시 페널티'를 거는 게 확실히 효과적입니다.",
      category: "정보공유",
      tags: ["사이드프로젝트", "팀빌딩"],
      author_id: userId,
      views: 77,
      likes: 20,
    },
    {
      title: "개발바닥 3년차 회고",
      content:
        "벌써 3년이 지났네요. 처음 입사했을 때는 git push도 무서웠는데...",
      category: "커리어",
      tags: ["회고", "개발자", "에세이"],
      author_id: userId,
      views: 340,
      likes: 55,
    },
  ];

  for (const post of postsData) {
    await prisma.posts.create({
      data: post,
    });
  }
  console.log(`게시글 ${postsData.length}개 생성 완료`);

  // 4. 스쿼드 (Squads - 모집 공고) 데이터 생성
  const squadsData = [
    {
      title: "Next.js + Supabase 포트폴리오 스터디 (모집중)",
      content:
        "매주 주말 3시간씩 모각코 하실 분 구합니다. 서로 코드 리뷰해주고 동기부여 하는 게 목표입니다.",
      type: "스터디",
      status: "recruiting",
      leader_id: userId,
      tech_stack: ["Next.js", "Supabase", "TypeScript"],
      capacity: 4,
      recruited_count: 1,
      place_type: "online",
      location: "Discord",
    },
    {
      title: "스택오버플로우 클론 코딩 (백엔드 1분 모셔요)",
      content:
        "현재 프론트 2명 있습니다. NestJS로 API 서버 구축해주실 백엔드 개발자님 구합니다! 3개월 내 완성 목표입니다.",
      type: "프로젝트",
      status: "recruiting",
      leader_id: userId,
      tech_stack: ["NestJS", "PostgreSQL", "Docker"],
      capacity: 4,
      recruited_count: 2,
      place_type: "offline",
      location: "강남역 모임공간",
    },
    {
      title: "알고리즘 코테 준비방 (백준 골드 이상)",
      content:
        "매일 1문제 풀고 인증하기. 안 하면 벌금 1000원. 빡세게 하실 분만 오세요.",
      type: "스터디",
      status: "recruiting",
      leader_id: userId,
      tech_stack: ["Python", "C++", "Java"],
      capacity: 8,
      recruited_count: 5,
      place_type: "online",
      location: "Discord",
    },
    {
      title: "Flutter로 배달앱 만드실 분?",
      content:
        "디자이너 1명 있습니다. 개발자 2명 구해요. 수익 창출까지 생각하고 있습니다.",
      type: "프로젝트",
      status: "recruiting",
      leader_id: userId,
      tech_stack: ["Flutter", "Firebase", "Dart"],
      capacity: 3,
      recruited_count: 1,
      place_type: "online",
      location: "Zoom",
    },
    {
      title: "CS 전공지식 면접 대비 스터디",
      content: "운영체제, 네트워크, 데이터베이스 돌아가면서 발표 스터디입니다.",
      type: "스터디",
      status: "recruiting",
      leader_id: userId,
      tech_stack: ["CS", "면접"],
      capacity: 6,
      recruited_count: 3,
      place_type: "offline",
      location: "홍대입구",
    },
  ];

  for (const squad of squadsData) {
    await prisma.squads.create({
      data: squad,
    });
  }
  console.log(`스쿼드 ${squadsData.length}개 생성 완료`);

  // 5. 워크스페이스 및 칸반 보드 데이터 생성
  const workspaceName = "졸업작품 프로젝트";

  // 워크스페이스 생성
  const workspace = await prisma.workspaces.create({
    data: {
      name: workspaceName,
      created_at: new Date(),
    },
  });
  console.log("워크스페이스 생성:", workspaceName);

  // 워크스페이스 멤버 추가
  await prisma.workspace_members.create({
    data: {
      workspace_id: workspace.id,
      user_id: userId,
      role: "owner",
    },
  });
  console.log("워크스페이스 멤버 추가 완료");

  // 칸반 태그 생성 (DB Persistence 확인용)
  const tagsData = [
    { name: "Bug", color: "red" },
    { name: "Feature", color: "blue" },
    { name: "Enhancement", color: "purple" },
  ];

  for (const tag of tagsData) {
    await prisma.kanban_tags.create({
      data: {
        workspace_id: workspace.id,
        name: tag.name,
        color: tag.color,
      },
    });
  }
  console.log("칸반 태그 생성 완료");

  // 칸반 컬럼 생성
  const columnsData = [
    { title: "To Do", category: "todo", order: 0 },
    { title: "In Progress", category: "in-progress", order: 1 },
    { title: "Done", category: "done", order: 2 },
  ];

  const createdColumns = [];
  for (const col of columnsData) {
    const newCol = await prisma.kanban_columns.create({
      data: {
        workspace_id: workspace.id,
        title: col.title,
        category: col.category,
        order: col.order,
      },
    });
    createdColumns.push(newCol);
  }
  console.log("칸반 컬럼 생성 완료");

  // 칸반 태스크 생성
  const tasksData = [
    {
      title: "로그인 페이지 UI 구현",
      description: "Shadcn UI를 사용하여 로그인 폼 디자인",
      column_id: createdColumns[0].id, // To Do
      order: 0,
      priority: "high",
      tags: ["Feature", "Frontend"],
    },
    {
      title: "DB 스키마 설계",
      description: "Prisma Schema 작성 및 마이그레이션",
      column_id: createdColumns[1].id, // In Progress
      order: 0,
      priority: "critical",
      tags: ["Backend"],
    },
    {
      title: "기획서 작성",
      description: "요구사항 정의서 및 화면 설계서",
      column_id: createdColumns[2].id, // Done
      order: 0,
      priority: "medium",
      tags: ["Enhancement"],
    },
  ];

  for (const task of tasksData) {
    await prisma.kanban_tasks.create({
      data: {
        column_id: task.column_id,
        title: task.title,
        description: task.description,
        order: task.order,
        priority: task.priority,
        tags: task.tags,
      },
    });
  }
  console.log("칸반 태스크 생성 완료");

  console.log("모든 한국어 데이터 시딩 완료!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
