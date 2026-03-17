export interface ResumeAnalysis {
  summary: string;
  skills: string[];
  experiences: {
    title: string;
    description: string;
    keywords: string[];
  }[];
  strength: string[];
  weakness?: string[];
  questions: string[];
}

export interface JdAnalysis {
  title: string;
  companyName: string;
  requirements: string[];
  techStack: string[];
  responsibilities: string[];
}

// Mock Types for Community Integration
export interface MockPost {
  id: string;
  create_by: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
  updated_at: string;
  views: number;
  likes: number;
  tags: string[];
  author: {
    id: string;
    nickname: string;
    avatar_url: string;
  } | null;
  comments_count: number;
}

export interface MockChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  timestamp: string;
}

export const MOCK_JD_ANALYSIS: JdAnalysis = {
  title: "Frontend Developer (Senior)",
  companyName: "TechCorp Inc.",
  requirements: [
    "5+ years of experience with React",
    "Deep understanding of JavaScript/TypeScript",
    "Experience with Next.js and Server Components",
    "Performance optimization skills (Web Vitals)"
  ],
  techStack: ["React", "TypeScript", "Next.js", "Tailwind CSS", "Zustand"],
  responsibilities: [
    "Develop and maintain scalable web applications",
    "Collaborate with designers and backend engineers",
    "Mentor junior developers",
    "Ensure high performance and accessibility"
  ]
};

export const MOCK_RESUME_ANALYSIS: ResumeAnalysis = {
  summary: "5년차 프론트엔드 개발자로, React 생태계에 깊은 이해가 있으며 성능 최적화 경험이 풍부합니다.",
  skills: ["React", "Next.js", "TypeScript", "Redux", "AWS S3", "CI/CD"],
  experiences: [
    {
      title: "E-commerce 플랫폼 리팩토링",
      description: "Legacy jQuery 코드를 Next.js로 마이그레이션하여 로딩 속도 50% 개선",
      keywords: ["Migration", "Performance", "SEO"]
    },
    {
      title: "사내 디자인 시스템 구축",
      description: "공통 컴포넌트 라이브러리를 구축하여 개발 생산성 30% 향상",
      keywords: ["Design System", "Storybook", "NPM"]
    }
  ],
  strength: ["문제 해결 능력", "주도적인 업무 수행", "기술 공유 문화 조성"],
  questions: [
    "Next.js의 Server Component와 Client Component의 차이점에 대해 설명해주세요.",
    "대규모 트래픽 발생 시 프론트엔드 성능 최적화를 위해 어떤 전략을 사용하셨나요?",
    "디자인 시스템 도입 과정에서 겪은 가장 큰 어려움은 무엇이었나요?"
  ]
};

export const MOCK_HISTORY = [
  {
    id: "1",
    date: "2024-03-10",
    title: "Naver Frontend Dev",
    mode: "Real-time Video",
    score: 85,
    status: "Completed",
    feedback: "기술적 깊이는 훌륭하나 답변이 조금 더 간결했으면 좋겠습니다."
  },
  {
    id: "2",
    date: "2024-03-05",
    title: "Kakao Mobility",
    mode: "Chat Q&A",
    score: 78,
    status: "Completed",
    feedback: "상황 대처 능력에 대한 답변이 인상적이었습니다."
  },
  {
    id: "3",
    date: "2024-02-28",
    title: "Line Messenger",
    mode: "Real-time Video",
    score: 92,
    status: "Completed",
    feedback: "완벽에 가까운 답변이었습니다."
  }
];

export const MOCK_CHAT_MESSAGES: MockChatMessage[] = [
  {
    id: "msg-1",
    role: "ai",
    content:
      "안녕하세요, 반갑습니다. 간단한 사전 탐색 질문을 시작하겠습니다. 최근에 가장 집중해서 개발했던 프로젝트를 소개해 주세요.",
    timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
  },
  {
    id: "msg-2",
    role: "user",
    content:
      "최근에는 Next.js 기반 팀 협업 플랫폼을 개발했고, 상태관리 구조를 개선해서 렌더링 병목을 줄이는 작업을 했습니다.",
    timestamp: new Date(Date.now() - 1000 * 60 * 9).toISOString(),
  },
  {
    id: "msg-3",
    role: "ai",
    content:
      "좋습니다. 당시 병목을 발견한 방식과, 개선 전후 성능 차이를 어떤 지표로 확인했는지 설명해주실 수 있을까요?",
    timestamp: new Date(Date.now() - 1000 * 60 * 7.5).toISOString(),
  },
  {
    id: "msg-4",
    role: "user",
    content:
      "React Profiler와 사용자 세션 리플레이를 같이 봤고, 특정 화면에서 불필요한 재렌더가 반복되는 걸 확인했습니다. 개선 뒤에는 초기 상호작용 시간이 약 30퍼센트 정도 줄었습니다.",
    timestamp: new Date(Date.now() - 1000 * 60 * 6.5).toISOString(),
  },
  {
    id: "msg-5",
    role: "ai",
    content:
      "그 과정에서 본인이 직접 결정한 구조적 변화는 무엇이었나요?",
    timestamp: new Date(Date.now() - 1000 * 60 * 5.5).toISOString(),
  },
  {
    id: "msg-6",
    role: "user",
    content:
      "전역 상태를 페이지 단위로 모두 공유하던 구조를 쪼개서 서버 상태와 UI 상태를 분리했습니다. 그래서 변경 영향 범위를 줄이고, 컴포넌트 책임도 더 선명하게 가져갈 수 있었습니다.",
    timestamp: new Date(Date.now() - 1000 * 60 * 4.2).toISOString(),
  },
  {
    id: "msg-7",
    role: "ai",
    content:
      "협업 관점에서는 어떤 식으로 조율했고, 성과를 팀에 어떻게 설명했는지도 말해 주세요.",
    timestamp: new Date(Date.now() - 1000 * 60 * 2.8).toISOString(),
  },
  {
    id: "msg-8",
    role: "user",
    content:
      "디자이너와는 체감 속도 기준을 맞추고, 백엔드와는 캐시 전략 영향 범위를 먼저 정리했습니다. 이후 전후 성능 지표와 사용자 이탈률 변화를 같이 공유해서 우선순위를 설득했습니다.",
    timestamp: new Date(Date.now() - 1000 * 60 * 1.4).toISOString(),
  },
  {
    id: "msg-9",
    role: "ai",
    content:
      "좋습니다. 이번에는 협업보다 구현 관점으로 볼게요. 상태를 분리할 때 가장 중요하게 둔 기준은 무엇이었나요?",
    timestamp: new Date(Date.now() - 1000 * 60 * 1.3).toISOString(),
  },
  {
    id: "msg-10",
    role: "user",
    content:
      "상태가 바뀌는 주체와 소비 범위를 먼저 나눴습니다. 사용자 입력으로 즉시 반응해야 하는 UI 상태와 서버에서 관리해야 하는 데이터 상태를 섞지 않는 걸 가장 중요하게 봤습니다.",
    timestamp: new Date(Date.now() - 1000 * 60 * 1.15).toISOString(),
  },
  {
    id: "msg-11",
    role: "ai",
    content:
      "그 기준이 맞다는 건 어떤 순간에 확신하게 됐나요?",
    timestamp: new Date(Date.now() - 1000 * 60 * 1.05).toISOString(),
  },
  {
    id: "msg-12",
    role: "user",
    content:
      "동일한 화면인데도 데이터 패칭이 반복되면서 렌더링이 불안정해지는 구간이 줄었고, 컴포넌트 테스트를 작성할 때도 mocking 포인트가 명확해졌습니다.",
    timestamp: new Date(Date.now() - 1000 * 60 * 0.95).toISOString(),
  },
  {
    id: "msg-13",
    role: "ai",
    content:
      "성능 최적화 외에 개발 생산성 측면에서는 어떤 효과가 있었나요?",
    timestamp: new Date(Date.now() - 1000 * 60 * 0.85).toISOString(),
  },
  {
    id: "msg-14",
    role: "user",
    content:
      "기능 추가 시 어디를 수정해야 하는지가 빨리 보여서 작업 시간이 줄었습니다. 특히 신규 인원이 들어왔을 때 상태 흐름을 설명하기도 훨씬 쉬워졌습니다.",
    timestamp: new Date(Date.now() - 1000 * 60 * 0.75).toISOString(),
  },
  {
    id: "msg-15",
    role: "ai",
    content:
      "당시 우선순위 충돌이 있었다면 어떤 방식으로 조율했는지도 설명해 주세요.",
    timestamp: new Date(Date.now() - 1000 * 60 * 0.65).toISOString(),
  },
  {
    id: "msg-16",
    role: "user",
    content:
      "사용자 체감 성능에 직접 영향을 주는 화면을 먼저 잡고, 나머지는 리팩토링 범위를 문서로 분리했습니다. 그래서 팀이 한 번에 큰 변경을 받아들이지 않아도 되게 만들었습니다.",
    timestamp: new Date(Date.now() - 1000 * 60 * 0.55).toISOString(),
  },
  {
    id: "msg-17",
    role: "ai",
    content:
      "좋습니다. 본인의 개발 강점을 한 문장으로 정리하면 어떻게 말하시겠어요?",
    timestamp: new Date(Date.now() - 1000 * 60 * 0.45).toISOString(),
  },
  {
    id: "msg-18",
    role: "user",
    content:
      "저는 복잡한 프론트엔드 상태를 구조적으로 정리하고, 실제 성능 개선까지 연결하는 개발자라고 설명할 수 있습니다.",
    timestamp: new Date(Date.now() - 1000 * 60 * 0.35).toISOString(),
  },
];

export const MOCK_INTERVIEW_LIST = [
  {
    id: "session-1",
    date: "2024-03-24",
    company: "네이버",
    role: "Frontend Developer",
    score: 88,
    analysis: {
      evaluation: { jobFit: 90, logic: 85, communication: 82, attitude: 95 },
      overallScore: 88,
      passProbability: 75,
      feedback: {
        strengths: ["기술적 기반이 탄탄하고 React 내부 동작 원리에 대해 깊이 있는 답변을 함"],
        improvements: ["답변 시 결론부터 말하는 두괄식 화법을 조금 더 연습하면 좋겠음"]
      },
      habits: [
        { habit: "음...", count: 3, severity: "low" },
        { habit: "그게...", count: 2, severity: "medium" }
      ],
      sentimentTimeline: [60, 65, 80, 75, 90],
      bestPractices: [
        {
          question: "React Server Components의 장점은 무엇인가요?",
          userAnswer: "서버에서 렌더링되니까 빠르고 번들 사이즈가 줄어듭니다.",
          refinedAnswer: "가장 큰 장점은 클라이언트 번들 사이즈 감소와 서버 리소스 직접 접근입니다. 클라이언트로 전송되는 JS 양을 획기적으로 줄여 TTI를 개선할 수 있습니다.",
          reason: "단순히 '빠르다'는 표현보다 'TTI 개선'이나 '번들 사이즈 감소' 같은 구체적인 기술적 이점을 강조하는 것이 좋습니다."
        }
      ]
    }
  },
  {
    id: "session-2",
    date: "2024-03-20",
    company: "카카오",
    role: "Service Engineer",
    score: 74,
    analysis: {
      evaluation: { jobFit: 70, logic: 75, communication: 80, attitude: 72 },
      overallScore: 74,
      passProbability: 45,
      feedback: {
        strengths: ["팀 협업 경험과 소통 능력이 매우 뛰어남"],
        improvements: ["기술 면접에서 구체적인 예시를 들어 설명하는 부분이 아쉬움"]
      },
      habits: [
        { habit: "아무래도", count: 5, severity: "high" }
      ],
      sentimentTimeline: [50, 55, 60, 58, 65],
      bestPractices: [
        {
          question: "협업 시 갈등이 생기면 어떻게 해결하시나요?",
          userAnswer: "대화로 풀어나가려고 노력합니다.",
          refinedAnswer: "데이터와 근거를 바탕으로 상대방의 입장을 먼저 이해한 뒤, 프로젝트의 목표(Goal)를 최우선으로 두어 합의점을 도출합니다.",
          reason: "추상적인 '대화'보다 '근거 기반'과 '공통 목표'를 언급하는 것이 전문성을 높여줍니다."
        }
      ]
    }
  },
  {
    id: "session-3",
    date: "2024-03-15",
    company: "토스",
    role: "Product Developer",
    score: 92,
    analysis: {
      evaluation: { jobFit: 95, logic: 92, communication: 90, attitude: 90 },
      overallScore: 92,
      passProbability: 85,
      feedback: {
        strengths: ["사용자 경험에 대한 집착과 비즈니스 가치에 대한 이해도가 매우 높음"],
        improvements: ["매우 훌륭함. 다만 자신감이 때로는 과하게 비춰질 수 있으니 주의"]
      },
      habits: [],
      sentimentTimeline: [80, 85, 90, 92, 95],
      bestPractices: []
    }
  }
];

export const MOCK_COMMUNITY_POSTS: MockPost[] = [
  {
    id: "post-1",
    create_by: "user-1",
    title: "실무 면접에서 가장 많이 받은 질문 10선 (프론트엔드 편)",
    content: "안녕하세요. 최근 3달간 15곳 면접을 보면서 공통적으로 받았던 질문들을 정리해봤습니다...",
    category: "interview-tip",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    views: 1240,
    likes: 45,
    tags: ["Frontend", "Interview", "Questions"],
    author: {
      id: "user-1",
      nickname: "DevMaster",
      avatar_url: ""
    },
    comments_count: 12
  },
  {
    id: "post-2",
    create_by: "user-2",
    title: "비전공자 네카라쿠배 최종 합격 후기",
    content: "드디어 저도 합격 수기를 남기네요. 준비 과정에서 AI 면접이 큰 도움이 되었습니다...",
    category: "review",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    views: 3500,
    likes: 120,
    tags: ["Success", "Non-CS", "Motivation"],
    author: {
      id: "user-2",
      nickname: "NewBie",
      avatar_url: ""
    },
    comments_count: 56
  },
  {
    id: "post-3",
    create_by: "user-3",
    title: "면접관의 표정을 읽는 법? 비언어적 커뮤니케이션의 중요성",
    content: "면접은 말하는 내용뿐만 아니라 태도와 표정도 중요합니다...",
    category: "insight",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    views: 890,
    likes: 23,
    tags: ["SoftSkill", "Communication"],
    author: {
      id: "user-3",
      nickname: "HRLover",
      avatar_url: ""
    },
    comments_count: 5
  },
  {
    id: "post-4",
    create_by: "user-4",
    title: "2024년 개발자 연봉 협상 가이드",
    content: "최종 합격 후 처우 협상 단계에서 알아야 할 팁들입니다.",
    category: "career",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(),
    views: 5600,
    likes: 210,
    tags: ["Salary", "Negotiation"],
    author: {
      id: "user-4",
      nickname: "SeniorDev",
      avatar_url: ""
    },
    comments_count: 34
  }
];
