-- AI 스튜디오 메이크업 시안(makeup_samples) 시드 — 무드 6종 × 3 = 18개
--
-- 메타데이터는 docs/makeup-samples-gpt-guide.md 와 1:1 동일. (단일 출처)
-- 8개는 업로드된 레퍼런스 사진 기반(ref), 10개는 2026 트렌드 기반 자동생성(auto).
--
-- 레퍼런스 → 룩 매핑:
--   ref_1→1C(물광)  ref_2→2C(투명글로시)  ref_3→1A(본식시그니처)  ref_4→6A(핑크그라데)
--   ref_5→4A(생기코랄)  ref_6→2B(글로우라벤더본식)  ref_7→2A(투명햇살본식)  ref_8→5B(시크에디토리얼)
--
-- 사용법:
--   1) docs 가이드 프롬프트로 18장 생성 → makeup-samples 버킷(public)에 업로드
--   2) 아래 '__IMG_xx__' 를 업로드된 public URL 로 치환
--   3) 실행 (execute_sql 또는 psql)
--
-- public URL 형식:
--   https://qabeywyzjsgyqpjqsvkd.supabase.co/storage/v1/object/public/makeup-samples/<파일명>
--
-- display_order (내림차순 정렬, 클수록 상단):
--   2026 6월 본식 트렌드(물광·투명·번짐 음영·확장 블러셔) 반영해 상단 고정:
--     2A 투명 햇살 본식 80 · 1C 물광 글로우 75 · 1A 본식 시그니처 70
--   이후 컨셉 그룹: 한국신부 60 / 에테리얼 50 / 글래머 40 / 프레시 30 / 클래식 20 / 로맨틱 10
-- (scene[본식/촬영]은 시안 속성이 아니라 사용자가 생성 시 선택하므로 저장하지 않음)

insert into public.makeup_samples
  (name, image_url, base_finish, lip_color, lip_finish, eye_style, eye_color,
   blush_color, blush_placement, brow_shape, contour_intensity, details, mood,
   display_order, is_active)
values
  -- 컨셉 1 — 한국 신부 (SOFT_KOREAN)
  ('한국 신부 · 본식 시그니처', '__IMG_1A__', 'SATIN', 'MLBB', 'TINTED', 'KOREAN_INNER', 'ROSE_BROWN',
   'ROSE', 'UNDER_EYE', 'KOREAN_STRAIGHT', 'SUBTLE', '{HIGHLIGHT}', '{SOFT_KOREAN}', 70, true),     -- ref_3 · 2026 본식 트렌드 상단
  ('한국 신부 · 음영 본식', '__IMG_1B__', 'SATIN', 'MLBB', 'TINTED', 'KOREAN_INNER', 'BROWN',
   'ROSE', 'UNDER_EYE', 'KOREAN_STRAIGHT', 'NATURAL', '{HIGHLIGHT}', '{SOFT_KOREAN}', 60, true),     -- auto
  ('한국 신부 · 물광 글로우', '__IMG_1C__', 'DEWY', 'CORAL', 'GLOSSY', 'NATURAL', 'PEACH',
   'PEACH', 'APPLE', 'KOREAN_STRAIGHT', 'NONE', '{HIGHLIGHT}', '{SOFT_KOREAN}', 75, true),           -- ref_1 · 2026 물광 트렌드

  -- 컨셉 2 — 에테리얼 (ETHEREAL)
  ('에테리얼 · 투명 햇살 본식', '__IMG_2A__', 'GLOWY', 'ROSE', 'GLOSSY', 'NATURAL', 'PEACH',
   'PINK', 'APPLE', 'KOREAN_STRAIGHT', 'NONE', '{INNER_CORNER,HIGHLIGHT}', '{ETHEREAL}', 80, true),   -- ref_7 · 2026 투명물광 1순위
  ('에테리얼 · 글로우 라벤더 본식', '__IMG_2B__', 'DEWY', 'MAUVE', 'GLOSSY', 'NATURAL', 'PLUM',
   'PINK', 'UNDER_EYE', 'KOREAN_STRAIGHT', 'SUBTLE', '{HIGHLIGHT}', '{ETHEREAL}', 50, true),          -- ref_6
  ('에테리얼 · 투명 글로시', '__IMG_2C__', 'DEWY', 'NUDE', 'GLOSSY', 'NATURAL', 'ROSE_BROWN',
   'PINK', 'APPLE', 'FEATHERY', 'NONE', '{INNER_CORNER,HIGHLIGHT}', '{ETHEREAL}', 50, true),          -- ref_2

  -- 컨셉 3 — 글래머러스 (GLAMOROUS) · 촬영 (auto)
  ('글래머러스 · 클래식 레드', '__IMG_3A__', 'SATIN', 'RED', 'SATIN', 'SMOKY', 'BRONZE',
   'NUDE', 'OUTER_CHEEK', 'DEFINED', 'DEFINED', '{LASH_EXT,HIGHLIGHT}', '{GLAMOROUS}', 40, true),
  ('글래머러스 · 버건디 캣아이', '__IMG_3B__', 'MATTE', 'BERRY', 'MATTE', 'CAT_EYE', 'BURGUNDY',
   'ROSE', 'OUTER_CHEEK', 'DEFINED', 'DEFINED', '{LASH_EXT}', '{GLAMOROUS}', 40, true),
  ('글래머러스 · 누드 음영 글램', '__IMG_3C__', 'SATIN', 'NUDE', 'GLOSSY', 'SMOKY', 'NEUTRAL',
   'NUDE', 'OUTER_CHEEK', 'DEFINED', 'DEFINED', '{LASH_EXT,HIGHLIGHT}', '{GLAMOROUS}', 40, true),

  -- 컨셉 4 — 프레시 (FRESH_NATURAL)
  ('프레시 · 생기 코랄', '__IMG_4A__', 'DEWY', 'CORAL', 'GLOSSY', 'NATURAL', 'PEACH',
   'CORAL', 'APPLE', 'NATURAL_FLAT', 'NONE', '{HIGHLIGHT}', '{FRESH_NATURAL}', 30, true),             -- ref_5
  ('프레시 · 주근깨 데일리', '__IMG_4B__', 'NATURAL_SKIN', 'PEACH', 'TINTED', 'BARE', 'NEUTRAL',
   'PEACH', 'APPLE', 'NATURAL_FLAT', 'NONE', '{FAUX_FRECKLE}', '{FRESH_NATURAL}', 30, true),          -- auto
  ('프레시 · 누드 글로우', '__IMG_4C__', 'DEWY', 'NUDE', 'TINTED', 'NATURAL', 'NEUTRAL',
   'PINK', 'APPLE', 'NATURAL_FLAT', 'NONE', '{HIGHLIGHT}', '{FRESH_NATURAL}', 30, true),              -- auto

  -- 컨셉 5 — 클래식 (CLASSIC)
  ('클래식 · 로즈 새틴 음영', '__IMG_5A__', 'SATIN', 'ROSE', 'SATIN', 'NATURAL', 'NEUTRAL',
   'ROSE', 'APPLE', 'SOFT_ARCH', 'NATURAL', '{LASH_EXT,HIGHLIGHT}', '{CLASSIC}', 20, true),           -- auto
  ('클래식 · 시크 에디토리얼', '__IMG_5B__', 'SATIN', 'MAUVE', 'SATIN', 'CAT_EYE', 'NEUTRAL',
   'NUDE', 'OUTER_CHEEK', 'SOFT_ARCH', 'NATURAL', '{LASH_EXT}', '{CLASSIC}', 20, true),               -- ref_8
  ('클래식 · 모브 음영', '__IMG_5C__', 'SATIN', 'MAUVE', 'SATIN', 'NATURAL', 'ROSE_BROWN',
   'ROSE', 'OUTER_CHEEK', 'SOFT_ARCH', 'NATURAL', '{HIGHLIGHT}', '{CLASSIC}', 20, true),              -- auto

  -- 컨셉 6 — 로맨틱 (ROMANTIC)
  ('로맨틱 · 핑크 그라데이션', '__IMG_6A__', 'DEWY', 'CORAL', 'BLURRED', 'DOLL', 'PEACH',
   'PINK', 'DRAPED', 'SOFT_ARCH', 'SUBTLE', '{OMBRE_LIP,INNER_CORNER,HIGHLIGHT}', '{ROMANTIC}', 10, true), -- ref_4
  ('로맨틱 · 로즈 글로우', '__IMG_6B__', 'DEWY', 'ROSE', 'GLOSSY', 'NATURAL', 'ROSE_BROWN',
   'ROSE', 'DRAPED', 'SOFT_ARCH', 'SUBTLE', '{HIGHLIGHT}', '{ROMANTIC}', 10, true),                  -- auto
  ('로맨틱 · 코랄핑크 러블리', '__IMG_6C__', 'SATIN', 'CORAL', 'GLOSSY', 'DOLL', 'PEACH',
   'CORAL', 'APPLE', 'SOFT_ARCH', 'SUBTLE', '{OMBRE_LIP,HIGHLIGHT}', '{ROMANTIC}', 10, true);         -- auto
