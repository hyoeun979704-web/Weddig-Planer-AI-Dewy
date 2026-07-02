# 260702 — AI 스튜디오 품질검토 (신규 기능 없음 — "있는 것 제대로")

> 요청: "새로운 기능 말고 있는 것부터 제대로 하자, 품질검토해줘."
> 범위: AI 스튜디오 도메인 전체(엣지 함수 9개 + `_shared/studio*` + FE 페이지 16개 +
> 데이터 레이어 5개 + 마이그레이션) — #523·#524·#525 diff 적대 검증 + **diff 밖 기존 결함 포함**.
> 방법: 병렬 리뷰 3축(백엔드 / 프론트 / 프롬프트 정합 — 프롬프트는 실제 렌더로 검증) + 교차 확인.
> 전체 레포 14차원 감사는 아님(주간 자동 감사 별도) — 이 문서는 AI 스튜디오 도메인 한정.

## TL;DR

- **P1(운영) 1건**: reaper 마이그레이션(20260701100000)이 **원격 미적용** — 머지됐지만
  deploy-migrations 가 dry-run 전용(베이스라인 드리프트)이라 스드메 미환불 P0가 실서비스에
  살아있었다. → **MCP apply_migration 으로 즉시 적용 + 검증**(sdm 블록 존재, 잔존 잡 0건).
- **P1(프롬프트) 2건**: ① 신랑 렌더에 신부 프레이밍("bridal portrait"·"makeup"·"gown")
  하드코딩 ② 신랑 본식 씬에 "dress train"·"bouquet" 잔존 — DO NOT("부케 금지")과 정면 모순.
  둘 다 실렌더로 확인·수정, **불변식 테스트 21개**로 회귀 가드.
- **P2 8건 수정**: 이중 환불 경합(전이 승자만 환불로 통일), 무료 게이트 폭주(잔액 선확인),
  photoshoot 버킷 30일 정리 누락(선제), 클로즈업×전신 포즈 모순, glam×매트 충돌, SDM
  identity 락 최약, 어드민 카탈로그 3중 드리프트, 스드메 결과물 dead-end(갤러리 부재).
- diff 로 주입된 회귀는 **0건**(3축 모두 확인) — 프롬프트 조립↔이미지 첨부 8조합 전수 일치,
  FE 전송 body↔서버 계약 전수 일치, 심 무결성 전수 확인.

## 발견 → 조치 전체 표

| # | 심각도 | 발견(축) | 조치 |
|---|---|---|---|
| 1 | **P1 운영** | reaper 마이그 원격 미적용 — 스드메 미환불 P0 실존속(백엔드) | ✅ MCP apply_migration 적용 + `pg_get_functiondef` 검증. photoshoot RPC 확장(#14)도 동일 경로 적용 |
| 2 | **P1** | `shotFramingBlock` 신부 하드코딩 — 신랑 렌더에 bridal/makeup/gown(프롬프트) | ✅ `shotTypes.ts` 성별 분기(신부 텍스트 바이트 동일 유지) — fitting·SDM 신랑 호출부 연결 |
| 3 | **P1** | 신랑 씬 치환 누락 — dress train·bouquet·solo bridal entrance 잔존 + "behind his" 비문(프롬프트) | ✅ `neutralizeVenueForGroom()` 단일 소스 헬퍼(구체 문구 선치환 + 격 맞춘 대명사) — 3개 호출부 통일 |
| 4 | P2 | 환불↔상태갱신 순서 비일관 → reaper 와 이중 환불/환불 유실 양방향 창구(백엔드) | ✅ **전이 승자만 환불** 패턴 통일: studioEdge(5플로우)는 pending/failed→refunded 전이 승자만 earn(timeout_reaped 제외), hair·photofix·consulting 은 finishAndRefund(processing 전이 승자만) |
| 5 | P2 | 결제 전 게이트가 차감 앞이라 잔액 0 사용자도 무료 Gemini/스토리지 폭주 가능(백엔드) | ✅ `hasHeartBalance` 잔액 선확인(읽기, fail-open) — 7개 플로우 |
| 6 | P2 | `photoshoot-uploads/results` 버킷 30일 정리 누락(휴면 기능 — 업로드는 이미 가능)(백엔드) | ✅ TARGET_BUCKETS + RPC IN 목록 편입(마이그 20260702120000, 원격 적용 완료) |
| 7 | P2 | 클로즈업/상반신에도 "Full body or 3/4 body visible" 포즈 지시 — 하체 지어내기 재유발(프롬프트) | ✅ POSE 를 shotType 인지로(closeup=두상 포즈만, bust=허리 위 명시, full=기존 유지) |
| 8 | P2 | glam RETOUCH "glossy glow" vs MAKEUP SCHEMA "matte (shine-free)" 충돌(프롬프트) | ✅ glam 에 "스키마 마감이 우선(WINS)" + 의도된 잔머리 보존 문구 |
| 9 | P2 | SDM identity 락이 6벌 중 최약(눈 크기·비율·philtrum·slim·age 누락) — drift 위험 최대 surface(프롬프트) | ✅ fitting 수준으로 보강 + 일상 조명/평상복 복사 금지 앵커 추가(신부·신랑) |
| 10 | P2 | 어드민 프롬프트 카탈로그 3중 드리프트(retouch 미반영·신랑판 부재·HAIR 스냅샷 구판)(프롬프트) | ✅ HAIR 는 subjectPrompt 단일 소스 직수입, 신랑·화보/풀 보정 엔트리 3종 추가 |
| 11 | P2 | 스드메(10하트 최고가) 결과물 재접근 경로 없음 — 결과 URL 이탈 시 dead-end(프론트) | ✅ `SdmPreviewGallery` + MyResults "스드메" 탭(기존 갤러리 패턴 그대로) + `fetchSdmGallery` |
| 12 | P2 | 프롬프트 모듈 유닛테스트 0건 — 위 결함들이 커밋 시점에 안 잡힘(프롬프트) | ✅ `studioPrompts.test.ts` 불변식 21개(신랑 어휘 잔존·포즈 정합·보정 레벨·심 값 import 가드·카탈로그 렌더) |
| 13 | P3 | 추천 2종만 `addPendingJob` 미등록 — 이탈 시 완료 알림 없음(프론트) | ✅ DressRecommend·MakeupRecommend 등록 |
| 14 | P3 | `toStylePreferencePayload` 의 hasData 게이트가 칩에 안 잡히는 신호(립톤 등)만 있으면 통째 드랍(프론트) | ✅ 실제 필드 기준 판정으로 교체 |
| 15 | P3 | 신랑 추천에 신부 드레스 신호(실루엣·넥라인·화이트톤) 주입(프론트) | ✅ gender 인지 필터(시즌·톤·메탈·무드만 전달) |
| 16 | P3 | `source_download_failed` 매핑이 5개 플로우에서 도달 불가(500 제네릭)(프론트) | ✅ 게이트 다운로드 try→400 코드 반환(클라 매핑 연결) |
| 17 | P3 | 원시 예외 메시지가 error_message 로 저장 → RLS self-read 노출(내부 URL 포함 가능)(백엔드) | ✅ `safeReason()` — 코드형 문자열만 저장, 원문은 서버 로그 |
| 18 | P3 | hair `single_style`·photofix `custom_text` 살균 없음(자유 텍스트 잔존 표면)(백엔드) | ✅ 제어문자 제거(길이 상한은 기존 slice 유지) |
| 19 | P3 | TEA(미드카프) 길이 판정이 fitting↔SDM 반대(발 렌더 지시 상충)(백엔드) | ✅ fitting 짧은길이 정규식에 `tea` 추가 |
| 20 | P3 | SDM prompt_params.reference_mode 가 신랑도 클라 원값 기록(실제는 text 강제) — 추적 드리프트(백엔드) | ✅ 실사용값 기록 |
| 21 | P3 | consulting blob→base64 1바이트 연결(20MB×2천만 루프 — CPU 리밋 위험)(백엔드) | ✅ 8KB 청크 변환(studioEdge 와 동일) |
| 22 | P3 | `fetchDressMeta`×2·`fetchMakeupMeta` 죽은 export(서버 이관 후 호출부 0)(프론트) | ✅ 제거(+해당 테스트 6개 정리) |
| 23 | P3 | faceLock(헤어 3뷰)만 moles/freckles·slim 금지 누락 / consulting freckles 누락(프롬프트) | ✅ 문구 보강 |
| 24 | P3 | callImageEdit 재시도 주석 "1회만" vs 실제 최대 3회 시도(백엔드) | ✅ 주석 정정(총 3회 상한 명시) |

## 확인함(문제 없음) — 각 축의 무결 판정

- **프롬프트 조립↔이미지 첨부 정합**: SDM 8조합(gender×reference_mode×sample) + fitting/makeup
  custom 플래그 전수 일치. TAILORED vs DRESS SCHEMA 는 대상 분리 명시로 모순 아님.
  natural 보정은 렌더 무흔적. WEDDING-DAY vs IDENTITY 는 화해 문구 존재.
- **FE 전송 body↔서버 계약**: 6개 플로우 필드명·타입 전수 일치, `toStylePreferencePayload`↔
  `StylePreferenceInput` 전 필드 일치, retouch 기본 studio 실전송 확인.
- **에러 경로**: FunctionsHttpError.context=Response 로 `edgeErrorCode` 유효(supabase-js 2.99.3),
  402/400/409 → 한국어 안내 흐름 실추적. RetouchLevelPicker 5페이지 렌더·타임아웃 화면·환불 안내 확인.
- **보안**: describeDress/describeMakeup 은 enum lookup 만 사용(`name` 미유입 — 주입 불가),
  style_preference 살균, 본인 폴더 검증, service_role 사용처, BOARD internal secret 모두 확인.
- **버킷 전수 대조**: dress/makeup/sdm 6버킷 + invitation-uploads AI prefix = RPC↔TARGET_BUCKETS
  완전 일치(photoshoot 만 누락 → #6 편입).
- **마이그레이션**: 새 reaper 정의가 원격 5블록(문구·reason 포함) 보존 + sdm 추가 — 손실 0.
  `sdm_previews.updated_at` 등 사용 컬럼 실존 확인.
- **iOS/사파리**: 신규 raw localStorage 접근 0, HEIC 통과(accept="image/*"), safe-area 유지.
- **접근성**: RetouchLevelPicker radiogroup·44pt 충족.

## 수용(의도적 미수정) — 근거 포함

- **더블탭 TOCTOU(2~6초 창)**: 클라 `isGenerating` disable + 서버 15초 가드의 잔존 틈.
  완전 차단은 idempotency key 필요 — earn/spend 멱등 설계와 함께 로드맵으로.
- **earn_hearts (reason, ref_id) 멱등 가드 부재**: 이중 환불의 근본 원인. 이번엔 호출측 전이
  가드로 창구를 닫았고, RPC 자체 멱등화는 하트 경제 전반(무 ref_id 호출부 다수) 재설계 필요 — 로드맵.
- **재시도의 플랫폼 이중 과금 가능성**: 네트워크 단계 실패 후 재시도는 첫 요청이 실처리됐을 수
  있음(사용자 하트는 1회). 1회 상한이라 수용.
- **hair/photofix 자유 텍스트 슬롯 자체**: 살균은 추가했으나 whitelist 화는 카탈로그 데이터
  도입 시(§로드맵). OpenAI 모더레이션이 2차 방어.
- **STYLE PREFERENCE 가 "Output:" 종결 라인 뒤에 붙는 구조**: 어색하나 실효 낮음 — 빌더
  시그니처 재변경 비용 대비 보류.
- **갤러리 조회 실패의 빈 상태 오표시 / retouch_level 결과 표시 / 코드 추출 3중 구현 /
  groomSuit draft / radio 화살표 키**: P3 마감 — 로드맵 기록.

## 검증

- `npm run build` ✅ / `npm run test` **1308/1308**(불변식 21개 신규, 죽은 테스트 6개 정리) ✅ /
  `npm run lint` 0 error ✅ / `check:integrity` 0 error ✅ / 엣지 9함수 esbuild 번들 ✅
- 원격 DB: reaper sdm 블록·photoshoot RPC 확장 적용 확인(`pg_get_functiondef`), 미환불 잔존 잡 0건.
- 한계: 실 gpt-image 생성 e2e·게이트 실판정 정확도는 sandbox 불가 — 실환경 확인 항목으로 유지.

## 남은 작업 (deferred)

1. earn_hearts 멱등화(+ ref_id 전 호출부 정비) — 이중 환불의 구조적 종결(P2).
2. idempotency key 기반 이중 제출 완전 차단(P3).
3. identity lock 6벌 → `studio/identity.ts` 단일 소스(문구 차이 표는 리뷰 로그 참조)(P2→P3,
   이번에 최약 락 보강으로 실위험은 완화됨).
4. 갤러리 에러 상태 표시·retouch_level 결과 라벨·에러코드 추출 단일화·hair 신뢰 경계
   whitelist 화·deploy-migrations 베이스라인 정합(운영 — 미적용 재발 방지의 근본 해결).
