-- AI 스튜디오 메이크업 시안(makeup_samples) 시드 — 30장
--   메이저 3컨셉 × 6 (베이직·에테리얼·로맨틱) + 나머지 3컨셉 × 4 (글래머·클래식·프레시)
--
-- 메타데이터는 describeMakeup(src/lib/makeupDescription.ts) enum 과 1:1.
-- '한국 신부' → '베이직'으로 표기 변경(내부 mood 값은 SOFT_KOREAN 유지, 라벨만 베이직).
--
-- 아바타: BASIC→avatar-basic, ETHEREAL→avatar-ethereal, ROMANTIC→avatar-romantic,
--         GLAMOROUS→avatar-glamorous, CLASSIC→avatar-classic, FRESH_NATURAL→avatar-fresh
-- 레퍼런스(ref) 매핑(8개): 베이직 본식 시그니처=ref_3 · 베이직 물광=ref_1 ·
--   에테리얼 투명햇살=ref_7 · 에테리얼 라벤더=ref_6 · 에테리얼 투명글로시=ref_2 ·
--   로맨틱 핑크그라데=ref_4 · 클래식 시크=ref_8 · 프레시 생기코랄=ref_5 (나머지 22 auto)
--
-- 사용법: 이미지 생성→makeup-samples 버킷 업로드→'__IMG_xx__'를 public URL로 치환→실행.
-- display_order(내림차순, 클수록 상단): 베이직60 / 에테리얼55 / 로맨틱50 / 글래머40 / 클래식35 / 프레시30

insert into public.makeup_samples
  (name, image_url, base_finish, lip_color, lip_finish, eye_style, eye_color,
   blush_color, blush_placement, brow_shape, contour_intensity, details, mood,
   display_order, is_active)
values
  -- ===== 베이직 (BASIC) · 6 =====
  ('베이직 · 본식 시그니처', '__IMG_B1__', 'SATIN', 'MLBB', 'TINTED', 'KOREAN_INNER', 'ROSE_BROWN',
   'ROSE', 'UNDER_EYE', 'KOREAN_STRAIGHT', 'SUBTLE', '{HIGHLIGHT}', '{SOFT_KOREAN}', 60, true),       -- ref_3
  ('베이직 · 음영 본식', '__IMG_B2__', 'SATIN', 'MLBB', 'TINTED', 'KOREAN_INNER', 'BROWN',
   'ROSE', 'UNDER_EYE', 'KOREAN_STRAIGHT', 'NATURAL', '{HIGHLIGHT}', '{SOFT_KOREAN}', 60, true),
  ('베이직 · 물광 글로우', '__IMG_B3__', 'DEWY', 'CORAL', 'GLOSSY', 'NATURAL', 'PEACH',
   'PEACH', 'APPLE', 'KOREAN_STRAIGHT', 'NONE', '{HIGHLIGHT}', '{SOFT_KOREAN}', 60, true),             -- ref_1
  ('베이직 · 로즈 데일리', '__IMG_B4__', 'SATIN', 'ROSE', 'TINTED', 'NATURAL', 'ROSE_BROWN',
   'ROSE', 'UNDER_EYE', 'KOREAN_STRAIGHT', 'SUBTLE', '{HIGHLIGHT}', '{SOFT_KOREAN}', 60, true),
  ('베이직 · 누드 글로우', '__IMG_B5__', 'DEWY', 'NUDE', 'GLOSSY', 'NATURAL', 'NEUTRAL',
   'PINK', 'APPLE', 'KOREAN_STRAIGHT', 'NONE', '{HIGHLIGHT}', '{SOFT_KOREAN}', 60, true),
  ('베이직 · MLBB 글로시', '__IMG_B6__', 'GLOWY', 'MLBB', 'GLOSSY', 'NATURAL', 'ROSE_BROWN',
   'PEACH', 'APPLE', 'KOREAN_STRAIGHT', 'SUBTLE', '{HIGHLIGHT,INNER_CORNER}', '{SOFT_KOREAN}', 60, true),

  -- ===== 에테리얼 (ETHEREAL) · 6 =====
  ('에테리얼 · 투명 햇살 본식', '__IMG_E1__', 'GLOWY', 'ROSE', 'GLOSSY', 'NATURAL', 'PEACH',
   'PINK', 'APPLE', 'KOREAN_STRAIGHT', 'NONE', '{INNER_CORNER,HIGHLIGHT}', '{ETHEREAL}', 55, true),    -- ref_7
  ('에테리얼 · 글로우 라벤더 본식', '__IMG_E2__', 'DEWY', 'MAUVE', 'GLOSSY', 'NATURAL', 'PLUM',
   'PINK', 'UNDER_EYE', 'KOREAN_STRAIGHT', 'SUBTLE', '{HIGHLIGHT}', '{ETHEREAL}', 55, true),           -- ref_6
  ('에테리얼 · 투명 글로시', '__IMG_E3__', 'DEWY', 'NUDE', 'GLOSSY', 'NATURAL', 'ROSE_BROWN',
   'PINK', 'APPLE', 'FEATHERY', 'NONE', '{INNER_CORNER,HIGHLIGHT}', '{ETHEREAL}', 55, true),           -- ref_2
  ('에테리얼 · 글리터 워시', '__IMG_E4__', 'GLOWY', 'NUDE', 'GLOSSY', 'GLITTER', 'ROSE_BROWN',
   'NUDE', 'APPLE', 'FEATHERY', 'NONE', '{GLITTER_TEAR,INNER_CORNER,HIGHLIGHT}', '{ETHEREAL}', 55, true),
  ('에테리얼 · 모브 글로시', '__IMG_E5__', 'DEWY', 'MAUVE', 'GLOSSY', 'NATURAL', 'PLUM',
   'ROSE', 'APPLE', 'FEATHERY', 'SUBTLE', '{INNER_CORNER,HIGHLIGHT}', '{ETHEREAL}', 55, true),
  ('에테리얼 · 피치 글로우', '__IMG_E6__', 'GLOWY', 'PEACH', 'GLOSSY', 'NATURAL', 'PEACH',
   'PEACH', 'APPLE', 'KOREAN_STRAIGHT', 'NONE', '{HIGHLIGHT,INNER_CORNER}', '{ETHEREAL}', 55, true),

  -- ===== 로맨틱 (ROMANTIC) · 6 =====
  ('로맨틱 · 핑크 그라데이션', '__IMG_R1__', 'DEWY', 'CORAL', 'BLURRED', 'DOLL', 'PEACH',
   'PINK', 'DRAPED', 'SOFT_ARCH', 'SUBTLE', '{OMBRE_LIP,INNER_CORNER,HIGHLIGHT}', '{ROMANTIC}', 50, true), -- ref_4
  ('로맨틱 · 로즈 글로우', '__IMG_R2__', 'DEWY', 'ROSE', 'GLOSSY', 'NATURAL', 'ROSE_BROWN',
   'ROSE', 'DRAPED', 'SOFT_ARCH', 'SUBTLE', '{HIGHLIGHT}', '{ROMANTIC}', 50, true),
  ('로맨틱 · 코랄핑크 러블리', '__IMG_R3__', 'SATIN', 'CORAL', 'GLOSSY', 'DOLL', 'PEACH',
   'CORAL', 'APPLE', 'SOFT_ARCH', 'SUBTLE', '{OMBRE_LIP,HIGHLIGHT}', '{ROMANTIC}', 50, true),
  ('로맨틱 · 핑크 도리', '__IMG_R4__', 'DEWY', 'ROSE', 'BLURRED', 'DOLL', 'ROSE_BROWN',
   'PINK', 'DRAPED', 'SOFT_ARCH', 'SUBTLE', '{OMBRE_LIP,INNER_CORNER,HIGHLIGHT}', '{ROMANTIC}', 50, true),
  ('로맨틱 · 피치 러블리', '__IMG_R5__', 'DEWY', 'PEACH', 'GLOSSY', 'DOLL', 'PEACH',
   'PEACH', 'APPLE', 'SOFT_ARCH', 'SUBTLE', '{HIGHLIGHT,INNER_CORNER}', '{ROMANTIC}', 50, true),
  ('로맨틱 · 모브 로맨틱', '__IMG_R6__', 'SATIN', 'MAUVE', 'GLOSSY', 'NATURAL', 'PLUM',
   'ROSE', 'DRAPED', 'SOFT_ARCH', 'NATURAL', '{HIGHLIGHT}', '{ROMANTIC}', 50, true),

  -- ===== 글래머러스 (GLAMOROUS) · 4 =====
  ('글래머러스 · 클래식 레드', '__IMG_G1__', 'SATIN', 'RED', 'SATIN', 'SMOKY', 'BRONZE',
   'NUDE', 'OUTER_CHEEK', 'DEFINED', 'DEFINED', '{LASH_EXT,HIGHLIGHT,OVERLINE}', '{GLAMOROUS}', 40, true),
  ('글래머러스 · 버건디 캣아이', '__IMG_G2__', 'MATTE', 'BERRY', 'MATTE', 'CAT_EYE', 'BURGUNDY',
   'ROSE', 'OUTER_CHEEK', 'DEFINED', 'DEFINED', '{LASH_EXT,OVERLINE}', '{GLAMOROUS}', 40, true),
  ('글래머러스 · 누드 음영 글램', '__IMG_G3__', 'SATIN', 'NUDE', 'GLOSSY', 'SMOKY', 'NEUTRAL',
   'NUDE', 'OUTER_CHEEK', 'DEFINED', 'DEFINED', '{LASH_EXT,HIGHLIGHT,OVERLINE}', '{GLAMOROUS}', 40, true),
  ('글래머러스 · 브론즈 스모키', '__IMG_G4__', 'SATIN', 'MLBB', 'SATIN', 'SMOKY', 'BRONZE',
   'NUDE', 'OUTER_CHEEK', 'DEFINED', 'DEFINED', '{LASH_EXT,HIGHLIGHT}', '{GLAMOROUS}', 40, true),

  -- ===== 클래식 (CLASSIC) · 4 =====
  ('클래식 · 로즈 새틴 음영', '__IMG_C1__', 'SATIN', 'ROSE', 'SATIN', 'NATURAL', 'NEUTRAL',
   'ROSE', 'APPLE', 'SOFT_ARCH', 'NATURAL', '{LASH_EXT,HIGHLIGHT}', '{CLASSIC}', 35, true),
  ('클래식 · 시크 에디토리얼', '__IMG_C2__', 'SATIN', 'MAUVE', 'SATIN', 'CAT_EYE', 'NEUTRAL',
   'NUDE', 'OUTER_CHEEK', 'SOFT_ARCH', 'NATURAL', '{LASH_EXT}', '{CLASSIC}', 35, true),                -- ref_8
  ('클래식 · 모브 음영', '__IMG_C3__', 'SATIN', 'MAUVE', 'SATIN', 'NATURAL', 'ROSE_BROWN',
   'ROSE', 'OUTER_CHEEK', 'SOFT_ARCH', 'NATURAL', '{HIGHLIGHT}', '{CLASSIC}', 35, true),
  ('클래식 · MLBB 소프트캣', '__IMG_C4__', 'SATIN', 'MLBB', 'SATIN', 'CAT_EYE', 'BROWN',
   'NUDE', 'OUTER_CHEEK', 'SOFT_ARCH', 'NATURAL', '{LASH_EXT}', '{CLASSIC}', 35, true),

  -- ===== 프레시 (FRESH_NATURAL) · 4 =====
  ('프레시 · 생기 코랄', '__IMG_F1__', 'DEWY', 'CORAL', 'GLOSSY', 'NATURAL', 'PEACH',
   'CORAL', 'APPLE', 'NATURAL_FLAT', 'NONE', '{HIGHLIGHT}', '{FRESH_NATURAL}', 30, true),              -- ref_5
  ('프레시 · 주근깨 데일리', '__IMG_F2__', 'NATURAL_SKIN', 'PEACH', 'TINTED', 'BARE', 'NEUTRAL',
   'PEACH', 'APPLE', 'NATURAL_FLAT', 'NONE', '{FAUX_FRECKLE}', '{FRESH_NATURAL}', 30, true),
  ('프레시 · 누드 글로우', '__IMG_F3__', 'DEWY', 'NUDE', 'TINTED', 'NATURAL', 'NEUTRAL',
   'PINK', 'APPLE', 'NATURAL_FLAT', 'NONE', '{HIGHLIGHT}', '{FRESH_NATURAL}', 30, true),
  ('프레시 · 피치 데일리', '__IMG_F4__', 'DEWY', 'PEACH', 'GLOSSY', 'NATURAL', 'PEACH',
   'PEACH', 'APPLE', 'NATURAL_FLAT', 'NONE', '{HIGHLIGHT}', '{FRESH_NATURAL}', 30, true);
