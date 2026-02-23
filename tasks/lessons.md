# Lessons Learned

- 2026-02-23
  - Failure mode: 변경 범위를 설명할 때 "이번 브랜치 기준 신설/수정"과 "프로젝트 전체 이력에서 최초 생성"을 구분하지 않아 사용자에게 혼동을 줌.
  - Detection signal: 사용자가 "`ctp-content-registry.tsx`는 이전 커밋에도 네가 만든 파일"이라고 정정함.
  - Prevention rule: 파일 생성 여부를 말할 때는 항상 두 기준을 함께 명시한다.
    - 기준 1: 현재 작업 브랜치에서의 변화(`A/M/D`)
    - 기준 2: 저장소 전체 이력에서의 최초 생성 커밋(`git log --follow`)
