# 260624 전체 감사 2차 (출시 직전 재검증 + 데이터 보강 후속)

260624 1차 이후 변경분(place-enrich 함수·iOS 수정·데이터 보강) 포함 재감사. 검증 기반(실코드·실DB).
보안/정확성/데이터-표시 3차원 병렬. 이번엔 **수정까지 적용**했다(아래 ✅ 표시).

## 결과 요약

| 항목 | 1차 상태 | 2차 결과 |
|---|---|---|
| S1 design-purchase 무료탈취 | P1 열림 | ✅ **닫힘**(팀이 환불·grant순서 수정) |
| S2 webhook fail-open | P1 열림 | ✅ **닫힘**(apple/play fail-closed) |
| **지도 좌표 미사용**(엉뚱한 위치) | P1 | ✅ **이번에 수정** — `PlaceMap.tsx` 좌표를 카메라 위치(`c=lng,lat`)에 박음 |
| **정렬 썸네일 우선키 부재** | P2 | ✅ **이번에 수정** — `places.has_image` 생성컬럼 + hook 4곳 `partner_rank→has_image→…` |
| **create_quote_request 8/9인자 공존** | P1 | ✅ **이번에 수정** — 구 8인자 DROP(실DB 1개로 정리 확인) |
| **config.toml place-enrich 블록 누락** | 신규 MEDIUM | ✅ **이번에 수정** — `verify_jwt=false` 명시 |
| 사진/갤러리 빈섹션·onError | — | 확인—안전(빈섹션 숨김·placeholder 폴백 있음) |
| CTA dead-end / 추천 0건 숨김 | — | 확인—안전 |
| "인기순" 라벨 오해소지 | 후보 | 오판정 — vendor 목록엔 정렬 라벨 미사용(닫힘) |

## 남은 항목(P2/마이너 — 미수정, 하드닝)
- `usePartnerDeals.ts:246` increment_claim_count `.catch(()=>{})` → console.warn 권장.
- `pages/CoupleVoteDetail.tsx:118` ai_suggestion update error 미확인(상태표시용 best-effort).
- `Cart.tsx:65-77` 수량 ± 더블클릭 last-write-wins → 버튼 disabled 권장.
- 추천 쿼리(`usePlaceRecommendations`)에 `deleted_at is null` 가드 누락 — soft-deleted 누출 방지 한 줄.
- place-enrich `last_collected_at` 를 실패행에도 스탬프 → 어드민 신선도 지표 약간 왜곡(의도된 트레이드오프, 보안 무관).

## place-enrich 검증(신규 함수 — 안전)
- 좌표변환 `/1e7`(WGS84) 정확 — `place-geocode-backfill` 과 동일, KATEC 혼동 없음.
- x-admin-token 인증·동적 `.or()` 필터(고정 ISO cutoff)·네이버 응답 파라미터화 쓰기 — 인젝션/우회 없음.
- 빈배열·null·429 재시도·부분쓰기 멱등(빈 필드만) — 견고.

## 데이터 보강 결과(별건, 코드 아님)
네이버 local 보강으로 활성 업체 주소 0%→**56~88%**(카테고리별), SNS/웹 수천 건. 가전·허니문 낮음=카테고리 특성(온라인/여행).

## 결론
출시 차단급(P1) **전부 해소**(이번 수정 + 팀 선반영). iOS 코드 수정(지도·정렬)은 다음 빌드에 포함 → 재빌드/재업로드 필요. P2 4건은 하드닝(차단 아님).
