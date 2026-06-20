# 🎯 최종 실행 계획 (단일 소스 — 출시까지) · 260620

> 이 문서가 **출시까지의 정식 실행 계획**이다. 세부는 각 참조 문서로 링크(중복 X).
> 구성: ①확정 결정 ②세션 완료분 ③잔여 작업 전체 ④**다방면 완전성 검수(9관점)** ⑤실행 순서 ⑥검증 원칙.
> 코드 착수 전 계획 확정용. 변경 시 이 문서가 우선.

## 1. 확정 결정 로그 (single source)
| # | 결정 | 값 |
|---|---|---|
| D1 | 레포 | 단일 레포 + `android/`·`ios/` |
| D2 | 결제 분기 | 웹=카카오페이 / 네이티브=**IAP** |
| D3 | IAP 솔루션 | 네이티브 스토어 빌링 직접(RevenueCat X) |
| D4 | IAP 가격 | 웹가 +10% (`iapPriceForKrw`) |
| D5 | iOS | 코드 선반영, Apple 계정이 게이트 |
| D6 | 데모 계정 | 고정 리뷰어 계정 ✅생성 |
| D7 | Google | 비공개테스트 가동 / Android 이미 운영(4차) |
| D8 | 푸시 | 사용(권한·FCM/APNs·마케팅/야간동의) |
| D9 | 위치 | 첫 출시 제외 |
| D10 | 무료체험 | 1개월 / 데모 2개월 |
| D11 | 추천인 | 추가(기존 referral 완성) |
| D12 | AI 공유 | 원탭 공유(워터마크 X) |
| D13 | 영어·A/B | 제외 |
| D14 | AI 결과 UX | 공유통일·전후비교·확대만(나머지 보류) |
| **D15** | **무료체험 자동갱신** | **a 전환(자동갱신)** — 정기결제 엔진 신규 구축 |

## 2. 이번 세션 완료분 (커밋됨 — branch `claude/md-review-audit-at4qt5`)
- ✅ P0 코드: 결제 sessionStorage 안전화(7) · ilike 이스케이프(4) · Auth/MyResults/Premium.
- ✅ AI 생성 라벨(`AiDisclosureNotice`) 6페이지 — AI기본법.
- ✅ 정책 단일화: companyInfo/consentDefinitions/dataRetention + **사업자정보 약관 기재**.
- ✅ 계정삭제 스토리지 purge.
- ✅ DB: 함수 search_path 마이그(19).
- ✅ 자동갱신 스키마 토대(sid/next_billing_at) + 설계.
- ✅ 감사·문서: codereview·codereview_2·gatekeeper_review·launch_handoff·autorenew_plan 등.

## 3. 잔여 작업 전체 (owner: 🧑‍💻나 / 👤당신 · gate: 🟢여기 / 🟡스테이징 / 🔴실PG·실기기)
| # | 작업 | P | owner | gate | 참조 |
|---|---|---|---|---|---|
| R1 | **디지털 IAP 분리**(추상화·상품·검증엣지·anti-steering) | P0 | 🧑‍💻+👤 | 🔴샌드박스 | payment_compliance_plan |
| R2 | **수집항목 정확화**: 방침·Data Safety·App Privacy ↔ 실제(사진·결제·광고ID·기기) + 얼굴사진 고지 | P0 | 🧑‍💻+👤 | 🟢 | gatekeeper §PIPA |
| R3 | **AI 인앱 신고**(genAI) — 결과에 신고+모더레이션 | P0 | 🧑‍💻 | 🟢 | codereview E |
| R4 | **Apple SiwA**(+토큰 revoke) | P0(iOS) | 🧑‍💻+👤 | 🔴Mac | ios-packaging §4 |
| R5 | **자동갱신 엔진**(ready/approve SID·charge잡·cancel PG·리마인더·UI문구) | P0(D15) | 🧑‍💻+👤 | 🔴KakaoPay sandbox | autorenew_plan |
| R6 | ATT + AdMob iOS(앱ID·SKAdNetwork) + 프라이버시 매니페스트 | P1(iOS) | 🧑‍💻+👤 | 🔴Mac | launch_handoff ⑦⑧ |
| R7 | 푸시(권한·POST_NOTIFICATIONS·FCM/APNs·send-push) | P1 | 🧑‍💻+👤 | 🔴실기기 | launch_handoff ③ |
| R8 | 청약철회 동의 UX(전상법17) 점검·보완 | P1 | 🧑‍💻 | 🟢 | gatekeeper §공정위 |
| R9 | 마케팅/야간 수신동의(발송 시) | P1 | 🧑‍💻+👤 | 🟢 | codereview B3 |
| R10 | 성장: 추천인·원탭공유·체험확장·AI UX(전후/확대) | P1 | 🧑‍💻 | 🟢 | growth_improvements |
| R11 | 견적 버스트 제한 | P1 | 🧑‍💻 | 🟡 | codereview_2 A5 |
| R12 | 국세: 현금영수증·부가세·정산매출 구분 체계 | P1 | 👤 | — | gatekeeper §국세청 |
| R13 | 보류 DB(definer view·버킷 리스팅·always-true RLS) | P2 | 🧑‍💻 | 🟡 | codereview_2 A1 |
| R14 | 의존성 6취약(dompurify 등) | P2 | 🧑‍💻 | 🟢 | codereview_2 G |
| R15 | 성능 백로그(RLS initplan·인덱스) | P2 | 🧑‍💻 | 🟡 | codereview_2 A2 |
| R16 | 머니패스 승인후 정합(디자인마켓 ON 전) | P1 | 🧑‍💻 | 🔴 | codereview A2 |

## 4. 다방면 완전성 검수 (9관점 — 계획이 완벽한가)
| 관점 | 핵심 요구 | 계획 반영 | 갭 |
|---|---|---|---|
| A 스토어(Apple) | IAP·SiwA·ATT·매니페스트·구독고지·데모·최소기능 | R1·R4·R5·R6, D6 | 없음(전부 R화) |
| B 스토어(Google) | 빌링·genAI신고·DataSafety·타깃API·광고ID | R1·R3·R2, ✅타깃 | 없음 |
| C 국내법 | AI기본법✅·PIPA·전상법(청약철회·사업자정보✅)·정보통신망·위치✅ | R2·R8·R9 | 없음 |
| D 세무 | 사업자·통신판매✅·현금영수증·부가세·정산구분 | R12 | 👤 영역(체계 필요) |
| E 코드 보안/품질 | P0버그✅·dead-end✅·DRY·DB어드바이저 | R11·R13·R14·R15, ✅완료분 | 없음 |
| F 머니패스 무결성 | 멱등·검증✅·승인후 정합·정기결제 안전 | R5·R16 | 없음 |
| G 성장/제품 | 추천인·공유·체험·AI UX | R10 | 없음 |
| H 인프라 | SDK·안전영역✅·푸시·의존성 | R7·R14, ✅SDK문서 | 없음 |
| I 검증가능성 | e2e 한계 명시 | gate열(🔴=실PG/실기기) | 명시됨 |
**검수 결론**: 9관점 모두 R1~R16에 매핑됨 — **계획상 누락 없음**. 미해결은 "결정"이 아니라 "외부 승인·실환경 검증 대기"뿐(D 세무는 👤 영역).

## 5. 실행 순서 (의존성·게이트 반영)
> 원칙: ①"이미 위반"(Google 빌링) 해소 최우선 ②이 환경에서 끝나는 것 먼저 ③외부 승인은 병렬 대기.

- **Phase 0 — 외부 승인 대기(병렬, 👤)**: Apple 계정·KakaoPay 정기결제 승인 / IAP 상품 등록·env·키.
- **Phase 1 — 지금, 여기서 완결(🟢)**: **R2 수집항목 정확화** → **R3 AI 인앱 신고** → R8 청약철회 UX → R11 견적버스트 → R10 성장(전후/확대/공유통일·추천인·체험).
  *(반려 직결 R2 먼저, 그다음 genAI R3.)*
- **Phase 2 — IAP 분리(🔴샌드박스, R1)**: 추상화·상품·검증엣지·anti-steering. Google "현재 위반" 해소의 핵심 → Phase1과 병행 착수, 샌드박스는 상품등록(Phase0) 후.
- **Phase 3 — Apple 계정 확보 후(🔴Mac, R4·R6)**: SiwA·ATT·AdMob iOS·매니페스트·Info.plist·iOS 빌드.
- **Phase 4 — KakaoPay 정기결제 승인 후(🔴sandbox, R5)**: 자동갱신 엔진 → sandbox e2e(첫·재청구·실패·해지·환불) → **검증 후 UI 문구 a로 변경**.
- **Phase 5 — 푸시(R7)** + **R9 마케팅 동의**(발송 시).
- **Phase 6 — 정리(🟡, R13·R14·R15·R16)**: 보류 DB·의존성·성능·머니패스 정합(스테이징 검증 후).
- **제출**: Android 업데이트(IAP 반영) → iOS 심사(데모계정 노트). 👤 R12 세무 체계 운영 전 완비.

**병렬 가능**: Phase 1 ∥ Phase 2 착수 ∥ Phase 0 대기. Phase 3은 Apple 승인, Phase 4는 KakaoPay 승인이 gate.

## 6. 검증 원칙
- 🔴 게이트 작업(IAP·정기결제·푸시·iOS)은 **실 PG/샌드박스/실기기 e2e 전 "완료" 보고 금지**(머니패스 특히).
- DB 변경은 브랜치 마이그 파일로만(main 머지 시 적용). 실 DB는 읽기 전용 조회만.
- 각 적용 시 커밋해시·검증결과 기록.

## 7. 문서 맵
출시감사 `260620_launch_readiness_audit` · 결제 `260620_payment_compliance_plan` · 정책 `260620_google_play_policy_audit` ·
법무/보안 `260620_codereview` · 코드 `260620_codereview_2` · 게이트키퍼 `260620_gatekeeper_review` ·
자동갱신 `260620_subscription_autorenew_plan` · 성장 `260620_growth_improvements_plan` · 핸드오프 `260620_launch_handoff` ·
iOS `ios-packaging` · SDK `android-target-sdk-upgrade` · 안전영역 `safe-area-system`.
