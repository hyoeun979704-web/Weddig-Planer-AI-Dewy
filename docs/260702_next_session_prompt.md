# 다음 세션 진행 프롬프트 (260702 보안/정책 감사 이월분)

> ✅ **실행 완료(260702 2차 세션)** — 결과는 `docs/260702_security_audit.md` §2차 세션 참조.
> 남은 것: 오너 액션(xcprivacy·IAP 상품·SKAdNetwork 전체 목록) + 백엔드 저위험 이월분.

> 사용법: 아래 "붙여넣기용 프롬프트"를 새 세션에 그대로 붙이면 된다. 배경·우선순위·
> 이미 한 것/안 한 것은 그 아래 참고 섹션에 정리돼 있다. 브랜치는 `claude/ai-studio-
> architecture-pyrts9`(머지된 PR 뒤이므로 origin/main 에서 새로 시작).

---

## 붙여넣기용 프롬프트

```
지난 세션 보안/정책 감사가 세션 한도로 절반만 끝났다(docs/260702_security_audit.md §미완).
백엔드 보안 축(P0 delete_user_data anon 노출)은 이미 수정·실DB 적용·머지(PR #527)됐다.
이번 세션은 남은 두 축 + 파기 커버리지를 끝낸다. 우선순위 순서:

【P0 후보 — 먼저】 delete_user_data(uuid) 파기 커버리지 감사.
- 지난 세션엔 이 함수의 anon 접근만 막았고, "실제로 무엇을 지우는지"는 감사 안 했다.
- supabase/migrations/20260624120100_delete_user_data_rpc.sql 의 DELETE 대상 테이블 목록과,
  실제 user_id 를 보유한 전체 테이블(packages/db/src/supabase/types.ts + 실DB
  information_schema.columns where column_name='user_id')을 대조해 파기 누락 테이블을 찾아라.
- 특히 AI 스튜디오 잡·버킷: dress_fittings·makeup_fittings·sdm_previews·hair_preview_jobs·
  photo_retouch_jobs·wedding_consulting_reports(+usage 테이블들) 행 삭제 여부,
  그리고 스토리지 버킷(dress/makeup/sdm/hair/photofix/consulting/photoshoot uploads·results)의
  사용자 사진이 탈퇴 시 실제 삭제되는지(delete-account edge 의 storage 삭제 경로 확인 —
  supabase/functions/delete-account/index.ts). 누락 = 개인정보보호법 파기의무 위반 P1.
- 보존 대상(결제·거래 기록: payments·orders·heart_transactions 등)은 의도된 보존이니 제외.
- 실DB 읽기(execute_sql)로 교차 확인하되 쓰기 금지. 수정은 마이그레이션으로,
  apply_migration 적용 후 grant/삭제 검증.

【법률/개인정보 — 14차원 10·13번】 docs/260620_payment_compliance_plan.md 읽고:
- 전자상거래법 표시의무(판매자 사업자정보·통신판매업신고번호)가 결제 화면(/points·구독·
  디자인 구매)·약관(Terms.tsx)·푸터에 있는지. 없으면 넣을 위치 제안.
- 환불/청약철회 고지가 하트·구독·디자인 결제 전에 뜨는지. 미성년자(만19세 미만) 결제 보호.
- 위치기반서비스 약관·동의(지도/주변 업체 Geolocation 사용처).
- 얼굴 사진의 OpenAI/Google(Gemini) 국외이전·처리위탁이 개인정보처리방침(Privacy.tsx)에
  명시됐는지 — AI 스튜디오가 얼굴을 해외 API 로 보내므로 필수.
- PhotoUploadConsent 동의 문구가 실제 처리(해외전송·30일 보관)와 일치하는지, 커플/타인
  사진의 제3자 초상권 고지 여부. AI 결과물 "실제와 다를 수 있음" 디스클레이머.

【스토어 정책 — 14차원 8번】 docs/260622_appstore_submission_runbook.md §11 + docs/ios-packaging.md 기준:
- ios/ Info.plist 권한 사용문구(NSUserTrackingUsageDescription·Camera·PhotoLibrary·위치) vs
  실제 권한 사용 코드 대조. AndroidManifest 동일.
- 광고 SDK 사용 여부 → 쓰면 ATT+SKAdNetworkItems, 안 쓰면 잔존설정 정리.
- IAP anti-steering(3.1.1): 네이티브 빌드에서 하트 '충전'(/points)·구독이 IAP 로만 되고
  카카오페이 등 외부 결제 UI·링크가 숨겨지는지(isNativePlatform 분기 확인).
- 회원탈퇴 인앱 경로(5.1.1)·UGC 신고+차단+삭제(1.2) 3종 실확인.

병렬 감사 에이전트로 fan-out 하되, 각 발견은 [심각도][파일:라인][실패 시나리오][수정안]
형식으로. 확인된 결함만 수정하고 docs/260702_security_audit.md 에 이어 기록(§미완 갱신).
이미 잠근 것(지난 세션 grant 회수 19함수) 재보고 금지. 검증 필수(build·test·lint +
DB 변경은 실DB 검증). 작업 브랜치 claude/ai-studio-architecture-pyrts9, 완료 후 PR 생성.
```

---

## 참고 — 이번 세션(260701~0702)에 이미 한 것

머지 완료 PR: #523(아키텍처+P0 2건) · #524(웨딩당일 프롬프트) · #525(안정성) ·
#526(품질검토 24건) · #527(보안 P0 delete_user_data).

- **보안 백엔드 축 완료분**(재감사 불필요): SECURITY DEFINER 함수 grant 하드닝 19개
  (delete_user_data→service_role, add_game_points·increment_ai_usage·admin_* 17개 anon 회수).
  경제함수·RSVP·RLS헬퍼·공개버킷·rls_no_policy·always_true·결제함수·PII로그 = 의도된 설계로
  판정(docs/260702_security_audit.md §확인함). advisor community_author_cards DEFINER 뷰 =
  설계상 유지(노출 컬럼 저위험).

## 참고 — 미착수(이월) 우선순위

1. **delete_user_data 파기 커버리지**(P0 후보 — 방금 그 함수를 건드렸으니 연결). ← 최우선
2. 법률/개인정보(전자상거래 표시·환불·미성년·위치·국외이전 고지).
3. 스토어 정책(권한문구·ATT·IAP anti-steering·탈퇴·UGC).
4. 백엔드 보안 저위험 이월: pg_net public 스키마 이동(의존 점검 후), community/vendor 버킷
   리스팅 하드닝(staging 검증 필요).

## 참고 — 구조적 운영 리스크(별건, 근본해결 필요)

**마이그레이션이 머지돼도 실DB 에 자동 적용되지 않는다**(deploy-migrations.yml = dry-run 전용,
베이스라인 드리프트). 이번 세션에 reaper·photoshoot·delete_user_data grant 를 전부 수동
apply_migration 으로 적용했다. docs/260625_migration_baseline_plan.md 의 베이스라인 정합을
끝내고 자동 적용을 켜는 것이 근본 해결 — 안 하면 앞으로도 "머지 ≠ 적용" 사고가 반복된다.

## 참고 — AI 스튜디오 제품 로드맵(감사와 별개, docs/260701_ai_studio_review.md §5)

earn_hearts 멱등화, identity lock 6벌 단일화, before/after 슬라이더+업체 견적 전환 고리,
신부대기실·한복/폐백 컨셉 씬 팩, 속도 티어/일일 무료 훅.
