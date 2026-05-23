# CTP 유지보수 플레이북

> 신규 컨셉 추가 / 기존 컨셉 수정 / ID 변경 시 따라야 하는 절차.

## 신규 sub-concept 추가 절차

1. **ConceptSpec JSON 작성**
   - 위치: `web/data/ctp/specs/<conceptId>.json`
   - 형식: `web/data/ctp/specs/concept-spec.ts`의 `ConceptSpec` 인터페이스 준수
   - `validateConceptSpec()`로 사전 검증

2. **Visualizer 작성** (시각화가 필요한 경우)
   - 위치: `web/components/features/ctp/playground/visualizers/svg-animations/module-XX/<id>.tsx`
   - export: `useXxxSim` 훅 + `XxxVisualizer` 컴포넌트
   - import 제약: `svg-primitives/` 라이브러리만 사용. hardcoded 색상/grid 금지
   - supp: `supp/<id>-supp.tsx`에 4개 SVG 컴포넌트 + `XxxSupplementaryOptions` 배열 export

3. **모듈 등록**
   - 해당 모듈 파일(`module-XX-*.tsx`) 안 `createInteractiveTemplateModules([...])` 배열에 새 항목 추가
   - 필드: `{ id, title, description, sampleData, story, features, useSim, Visualizer }`
   - `id`는 ConceptSpec의 `id`와 동일해야 함

4. **커리큘럼 등록**
   - `web/lib/ctp-curriculum.ts`의 해당 concept `subConcepts` 배열에 `{ id, title }` 추가

5. **(선택) Expansion 매핑**
   - `ctp-content-expansion.ts`에 같은 `id` 키로 추가 콘텐츠 보강 가능
   - fc-1~4와 ProblemBank 컨셉은 매핑 무관

6. **검증**
   ```bash
   pnpm exec node scripts/ctp-verify.mjs --concept <id>
   ```
   G1-G7 모두 PASS 확인 후 commit.

## ID 변경 시 동기화 4곳

같은 ID가 다음 4곳에서 키로 사용된다. 하나라도 누락하면 404 또는 매핑 깨짐:
1. `ctp-curriculum.ts`의 subConcept ID
2. `module-XX-*.tsx`의 `createInteractiveTemplateModules` 항목 `id`
3. URL `?view=<id>` 쿼리
4. `ctp-content-expansion.ts`의 expansions 키 (선택)

ID rename 시 위 4곳 동시 수정 + `ctp-verify.mjs` G3, G7 통과 확인.

## 기존 컨셉 콘텐츠 수정

- story/features 만 수정: 모듈 파일만 수정 + Tone Guide 준수 + G4 통과
- Visualizer 수정: 해당 `svg-animations/module-XX/<id>.tsx` + ConceptSpec storyboard 동기화

## 검증 명령 모음

```bash
# 단일 컨셉 검증
pnpm exec node scripts/ctp-verify.mjs --concept <id>

# 전체 컨셉 검증 (CI)
pnpm exec node scripts/ctp-verify.mjs --all

# 타입 검사
pnpm exec tsc --noEmit

# 빌드 검증
pnpm exec next build
```
