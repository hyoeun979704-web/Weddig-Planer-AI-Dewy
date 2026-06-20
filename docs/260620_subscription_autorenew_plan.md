# 구독 자동갱신(a) 전환 — 백엔드 정합성 리뷰 + 구현 설계 (260620)

> U3 결정 = **a(자동갱신) 전환**. 현재는 모델 b(자동갱신 없음). 이 문서는 ① 현 결제/구독 백엔드
> **정합성 리뷰** ② a 전환 **구현 설계**다. ⚠️ KakaoPay **정기결제는 머니패스 + sandbox e2e 불가**
> (본 환경) → 라이브 충전 코드는 **검증 전 비활성**, 단계적 적용.

## 1. 백엔드 정합성 리뷰 (현 상태)
- **`kakao-pay-ready`**: `cid = KAKAO_CID || "TC0ONETIME"` → **일회성 결제 CID**. 정기결제(SID) 미발급.
- **`kakao-pay-approve`**: 일회성 approve. **SID 미수신/미저장**. trial(100원)은 승인 후 **즉시 환불**.
  `subscriptions` upsert 시 `payment_method: "kakaopay"`, `expires_at` 설정 — 그러나 **재결제 잡 없음**
  → `expires_at` 지나면 그냥 만료(=모델 b).
- **`cancel-subscription`**: ✅ **이미 a 전환 대비 가드 존재** — `payment_method === "kakaopay_recurring"`이면
  **501 "Recurring cancel not implemented"** 거부(회귀 방지) + 주석으로 "정기결제 전환 시 PG 해지 호출
  필요" 명시. 일반(단건)은 DB 마킹만으로 해지.
- **`subscriptions`**: user_id·plan·status·price·started_at·expires_at·trial_ends_at·cancelled_at·
  payment_id·payment_method. **`sid`·`next_billing_at` 컬럼 없음**.
- **`billing_attempts`**: 테이블 존재(쓰기 경로 없음 — 미사용).
- **멱등/검증 양호**: payments `UNIQUE(payment_key)`, 금액 서버 재검증, 소유권 체크, 중복 승인 단락.

**결론**: 구조는 깔끔하고 정기결제 전환을 **이미 염두**(cancel 가드·billing_attempts 테이블). a 전환에
필요한 일은 아래로 명확히 한정된다.

## 2. a 전환 구현 설계 (web = KakaoPay 정기결제 / native = 스토어 IAP)
> native(Android·iOS)는 마스터플랜 D2대로 **스토어 IAP 구독**이 자동갱신을 담당(스토어가 처리).
> 아래는 **웹(KakaoPay 정기결제)** 설계.

### 2-1. 스키마 (안전·추가형 — 본 커밋 포함)
`subscriptions`에 컬럼 추가(ADD COLUMN IF NOT EXISTS):
- `sid text` — KakaoPay 정기결제키.
- `next_billing_at timestamptz` — 다음 청구 예정.
- `last_billing_at timestamptz` — 마지막 청구.
(기존 `billing_attempts`로 시도 이력 기록.)

### 2-2. ready/approve — 정기결제 CID + SID 수신 (⚠️ 머니패스, sandbox e2e 후 활성)
- env `KAKAO_SUBSCRIPTION_CID`(test=`TCSUBSCRIP`) 추가. 구독 플랜은 이 cid로 `/v1/payment/ready`.
- approve 응답의 **`sid` 저장** + `payment_method = "kakaopay_recurring"` + `next_billing_at` 설정.
- **trial**: 첫 승인으로 SID 확보(카드등록). 100원 인증분은 환불하되 **SID는 유지**.
  `trial_ends_at = now+30일`, `next_billing_at = trial_ends_at`(이때 첫 정기청구).

### 2-3. 재결제 잡 — 신규 `charge-subscriptions` (⚠️ 머니패스, sandbox e2e 후 활성)
- pg_cron(또는 스케줄 엣지)로 주기 실행. `status='active' AND sid IS NOT NULL AND next_billing_at <= now
  AND cancelled_at IS NULL` 대상.
- KakaoPay `/v1/payment/subscription`(cid+sid+amount) 호출 → `billing_attempts` 기록(멱등키=구독+주기).
  - 성공: `expires_at`·`next_billing_at` 연장, `last_billing_at` 갱신.
  - 실패: 재시도(예 3일 간격 N회) → 초과 시 `status='past_due'`→`cancelled`(이용 종료). **이중청구 금지**(멱등).

### 2-4. cancel — 정기결제 PG 해지 구현
- `cancel-subscription`의 501 가드를 **실제 구현으로 교체**: `kakaopay_recurring`이면 KakaoPay
  `/v1/payment/manage/subscription/inactive`(cid+sid) 호출로 PG측 비활성 후 DB 해지. (해지는 기간말까지
  이용 보장 = `cancelled_at` 마킹, `next_billing_at` 중단.)

### 2-5. 사전 고지(리마인더) — 다크패턴/전상법
- `next_billing_at` **N일 전 알림**(`app_notifications` + 푸시 동의 시 푸시): 금액·일자·해지 경로.

### 2-6. UI 문구 — **백엔드 라이브 후 마지막에 변경**
- 현 "체험 종료 후 자동결제 없음"(UpgradeModal·Premium FAQ §52·Premium §132·SubscriptionCheckout §102)을
  → **"1개월 무료 후 ₩X/월 자동결제, 언제든 해지"** + 결제 전 리마인더 안내로 변경.
- ⚠️ **순서 중요**: 백엔드가 실제 자동갱신을 하기 전에 문구만 바꾸면 거짓(역다크패턴). 반드시 2-2~2-4
  라이브 검증 후 문구 변경.

## 3. 단계 적용 순서 (안전)
1. ✅ **스키마 추가**(2-1) — 본 커밋(추가형, 무위험).
2. ⏸ **ready/approve SID**(2-2) + **charge 잡**(2-3) + **cancel PG해지**(2-4) — 구현 후 **KakaoPay
   정기결제 sandbox로 e2e**(첫청구·재청구·실패재시도·해지·환불) 검증. **검증 전 비활성**(cid 미설정 시
   기존 단건 경로 유지).
3. ⏸ **리마인더**(2-5).
4. ⏸ **UI 문구 변경**(2-6) — 2~3 검증 완료 후.
5. native: 스토어 IAP 구독(별도 IAP 워크스트림).

## 4. 검증 한계
- 본 환경: KakaoPay 정기결제 cid/sandbox 없음 → **2-2~2-4는 정적까지만**. 라이브 전 반드시 sandbox e2e
  (검증 규칙: 머니패스 "정적 통과=완료" 금지). 스키마(2-1)만 안전 적용.
