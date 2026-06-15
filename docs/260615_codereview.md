# 260615 감사·정합성 후속 (코드리뷰)

> 범위: 감사 결과 기반 후속 + 사용자 보고 버그. ① 업체 리스팅 승인 불능(P0) ② 데이터 신선도
> 백엔드 정합성 ③ 어뷰징·엣지 보안(A1~A5) ④ 출석 KST 버그 ⑤ 기능(청첩장 3-모드·결과물 통합·
> 태그 검색·캔버스 핸들). 직전 리뷰: `260614_codereview_2.md`. 각 항목 커밋 해시·파일 추적.

## TL;DR

- **P0 — 업체정보 승인 불능 수정**: 클라가 `admin_review_listing` 을 3인자(p_note 포함)로
  호출하는데 DB 함수는 2인자 → PostgREST 함수 미발견(PGRST202)으로 **승인이 100% 실패**하던 것을
  수정. 빌드·린트는 통과(`as any` 캐스트)해 이전 감사들이 못 잡았다. **DB 적용 완료라 이미 해소**.
- **데이터 신선도 정합성**: 대시보드가 `updated_at`(트리거·마이그레이션 등에 흔들림)으로 신선도를
  재 **모든 카테고리가 '신선'으로 거짓** 표시. 실제 수집일(`last_source_date`) 기준 staleness 큼
  (studio 44·hanbok 37 등 60일+). → last_source_date 기준 + '수집일 미상' 분리 표기로 정직화.
- **보안 A1~A5 처리**: admin RPC anon revoke(A1)·조회수 dedup(A3)·RSVP burst 제한(A4)·엣지 error
  일반화(A5). A2(is_premium_member)는 트리거 의존·저영향으로 보류.
- **출석 완료표시 버그**: KST 날짜 계산 이중보정으로 00~09시 미표시 → 수정.
- **규칙 고도화**: RPC 인자↔시그니처 교차확인 + 신선도 신호(updated_at≠last_source_date) 교훈을
  `verification-lessons.md`·`AGENTS.md` 에 추가.

---

## 1. P0 — 업체 리스팅 승인 불능

- 증상(사용자): "업체정보 승인이 여전히 안 됨"(전체 감사 후에도 잔존).
- 원인: `AdminBusinessReview.reviewListing` → `admin_review_listing(p_place_id, p_approved, p_note)`
  3인자 호출, 함수는 2인자뿐 → PGRST202 → 호출 전량 실패. 부수: 사장님 페이지가 반려 사유로
  `places.moderation_note` 를 읽는데 컬럼 부재(항상 빈값).
- 수정(`b07449a`, mig `20260615000349`): `places.moderation_note` 추가 + `admin_review_listing` 에
  `p_note` 파라미터 추가(반려 시 사유 저장). **admin 역할 실호출 시뮬레이션으로 승인 반영 검증**.
  `types.ts` 반영. ⚠️ 검증 호출이 대기 1건을 실제 승인 처리함(필요 시 반려로 변경 가능).

## 2. 데이터 신선도 백엔드 정합성

- 발견: `AdminDashboard` 신선도가 `updated_at` 기준 → 정규화 트리거·모더레이션·마이그레이션이
  갱신해 **stale 0 = 거짓 '신선'**. `last_source_date` 기준 실측: studio 44·hanbok 37·wedding_hall
  17·tailor 15·dress 10·makeup 8곳 60일+. 또 `last_source_date` 자체가 대부분 NULL.
- 수정(`b07449a`): `last_source_date` 기준 계산 + `unknownCount`(수집일 미상) 분리 표기 + 설명 문구.
  카테고리 키는 실제 값과 일치 확인(`etc` 1건만 미집계 — 무시).
- 근본(deferred): 수집 파이프라인이 `last_source_date` 를 소스 발행일로만 채워 대부분 NULL.
  '수집 실행일' 의미로 바꾸면 `scoring`·`dedupe` 까지 영향 → 설계 결정 필요.

## 3. 보안 (어뷰징·엣지)

| 항목 | 처리 | 커밋/mig |
|---|---|---|
| A1 admin 비즈니스/제휴 RPC anon·PUBLIC revoke | authenticated 전용(내부 has_role 유지) | `081979a` / 20260614234033 |
| A3 조회수 카운터 per-user/day dedup | view_events unique, 로그인 1회/일 집계 | `a114b5c` / 20260614235842 |
| A4 RSVP 익명 도배 burst 제한 | 10분 30건 초과 차단(+총 500 cap) | `79c7b1b` / 20260615001509 |
| A5 엣지 error.message 일반화 | invitation-map·delete-account 제네릭화 | `223ee51` |
| A2 is_premium_member auth.uid() | **보류**(트리거 2개 의존·저영향) | — |

## 4. UX 버그 — 출석 완료표시

- `useAttendance.todayKstISO()` 가 getTimezoneOffset 보정 후 toISOString 으로 또 UTC 로 읽어
  KST 브라우저에서 'UTC 날짜' 반환 → RPC 의 KST 날짜와 00~09시 어긋나 claim 후 '완료' 미표시.
  → `Date.now()+9h` 후 toISOString 으로 타임존 무관 KST 날짜 산출(`081979a`).

## 5. 기능 (요약)

- **청첩장 3-모드**(`3f921c9`): AI 자동생성·템플릿 선택·자유. 경쟁사 분석(한국 표준=폼+템플릿)
  반영, 기존 플로/Studio 재사용.
- **결과물 통합 페이지**(`e704c14`): `/ai-studio/my-results` 탭(헤어·드레스·메이크업·사진보정·컨설팅),
  갤러리 embedded 재사용.
- **태그 검색 surface**(`70d09fd`): `/search/tag/:tag` + 상세 #태그 칩 재활성화(실데이터 2,038곳).
- **청첩장 캔버스 핸들 터치영역**(`c7e8195`): 리사이즈 핸들 hitStrokeWidth 확대.
- **Settings dead-end 정리**(`081979a`): 오픈소스 라이선스 페이지·언어 row.

## 적용 마이그레이션

| version | 내용 |
|---|---|
| 20260614234033 | admin 비즈니스/제휴 RPC anon revoke (A1) |
| 20260614235842 | 조회수 카운터 dedup view_events (A3) |
| 20260615000349 | places.moderation_note + admin_review_listing p_note (P0) |
| 20260615001509 | RSVP burst rate-limit (A4) |

> (이번 라운드 외 동일 세션의 inquiry_channel·promo popup 등은 `260614_codereview_2.md`/PR 참고.)

## 남은 작업 (deferred)

- **A2** is_premium_member auth.uid(): 트리거 의존, 저영향.
- **데이터 신선도 근본**: 파이프라인 `last_source_date` 의미(소스 발행일 → 수집 실행일) 설계 결정 +
  기존 NULL 백필. scoring·dedupe 영향분석 선행.
- **A4 완전 anti-spam**: IP/캡차 엣지 레이어.
- **e2e**: 실기기 확인(승인·신선도 대시보드·태그·캔버스 등 샌드박스 미확인).

## 규칙/문서 업데이트

- `verification-lessons.md`: RPC 인자≠시그니처(PGRST202 100% 실패) · 신선도 신호 오류 교훈 추가.
- `AGENTS.md` 검증 섹션: RPC 인자↔함수 시그니처 교차확인 규칙.
