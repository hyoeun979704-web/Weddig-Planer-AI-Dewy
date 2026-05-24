-- Round 4 review #E5 — 레거시 consent_type 백필.
--
-- F#10(Commit A, Round 2) 에서 `sensitive_family_no_parents_v1` 단일 type 을
-- `_bride_v1` / `_groom_v1` 두 type 으로 분리. TypeScript enum 은 갱신했지만 기존
-- user_consents 행은 그대로 → 'latest row per (user_id, consent_type)' 쿼리가
-- 레거시 행은 누락되거나 새 행과 단절돼 audit 일관성 무너짐.
--
-- 백필 전략 — 레거시 행이 어느 측(bride/groom)을 대상으로 했는지 1:1 식별 불가
-- (당시 client 가 두 컬럼 모두에 같은 type 으로 logging). 가장 안전한 결정:
-- 레거시 각 행을 bride 와 groom 두 행으로 복제 — agreed/timestamp 동일하게.
-- '두 측 모두에 같은 의사를 표명한 것으로 본다' 는 보수적 해석. 잘못된 추론
-- (예: 사용자가 한 쪽만 의도) 위험은 있으나, 행 누락(현 상태)보다 audit 정확도 우위.
--
-- 멱등 보장: 이미 백필된 행은 다시 만들지 않도록 NOT EXISTS 가드.

INSERT INTO public.user_consents (
  user_id, consent_type, consent_version, agreed, agreed_at, user_agent
)
SELECT
  uc.user_id,
  'sensitive_family_no_parents_bride_v1',
  uc.consent_version,
  uc.agreed,
  uc.agreed_at,
  uc.user_agent
FROM public.user_consents uc
WHERE uc.consent_type = 'sensitive_family_no_parents_v1'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_consents uc2
    WHERE uc2.user_id = uc.user_id
      AND uc2.consent_type = 'sensitive_family_no_parents_bride_v1'
      AND uc2.agreed_at = uc.agreed_at
  );

INSERT INTO public.user_consents (
  user_id, consent_type, consent_version, agreed, agreed_at, user_agent
)
SELECT
  uc.user_id,
  'sensitive_family_no_parents_groom_v1',
  uc.consent_version,
  uc.agreed,
  uc.agreed_at,
  uc.user_agent
FROM public.user_consents uc
WHERE uc.consent_type = 'sensitive_family_no_parents_v1'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_consents uc2
    WHERE uc2.user_id = uc.user_id
      AND uc2.consent_type = 'sensitive_family_no_parents_groom_v1'
      AND uc2.agreed_at = uc.agreed_at
  );

-- 레거시 행은 보존 — 삭제하지 않음. PIPA 의무로 원본 audit 흔적은 유지하되
-- 새 분리 type 쿼리가 누락 없이 동작하도록 보충.
-- 향후 reporting 은 _bride_v1 / _groom_v1 만 조회하면 됨.

COMMENT ON TABLE public.user_consents IS
  '사용자 동의 기록. v1: sensitive_family_no_parents_v1 → _bride_v1 / _groom_v1 분리 백필 완료(20260524070000).';
