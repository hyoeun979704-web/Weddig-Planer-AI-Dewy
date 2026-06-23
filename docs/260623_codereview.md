# 전체감사 — 레포 전체 × 전 surface × 14차원 (2026-06-23)

> 첫 14차원 전체감사. `docs/audit-surface-map.md` 기준 surface 별 병렬 fan-out(소비자/기업·운영자/
> 네이티브·백엔드) + 프로덕션 DB 직접 검증(RLS·RPC 가드). 방어(1~13) + 초개인화(14) 공세 차원 포함.

## TL;DR
- **P0 1건**: **광고 ATT 누락**(`adService.initAds` 가 `requestTrackingAuthorization` 없이 AdMob init →
  iOS 5.1.2 반려). **이번 감사에서 코드 수정 적용**(ATT 요청 추가). 네이티브 Info.plist 문구는 Mac-side 남음.
- **보안 대형 de-risk(추측→검증)**: 기업/운영자 surface 의 인가를 **프로덕션 DB 로 직접 확인** —
  ① 기업/플레이스 테이블 **RLS 전부 활성+정책 존재** ② **admin_* RPC 20개 전원 권한 가드 보유**.
  클라 코드만으론 "RLS 가정"이던 걸 사실로 확정.
- **dead-end UI·백엔드 정합·결제 anti-steering·회원탈퇴·UGC·법적 고지**: 전부 통과(아래 차원별).
- **초개인화(14)**: 엔진(20모드)·추천행·홈 헤더는 깊이 ④. 단 **꿀팁·견적·예산·VendorList·쇼핑**은
  신호를 정렬/큐레이션(③)까지만 쓰고 **카피/CTA 변형(④)·생성형(⑤)** 미적용 → 개인화 기회 매트릭스 참조.

## 차원별

### 2. 보안 / 인가 (프로덕션 DB 검증 — 이번 감사 최대 수확)
- ✅ **RLS 활성+정책**(pg_class/pg_policies 직접 조회): `business_products`(5)·`business_coupons`(7)·
  `business_events`(7)·`place_inquiries`(3)·`place_reviews`(5)·`place_media`(4)·`places`(3)·`place_details`(2).
  → 클라가 `.eq("owner_user_id",…)` 만 해도 서버 RLS 가 타 업체 데이터 변조 차단. "RLS 가정" 해소.
- ✅ **admin_* RPC 20개 전원 권한 가드**(`pg_get_functiondef` 검사: is_admin/has_role/user_roles 참조).
  AdminGuard 가 클라 전용이라도 RPC 본문이 서버에서 막음 → 비관리자 직접 호출 차단.
- ✅ edge functions(`iap-verify-*`·`delete-account`·웹훅) Bearer/secret 검증, IDFA/PII 누출 없음.

### 3. dead-end UI / placeholder CTA (필수)
- ✅ 소비자 전 surface: 영구 placeholder CTA·no-op 없음. `BusinessDashboard` "준비중"은 `disabled` 처리,
  `InvitationMarket` 토스트는 보유상태 피드백(죽은 버튼 아님). 결제 CTA 전부 실제 경로 도달.
- ✅ 미입점 '문의' → 견적매칭 전환 유지(이전 회귀 수정분 잔존 확인).

### 8. 출시 적합성 (스토어 컴플라이언스)
- 🔴→🟢 **광고 ATT (5.1.2)**: `adService.initAds` 에 `requestTrackingAuthorization()` 추가(이번 커밋).
  거부해도 비개인화 광고로 graceful. **남은 Mac-side**: Info.plist `NSUserTrackingUsageDescription` +
  `SKAdNetworkItems` + 실제 `GADApplicationIdentifier`(현재 테스트 ID).
- ✅ **결제 anti-steering (3.1.1)**: `HeartCharge`·`SubscriptionCheckout` 가 `getPaymentProvider()` 로
  분기 — 네이티브=IAP UI 만, unavailable=숨김. 외부/웹 결제 누수 없음.
- ✅ **회원탈퇴 (5.1.1)**: `Settings`→`delete-account`(auth user 삭제+7개 버킷 정리, 부분 실패 graceful).
- ✅ **UGC (1.2)**: `ReportDialog`(6사유)·`BlockUserDialog`·AI결과 신고 동작.
- ⬜ **권한 사용설명 문자열**(Info.plist 카메라/사진/ATT) — Mac-side, 레포 미포함. 제출 전 Xcode 확인 필수.

### 9. 안정성 (복원력)
- ✅ `ErrorBoundary`(청크 리로드 복구·`client_error_logs` 로깅), `safeLocalStorage`/`safeSessionStorage`
  (iOS 프라이빗 화이트스크린 차단), 전 데이터 페이지 스켈레톤/빈상태(흰화면 없음), IAP 5분 타임아웃+재시도,
  AdMob 플러그인 미설치 graceful 폴백.

### 1·5·6 정확성/테스트/아키텍처 (백엔드)
- ✅ **RPC↔클라 인자 정합**: `spend_hearts`·`earn_hearts`·`pay_balance`·`increment_post_views` 등 스팟체크
  — PGRST202 불일치 없음. ✅ 하트 차감 단일 UPDATE(원자적)·`iap_transactions` UNIQUE(이중발급 차단).
- ⚠️ 결제 e2e 테스트 파일 부재(`products.test.ts` 만) — 샌드박스 IAP e2e 권장(deferred).

### 10·11·13 법적/비용/개인정보
- ✅ 하트·구독 결제 화면에 청약철회·환불 고지(전자상거래법 17조), `AccountDeletion` 보존기간 표·위탁 고지.
- ✅ LLM/외부 API 는 서버 토큰·auth 게이트, 폭주 루프 없음. 검색 디바운스(250ms).

### 14. 초개인화 (공세) — 개인화 기회 매트릭스

| Surface | 쓰는 신호 | 현재 | 목표 | 고도화 포인트 |
|---|---|---|---|---|
| 홈(PersonaDashboard) | 페르소나·D-day·스타일 | ④ | ④ | ✅ 헤더 카피·미션 페르소나화(양호) |
| 추천행(PersonaRecRows) | 페르소나·지역 | ④ | ④ | ✅ 카테고리 순서 페르소나별(양호) |
| **A2 꿀팁(Tips)** | 페르소나·단계 | ③ | ④ | "당신을 위한 꿀팁" 제네릭 → "임신 중 결혼 꿀팁" 등 **헤드라인 변형** |
| **A1 VendorList** | 페르소나·지역·취향 | ③ | ④ | taste 소프트정렬만 → **"맞춤 이유"** 표기 |
| **A3 예산/일정** | D-day·페르소나 | ③ | ⑤ | 고정 템플릿 다음액션 → **생성형 맞춤 제안** |
| **A6 견적(QuoteNew)** | 지역·예산 | ③ | ④ | 지역 프리필만 → **재혼/스몰/예산 페르소나 카피** |
| **A6 쇼핑(Store)** | 예산·지역·featured_personas | ②~③ | ④ | featured 필터는 있으나 카피 제네릭·신규유저 폴백 전원동일 → **예산대별 큐레이션** |

> 목표>현재 6개 surface = 초개인화 백로그. 엔진·신호는 갖춰졌고 **표면(카피/CTA/생성형) 적용이 얕다** —
> 다음 개인화 스프린트 우선순위.

## 적용 마이그레이션 / 변경
| 항목 | 내용 | 상태 |
|---|---|---|
| `adService.ts` ATT | AdMob init 전 `requestTrackingAuthorization` | ✅ 이번 커밋(코드). Info.plist 는 Mac-side deferred |
| (DB 변경 없음) | RLS·RPC 가드는 **검증만**(이미 존재) | ✅ 프로덕션 조회로 확인 |

## surface 커버리지 표
| Surface | 점검 | 비고 |
|---|---|---|
| 소비자 A1~A3·A6·A7 | ✅ | dead-end·안정성·개인화 깊이 |
| 소비자 A4(AI)·A5(청첩장 에디터) | ⚠️ | 로직 확인, e2e/Konva 좌표 미검증 |
| 기업 B (12개 관리 항목) | ✅ | edit·갤러리·상품·리뷰·쿠폰·이벤트·리드·문의·배송·디자인 |
| 기업 B 가이드 | ⬜ | read-only 추정, 미점검 |
| 운영자 C (16/28) | ✅ | places·claims·business-review·content-review·promotions·users·inquiries·prompts·error-logs 등 |
| 운영자 C 나머지 12 | ⬜ | reports·assets·fonts·ai-jobs·samples·instagram·announcements·waitlist (read-only/CRUD 추정) |
| 네이티브 D | ⚠️ | 코드측 ✅, Info.plist Mac-side ⬜ |
| 백엔드 E | ✅ | RPC 정합·RLS·edge auth·원자성·큐레이션 게이트 |

## 남은 작업 (deferred)
1. **Mac-side Info.plist** (제출 전 필수): ATT 문구·SKAdNetworkItems·실 GADApplicationIdentifier·카메라/사진 권한 문구.
2. **초개인화 백로그**: 꿀팁 헤드라인·VendorList 맞춤 이유·예산/일정 생성형·견적 페르소나 카피·쇼핑 예산대 큐레이션(매트릭스 6건).
3. **운영자 C 미점검 12 라우트 + 기업 가이드** 차기 감사 이월(⬜).
4. **결제 e2e 테스트**(샌드박스 IAP) 추가.
5. **AI(A4)·청첩장 에디터(A5)** 깊은 e2e(프롬프트 왕복·Konva 좌표) 차기.
