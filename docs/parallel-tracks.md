# 병렬 작업 트랙 — 새 세션 전달용 프롬프트

각 트랙은 독립 브랜치에서 작업한다. 동시 진행 안전 조합: **트랙 1 + 3 + 5**
(파일 영역 완전 분리). 트랙 2·4 는 `WeddingInfoSetupModal` 공유 가능성이
있어 둘 중 하나씩만 동시 진행.

머지 순서 권장: 3·5 → 1 → 2·4 (App.tsx / 마이그레이션 겹치는 것 나중에).

공통 규칙 (모든 트랙):
- 빌드 검증: `npm run build:vite`
- 마이그레이션 파일명 timestamp 는 트랙마다 다른 시각 사용 (충돌 방지)
- 작업 완료 시 PR 생성, CI(Vercel) 그린 확인 후 머지
- 하트 결제: `user_hearts` + `spend_hearts`/`earn_hearts` RPC (reason 문자열)
- 동의 기록: `user_consents` 테이블 + `useDataCollectionConsent` 패턴
- 모바일 레이아웃: `max-w-[430px] mx-auto`

---

## 트랙 1 — 청첩장 고급 기능 (3-D / 3-E)

```
Dewy 웨딩 앱 (React 18 + Vite + Supabase, 모바일 max-w-[430px]) 에서
청첩장 기능을 확장한다.

[브랜치] origin/main 에서 claude/invitation-advanced 분기

[현재 상태]
청첩장 V1 이 완성돼 있다:
- 종이 무료/5하트(누끼), 모바일 무료 등급 동작
- src/pages/invitation/InvitationFlow.tsx — template→wizard→result 흐름
- src/components/invitation/InvitationCanvas.tsx — Konva 캔버스, 슬롯 렌더
  (text/image/asset/calendar/qr/map), auto_cutout 슬롯 지원
- src/data/seedInvitationTemplates.ts — 코드 시드 (slug 기준 upsert)
- supabase/functions/invitation-cutout — remove.bg 누끼 (REMOVEBG_API_KEY)
- supabase/functions/invitation-text-suggest — Gemini 인사말 (1하트)
- supabase/functions/dewy-dress-recommend / dewy-makeup-recommend — gpt-image-2
  사진→이미지 변환 패턴의 레퍼런스
- 가격: 종이 0/5/15, 모바일 0/10/20 하트

[작업]
3-D: 모바일 청첩장 누끼 등급 (10하트)
  - 모바일 누끼 시드 템플릿 1개 추가 (1080×1920, auto_cutout 슬롯)
  - 이미 invitation-cutout / applyCutoutToSlots 인프라 있음 — 재사용
  - InvitationFlow 가 mobile + price_hearts=10 도 처리하는지 확인·보강

3-E: 사진 → 일러스트 변환 (15/20하트)
  - 새 Edge function (supabase/functions/invitation-illustrate) —
    gpt-image-2 로 사용자 사진을 흑백 핸드드로잉 라인 일러스트로 변환.
    dewy-dress-recommend 의 gpt-image-2 호출 패턴 참고.
  - 슬롯 스키마의 auto_illustration 플래그 활성 (types.ts 에 이미 정의됨)
  - InvitationFlow 의 applyCutoutToSlots 와 유사한 applyIllustrationToSlots
  - 일러스트 데모 시드 템플릿 1개 (종이 15하트)
  - 프롬프트 튜닝: 흑백 라인 일러스트, 인물 단순화, 흰 배경

[건드리지 말 것]
- src/pages/MyPage.tsx, src/components/mypage/* (다른 트랙)
- src/pages/Privacy.tsx, Auth.tsx, AuthContext.tsx (트랙 2)
- src/pages/AIPlanner*, Schedule*, Home*, Community* (트랙 3/4/5)

[주의]
- src/App.tsx 라우트 추가 시 invitation 관련 줄만 (다른 트랙도 라우트
  추가하므로 머지 충돌 최소화)
- 마이그레이션 필요 시 파일명 20260521 이후 + 트랙1 전용 시각 사용

[참고 문서] docs/invitation-ux-review.md (결정 필요 항목 A~E)
```

---

## 트랙 2 — 동의·약관 마무리

```
Dewy 웨딩 앱 (React 18 + Vite + Supabase) 의 개인정보 동의 체계를
마무리한다.

[브랜치] origin/main 에서 claude/consent-finalize 분기

[현재 상태]
동의 체계가 거의 완성됨:
- user_consents 테이블 (consent_type / consent_version / agreed /
  agreed_at). RLS: owner SELECT+INSERT, UPDATE/DELETE 금지 (이력 보존)
- src/hooks/useDataCollectionConsent.ts — data_collection_v1 동의 상태
- src/components/consent/DataCollectionConsentModal.tsx — 수집항목/목적/
  기간/위탁사 명시 모달
- PhotoUploadConsent → photo_upload_v1 기록
- 임신 민감정보 → sensitive_health_pregnancy_v1 기록
- 마케팅 동의 → Auth 가입 폼 체크박스 → user_metadata 에 기록

[작업]
1. /privacy 페이지 (src/pages/Privacy.tsx) 본문 동기화:
   - 제3자 처리 위탁 섹션 추가/갱신 (OpenAI 이미지생성, Google Gemini
     문구추천, remove.bg 누끼)
   - 민감정보(임신/건강) 처리 항목
   - 마케팅 정보 수신 동의 항목
   - 보관 기간 (회원 탈퇴 시까지, AI 업로드 30일 자동삭제)
   ※ 법적 정확성 중요 — 기존 본문 톤·구조 유지하며 항목만 추가

2. LocationTerms (src/pages/LocationTerms.tsx) — 현재 약관 페이지만 있음.
   위치정보 사용 시점 또는 설정에 명시적 동의 체크박스 surface 검토·추가.
   user_consents 에 location_v1 기록.

3. 마케팅 동의 backfill: 가입 시 user_metadata.marketing_consent 에만
   기록됨. AuthContext (src/contexts/AuthContext.tsx) 의 첫 로그인 감지
   시점에 metadata → user_consents(marketing_v1) 로 1회 이관.

[건드리지 말 것]
- src/pages/invitation/*, src/components/invitation/* (트랙 1)
- src/pages/AIPlanner*, Home*, Community* (트랙 3/5)
- src/components/wedding-planner/WeddingInfoSetupModal.tsx — 트랙 4 와
  충돌 가능. 이 트랙에서 수정 필요하면 트랙 4 와 조율

[주의]
- Auth.tsx 는 이 트랙 단독으로 수정
- 마이그레이션 필요 시 트랙2 전용 시각 사용
```

---

## 트랙 3 — AI 플래너 UX 검토·개선

```
Dewy 웨딩 앱 (React 18 + Vite + Supabase, 모바일) 의 AI 플래너 화면을
페르소나 기반으로 UX 검토하고 자동 개선한다.

[브랜치] origin/main 에서 claude/aiplanner-ux 분기

[방법] docs/mypage-ux-review.md 와 docs/invitation-ux-review.md 의
페르소나 검토 패턴을 그대로 따른다:
1. AI 플래너 페이지(src/pages/AIPlanner.tsx 등) 구조 파악
2. 5명 내외 가상 페르소나로 진입~사용 흐름 시뮬레이션
3. 발견한 UX 이슈를 자동개선 가능 / 결정필요 로 분류
4. 자동개선 가능한 것만 코드 수정 (명백한 결함: 진입로 부재, 빈 상태
   안내 부족, 라벨 오류, 로딩/에러 미처리 등)
5. 결정 필요한 것은 docs/aiplanner-ux-review.md 에 선택지+추천과 함께 정리
6. PR 생성

[건드리지 말 것]
- 청첩장 / 마이페이지 / 동의 / 일정·예산 / 홈·커뮤니티 파일
- 공유 컴포넌트 (Button 등 ui/) 는 수정 금지, 사용만

[주의] App.tsx 라우트는 가급적 안 건드림. 새 페이지 추가 시 라우트 1줄만.
```

---

## 트랙 4 — 일정·예산 UX 검토·개선

```
Dewy 웨딩 앱 (React 18 + Vite + Supabase, 모바일) 의 일정/예산 화면을
페르소나 기반으로 UX 검토하고 자동 개선한다.

[브랜치] origin/main 에서 claude/schedule-budget-ux 분기

[방법] docs/mypage-ux-review.md 의 페르소나 검토 패턴을 따른다:
1. 일정(src/pages/Schedule.tsx, MySchedule.tsx), 예산 페이지 구조 파악
2. 페르소나 시뮬레이션 → 이슈 분류 (자동개선 / 결정필요)
3. 자동개선만 수정, 결정필요는 docs/schedule-budget-ux-review.md 에 정리
4. PR 생성

[건드리지 말 것]
- 청첩장 / 마이페이지 / 동의 / AI플래너 / 홈·커뮤니티 파일
- ★ src/components/wedding-planner/WeddingInfoSetupModal.tsx 는 트랙 2 와
  공유될 수 있음. 이 모달 수정이 필요하면 PR description 에 명시하고
  트랙 2 머지 후 rebase. 가급적 모달 자체는 안 건드리고 일정/예산 페이지
  레벨에서만 개선.

[주의] 마이그레이션 필요 시 트랙4 전용 시각 사용
```

---

## 트랙 5 — 홈·커뮤니티 UX 검토·개선

```
Dewy 웨딩 앱 (React 18 + Vite + Supabase, 모바일) 의 홈/커뮤니티 화면을
페르소나 기반으로 UX 검토하고 자동 개선한다.

[브랜치] origin/main 에서 claude/home-community-ux 분기

[방법] docs/mypage-ux-review.md 페르소나 검토 패턴을 따른다:
1. 홈(src/pages/Home* / Index 등), 커뮤니티 페이지 구조 파악
2. 페르소나 시뮬레이션 → 이슈 분류
3. 자동개선만 수정, 결정필요는 docs/home-community-ux-review.md 에 정리
4. PR 생성

[건드리지 말 것]
- 청첩장 / 마이페이지 / 동의 / AI플래너 / 일정·예산 파일
- 공유 ui/ 컴포넌트

[주의] App.tsx 라우트 추가 시 1줄만
```

---

## 통합·머지 가이드 (메인 세션에서)

- 각 트랙 PR 을 순서대로 머지: 3 → 5 → 1 → 4 → 2
- App.tsx 충돌은 라우트 추가 줄만이라 가볍게 resolve
- 마이그레이션 번호가 겹치면 나중 머지 트랙이 timestamp +1
- 각 트랙이 docs/*-ux-review.md 를 남기므로, 머지 후 "결정 필요" 항목들을
  모아 사용자에게 일괄 보고
