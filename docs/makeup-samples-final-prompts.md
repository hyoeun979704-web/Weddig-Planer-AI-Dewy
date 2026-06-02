# 메이크업 시안 18종 — 최종 프롬프트 (복사 즉시 사용)

> 검수 완료본. 메타데이터는 `seed/makeup-samples/seed.sql`와 1:1 일치.
> 헤어/포즈는 **컨셉 표준으로 통일**(레퍼런스의 베일·손·단발·크롭은 쓰지 않음).
> 모든 룩은 **avatar-base.png(첫 쌩얼 아바타)** 를 첨부해 같은 얼굴로 생성한다.

## 공통 규칙
- 8종(ref)은 해당 레퍼런스 사진을 **2번째 이미지**로 추가 첨부 → 메이크업만 복사
- 10종(auto)은 아바타 1장만 첨부 → 텍스트 메이크업으로 생성
- 출력: 1:1 정사각 1024², 이마~쇄골 클로즈업, 얼굴 정면 노출, 깨끗한 배경, 모공 보이는 사실적 피부, 베일·손·소품·큰 장신구·글자 없음

---

## 컨셉 1 — 한국 신부 (배경: warm ivory / 헤어·포즈: 슬릭 로우 시뇽, 가운데 가르마 / 정면, 턱 살짝 아래, 아주 옅은 미소)

### 1A · 본식 시그니처 〔ref_3 첨부〕
```
[Image 1: avatar-base.png]  [Image 2: ref_3]
Ultra-photorealistic Korean bridal beauty close-up, 1:1 square 1024x1024. Generate
the SAME person as Image 1 — keep her face, eyes, nose, lips, jawline, skin tone and
identity unchanged. Use Image 2 as a MAKEUP reference ONLY: copy its makeup colors,
finish and placement; do NOT copy its face, hair, veil, crop or pose. Head-and-
shoulders, face centered and fully visible, even soft beauty-dish lighting, true-to-
color, clean seamless warm-ivory backdrop, realistic skin texture with visible pores,
no beauty filter, no veil, no hands, no jewelry, no props, no text. Makeup clearly readable.
HAIR & POSE: sleek glossy low chignon, clean center part, no flyaways; straight-on,
chin slightly down, eyes to camera, very soft closed-lip smile.
MAKEUP: satin base with light reflectance; MLBB lip with a blurred tinted stain finish;
Korean inner-corner soft warm shading in rose-brown tones with natural lashes; soft
Korean straight brow; rose blush just under the eyes (애교살); very subtle contour;
soft highlighter on the high points.
```

### 1B · 음영 본식 〔auto〕
```
[Image 1: avatar-base.png]
Ultra-photorealistic Korean bridal beauty close-up, 1:1 square 1024x1024. Generate the
SAME person as Image 1 (face, eyes, nose, lips, jawline, skin tone, identity unchanged).
Apply ONLY makeup; restyle hair/pose as below. Head-and-shoulders, face fully visible,
even soft beauty-dish lighting, true-to-color, clean seamless warm-ivory backdrop, visible
skin pores, no beauty filter, no veil, no hands, no props, no text.
HAIR & POSE: sleek glossy low chignon, clean center part; straight-on, chin slightly down,
very soft closed-lip smile.
MAKEUP: satin base; MLBB lip with a blurred tinted finish; Korean inner-corner shading in
deeper warm brown tones for a soft sculpted 음영 eye, natural lashes; soft Korean straight
brow; rose blush just under the eyes; natural contour for gentle dimension; soft highlighter.
```

### 1C · 물광 글로우 〔ref_1 첨부〕
```
[Image 1: avatar-base.png]  [Image 2: ref_1]
Ultra-photorealistic Korean bridal beauty close-up, 1:1 square 1024x1024. Generate the SAME
person as Image 1 (identity unchanged). Use Image 2 as a MAKEUP reference ONLY: copy makeup
only; do NOT copy its face, hair, crop or pose. Head-and-shoulders, face fully visible, even
soft lighting, true-to-color, clean seamless warm-ivory backdrop, visible skin pores, no
beauty filter, no hands, no props, no text. Makeup clearly readable.
HAIR & POSE: sleek glossy low chignon, clean center part; straight-on, chin slightly down,
very soft closed-lip smile.
MAKEUP: dewy glass-skin base with strong moisture sheen (물광); coral lip with a high-shine
glossy finish; natural soft eye in warm peach tones with natural lashes; soft Korean straight
brow; peach blush on the apples of the cheeks; no contour; soft dewy highlighter on the high points.
```

---

## 컨셉 2 — 에테리얼 (배경: soft cool misty white / 헤어·포즈: 에어리 루즈 웨이브 + 잔머리 / 약한 3/4, 시선 아래, 차분)

### 2A · 투명 햇살 본식 〔ref_7 첨부〕
```
[Image 1: avatar-base.png]  [Image 2: ref_7]
Ultra-photorealistic Korean bridal beauty close-up, 1:1 square 1024x1024. Generate the SAME
person as Image 1 (identity unchanged). Use Image 2 as a MAKEUP reference ONLY; do NOT copy
its face, hair, veil, crop or pose. Head-and-shoulders, face fully visible, even soft lighting,
true-to-color, clean seamless cool misty-white backdrop, visible skin pores, no beauty filter,
no veil, no hands, no props, no text. Makeup clearly readable.
HAIR & POSE: airy loose waves with soft face-framing strands; slight 3/4 turn, eyes gently
downcast, serene relaxed lips.
MAKEUP: soft glowy luminous translucent base (햇살 투명 물광); rose lip with a glossy finish;
natural soft eye in warm peach tones with natural lashes; soft Korean straight brow; pink blush
on the apples; no contour; shimmer in the inner corners and abundant dewy highlighter.
```

### 2B · 글로우 라벤더 본식 〔ref_6 첨부〕
```
[Image 1: avatar-base.png]  [Image 2: ref_6]
Ultra-photorealistic Korean bridal beauty close-up, 1:1 square 1024x1024. Generate the SAME
person as Image 1 (identity unchanged). Use Image 2 as a MAKEUP reference ONLY; do NOT copy its
face, hair, veil, crop or pose. Head-and-shoulders, face fully visible, even soft lighting,
true-to-color, clean seamless cool misty-white backdrop, visible skin pores, no beauty filter,
no veil, no hands, no props, no text. Makeup clearly readable.
HAIR & POSE: airy loose waves with soft face-framing strands; slight 3/4 turn, eyes gently
downcast, serene.
MAKEUP: dewy glass-skin base; mauve lip with a glossy finish; natural soft eye in cool plum
tones with defined lower lashes; soft Korean straight brow; pink blush just under the eyes;
very subtle contour; soft dewy highlighter.
```

### 2C · 투명 글로시 〔ref_2 첨부〕
```
[Image 1: avatar-base.png]  [Image 2: ref_2]
Ultra-photorealistic Korean bridal beauty close-up, 1:1 square 1024x1024. Generate the SAME
person as Image 1 (identity unchanged). Use Image 2 as a MAKEUP reference ONLY; do NOT copy its
face, hair, crop or pose. Head-and-shoulders, face fully visible, even soft lighting, true-to-
color, clean seamless cool misty-white backdrop, visible skin pores, no beauty filter, no hands,
no props, no text. Makeup clearly readable.
HAIR & POSE: airy loose waves with soft face-framing strands; slight 3/4 turn, eyes gently
downcast, serene.
MAKEUP: dewy glass-skin base; nude lip with a glossy finish; natural soft eye in rose-brown
tones; feathered brow with visible hair strokes; pink blush on the apples; no contour; shimmer
in the inner corners and soft highlighter.
```

---

## 컨셉 3 — 글래머러스 (배경: deep charcoal grey / 헤어·포즈: 볼륨 글래머 웨이브 다운 / 정면 당당, 턱 살짝 들고, 또렷한 시선) · 전부 auto · 촬영

### 3A · 클래식 레드
```
[Image 1: avatar-base.png]
Ultra-photorealistic Korean bridal beauty close-up, 1:1 square 1024x1024. Generate the SAME
person as Image 1 (identity unchanged). Apply ONLY makeup; restyle hair/pose as below. Head-and-
shoulders, face fully visible, even soft lighting, true-to-color, clean seamless deep charcoal-
grey backdrop, visible skin pores, no beauty filter, no props, no text.
HAIR & POSE: voluminous glamorous waves worn down; confident straight-on, chin slightly up,
direct gaze.
MAKEUP: satin base; classic true-red lip with a satin finish; smoky gradient eye in warm bronze
tones blended into a soft halo; well-defined brow; nude blush on the outer cheekbone; defined
sculpted contour; emphasized long curled lashes and soft highlighter.
```

### 3B · 버건디 캣아이
```
[Image 1: avatar-base.png]
Ultra-photorealistic Korean bridal beauty close-up, 1:1 square 1024x1024. Generate the SAME
person as Image 1 (identity unchanged). Apply ONLY makeup; restyle hair/pose as below. Head-and-
shoulders, face fully visible, even soft lighting, true-to-color, clean seamless deep charcoal-
grey backdrop, visible skin pores, no beauty filter, no props, no text.
HAIR & POSE: voluminous glamorous waves worn down; confident straight-on, chin slightly up,
direct gaze.
MAKEUP: matte velvet base; berry lip fully matte; cat-eye with a winged liner extending up-and-
out in burgundy wine tones; well-defined brow; rose blush on the outer cheekbone; defined
contour; emphasized lashes.
```

### 3C · 누드 음영 글램
```
[Image 1: avatar-base.png]
Ultra-photorealistic Korean bridal beauty close-up, 1:1 square 1024x1024. Generate the SAME
person as Image 1 (identity unchanged). Apply ONLY makeup; restyle hair/pose as below. Head-and-
shoulders, face fully visible, even soft lighting, true-to-color, clean seamless deep charcoal-
grey backdrop, visible skin pores, no beauty filter, no props, no text.
HAIR & POSE: voluminous glamorous waves worn down; confident straight-on, chin slightly up,
direct gaze.
MAKEUP: satin base; nude lip with a high-shine glossy finish; smoky gradient eye in neutral deep
beige-taupe tones; well-defined brow; nude blush on the outer cheekbone; defined contour;
emphasized lashes and soft highlighter.
```

---

## 컨셉 4 — 프레시 (배경: bright airy off-white / 헤어·포즈: 자연 하프업 + 잔머리 / 밝게 활짝 웃는 정면)

### 4A · 생기 코랄 〔ref_5 첨부〕
```
[Image 1: avatar-base.png]  [Image 2: ref_5]
Ultra-photorealistic Korean bridal beauty close-up, 1:1 square 1024x1024. Generate the SAME
person as Image 1 (identity unchanged). Use Image 2 as a MAKEUP reference ONLY; do NOT copy its
face, hair, crop or pose. Head-and-shoulders, face fully visible, even soft lighting, true-to-
color, clean seamless bright off-white backdrop, visible skin pores, no beauty filter, no hands,
no props, no text. Makeup clearly readable.
HAIR & POSE: natural half-up with soft movement, a few face-framing strands; bright open genuine
smile, lively, straight-on.
MAKEUP: dewy base; coral lip with a glossy finish; natural soft eye in warm peach tones with
natural lashes; natural lightly-groomed brow; coral blush on the apples of the cheeks for a
youthful flush; no contour; soft dewy highlighter.
```

### 4B · 주근깨 데일리 〔auto〕
```
[Image 1: avatar-base.png]
Ultra-photorealistic Korean bridal beauty close-up, 1:1 square 1024x1024. Generate the SAME
person as Image 1 (identity unchanged). Apply ONLY makeup; restyle hair/pose as below. Head-and-
shoulders, face fully visible, even soft lighting, true-to-color, clean seamless bright off-white
backdrop, visible skin pores, no beauty filter, no props, no text.
HAIR & POSE: natural half-up with soft movement, a few face-framing strands; bright open smile,
lively, straight-on.
MAKEUP: natural-skin barely-there base that lets skin texture show; peach lip with a blurred
tinted finish; bare eye with only a hair-thin tightline in neutral tones; natural lightly-groomed
brow; peach blush on the apples; no contour; delicate faux freckles across the nose and upper cheeks.
```

### 4C · 누드 글로우 〔auto〕
```
[Image 1: avatar-base.png]
Ultra-photorealistic Korean bridal beauty close-up, 1:1 square 1024x1024. Generate the SAME
person as Image 1 (identity unchanged). Apply ONLY makeup; restyle hair/pose as below. Head-and-
shoulders, face fully visible, even soft lighting, true-to-color, clean seamless bright off-white
backdrop, visible skin pores, no beauty filter, no props, no text.
HAIR & POSE: natural half-up with soft movement; bright open smile, lively, straight-on.
MAKEUP: dewy base; nude lip with a blurred tinted finish; natural soft eye in neutral beige-taupe
tones; natural lightly-groomed brow; pink blush on the apples; no contour; soft highlighter.
```

---

## 컨셉 5 — 클래식 (배경: neutral greige / 헤어·포즈: 정통 우아 로우 업두 / 차분 단정, 약한 측면)

### 5A · 로즈 새틴 음영 〔auto〕
```
[Image 1: avatar-base.png]
Ultra-photorealistic Korean bridal beauty close-up, 1:1 square 1024x1024. Generate the SAME
person as Image 1 (identity unchanged). Apply ONLY makeup; restyle hair/pose as below. Head-and-
shoulders, face fully visible, even soft lighting, true-to-color, clean seamless neutral greige
backdrop, visible skin pores, no beauty filter, no props, no text.
HAIR & POSE: polished classic elegant low updo, clean part; composed, slight tilt, calm serene.
MAKEUP: satin base; rose lip with a satin finish; natural soft eye in neutral beige-taupe tones;
soft arched brow; rose blush on the apples; natural contour for gentle dimension; emphasized
lashes and soft highlighter.
```

### 5B · 시크 에디토리얼 〔ref_8 첨부〕
```
[Image 1: avatar-base.png]  [Image 2: ref_8]
Ultra-photorealistic Korean bridal beauty close-up, 1:1 square 1024x1024. Generate the SAME
person as Image 1 (identity unchanged) — keep HER hair (do not give her a bob). Use Image 2 as a
MAKEUP reference ONLY; do NOT copy its face, hair or pose. Head-and-shoulders, face fully visible,
even soft lighting, true-to-color, clean seamless neutral greige backdrop, visible skin pores, no
beauty filter, no props, no text. Makeup clearly readable.
HAIR & POSE: polished classic elegant low updo, clean part; composed, slight tilt, calm serene.
MAKEUP: satin base; mauve lip with a satin finish; soft eye in neutral taupe tones with a subtle
elongated cat-eye liner; soft arched brow; nude blush on the outer cheekbone; natural contour;
emphasized lashes.
```

### 5C · 모브 음영 〔auto〕
```
[Image 1: avatar-base.png]
Ultra-photorealistic Korean bridal beauty close-up, 1:1 square 1024x1024. Generate the SAME
person as Image 1 (identity unchanged). Apply ONLY makeup; restyle hair/pose as below. Head-and-
shoulders, face fully visible, even soft lighting, true-to-color, clean seamless neutral greige
backdrop, visible skin pores, no beauty filter, no props, no text.
HAIR & POSE: polished classic elegant low updo, clean part; composed, slight tilt, calm serene.
MAKEUP: satin base; mauve lip with a satin finish; natural soft eye in rose-brown tones; soft
arched brow; rose blush on the outer cheekbone; natural contour; soft highlighter.
```

---

## 컨셉 6 — 로맨틱 (배경: warm blush-pink / 헤어·포즈: 로맨틱 루즈 업두 + 컬 잔머리 / 약한 3/4, 수줍은 미소)

### 6A · 핑크 그라데이션 〔ref_4 첨부〕
```
[Image 1: avatar-base.png]  [Image 2: ref_4]
Ultra-photorealistic Korean bridal beauty close-up, 1:1 square 1024x1024. Generate the SAME
person as Image 1 (identity unchanged). Use Image 2 as a MAKEUP reference ONLY; do NOT copy its
face, hair, hands, crop or pose. Head-and-shoulders, face fully visible, even soft lighting,
true-to-color, clean seamless warm blush-pink backdrop, visible skin pores, no beauty filter, no
hands, no props, no text. Makeup clearly readable.
HAIR & POSE: romantic loose updo with soft curled face-framing tendrils; soft 3/4, gentle shy smile.
MAKEUP: dewy base; coral lip with a soft-blurred ombré edge, deeper in the center; round doll-eye
look in warm peach tones with inner-corner highlight; soft arched brow; pink blush draped from the
cheekbone toward the temple; subtle contour; ombré gradient lip, shimmer in the inner corners and
soft highlighter.
```

### 6B · 로즈 글로우 〔auto〕
```
[Image 1: avatar-base.png]
Ultra-photorealistic Korean bridal beauty close-up, 1:1 square 1024x1024. Generate the SAME
person as Image 1 (identity unchanged). Apply ONLY makeup; restyle hair/pose as below. Head-and-
shoulders, face fully visible, even soft lighting, true-to-color, clean seamless warm blush-pink
backdrop, visible skin pores, no beauty filter, no props, no text.
HAIR & POSE: romantic loose updo with soft curled face-framing tendrils; soft 3/4, gentle shy smile.
MAKEUP: dewy base; rose lip with a glossy finish; natural soft eye in rose-brown tones; soft arched
brow; rose blush draped from the cheekbone toward the temple; subtle contour; soft highlighter.
```

### 6C · 코랄핑크 러블리 〔auto〕
```
[Image 1: avatar-base.png]
Ultra-photorealistic Korean bridal beauty close-up, 1:1 square 1024x1024. Generate the SAME
person as Image 1 (identity unchanged). Apply ONLY makeup; restyle hair/pose as below. Head-and-
shoulders, face fully visible, even soft lighting, true-to-color, clean seamless warm blush-pink
backdrop, visible skin pores, no beauty filter, no props, no text.
HAIR & POSE: romantic loose updo with soft curled face-framing tendrils; soft 3/4, gentle shy smile.
MAKEUP: satin base; coral lip with a glossy finish and a soft ombré gradient; round doll-eye look
in warm peach tones; soft arched brow; coral blush on the apples of the cheeks; subtle contour;
ombré gradient lip and soft highlighter.
```
