# 260617 코드리뷰 #2 — PR #330·#331·#332 감사 (포트폴리오 앨범 + 필터 + 이벤트 배너)

> 대상: 미디어 기획(`docs/260617_business_media_plan.md`)의 3개 PR. 6차원 + iOS/사파리 +
> dead-end UI 로 적대적 자기검증. 결론: **기능 정합·dead-end 없음. 단, 마이그레이션 미적용 시
> 422 회귀 위험(P1)을 #332 에서 방어 처리함.**

## TL;DR
- **#330**(merged 34da67e) 포트폴리오 앨범: 견고(드리프트 폴백·spinner finally·orphan 앨범 무해). ✅
- **#331**(draft) 필터 바: 로직 정합(loose 제외·승인상품만 패키지 옵션). ✅
- **#332**(draft) 이벤트 배너+상세: dead-end 아님(카드→실제 상세 모달). **P1: 명시 컬럼 select →
  마이그레이션 미적용 시 이벤트 전량 사라짐** → `select("*")` 방어로 수정(이번 커밋).
- **교차 위험**: #331·#332 둘 다 `PlaceBusinessSections.tsx` 수정 → 나중 머지본 **충돌/리베이스** 필요.

## 보안
- 모든 insert 가 `owner_user_id = user.id` + RLS(owner write / public read). 인가 OK.
- 외부 이미지 URL 입력 허용 → `<img src>` 렌더. `javascript:` 미실행(브라우저), 저장형 XSS 아님.
  단 외부 호스트 핫링크/트래킹 가능(저위험, 기존 BusinessGallery 패턴 동일). 수용.
- 앨범 product_id 칩: `productName` 맵은 **승인 상품만**으로 구성 → 미승인 상품명 노출 안 됨(의도대로).

## P0/P1 버그
- **P1 (수정함) — #332 명시 컬럼 422**: `business_events` 를 `banner_image_url, detail_images`
  명시 select(소비자·어드민·업체 3곳). 컬럼이 라이브 미적용이면 PostgREST 422 → **이벤트
  목록 전체 실패**(verification-lessons 의 "없는 컬럼 SELECT→422→전체 실패" 회귀 동일 클래스).
  Vercel 은 머지 즉시 배포되나 마이그레이션은 수동 → 시차 윈도우 존재. → 3곳 모두 `select("*")`
  방어로 변경(place_media 와 동일 idiom). insert 는 여전히 컬럼 필요하나 실패 시 toast(블래스트
  반경=신규 등록 1건, graceful).
- **P2 — orphan 앨범**: #330 앨범 insert 성공 후 사진 insert 실패 시 빈 앨범 잔존. 렌더는
  `photosByAlbum.has(a.id)` 게이트로 **노출 안 됨**(무해). 정리는 향후 선택.

## dead-end UI / placeholder CTA
- **#332 이벤트 카드 → 상세 모달**: 탭 시 실제 상세(배너·기간·내용·detail_images) 렌더. **dead-end 아님.** ✅
- #330 앨범 카드/#331 필터칩: 모두 실제 상태 변경/그룹 노출 수행. no-op 없음. ✅

## iOS/사파리(웹) 차원
- 이미지 업로드는 기존 `ImageUploader`(vendor-images 버킷) 재사용 → HEIC/대용량 처리 위임(공통).
- **draft 자동저장 미적용(P2)**: 이벤트 등록 폼(제목+내용 textarea)·BusinessGallery 앨범 폼은
  `useTextDraft`/`formDraft` 미적용 → iOS 탭 폐기 시 입력 유실 가능(AGENTS.md #7②). 기존 폼들과
  동일한 갭(이번 PR 신규 결함 아님). 후속 일괄 적용 권장.
- 모달: Radix `DialogContent` 에 `DialogDescription` 없어 a11y 콘솔 경고(P3, 동작 영향 없음).

## 성능
- `PlaceBusinessSections` 4쿼리 병렬(Promise.all), N+1 없음. 맵/필터 계산은 매 렌더지만 경량(데이터·
  필터 변경 시만 리렌더). 수용.

## 공통화/아키텍처
- `ImageUploader`·RLS 패턴·moderation 워크플로 재사용(DRY). 계층(page/component/migration) 준수.
- `select("*")` 드리프트 방어가 이제 place_media·business_events 공통 idiom — 주석으로 의도 명시.

## 적용/권장
| 항목 | 상태 |
|---|---|
| #332 `select("*")` 422 방어 (3곳) | ✅ 이번 커밋 |
| **머지 전 라이브 마이그레이션 적용** (20260617070000 앨범 · 20260617080000 배너) | ⏳ 사용자 SQL 실행 |
| #331·#332 머지 순서 — 나중 것 리베이스 | ⏳ 머지 시 |
| draft 자동저장(이벤트·앨범 폼) | deferred(공통 갭) |
| orphan 앨범 정리, Dialog a11y description | deferred(P2/P3) |

## 검증
- `npm run build` ✅ / `npm run lint` ✅(신규 에러 없음, 기존 `as any` 경고만).
- e2e: sandbox 라 클라 클릭 미검증 — **라이브 마이그레이션 적용 후 실기기에서 이벤트 등록→검토→
  소비자 카드 탭→모달, 앨범 필터 동작 확인 필요**(SQL 레벨/정적만 확인).
