-- 전면/후면 템플릿 분리 정정.
--
-- 문제: 20260531140000 에서 face 기본값을 'both' 로 두어, 기존 종이 단면 디자인
-- (free-modern-01 / free-classic-01 / paper-cutout-01 / free-moody-01)이 'both' 가 되어
-- Studio 의 "후면 교체" picker(face in back,both)에 전면 디자인이 섞여 노출됐다.
--
-- 정정:
--   1) 종이 'both' → 'front' 재분류 (이들은 전면/단독 디자인). 후면 picker 엔
--      전용 후면(face='back')만 남는다.
--   2) 컬럼 기본값을 'front' 로 변경 — 템플릿은 기본적으로 전면/단독 디자인이며,
--      후면/양면은 명시적으로 지정한다. (향후 insert 시 'both' 누수 방지)
--   * 모바일은 단면이라 'both' 유지(전/후면 개념 없음).

UPDATE public.invitation_templates
SET face = 'front', updated_at = now()
WHERE format = 'paper' AND face = 'both';

ALTER TABLE public.invitation_templates
  ALTER COLUMN face SET DEFAULT 'front';
