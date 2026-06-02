-- AI 스튜디오 메이크업 시안(makeup_samples) 시드 — 무드 6종 × 3 = 18개
--
-- 메타데이터는 docs/makeup-samples-gpt-guide.md 와 1:1 동일. (단일 출처)
-- 사용법:
--   1) docs 가이드의 프롬프트로 18장 생성 → makeup-samples 버킷(public)에 업로드
--   2) 아래 각 행의 '__IMG_xx__' 를 업로드된 public URL 로 치환
--   3) 실행 (execute_sql 또는 psql)
--
-- public URL 형식:
--   https://qabeywyzjsgyqpjqsvkd.supabase.co/storage/v1/object/public/makeup-samples/<파일명>
--
-- display_order: 한국신부 60 / 에테리얼 50 / 글래머 40 / 프레시 30 / 클래식 20 / 로맨틱 10
-- (목록은 display_order 내림차순 → 한국 신부가 먼저 노출)

insert into public.makeup_samples
  (name, image_url, base_finish, lip_color, lip_finish, eye_style, eye_color,
   blush_color, blush_placement, brow_shape, contour_intensity, details, mood,
   display_order, is_active)
values
  -- 컨셉 1 — 한국 신부 (SOFT_KOREAN)
  ('한국 신부 · 코랄 MLBB', '__IMG_1A__', 'SATIN', 'MLBB', 'TINTED', 'KOREAN_INNER', 'ROSE_BROWN',
   'PEACH', 'UNDER_EYE', 'KOREAN_STRAIGHT', 'SUBTLE', '{HIGHLIGHT}', '{SOFT_KOREAN}', 60, true),
  ('한국 신부 · 로즈 뉴드', '__IMG_1B__', 'SATIN', 'ROSE', 'TINTED', 'KOREAN_INNER', 'NEUTRAL',
   'ROSE', 'UNDER_EYE', 'KOREAN_STRAIGHT', 'NATURAL', '{HIGHLIGHT}', '{SOFT_KOREAN}', 60, true),
  ('한국 신부 · 피치 글로우', '__IMG_1C__', 'DEWY', 'PEACH', 'TINTED', 'NATURAL', 'PEACH',
   'PEACH', 'APPLE', 'KOREAN_STRAIGHT', 'SUBTLE', '{HIGHLIGHT}', '{SOFT_KOREAN}', 60, true),

  -- 컨셉 2 — 에테리얼 (ETHEREAL)
  ('에테리얼 · 글리터 워시', '__IMG_2A__', 'GLOWY', 'NUDE', 'GLOSSY', 'GLITTER', 'ROSE_BROWN',
   'NUDE', 'APPLE', 'FEATHERY', 'NONE', '{GLITTER_TEAR,INNER_CORNER,HIGHLIGHT}', '{ETHEREAL}', 50, true),
  ('에테리얼 · 모브 글로시', '__IMG_2B__', 'DEWY', 'MAUVE', 'GLOSSY', 'NATURAL', 'PLUM',
   'ROSE', 'APPLE', 'FEATHERY', 'SUBTLE', '{INNER_CORNER,HIGHLIGHT}', '{ETHEREAL}', 50, true),
  ('에테리얼 · 투명 로즈', '__IMG_2C__', 'GLOWY', 'ROSE', 'GLOSSY', 'NATURAL', 'ROSE_BROWN',
   'PINK', 'APPLE', 'FEATHERY', 'NONE', '{INNER_CORNER,HIGHLIGHT}', '{ETHEREAL}', 50, true),

  -- 컨셉 3 — 글래머러스 (GLAMOROUS)
  ('글래머러스 · 클래식 레드', '__IMG_3A__', 'SATIN', 'RED', 'SATIN', 'SMOKY', 'BRONZE',
   'NUDE', 'OUTER_CHEEK', 'DEFINED', 'DEFINED', '{LASH_EXT,HIGHLIGHT}', '{GLAMOROUS}', 40, true),
  ('글래머러스 · 버건디 캣아이', '__IMG_3B__', 'MATTE', 'BERRY', 'MATTE', 'CAT_EYE', 'BURGUNDY',
   'ROSE', 'OUTER_CHEEK', 'DEFINED', 'DEFINED', '{LASH_EXT}', '{GLAMOROUS}', 40, true),
  ('글래머러스 · 누드 글램', '__IMG_3C__', 'SATIN', 'NUDE', 'GLOSSY', 'SMOKY', 'NEUTRAL',
   'NUDE', 'OUTER_CHEEK', 'DEFINED', 'DEFINED', '{LASH_EXT,HIGHLIGHT}', '{GLAMOROUS}', 40, true),

  -- 컨셉 4 — 프레시 (FRESH_NATURAL)
  ('프레시 · 코랄 생기', '__IMG_4A__', 'DEWY', 'CORAL', 'TINTED', 'NATURAL', 'PEACH',
   'CORAL', 'APPLE', 'NATURAL_FLAT', 'NONE', '{HIGHLIGHT}', '{FRESH_NATURAL}', 30, true),
  ('프레시 · 주근깨 데일리', '__IMG_4B__', 'NATURAL_SKIN', 'PEACH', 'TINTED', 'BARE', 'NEUTRAL',
   'PEACH', 'APPLE', 'NATURAL_FLAT', 'NONE', '{FAUX_FRECKLE}', '{FRESH_NATURAL}', 30, true),
  ('프레시 · 누드 글로우', '__IMG_4C__', 'DEWY', 'NUDE', 'TINTED', 'NATURAL', 'NEUTRAL',
   'PINK', 'APPLE', 'NATURAL_FLAT', 'NONE', '{HIGHLIGHT}', '{FRESH_NATURAL}', 30, true),

  -- 컨셉 5 — 클래식 (CLASSIC)
  ('클래식 · 로즈 새틴', '__IMG_5A__', 'SATIN', 'ROSE', 'SATIN', 'NATURAL', 'NEUTRAL',
   'ROSE', 'APPLE', 'SOFT_ARCH', 'NATURAL', '{LASH_EXT,HIGHLIGHT}', '{CLASSIC}', 20, true),
  ('클래식 · MLBB 소프트 캣', '__IMG_5B__', 'SATIN', 'MLBB', 'SATIN', 'CAT_EYE', 'BROWN',
   'NUDE', 'OUTER_CHEEK', 'SOFT_ARCH', 'NATURAL', '{LASH_EXT}', '{CLASSIC}', 20, true),
  ('클래식 · 모브 음영', '__IMG_5C__', 'SATIN', 'MAUVE', 'SATIN', 'NATURAL', 'ROSE_BROWN',
   'ROSE', 'OUTER_CHEEK', 'SOFT_ARCH', 'NATURAL', '{HIGHLIGHT}', '{CLASSIC}', 20, true),

  -- 컨셉 6 — 로맨틱 (ROMANTIC)
  ('로맨틱 · 핑크 그라데이션', '__IMG_6A__', 'DEWY', 'ROSE', 'BLURRED', 'DOLL', 'PEACH',
   'PINK', 'DRAPED', 'SOFT_ARCH', 'SUBTLE', '{OMBRE_LIP,INNER_CORNER,HIGHLIGHT}', '{ROMANTIC}', 10, true),
  ('로맨틱 · 로즈 글로우', '__IMG_6B__', 'DEWY', 'ROSE', 'GLOSSY', 'NATURAL', 'ROSE_BROWN',
   'ROSE', 'DRAPED', 'SOFT_ARCH', 'SUBTLE', '{HIGHLIGHT}', '{ROMANTIC}', 10, true),
  ('로맨틱 · 코랄핑크 러블리', '__IMG_6C__', 'SATIN', 'CORAL', 'GLOSSY', 'DOLL', 'PEACH',
   'CORAL', 'APPLE', 'SOFT_ARCH', 'SUBTLE', '{OMBRE_LIP,HIGHLIGHT}', '{ROMANTIC}', 10, true);
