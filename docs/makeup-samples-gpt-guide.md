# AI 스튜디오 — 메이크업 시안(makeup_samples) 제작 가이드

> 대상: `/ai-studio/makeup-room` (착붙 메이크업 찾기)
> 목적: 비어있는 `makeup_samples` 테이블을 **무드(컨셉) 6종 × 3개 = 18개** 시안으로 채운다.

---

## 0. 이 시안이 어디에 쓰이나 (중요)

메이크업 룸 플로우:

```
셀카 업로드 → 메이크업 룩 시안 선택 → 컷(본식/촬영) → 조명 → 생성
```

생성 단계에서 `dewy-makeup` Edge Function이 OpenAI `gpt-image-2`(images.edit)에
**두 장**을 함께 보낸다:

- **Image 1 = 사용자 셀카** → 얼굴형·이목구비·피부톤은 *전부 여기서* 가져옴
- **Image 2 = 우리가 만드는 시안 이미지** → **메이크업 색·마감·배치만** 참고

즉 시안 이미지는 "이 모델의 얼굴"이 아니라 **"이 메이크업"** 을 보여주는 레퍼런스다.
따라서 제작 원칙은 단 하나:

> **메이크업이 또렷하게 읽혀야 한다.**
> 베이스 광/매트, 립 색·마감, 아이섀도 색·배치, 아이라인, 블러셔 위치, 눈썹, 하이라이트가
> 사진만 봐도 구분되도록. 얼굴 모델의 미모/정체성은 결과물과 무관하다.

또한 각 시안에는 메타데이터(립 컬러, 아이 스타일 등 enum)가 함께 저장되고,
`describeMakeup()`가 그 enum을 영어 문장으로 바꿔 프롬프트의 `MAKEUP SCHEMA`에 주입한다.
**스키마가 레퍼런스 이미지보다 우선**한다. 그러므로 아래 각 시안의
**이미지 프롬프트와 메타데이터는 반드시 서로 일치**해야 한다 (둘 다 이 문서에 같이 적어둠).

---

## 0.5. 표준 아바타 (쌩얼 베이스) — 먼저 1장 생성

18장은 **같은 얼굴**로 통일한다. 표준 쌩얼 아바타 1장을 먼저 만들고, 그 이미지를
캔버스로 삼아 룩마다 메이크업·헤어만 입힌다. (실사진 초상권 회피 + 화질·인물 통일)

**아바타 생성 프롬프트:**

```
A photorealistic studio beauty portrait of a standard, representative Korean
woman in her late 20s — natural, relatable, average Korean features (not a
celebrity, not heavily idealized). COMPLETELY BARE FACE, absolutely no makeup:
no foundation, no concealer, no powder, no eyeshadow, no eyeliner, no mascara,
no false lashes, no lip tint/lipstick, no blush, no contour, no highlighter.
Natural untouched eyebrows, bare lips in their true natural color, bare natural
lashes, clean fresh skin with realistic texture and visible pores (a few subtle
natural imperfections allowed — no airbrushing, no beauty filter).

Framing: 1:1 square, 1024x1024. Head-and-shoulders, face perfectly centered and
fully visible, symmetrical front-facing, eyes looking straight to camera, calm
neutral relaxed expression, lips gently closed. Hair pulled back into a clean
sleek low bun with a center part, no flyaways, forehead and full face uncovered.
Even soft neutral beauty-dish lighting, no color cast (true-to-color), clean
seamless light-grey studio backdrop, bare neck/collarbone visible, no jewelry,
no clothing detail, no veil, no props, no text/logo/watermark.
Ultra-photorealistic, 85mm lens, high-resolution editorial beauty photography.
This is a neutral BASE FACE used as a canvas for applying makeup.
```

**아바타에 룩 입히는 재사용 템플릿** (아바타 이미지를 첨부 후 18회):

```
[표준 아바타 이미지 첨부]
Keep this exact person's identity, face shape, features, and skin tone unchanged,
and keep the 1:1 square framing. Apply ONLY makeup, and restyle hair & pose as
specified below.
HAIR & POSE: {컨셉별 헤어·포즈 — 아래 2번 표}
MAKEUP: {해당 룩의 MAKEUP 문장 — 아래 3번}
```

> 아바타는 슬릭 로우번(이마·얼굴 전부 노출)이라 어떤 컨셉 헤어로도 재스타일이 쉽다.
> 아바타 파일은 `avatar-base.png` 로 저장해두고 18장 생성의 기준으로 재사용한다.

**(권장) 듀얼 이미지 — 아바타 + 메이크업 레퍼런스 사진**

텍스트 설명만으로는 룩 재현이 부정확할 수 있다. 메이크업 레퍼런스 사진을 함께 넣으면
정확도가 크게 오른다. 이는 `dewy-makeup` 함수의 구조(Image 1=신부 얼굴, Image 2=메이크업
레퍼런스, *메이크업만 복사*)와 동일하다. **얼굴은 아바타, 메이크업만 레퍼런스**를 강제하는 게 핵심.

```
[Image 1: avatar-base.png]   [Image 2: 메이크업 레퍼런스 사진]

Image 1 is the BASE PERSON. Image 2 is a MAKEUP STYLE reference ONLY.
Generate the SAME person as Image 1 — keep her face shape, eyes, nose, lips,
jawline, skin tone and identity completely unchanged, and keep the 1:1 square
head-and-shoulders framing. Do NOT borrow the face or identity from Image 2.
From Image 2 copy ONLY the makeup: base finish, lip color & finish, eyeshadow
color & placement, eyeliner, lashes, brow style, blush color & placement,
highlight/contour. Restyle hair & pose as below. Photorealistic, realistic skin
texture with visible pores, true-to-color, no beauty filter, no text/logo.
HAIR & POSE: {컨셉별 헤어·포즈 — 2번 표}
MAKEUP (use as a guide if Image 2 is ambiguous): {해당 룩의 MAKEUP 문장 — 3번}
```

주의:
- Image 1·2 역할을 문장에서 명시 → GPT가 레퍼런스 얼굴을 베껴오지 않게 함
- 레퍼런스는 메이크업이 또렷한 사진으로, 룩의 의도 메타데이터에 맞게 선택
- 결과 얼굴은 AI 아바타이므로 레퍼런스 인물 초상권 노출 없음. 원본 레퍼런스는 입력용으로만, 배포·저장 금지
- 레퍼런스로 결과가 계획과 달라지면 `seed/makeup-samples/seed.sql`의 해당 행 메타데이터도 맞춰 수정 (이미지 ↔ 메타데이터 일치 유지)

---

## 1. 출력 규격 (모든 18장 공통)

`gpt-image-2`는 `1024x1024`(정사각)로 합성하므로 레퍼런스도 정사각이 가장 자연스럽다.

- **비율/크기**: 1:1 정사각, 1024×1024 이상
- **프레이밍**: 얼굴 클로즈업 (이마~쇄골). 얼굴이 프레임의 중심, 좌우 대칭
- **배경**: 단색 시멜리스(seamless) 스튜디오 배경 — 컨셉별 톤만 다르게(아래 명시). 소품·글자·로고·워터마크 금지
- **조명**: 부드러운 뷰티디시/소프트박스, 얼굴 전체 고르게. 강한 그림자·컬러 조명 금지 (메이크업 색이 왜곡되면 안 됨)
- **얼굴/표정**: 정면 또는 약한 3/4, 차분한 표정. 입은 다물거나 아주 옅은 미소
- **가리지 말 것**: 베일·손·머리카락이 눈/입/볼을 덮지 않게. 큰 귀걸이·목걸이 금지(메이크업에 집중)
- **사실성**: 포토리얼리스틱, 실제 피부결(모공)이 보이는 자연스러운 보정. 과한 뷰티필터·AI 플라스틱 피부 금지
- **모델**: 20대 후반 한국인 여성, 시안 간 톤 일관성 (단, 정체성은 결과물과 무관하므로 컨셉 분위기에 맞게)

### 공통 베이스 프롬프트 (앞에 붙여 사용)

```
Ultra-photorealistic Korean bridal beauty close-up, 1:1 square, 1024x1024.
Head-and-shoulders, face centered and fully visible, even soft beauty-dish
lighting, true-to-color (no color cast), clean seamless {BACKDROP} studio
backdrop, no props, no big jewelry, no veil over the face, no text/logo/watermark.
Realistic skin texture with visible pores, high-end editorial beauty photography,
85mm lens. The makeup must be clearly readable. {HAIR}. {POSE}.
MAKEUP: {MAKEUP}.
```

`{BACKDROP}` `{HAIR}` `{POSE}` `{MAKEUP}` 만 컨셉/시안별로 갈아끼우면 된다.
아래 표에 그대로 채워둠 — **복사해서 ChatGPT에 붙여넣기만** 하면 된다.

> 💡 이미 가진 사진을 "재생성"으로 규격화하려면: 그 사진을 첨부하고 위 프롬프트 앞에
> `Keep this person's face and identity. Restyle only hair, pose, and makeup as below:` 를 붙이면
> 컨셉별 규격(헤어·포즈)으로 통일된다.

---

## 2. 컨셉별 규격 (헤어 · 포즈 · 배경)

컨셉당 헤어/포즈/배경은 **고정**하고, 컨셉 안의 3개는 메이크업만 다르게 한다.

| 컨셉(mood) | 배경 BACKDROP | 헤어 HAIR | 포즈 POSE |
|---|---|---|---|
| 한국 신부 `SOFT_KOREAN` | warm ivory | sleek glossy low chignon, clean center part, no flyaways | straight-on, chin slightly down, eyes to camera, very soft closed-lip smile |
| 에테리얼 `ETHEREAL` | soft cool misty white | airy loose waves, soft half-up, baby hairs framing the face | slight 3/4 turn, eyes gently downcast, serene relaxed lips |
| 글래머러스 `GLAMOROUS` | deep charcoal grey | voluminous glamorous waves worn down | confident straight-on, chin slightly up, direct intense gaze |
| 프레시 `FRESH_NATURAL` | bright airy off-white | natural half-up with soft movement, a few face-framing strands | bright open genuine smile, lively, straight-on |
| 클래식 `CLASSIC` | neutral greige | polished classic elegant updo, clean part | elegant and composed, slight tilt, calm serene expression |
| 로맨틱 `ROMANTIC` | warm blush-pink | romantic loose updo with soft curled face-framing tendrils | soft 3/4, gentle shy smile, warm romantic gaze |

---

## 3. 18개 시안 — 프롬프트 + 메타데이터 (※ 초기안)

> ⚠️ 이 섹션은 초기 일반안이다. **최종 18종 구성·이름·메타데이터는 5번 표 + `seed/makeup-samples/seed.sql`이 권위 출처**다 (레퍼런스 8장 반영 후 갱신됨). 아래 MAKEUP 문장은 자연어 작성 참고용으로 유지.

각 항목의 `MAKEUP:` 문장은 메타데이터 enum(`describeMakeup` 매핑)과 1:1로 맞췄다.
이미지 생성 시 공통 베이스 프롬프트의 `{BACKDROP}/{HAIR}/{POSE}`는 위 표(컨셉별)에서,
`{MAKEUP}`은 아래에서 가져온다.

> 메타데이터 컬럼: `base_finish, lip_color, lip_finish, eye_style, eye_color,
> blush_color, blush_placement, brow_shape, contour_intensity, details[], mood[]`

---

### 컨셉 1 — 한국 신부 (SOFT_KOREAN) · 은은한 청순 신부

**1A · 코랄 MLBB**
- `MAKEUP:` satin base with light reflectance; MLBB lip (slightly enhanced natural tone) with a blurred tinted stain finish; Korean inner-corner soft warm shading in rose-brown; Korean-style soft straight brow; soft peach 'aegyo-sal' blush just under the eyes across the upper cheekbone; subtle almost-imperceptible contour; soft highlighter on the high points.
- meta: base_finish=`SATIN`, lip_color=`MLBB`, lip_finish=`TINTED`, eye_style=`KOREAN_INNER`, eye_color=`ROSE_BROWN`, blush_color=`PEACH`, blush_placement=`UNDER_EYE`, brow_shape=`KOREAN_STRAIGHT`, contour_intensity=`SUBTLE`, details=`{HIGHLIGHT}`, mood=`{SOFT_KOREAN}`

**1B · 로즈 뉴드**
- `MAKEUP:` satin base; rose lip (cool muted pink) with blurred tinted stain finish; Korean inner-corner shading in neutral beige-taupe; Korean-style soft straight brow; rose 'aegyo-sal' blush under the eyes; natural gentle contour; soft highlighter.
- meta: base_finish=`SATIN`, lip_color=`ROSE`, lip_finish=`TINTED`, eye_style=`KOREAN_INNER`, eye_color=`NEUTRAL`, blush_color=`ROSE`, blush_placement=`UNDER_EYE`, brow_shape=`KOREAN_STRAIGHT`, contour_intensity=`NATURAL`, details=`{HIGHLIGHT}`, mood=`{SOFT_KOREAN}`

**1C · 피치 글로우**
- `MAKEUP:` dewy glass-skin base; peach lip with blurred tinted finish; natural soft eye look in warm peach tones; Korean-style soft straight brow; peach blush on the apples of the cheeks; subtle contour; soft highlighter on the high points.
- meta: base_finish=`DEWY`, lip_color=`PEACH`, lip_finish=`TINTED`, eye_style=`NATURAL`, eye_color=`PEACH`, blush_color=`PEACH`, blush_placement=`APPLE`, brow_shape=`KOREAN_STRAIGHT`, contour_intensity=`SUBTLE`, details=`{HIGHLIGHT}`, mood=`{SOFT_KOREAN}`

---

### 컨셉 2 — 에테리얼 (ETHEREAL) · 몽환·투명

**2A · 글리터 워시**
- `MAKEUP:` soft glowy luminous base; nude lip with high-shine glossy finish; shimmer/glitter eye focus with fine pearl on the lid center, rose-brown wash; feathered brow with visible hair strokes; muted nude blush on the apples; no contour; details — fine glitter accent on the lower lash center, shimmer in the inner corners, soft highlighter.
- meta: base_finish=`GLOWY`, lip_color=`NUDE`, lip_finish=`GLOSSY`, eye_style=`GLITTER`, eye_color=`ROSE_BROWN`, blush_color=`NUDE`, blush_placement=`APPLE`, brow_shape=`FEATHERY`, contour_intensity=`NONE`, details=`{GLITTER_TEAR,INNER_CORNER,HIGHLIGHT}`, mood=`{ETHEREAL}`

**2B · 모브 글로시**
- `MAKEUP:` dewy glass-skin base; mauve lip (dusty cool pink-brown) glossy finish; natural soft diffused eye in plum tones; feathered brow; rose blush on the apples; very subtle contour; shimmer in the inner corners, soft highlighter.
- meta: base_finish=`DEWY`, lip_color=`MAUVE`, lip_finish=`GLOSSY`, eye_style=`NATURAL`, eye_color=`PLUM`, blush_color=`ROSE`, blush_placement=`APPLE`, brow_shape=`FEATHERY`, contour_intensity=`SUBTLE`, details=`{INNER_CORNER,HIGHLIGHT}`, mood=`{ETHEREAL}`

**2C · 투명 로즈**
- `MAKEUP:` soft glowy luminous base; rose lip glossy finish; natural soft eye in rose-brown tones; feathered brow; soft pink blush on the apples; no contour; shimmer in the inner corners, soft highlighter.
- meta: base_finish=`GLOWY`, lip_color=`ROSE`, lip_finish=`GLOSSY`, eye_style=`NATURAL`, eye_color=`ROSE_BROWN`, blush_color=`PINK`, blush_placement=`APPLE`, brow_shape=`FEATHERY`, contour_intensity=`NONE`, details=`{INNER_CORNER,HIGHLIGHT}`, mood=`{ETHEREAL}`

---

### 컨셉 3 — 글래머러스 (GLAMOROUS) · 화려·또렷

**3A · 클래식 레드**
- `MAKEUP:` satin base; classic true-red lip with satin finish; smoky gradient eye in warm bronze tones blended into a soft halo; well-defined brow with clear edges; muted nude blush on the outer cheekbone for a contoured effect; defined contour under cheekbones/nose/jaw; emphasized long curled separated lashes; soft highlighter.
- meta: base_finish=`SATIN`, lip_color=`RED`, lip_finish=`SATIN`, eye_style=`SMOKY`, eye_color=`BRONZE`, blush_color=`NUDE`, blush_placement=`OUTER_CHEEK`, brow_shape=`DEFINED`, contour_intensity=`DEFINED`, details=`{LASH_EXT,HIGHLIGHT}`, mood=`{GLAMOROUS}`

**3B · 버건디 캣아이**
- `MAKEUP:` matte velvet base; berry lip (deep cool pink-purple) fully matte; cat-eye with winged liner extending up-and-out, burgundy deep-wine shadow; well-defined brow; rose blush on the outer cheekbone; defined contour; emphasized lashes.
- meta: base_finish=`MATTE`, lip_color=`BERRY`, lip_finish=`MATTE`, eye_style=`CAT_EYE`, eye_color=`BURGUNDY`, blush_color=`ROSE`, blush_placement=`OUTER_CHEEK`, brow_shape=`DEFINED`, contour_intensity=`DEFINED`, details=`{LASH_EXT}`, mood=`{GLAMOROUS}`

**3C · 누드 글램**
- `MAKEUP:` satin base; nude lip (warm beige-pink) high-shine glossy; smoky gradient eye in neutral deep beige-taupe; well-defined brow; muted nude blush on the outer cheekbone; defined contour; emphasized lashes, soft highlighter.
- meta: base_finish=`SATIN`, lip_color=`NUDE`, lip_finish=`GLOSSY`, eye_style=`SMOKY`, eye_color=`NEUTRAL`, blush_color=`NUDE`, blush_placement=`OUTER_CHEEK`, brow_shape=`DEFINED`, contour_intensity=`DEFINED`, details=`{LASH_EXT,HIGHLIGHT}`, mood=`{GLAMOROUS}`

---

### 컨셉 4 — 프레시 (FRESH_NATURAL) · 생기·노메이크업 같은

**4A · 코랄 생기**
- `MAKEUP:` dewy glass-skin base; coral lip (vivid orange-pink) with blurred tinted finish; natural soft eye in warm peach tones; natural lightly-groomed brow; coral blush on the apples of the cheeks; no contour; soft highlighter.
- meta: base_finish=`DEWY`, lip_color=`CORAL`, lip_finish=`TINTED`, eye_style=`NATURAL`, eye_color=`PEACH`, blush_color=`CORAL`, blush_placement=`APPLE`, brow_shape=`NATURAL_FLAT`, contour_intensity=`NONE`, details=`{HIGHLIGHT}`, mood=`{FRESH_NATURAL}`

**4B · 주근깨 데일리**
- `MAKEUP:` natural-skin barely-there base letting skin texture show; peach lip with blurred tinted finish; bare almost-no-shadow eye with only a hair-thin tightline, neutral tones; natural brow; peach blush on the apples; no contour; delicate faux freckles across the nose bridge and upper cheeks.
- meta: base_finish=`NATURAL_SKIN`, lip_color=`PEACH`, lip_finish=`TINTED`, eye_style=`BARE`, eye_color=`NEUTRAL`, blush_color=`PEACH`, blush_placement=`APPLE`, brow_shape=`NATURAL_FLAT`, contour_intensity=`NONE`, details=`{FAUX_FRECKLE}`, mood=`{FRESH_NATURAL}`

**4C · 누드 글로우**
- `MAKEUP:` dewy glass-skin base; nude lip with blurred tinted finish; natural soft eye in neutral beige-taupe; natural brow; soft pink blush on the apples; no contour; soft highlighter.
- meta: base_finish=`DEWY`, lip_color=`NUDE`, lip_finish=`TINTED`, eye_style=`NATURAL`, eye_color=`NEUTRAL`, blush_color=`PINK`, blush_placement=`APPLE`, brow_shape=`NATURAL_FLAT`, contour_intensity=`NONE`, details=`{HIGHLIGHT}`, mood=`{FRESH_NATURAL}`

---

### 컨셉 5 — 클래식 (CLASSIC) · 격식·정통

**5A · 로즈 새틴**
- `MAKEUP:` satin base; rose lip with satin soft-sheen finish; natural soft eye in neutral beige-taupe; soft arched brow with a gentle peak; rose blush on the apples; natural contour adding gentle dimension; emphasized lashes, soft highlighter.
- meta: base_finish=`SATIN`, lip_color=`ROSE`, lip_finish=`SATIN`, eye_style=`NATURAL`, eye_color=`NEUTRAL`, blush_color=`ROSE`, blush_placement=`APPLE`, brow_shape=`SOFT_ARCH`, contour_intensity=`NATURAL`, details=`{LASH_EXT,HIGHLIGHT}`, mood=`{CLASSIC}`

**5B · MLBB 소프트 캣**
- `MAKEUP:` satin base; MLBB lip with satin finish; soft cat-eye with a gentle wing in warm brown tones; soft arched brow; muted nude blush on the outer cheekbone; natural contour; emphasized lashes.
- meta: base_finish=`SATIN`, lip_color=`MLBB`, lip_finish=`SATIN`, eye_style=`CAT_EYE`, eye_color=`BROWN`, blush_color=`NUDE`, blush_placement=`OUTER_CHEEK`, brow_shape=`SOFT_ARCH`, contour_intensity=`NATURAL`, details=`{LASH_EXT}`, mood=`{CLASSIC}`

**5C · 모브 음영**
- `MAKEUP:` satin base; mauve lip with satin finish; natural soft eye in rose-brown tones; soft arched brow; rose blush on the outer cheekbone; natural contour; soft highlighter.
- meta: base_finish=`SATIN`, lip_color=`MAUVE`, lip_finish=`SATIN`, eye_style=`NATURAL`, eye_color=`ROSE_BROWN`, blush_color=`ROSE`, blush_placement=`OUTER_CHEEK`, brow_shape=`SOFT_ARCH`, contour_intensity=`NATURAL`, details=`{HIGHLIGHT}`, mood=`{CLASSIC}`

---

### 컨셉 6 — 로맨틱 (ROMANTIC) · 여성스러움·드라마틱

**6A · 핑크 그라데이션**
- `MAKEUP:` dewy glass-skin base; rose lip with soft-blurred ombré edge (deeper center fading outward); round doll-eye look in warm peach tones; soft arched brow; soft pink blush draped diagonally from the cheekbone toward the temple; subtle contour; details — ombré gradient lip, shimmer in the inner corners, soft highlighter.
- meta: base_finish=`DEWY`, lip_color=`ROSE`, lip_finish=`BLURRED`, eye_style=`DOLL`, eye_color=`PEACH`, blush_color=`PINK`, blush_placement=`DRAPED`, brow_shape=`SOFT_ARCH`, contour_intensity=`SUBTLE`, details=`{OMBRE_LIP,INNER_CORNER,HIGHLIGHT}`, mood=`{ROMANTIC}`

**6B · 로즈 글로우**
- `MAKEUP:` dewy glass-skin base; rose lip glossy finish; natural soft eye in rose-brown tones; soft arched brow; rose blush draped from cheekbone toward the temple; subtle contour; soft highlighter.
- meta: base_finish=`DEWY`, lip_color=`ROSE`, lip_finish=`GLOSSY`, eye_style=`NATURAL`, eye_color=`ROSE_BROWN`, blush_color=`ROSE`, blush_placement=`DRAPED`, brow_shape=`SOFT_ARCH`, contour_intensity=`SUBTLE`, details=`{HIGHLIGHT}`, mood=`{ROMANTIC}`

**6C · 코랄핑크 러블리**
- `MAKEUP:` satin base; coral lip glossy finish with a soft ombré gradient; round doll-eye look in warm peach tones; soft arched brow; coral blush on the apples of the cheeks; subtle contour; ombré gradient lip, soft highlighter.
- meta: base_finish=`SATIN`, lip_color=`CORAL`, lip_finish=`GLOSSY`, eye_style=`DOLL`, eye_color=`PEACH`, blush_color=`CORAL`, blush_placement=`APPLE`, brow_shape=`SOFT_ARCH`, contour_intensity=`SUBTLE`, details=`{OMBRE_LIP,HIGHLIGHT}`, mood=`{ROMANTIC}`

---

## 4. 생성 후 — 업로드 & 적재 절차

1. 위 18개 프롬프트로 ChatGPT에서 이미지 생성 (컨셉당 헤어·포즈 고정 확인)
2. 파일명을 `1A.png … 6C.png` 식으로 저장
3. 이미지를 전달하면 → `makeup-samples` 버킷(public)에 업로드 → `makeup_samples`에
   각 행을 위 메타데이터 그대로 `INSERT` (`is_active=true`, `display_order`는 컨셉 순서대로)
4. `/admin/makeup-samples` 또는 `/ai-studio/makeup-room`에서 18개 노출·선택 가능 확인 (end-to-end)

> `name` 예시: "한국 신부 · 코랄 MLBB", "글래머러스 · 클래식 레드" …
> `display_order` 제안: 한국신부 60 / 에테리얼 50 / 글래머 40 / 프레시 30 / 클래식 20 / 로맨틱 10
> (목록은 display_order 내림차순 정렬 → 한국 신부가 먼저 노출)

---

## 5. 최종 18종 매핑 — 레퍼런스 8 + 트렌드 10 (2026)

업로드 레퍼런스 8장 + 2026 트렌드(속광 글로우·음영·그라데/퍼피 눈매·투명 물광) 자동생성 10종.
**메타데이터 권위 출처는 `seed/makeup-samples/seed.sql`** (이 표는 빠른 참조용).

| 룩 | 컨셉 | 소스 | 추천 컷 | 한 줄 |
|---|---|---|---|---|
| 1A 본식 시그니처 | 한국 신부 | ref_3 | 본식 | 글로우 베이스·MLBB·눈밑 블러셔, 정통 한국 본식 |
| 1B 음영 본식 | 한국 신부 | auto | 본식 | 그윽한 음영 눈매 + 글로우, 차분 세련 |
| 1C 물광 글로우 | 한국 신부 | ref_1 | 본식·데일리 | 강한 물광 + 글로시 코랄립 |
| 2A 투명 햇살 본식 | 에테리얼 | ref_7 | 본식 | "햇살 투명" 글래스 스킨, 핑크 글로시 |
| 2B 글로우 라벤더 본식 | 에테리얼 | ref_6 | 본식 | 쿨 라벤더 워시 + 물광, 모브 글로시 |
| 2C 투명 글로시 | 에테리얼 | ref_2 | 데일리·촬영 | 투명 듀이 + 누드 글로시, 몽환 |
| 3A 클래식 레드 | 글래머러스 | auto | 촬영 | 레드립 + 브론즈 스모키 + 음영 |
| 3B 버건디 캣아이 | 글래머러스 | auto | 촬영 | 매트 베리립 + 버건디 캣아이 |
| 3C 누드 음영 글램 | 글래머러스 | auto | 촬영·본식 | 누드 글로시 + 딥 스모키 음영 |
| 4A 생기 코랄 | 프레시 | ref_5 | 데일리·촬영 | 코랄 생기 블러셔 + 글로시, 발랄 |
| 4B 주근깨 데일리 | 프레시 | auto | 데일리 | 쌩얼 베이스 + 주근깨 포인트 |
| 4C 누드 글로우 | 프레시 | auto | 데일리 | 누드 틴트 + 듀이, 노메이크업 같은 |
| 5A 로즈 새틴 음영 | 클래식 | auto | 본식 | 새틴 로즈립 + 자연 음영, 정갈 |
| 5B 시크 에디토리얼 | 클래식 | ref_8 | 촬영 | 단발·모브 새틴립 + 음영, 시크 |
| 5C 모브 음영 | 클래식 | auto | 촬영 | 모브 새틴 + 로즈브라운 음영 |
| 6A 핑크 그라데이션 | 로맨틱 | ref_4 | 촬영 | 핑크 드레이프 블러셔 + 그라데 입술 |
| 6B 로즈 글로우 | 로맨틱 | auto | 데일리·본식 | 로즈 글로시 + 드레이프 블러셔 |
| 6C 코랄핑크 러블리 | 로맨틱 | auto | 촬영 | 코랄 그라데 + 도리 눈매, 러블리 |

생성 방식:
- **ref 8종**: 0.5절 *듀얼 이미지* 템플릿 (아바타 Image 1 + 해당 레퍼런스 Image 2)
- **auto 10종**: 0.5절 *아바타 텍스트* 템플릿 (아바타 + 컨셉 HAIR&POSE + seed.sql 메타데이터를 자연어로)
