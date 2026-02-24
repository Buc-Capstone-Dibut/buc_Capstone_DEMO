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
