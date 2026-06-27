# 260625 마이그레이션 정합 감사 (Task #6 후속)

> #433(types.ts 재정합 + 미적용 4건 복구)의 후속. `supabase_migrations.schema_migrations`(실DB)와
> `supabase/migrations/*.sql`(repo)을 전수 대조해 드리프트를 규명하고, **머지됐지만 프로덕션에
> 도달하지 못한 P0 보안 마이그**를 발굴·복구했다. 단일 소스: 실DB = 진실원천.
> 프로젝트: `qabeywyzjsgyqpjqsvkd` (dewy_wedding_planer_AI).

## TL;DR

- **근본원인 확정**: **마이그 배포 파이프라인 부재.** 변경이 ① 대시보드/MCP로 ad-hoc 적용(정밀
  타임스탬프로 기록)되거나 ② repo 파일로 작성(라운드 타임스탬프)되는 **두 갈래 평행 히스토리**로
  갈렸다. repo 255 vs DB 적용 154, 교집합 31건뿐.
- **그 결과 머지된 P0 보안 수정 5건이 프로덕션 미적용 상태였다** — 기능/빌드 CI는 통과하므로
  "작동한다"로 보였지만 보안은 조용히 비어 있었다(SusVibes 패턴). 본 작업에서 **5건 전부 복구**.
- **코드가 참조하나 DB에 없던 테이블 2건(`device_tokens`·`iap_transactions`)** 추가 발굴·복구
  (#433의 `sdm_previews`와 동일 클래스).
- repo 파일명 비표준 5건(12자리) → 14자리 정규화. 적용분 schema_migrations 버전을 repo 원본 버전으로
  repair(드리프트 청산).

## 1. 적용된 프로덕션 변경 (전부 실DB 검증 완료)

| # | 객체 | 출처 마이그(repo 버전) | 종류 | 검증 |
|---|---|---|---|---|
| 1 | `ai_prompts` 시드 2행(`ai_planner_system`·`invitation_text_system`) | 20260620070000 | 데이터(execute_sql, ON CONFLICT 멱등) | content 7372·186자 SELECT 확인 |
| 2 | `device_tokens` 테이블+RLS+트리거 | 20260519050000 | **미적용 테이블 복구** | relkind=r, send-push·AuthContext 참조 |
| 3 | `iap_transactions` 테이블+RLS | 20260620060000 | **미적용 테이블 복구** | relkind=r, IAP 검증함수 4개 참조 |
| 4 | `delete_user_data(uuid)` RPC | 20260624120100 | **미적용 P0(탈퇴 파기)** | pg_proc 1건, delete-account edge가 호출(line 78) |
| 5 | `guard_business_profile_privileged_cols` 함수+트리거 | 20260625120000 | **미적용 P0(권한상승 차단)** | pg_trigger 1건 |
| 6 | `admin update service_waitlist` 정책 + INSERT 하드닝 | 20260625120000 | **미적용 P0** | pg_policies 확인 |
| 7 | `guard_vendor_delivery_recipient_cols` 함수+트리거 | 20260625130000 | **미적용 P1(수신자 컬럼잠금)** | pg_trigger 1건 |
| 8 | `list_expired_ai_uploads` 확장(makeup/photofix/hair/consulting 버킷) | 20260624120000 | **미적용 P0(AI사진 파기)** | 함수정의에 makeup-uploads 포함 확인 |
| 9 | business cross-tenant write 차단 RLS 11정책(products·coupons·events·media·albums·vendor_deliveries) | 20260624130000 | **미적용 P0(교차테넌트)** | 11/11 정책, place 소유권 EXISTS 검증 라이브 |

**적용 전 안전성 검증(공통)**: 각 마이그가 참조하는 컬럼·함수·타입(예: business_profiles 권한컬럼 5종,
vendor_deliveries 컬럼 8종, `has_role`/`app_role`, `delete_user_data` 대상 55개 테이블의 `user_id`,
places.owner_user_id 등)이 **실DB에 모두 존재함을 사전 확인**한 뒤 적용(없는 컬럼 참조 → 런타임 실패 방지).
전부 additive(테이블/함수 신설·정책 강화·트리거 동결)라 기존 정상 흐름 무영향(admin RPC·service_role은
`auth.uid() IS NULL`/`has_role`로 통과).

### 발견의 심각도 — 왜 P0인가
- **권한상승**(#5): 사업자가 self-UPDATE로 `approval_status='approved'`/`partner_tier`/`is_verified`/
  `commission_rate_bps` 자가부여 가능했음. **AGENTS.md가 "수정됨"이라 명시한 회귀가 실제론 미적용**이었다.
- **교차테넌트 쓰기**(#9): `owner_user_id=본인 + place_id=타 업체`로 경쟁사 상세에 상품/쿠폰/사진 부착 가능.
- **탈퇴 데이터 미파기**(#4): auth.users 참조 FK가 0개라 CASCADE 무동작 → 탈퇴해도 개인 콘텐츠 잔존
  (개인정보보호법 파기의무·App Store 5.1.1). delete-account edge는 없는 RPC를 호출 중이었다.
- **AI 사진 미파기**(#8): makeup/photofix/hair/consulting 결과물이 30일 자동삭제에서 누락(개인정보방침 위반).

## 2. 드리프트 전수 대조 결과

- **repo `.sql` 258개**(MANUAL 2 제외 256, 버전prefix distinct 255) vs **DB schema_migrations 154개**.
- **교집합 31건**뿐. 즉 두 히스토리가 거의 분리돼 있다.
  - **DB-only 123건**: 정밀 초단위 타임스탬프(`20260525020426` 등) = 대시보드/MCP 직접 적용분.
    repo에 대응 파일 없음(파일로 커밋 안 됨).
  - **repo-only 224건**: 다수가 라운드 타임스탬프(`...120000`) = 별도 작성됐으나 실제 적용경로가 아니었음.
    대부분은 **정밀 타임스탬프 기록분과 동일 논리변경**(객체는 라이브, 버전만 불일치) — 즉 "이미 적용됨,
    기록 버전만 다름". 단 일부는 **진짜 미적용**(위 §1 #2~#9가 그 사례).
- **repo-only CREATE TABLE 117종 전수 대조** → DB에 없는 코드참조 테이블은 `device_tokens`·`iap_transactions`
  **2건뿐**(나머지 13개 미존재 테이블명 — vendors/reviews/events/shopping_products 등 — 은 초기개발의
  이름변경/대체 구버전, 현재 코드 `.from()` 참조 0). 둘 다 §1에서 복구.

## 3. repo 파일명 정규화

12자리 비표준(앞 `20` 누락) 5건 → 14자리. `db push`가 버전 파싱 시 오작동/오정렬할 위험 제거.
schema_migrations에도 동일 14자리 버전으로 기록.

```
260624120000_*  → 20260624120000_expand_ai_cleanup_buckets.sql
260624120100_*  → 20260624120100_delete_user_data_rpc.sql
260624130000_*  → 20260624130000_business_place_ownership_rls.sql
260625120000_*  → 20260625120000_p0_security_fixes.sql
260625130000_*  → 20260625130000_vendor_deliveries_recipient_guard.sql
```

## 4. 남은 작업 (deferred — 합의·법무 필요)

1. **[높음] `function_search_path_mutable` 21건** ↔ repo-only `20260620020000_harden_function_search_path.sql`
   (미적용). 동일 클래스의 미적용 보안 하드닝. 21개 함수 search_path 고정은 신중 적용 필요(부수효과 점검).
   보안 어드바이저 WARN.
2. **[구조] 224 repo-only 평행히스토리 베이스라인 결정.** 지금 `supabase db push`를 켜면 200+ 역사
   파일을 재적용 시도 → 위험. **베이스라인 전략**(현 스키마를 단일 baseline으로 스쿼시 또는
   `migration repair --status applied`로 역사분 일괄 기록) 합의 후에만 파이프라인 가동 가능.
3. **[구조] 마이그 배포 파이프라인 도입**(근본원인 해소). 베이스라인 후 `main` 머지 시
   `supabase db push` 자동화(GitHub Action, `SUPABASE_ACCESS_TOKEN`+DB 비밀번호 시크릿, 환경 게이트).
   이게 없으면 "머지=적용" 가정이 다시 깨진다.
4. **[법무] `delete_user_data` 보존/삭제 분류 검토**(파일 주석의 권고). 금융·거래·동의 기록은
   보존(전자상거래법) vs 개인 콘텐츠 삭제 — 운영 정책 확정 + 보존 레코드 PII 익명화 후속.
5. **[보안백로그] 어드바이저 잔여**(주간감사 영역): `community_author_cards` SECURITY DEFINER 뷰(ERROR 1),
   RLS-enabled-no-policy 15(대부분 oauth_states 등 의도된 service-role lockdown), telemetry INSERT
   always-true 2(의도). 본 정합 작업의 신규 회귀 아님.

## 5. 교훈 (verification-lessons 추가 후보)

- **"머지됨 ≠ 적용됨".** 마이그 배포 파이프라인이 없으면 PR 머지는 DB를 바꾸지 않는다. 기능/빌드 CI가
  녹색이어도 보안 마이그는 조용히 미반영된다. → 보안 마이그는 머지 후 **실DB 객체 존재를 직접 확인**.
- **비표준 파일명은 미적용의 신호**였다(12자리 5건이 전부 미적용 P0였음). 파일명 규율도 보안.
- 드리프트 점검의 진실원천은 **실DB**(`pg_policies`/`pg_proc`/`pg_trigger`/`schema_migrations`).
  repo 파일 존재로 "적용됐겠지" 추측 금지.
