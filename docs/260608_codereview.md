# 260608 코드리뷰·보안감사 작업 기록

> 브랜치 `main` (원격 `origin/main` 최신 머지) 기준 전체 코드리뷰 및 변경사항 분석 세션 기록.
> 시작 요청: "최신 깃으로 업데이트하고 코드리뷰해줘"
> 통계: **11 files, +912 / −154** (f6ae5ff..14f744d 기준). 커밋 2개.

## TL;DR — 핵심 성과

- **AI 스튜디오 전면 개인화 및 쌩얼 메이크업 보완**: 드레스/메이크업 피팅에 "맞춤 생성(Custom Mode)" 기능 추가. 사용자가 드레스/메이크업 속성을 직접 선택해 텍스트 기반으로 생성할 수 있어, 레퍼런스 이미지(Image 2) 없이도 완전한 개인화 생성 가능.
- **이목구비 및 소재 일관성 대폭 강화**: OpenAI Image Edits API 및 Gemini Vision API 활용 시, 얼굴 이목구비(눈 크기, 쌍꺼풀, 콧대, 입술 비율 등)와 의상 소재(새틴, 실크, 튤, 레이스 등 질감 및 광택) 일관성을 유지하기 위한 프롬프트 가이드를 구체적이고 엄격하게 고도화.
- **얼굴 분석 기반 동적 헤어보드 및 9그리드 프롬프트**: `dewy-hair-preview`에서 Gemini Flash를 사용해 업로드한 사진의 얼굴형/모발 분석 결과에 따라 맞춤형 스타일 및 컬러 추천(9종)을 동적으로 생성하고, 어울림 피드백을 한국어 및 영어 바인딩으로 제공.
- **헤어보드 고품질 렌더링 도입**: 얼굴 썸네일(18개 이상)이 다수 포함되어 이미지 해상도가 깨지는 문제를 해결하기 위해, 헤어보드 렌더링에만 `quality=high` 옵션을 적용하여 얼굴 드리프트 방지 및 퀄리티 개선.
- **컨설팅 리포트 생성 견고성 강화**: Vision 분석 실패 또는 API 에러로 분석 결과가 비는 경우, 깨진 보드 생성 방지를 위해 즉시 환불 및 실패 처리 로직(`analysisOk` 검증)을 Edge function에 추가하여 리스크 차단.

---

## 1. 보안 / 견고성 (가장 중점)

| 항목 | 내용 | 파일 / 커밋 |
|---|---|---|
| 컨설팅 Vision 분석 결과 누수 및 깨짐 방지 | Vision 분석 API가 실패하거나 응답 형식이 깨진 채 넘어왔을 때(`analysisOk` 검증 실패 시), 깨진 보드를 마구잡이로 호출하지 않고 즉시 하트 환불(`refund`) 및 리포트 `status: 'failed'` 처리 | `supabase/functions/wedding-consulting/index.ts` / `14f744d` |
| 맞춤형 드레스/메이크업 생성 시 Null 안전성 | `dress_sample_id` 및 `makeup_sample_id`를 선택적(Optional) 필드로 바꾸고, 카탈로그 레퍼런스 이미지가 없을 경우 Storage 다운로드 단계를 스킵하도록 Deno Edge Function 수정 | `supabase/functions/dewy-fitting/index.ts` / `e75b050`<br>`supabase/functions/dewy-makeup/index.ts` / `e75b050` |
| Gemini API 키 환경변수 분리 | 헤어 프리뷰 내 얼굴형/모발 분석 시 `GEMINI_API_KEY` 환경변수를 활용하며, API 키가 존재하지 않을 시 안전한 고정 프리셋 프롬프트로 폴백하도록 fail-safe 설계 | `supabase/functions/dewy-hair-preview/index.ts` / `e75b050` |

---

## 2. P0 런타임 버그 / 예외 처리

- **분석 실패 시 과금 오동작 차단**: DB의 `wedding_consulting_reports`에 리포트를 생성하며 하트 30개를 차감한 후, Vision 분석 혹은 OpenAI JSON 파싱에서 에러가 발생하면 하트가 영영 환불되지 않거나 `'undefined'` 키가 들어간 불량 보드가 지속적으로 생성되던 흐름 제어.
  - **개선**: `analysisOk` 판정 함수를 통해 `season_ko` 등 핵심 도메인 정보가 유효하지 않으면 즉시 `refund(finalCost)` RPC를 호출하고 상태를 `failed`로 종료 처리함.
- **카탈로그 이미지 로딩 에러 방지**: 맞춤 드레스/메이크업 생성 모드일 때는 `selectedDress` / `selectedMakeup` 변수가 `null`인 상태로 handleGenerate를 타게 됨. 기존의 `maybeSingle` SQL 호출 부에서 `selectedDress.id` 역참조로 발생할 수 있는 런타임 NPE를 방지하고자 `selectedDress!.id` 및 `makeupMode === 'catalog'` 분기 처리를 통해 안전하게 리팩터링 완료.

---

## 3. 폴더정리 / 공통화 (드리프트 차단)

- **맞춤형 프리셋 데이터 단일화**:
  - `src/components/fitting/CustomDressPicker.tsx` 및 `src/components/fitting/CustomMakeupPicker.tsx`
  - 두 컴포넌트에 정의된 실루엣, 넥라인, 컬러, 슬리브, 립마감 등의 속성 코드 및 프리셋 매핑 데이터를 `src/lib/dressDescription.ts` 및 `src/lib/makeupDescription.ts`의 스키마 명세와 일치시킴으로써 텍스트 생성의 단일 소스 체계를 유지. (UI 필터 데이터와 분리하여 Deno Edge Function parsing과의 정합성 달성)
- **리뷰 섹션 통합 포맷팅**:
  - 맞춤형 선택 완료 후 요약 정보를 텍스트(예: "맞춤 · A라인 · 오프숄더 · 아이보리")로 포맷팅하는 `summarizeDressKo`, `summarizeMakeupKo` 유틸리티 함수를 제공하여 복수의 컴포넌트나 요약 화면에서 중복 정의 없이 재사용할 수 있도록 공통화.

---

## 4. 도메인 변경 / 피처 개선

### A. 맞춤 드레스 및 메이크업 생성 (Custom Picker)
- **CustomDressPicker**: 4개 대표 프리셋(클래식, 로맨틱, 모던, 미니멀)으로 원터치 입력을 제공하며, 실루엣·네크라인·컬러 등 핵심 요소를 칩(Chip) 컴포넌트로 노출. 슬리브, 기장, 소재, 디테일, 백디자인 등 6개 고급 세부 정보는 아코디언(`Advanced` 드롭다운) 처리하여 깔끔한 화면 구성.
- **CustomMakeupPicker**: 내추럴, 로맨틱, 글램, 클래식 프리셋을 지원하며 베이스 마감, 립 컬러, 아이 스타일을 상위 탭에서 결정하고 상세조정으로 블러셔 위치, 눈썹 형태, 컨투어 등의 다양한 조합이 가능하도록 UI 설계.
- **추천 바인딩**: 추후 컨설팅 분석 결과가 있는 경우 "당신께 어울리는 추천으로 채우기" 버튼이 동적으로 활성화되도록 `recommended` prop 설계 및 연동.

### B. 프롬프트 내 일관성(Consistency)과 디테일 강화
- **헤어보드 일관성**: HAIRSTYLE BOARD 생성 프롬프트에 `★FACE CONSISTENCY` 및 `★HAIRSTYLE DIFFERENTIATION` 규칙을 대폭 강화. 6개 추천 컷이 한눈에 달라 보여야 하며, 각 썸네일에 억지로 지어낸 텍스트 대신 `cuts` 데이터의 한글 이름과 적합도 %를 정교하게 출력하도록 지시.
- **이목구비 보존**: `buildFittingPrompt` 및 `buildMakeupPrompt` 프롬프트에 눈(쌍꺼풀 크기, 꼬리 각도), 코(콧볼 너비, 콧대), 입술(가로 너비, 인중 비율), 얼굴형, 잡티/점의 위치를 AI 모델이 멋대로 보정하거나 지우지 못하도록 `TOP PRIORITY — IDENTITY MATCH` 규칙을 세부적으로 보강.
- **소재 질감(Realism)**: 드레스 소재(새틴, 실크, 튤, 레이스 등)의 광택, 비침 정도, 드레이프감 등을 AI 모델이 일반 새틴으로 통일해 버리지 않고 원단 그대로 재현하도록 프롬프트를 보강.

---

## 5. 규칙 및 문서

- **헤어보드 화질 격상**: `generateBoard` 시 헤어보드의 얼굴 썸네일 수가 많아 디테일이 깨지던 한계를 극복하기 위해, 헤어보드에만 `quality='high'`를 적용하고 나머지 보드는 `medium`을 유지함으로써 비용 효율성과 퀄리티 간의 최적의 밸런스를 달성.
- **전신안내 가이드 추가**:
  - `DressFitting.tsx` 및 `WeddingConsulting.tsx` 페이지 업로드 섹션에 "머리부터 발끝까지 전신이 보이는 사진일수록 드레스 핏·기장·비율이 자연스럽게 합성돼요" 및 "전신이 함께 나오면 체형·드레스 실루엣·넥라인 추천이 더 정확해져요"라는 상세 문구를 추가하여, 사용자의 오인식 및 부적절한 셀카 업로드로 인한 부자연스러운 이미지 합성을 미연에 방지.

---

## 남은 작업 (deferred)

- **맞춤 생성 이미지의 e2e 테스트**: Image 2(드레스 단독 사진) 없이 프롬프트 스키마로만 생성된 드레스/메이크업 합성본이 사용자 셀카에 얼마나 자연스럽게 안착하는지 다양한 해상도 및 성별/나이대별 사진으로 런타임 결과 확인 및 프롬프트 세부 튜닝.
- **맞춤 추천(Recommended) 데이터 프론트 결합**: 컨설팅 리포트 분석 완료 시, `DressFitting` 및 `MakeupFitting` 로드 과정에서 사용자의 `recommended` 데이터를 Supabase DB에서 조회하여 Picker에 기본값으로 공급해주는 브릿지 기능 마무리.
