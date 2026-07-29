# Debut 최소 Spec 규칙

`specs/`는 모든 작업에 문서를 강제하는 곳이 아니다. 코드와 Pull Request만으로 목적과 검증을 이해하기 어려운 변경에만 한 장짜리 Spec을 남긴다.

- 현재 동작의 기준: 코드, 테스트, `docs/PROJECT_REFERENCE.md`, 서비스별 `README.md`
- 변경 논의와 검토의 기준: Issue와 Pull Request
- 구현 전 합의가 필요한 기능: `specs/**`
- 중요한 구조적 결정: 필요할 때만 `docs/decisions/**`에 ADR 작성

Spec은 구현 세부사항을 고정하는 설계도가 아니라, 사람이 정한 의도와 완료 조건을 AI와 팀에 전달하는 짧은 계약이다.

## 언제 작성하는가

| 변경 | 남길 기록 |
| --- | --- |
| 문구·스타일·로컬 리팩터링·작은 버그 | Spec 없이 PR 설명 |
| 사용자 동작이 바뀌거나 여러 모듈을 건드리는 기능 | 한 장짜리 Spec |
| 인증·권한·데이터 마이그레이션·공용 API/Socket/Yjs 계약 변경 | Spec + 필요한 계약 또는 ADR만 |
| 탐색용 프로토타입 | Spec 없이 시작하고, 채택할 때 Spec 작성 |

판단이 애매하면 한 장짜리 Spec으로 시작한다. 구현 중 실제로 필요해진 문서만 추가하며, 빈 템플릿을 채우기 위해 파일을 만들지 않는다.

## 구조

기능 하나는 기본적으로 Markdown 파일 하나다.

```text
specs/
├── README.md
├── TEMPLATE.md
└── workspace/
    └── navigation.md
```

API 스키마나 중요한 설계 결정처럼 독립적으로 검토할 내용이 생긴 경우에만 같은 이름의 디렉토리 또는 `docs/decisions/`로 분리한다.

## 한 장짜리 Spec

[`TEMPLATE.md`](TEMPLATE.md)를 복사하고 다음 네 가지를 작성한다.

1. **Why**: 어떤 사용자 문제를 해결하는가
2. **Outcome**: 사용자가 최종적으로 무엇을 할 수 있는가
3. **Boundaries**: 이번 변경에서 하지 않을 것과 반드시 지킬 제약
4. **Done when**: 관찰하거나 테스트할 수 있는 완료 조건

합의가 필요한 결정은 선택 항목인 **Notes**에만 추가한다. 요구사항 ID, 파일 목록, 클래스명, 상세 작업 순서, 모든 예외 상태를 기본으로 요구하지 않는다. 안전·호환성·공용 계약 때문에 꼭 필요한 경우에만 구체화한다.

## 작업 흐름

1. 사람과 AI가 현재 코드와 관련 문서를 확인한다.
2. Spec이 필요한 변경이면 AI가 짧은 초안을 만들고 범위가 맞는지 확인한다.
3. 사용자가 구현을 요청했거나 초안에 동의하면 바로 개발한다.
4. AI는 작고 검토 가능한 단위로 구현하고 관련 테스트를 함께 수행한다.
5. PR에 변경 이유, 핵심 변경, 검증 결과를 남긴다.
6. 제품의 현재 동작이 달라졌다면 `docs/PROJECT_REFERENCE.md` 또는 관련 README를 갱신한다.

별도의 `approved` 상태와 문서별 승인 절차는 두지 않는다. 다만 파괴적 작업, 보안·권한 완화, 데이터 마이그레이션, 되돌리기 어려운 결정은 구현 전에 명시적으로 확인한다.

작업 목록은 Issue, PR 또는 현재 대화에서 관리한다. 여러 사람이나 에이전트가 병렬로 작업해 장기 추적이 필요할 때만 Spec 안에 체크리스트를 둔다.

## 유지 방식

진행 상태는 Issue와 PR에서 관리한다. 완료된 Spec은 병합 당시 의도와 결정의 기록이며, 현재 동작을 중복 설명하는 운영 문서로 계속 확장하지 않는다. 구현 후의 현재 기준은 코드, 테스트, 프로젝트 기준 문서에 반영한다.

## 적용 근거

이 저장소는 도구의 전체 산출물을 그대로 강제하지 않고 다음 원칙만 채택한다.

- GitHub Spec Kit의 `Spec → Plan → Tasks → Implement` 흐름 중 Spec을 핵심 계약으로 사용한다. Plan과 Tasks는 필요할 때 생성하는 파생물로 본다.
- 잘 알려진 변경은 승인 단계를 줄이고, 불확실하거나 위험한 변경에만 사람의 검토 지점을 둔다.
- AI는 초안·분해·구현·검증을 수행하고, 사람은 제품 범위와 중요한 결정을 맡는다.
- 작은 PR을 기본 협업 단위로 삼고 중요한 구조적 결정에만 ADR을 남긴다.

참고:

- [GitHub Spec Kit](https://github.com/github/spec-kit)
- [Spec Kit의 Spec 유지 모델](https://github.github.com/spec-kit/concepts/spec-persistence.html)
- [AWS AI-Driven Development Life Cycle](https://aws.amazon.com/blogs/devops/ai-driven-development-life-cycle/)
- [Kiro Quick Spec](https://kiro.dev/docs/specs/quick-spec/)
- [GitHub의 리뷰하기 쉬운 변경 가이드](https://docs.github.com/en/pull-requests/concepts/helping-others-review-your-changes)
- [AWS Architecture Decision Records](https://docs.aws.amazon.com/prescriptive-guidance/latest/architectural-decision-records/adr-process.html)
