# 메이크업 시안 18종 — 최종 프롬프트 (컨셉 아바타 잠금 방식)

> 검수 완료본. 메타데이터는 `seed/makeup-samples/seed.sql`와 1:1 일치.
> **워크플로우**: ① `avatar-base.png`로 컨셉별 쌩얼 아바타 6장 생성 → ② 각 아바타에
> "헤어·포즈 잠금 + 메이크업만 추가"로 3장씩 = 18종.
> 이렇게 하면 **컨셉 안에서 헤어·포즈가 100% 동일**, 차이는 메이크업뿐.

## 왜 이 방식인가 (지난 시도의 문제)
- 텍스트로 "컨셉별 헤어·포즈 재스타일"을 시키면 매번 헤어·포즈가 다르게 그려짐 → **아바타에 헤어·포즈를 박아두고 잠근다.**
- "identity 유지"에 눈썹까지 묶이면 눈썹 메이크업이 안 올라옴 → **눈썹·속눈썹·피부마감은 '메이크업'으로 분리**, 항목별 체크리스트로 "전부 반드시 보이게" 강제.
- 시선이 아래면 눈 화장이 가려짐 → **눈 정면(open to camera)** 고정.

---

## STEP 1 — 컨셉별 쌩얼 아바타 6장

각 프롬프트에 **`avatar-base.png`(첫 아바타)를 첨부** → 같은 인물·쌩얼 유지, 헤어·포즈만 컨셉용으로.
결과를 `avatar-soft_korean.png` … `avatar-romantic.png` 로 저장.

공통 규칙(6장 모두) — **얼굴 고정이 최우선**:
```
[avatar-base.png 첨부]
EDIT this exact photo. It MUST remain the SAME woman — preserve her face 100%: identical
eye shape & size, eyelid type, eyebrow shape & position, nose, lip shape, face shape,
proportions and skin tone. Keep her pose, head angle, framing, neutral expression and the
clean light-grey background IDENTICAL to the source. Keep a COMPLETELY BARE FACE (no
makeup, bare natural brows & lashes, visible skin pores). Change ONLY the hairstyle to the
one below — like the same person photographed on another day with her hair restyled. Keep
her EYEBROWS fully visible; her forehead MAY be softly covered by bangs or side-swept
pieces. Set her hair color to a natural Korean dark brown — a soft blackish-brown (흑갈색)
with a subtle warm brown sheen in the light, NOT flat jet-black. Style it like a CURRENT
2026 Korean bridal salon look — soft crown volume with deliberate fine face-framing wispy
strands and see-through bangs (the trendy 잔머리 연출), polished and pretty. (The wispy
strands are intentional and stylist-placed — NOT frizzy, NOT DIY, NOT stiff or severely
slicked-back, NOT old-fashioned.) 1:1 1024², eyes open to
camera, no veil, no jewelry, no props, no text. Ultra-photorealistic.
HAIRSTYLE: {HAIR}
```

> **얼굴 드리프트 방지**: ① 위 정체성 잠금 문구 그대로 ② 6장 모두 **avatar-base.png에서**
> 생성(직전 결과 말고 항상 원본에서) ③ 눈썹·이목구비·얼굴형은 동일 유지(이마는 앞머리로 가려도 됨).
> 결과가 다른 얼굴이면 **재생성해서 원본과 가장 닮은 컷 채택.**
> 배경은 전 컨셉 공통 라이트그레이(통일). 포즈도 전 컨셉 정면 고정(통일).

| 아바타 | {HAIR} — 2026 모던 한국 웨딩 (전부 잔머리 연출+정수리 볼륨, 실루엣만 다르게, 흑갈색) |
|---|---|
| `avatar-soft_korean` | a modern Korean slicked LOW BUN with soft crown volume, see-through bangs and deliberate fine face-framing wispy strands (trendy 잔머리 연출); the signature current bridal bun |
| `avatar-ethereal` | a soft HALF-UP — top secured with soft crown volume, airy waves flowing down, wispy face-framing strands and see-through bangs; dreamy and modern |
| `avatar-glamorous` | all hair worn DOWN in modern glossy S-curl waves, deep SIDE part, a few face-framing strands; sleek and editorial (not retro Hollywood) |
| `avatar-fresh` | a low/mid PONYTAIL with soft waves and fine wispy face-framing strands; youthful, lively, current |
| `avatar-classic` | a refined textured LOW BUN (메시번 느낌) with soft crown volume and a few minimal wisps, clean forehead, no bangs; modern and elegant |
| `avatar-romantic` | a soft romantic LOW UPDO with curled face-framing tendrils, curtain bangs and plenty of soft wispy strands; undone goddess vibe |

---

## STEP 2 — 잠금형 메이크업 프롬프트 (18종)

각 룩은 **해당 컨셉 아바타**를 Image 1로 첨부. ref 표시가 있는 룩은 **레퍼런스 사진을 Image 2로 추가** 첨부.
공통 잠금 헤더(모든 룩 동일):

```
[Image 1: 컨셉 아바타]   (+ [Image 2: ref_N] — ref 룩만)
LOCK Image 1 EXACTLY — do NOT change: hair (every strand & parting), head pose & angle,
framing, face shape, eye shape, nose, lip shape, jaw, skin tone. The ONLY change is ADDING
makeup (eyebrows, lashes, skin-finish count as makeup, NOT identity).
[ref 룩만] Use Image 2 as a MAKEUP reference ONLY — copy makeup colors/placement; never
copy its face, hair, veil, crop or pose.
APPLY FULL PROFESSIONAL BRIDAL MAKEUP — EVERY item below must be clearly visible and
well-defined (this is a sample, NOT a bare face). Editorial beauty quality, eyes OPEN to
camera. Visible skin pores, no veil/hands/props/text.
```
그 아래 룩별 7줄 체크리스트를 붙인다.

---

### 컨셉 1 — 한국 신부 (`avatar-soft_korean`)

**1A · 본식 시그니처** 〔+ ref_3〕 · 트렌드 상단
- Skin: satin base with soft glow
- Brows: groom, fill & shape into a soft Korean straight brow — not bare
- Eyes: rose-brown Korean inner-corner shading, gradient outward; thin tightline; defined natural lashes
- Lips: MLBB, blurred tinted stain finish, clearly tinted
- Blush: rose, just under the eyes (애교살), clearly visible
- Contour: very subtle
- Highlight: soft highlighter on the high points

**1B · 음영 본식** 〔auto〕
- Skin: satin base with soft glow
- Brows: groom, fill & shape into a soft Korean straight brow — not bare
- Eyes: deeper warm-brown Korean inner-corner shading, soft blurred 음영 depth; tightline; defined lashes
- Lips: MLBB, blurred tinted finish, clearly tinted
- Blush: rose, just under the eyes, clearly visible
- Contour: natural, gentle dimension
- Highlight: soft highlighter

**1C · 물광 글로우** 〔+ ref_1〕 · 트렌드 상단
- Skin: dewy glass-skin, strong 물광 lit-from-within glow
- Brows: groom, fill & shape into a soft Korean straight brow — not bare
- Eyes: natural soft warm-peach wash; defined natural lashes
- Lips: coral, juicy glossy, clearly tinted
- Blush: peach on the apples of the cheeks, clearly visible
- Contour: none
- Highlight: generous dewy highlight (cheekbones, nose, cupid's bow)

---

### 컨셉 2 — 에테리얼 (`avatar-ethereal`)

**2A · 투명 햇살 본식** 〔+ ref_7〕 · 트렌드 1순위
- Skin: luminous translucent glass-skin, strong 물광 glow
- Brows: groom, fill & shape into a soft Korean straight brow — not bare
- Eyes: warm peach wash; bright inner-corner shimmer; defined natural lashes; thin tightline
- Lips: rose-pink, juicy glossy, clearly tinted
- Blush: soft pink, spread wide along the cheekbones, clearly visible
- Contour: none
- Highlight: generous dewy highlight

**2B · 글로우 라벤더 본식** 〔+ ref_6〕
- Skin: dewy glass-skin, strong glow
- Brows: groom, fill & shape into a soft Korean straight brow — not bare
- Eyes: cool plum/lavender wash; defined lower lashes; natural lashes
- Lips: mauve, glossy, clearly tinted
- Blush: pink, just under the eyes, clearly visible
- Contour: very subtle
- Highlight: dewy highlight

**2C · 투명 글로시** 〔+ ref_2〕
- Skin: dewy glass-skin base
- Brows: groom into soft FEATHERED fluffy brows, visible upward strokes, lightly filled — not bare
- Eyes: cool rose-brown wash that clearly defines the eye; inner-corner shimmer; defined natural lashes
- Lips: nude, juicy glossy, clearly tinted
- Blush: soft pink on the apples, clearly visible
- Contour: none
- Highlight: dewy highlight

---

### 컨셉 3 — 글래머러스 (`avatar-glamorous`) · 전부 auto

**3A · 클래식 레드**
- Skin: satin base
- Brows: groom, fill & shape into a well-defined, cleanly-shaped brow — not bare
- Eyes: bronze smoky gradient blended into a soft halo; defined liner; emphasized long curled lashes
- Lips: classic true-red, satin finish, clearly defined
- Blush: nude on the outer cheekbone, clearly visible
- Contour: defined sculpted contour
- Highlight: soft highlighter

**3B · 버건디 캣아이**
- Skin: smooth matte velvet base
- Brows: groom, fill & shape into a well-defined brow — not bare
- Eyes: burgundy wine shadow; cat-eye winged liner up-and-out; emphasized lashes
- Lips: berry, fully matte, clearly defined
- Blush: rose on the outer cheekbone, clearly visible
- Contour: defined contour
- Highlight: minimal

**3C · 누드 음영 글램**
- Skin: satin base
- Brows: groom, fill & shape into a well-defined brow — not bare
- Eyes: neutral deep beige-taupe smoky gradient; defined liner; emphasized lashes
- Lips: nude, high-shine glossy, clearly tinted
- Blush: nude on the outer cheekbone, clearly visible
- Contour: defined contour
- Highlight: soft highlighter

---

### 컨셉 4 — 프레시 (`avatar-fresh`)

**4A · 생기 코랄** 〔+ ref_5〕
- Skin: dewy base
- Brows: groom into a natural lightly-groomed brow, filled — not bare
- Eyes: warm peach natural wash; defined natural lashes
- Lips: coral, glossy, clearly tinted
- Blush: coral on the apples, youthful flush, clearly visible
- Contour: none
- Highlight: soft dewy highlight

**4B · 주근깨 데일리** 〔auto〕
- Skin: barely-there natural-skin base, texture shows
- Brows: natural lightly-groomed brow, lightly filled — not bare
- Eyes: bare with only a thin tightline, neutral tones; natural lashes
- Lips: peach, blurred tinted, clearly tinted
- Blush: peach on the apples, clearly visible
- Contour: none
- Details: delicate faux freckles across the nose and upper cheeks

**4C · 누드 글로우** 〔auto〕
- Skin: dewy base
- Brows: natural lightly-groomed brow, filled — not bare
- Eyes: neutral beige-taupe natural soft wash; natural lashes
- Lips: nude, blurred tinted, clearly tinted
- Blush: soft pink on the apples, clearly visible
- Contour: none
- Highlight: soft highlighter

---

### 컨셉 5 — 클래식 (`avatar-classic`)

**5A · 로즈 새틴 음영** 〔auto〕
- Skin: satin base
- Brows: groom, fill & shape into a soft arched brow — not bare
- Eyes: neutral beige-taupe soft wash; emphasized lashes
- Lips: rose, satin, clearly tinted
- Blush: rose on the apples, clearly visible
- Contour: natural, gentle dimension
- Highlight: soft highlighter

**5B · 시크 에디토리얼** 〔+ ref_8〕
- Skin: satin base
- Brows: groom, fill & shape into a soft arched brow — not bare
- Eyes: neutral taupe with a subtle elongated cat-eye liner; emphasized lashes
- Lips: mauve, satin, clearly tinted
- Blush: nude on the outer cheekbone, clearly visible
- Contour: natural
- Highlight: minimal

**5C · 모브 음영** 〔auto〕
- Skin: satin base
- Brows: groom, fill & shape into a soft arched brow — not bare
- Eyes: rose-brown soft wash that defines the eye; natural lashes
- Lips: mauve, satin, clearly tinted
- Blush: rose on the outer cheekbone, clearly visible
- Contour: natural
- Highlight: soft highlighter

---

### 컨셉 6 — 로맨틱 (`avatar-romantic`)

**6A · 핑크 그라데이션** 〔+ ref_4〕
- Skin: dewy base
- Brows: groom, fill & shape into a soft arched brow — not bare
- Eyes: round doll-eye look in warm peach, inner-corner highlight to enlarge; defined natural lashes
- Lips: coral ombré gradient, soft-blurred edge deeper in the center, clearly tinted
- Blush: pink draped from the cheekbone toward the temple, clearly visible
- Contour: subtle
- Highlight: soft highlighter + inner-corner shimmer

**6B · 로즈 글로우** 〔auto〕
- Skin: dewy base
- Brows: groom, fill & shape into a soft arched brow — not bare
- Eyes: rose-brown soft wash; defined natural lashes
- Lips: rose, glossy, clearly tinted
- Blush: rose draped toward the temple, clearly visible
- Contour: subtle
- Highlight: soft highlighter

**6C · 코랄핑크 러블리** 〔auto〕
- Skin: satin base
- Brows: groom, fill & shape into a soft arched brow — not bare
- Eyes: round doll-eye look in warm peach; defined natural lashes
- Lips: coral, glossy with a soft ombré gradient, clearly tinted
- Blush: coral on the apples, clearly visible
- Contour: subtle
- Highlight: soft highlighter

---

## 적재 매핑 (참고)
ref 첨부: 1A=ref_3 · 1C=ref_1 · 2A=ref_7 · 2B=ref_6 · 2C=ref_2 · 4A=ref_5 · 5B=ref_8 · 6A=ref_4 / 나머지 10종 auto.
seed `__IMG_xx__` ↔ 위 룩 코드 1:1.
