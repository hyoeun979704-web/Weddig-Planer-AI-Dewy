-- 페르소나 검토 P1 #6 — 임산부 드레스 옵션.
-- DressFitting 의 dress_samples 에는 silhouette/neckline/sleeve/color 만 있어
-- P18(임신 16주·식 4개월) 페르소나가 "배 부분 여유·엠파이어 라인·마타니티"
-- 옵션을 찾을 수 없다. pregnancy_supported 플래그를 추가해 임산부 필터에서 사용.
--
-- 단순 boolean이 아니라 enum (none/light/full) 로 — 정도(약한 여유 ~ 마타니티
-- 전용)를 표시해 사용자가 본인 차수에 맞게 선택 가능.

ALTER TABLE public.dress_samples
  ADD COLUMN IF NOT EXISTS pregnancy_supported TEXT DEFAULT 'none';

ALTER TABLE public.dress_samples
  DROP CONSTRAINT IF EXISTS dress_samples_pregnancy_supported_check;
ALTER TABLE public.dress_samples
  ADD CONSTRAINT dress_samples_pregnancy_supported_check
  CHECK (pregnancy_supported IN ('none', 'light', 'full'));

-- 엠파이어/A 라인은 일반적으로 마타니티 호환 — 기존 샘플에서 silhouette
-- 패턴으로 light 백필. 더 정확한 분류는 운영팀이 dress_samples 어드민에서.
UPDATE public.dress_samples
SET pregnancy_supported = 'light'
WHERE pregnancy_supported = 'none'
  AND silhouette ILIKE ANY (ARRAY['%A%', '%엠파이어%', '%empire%', '%a-line%']);

COMMENT ON COLUMN public.dress_samples.pregnancy_supported IS
  '임산부 호환 정도: none(불가)/light(엠파이어·A라인 등 일반 호환)/full(마타니티 전용). P18 페르소나 필터링.';
