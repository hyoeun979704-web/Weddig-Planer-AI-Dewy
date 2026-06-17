# 앱내 팝업 / 이벤트 배너

> 선행: `README.md` §1 브랜드 · §2 스펙 · §3 비주얼 규칙. 수치는 §2에서만.

## 1. 배치 (기존 인프라 그대로 — 코드 변경 0)
`promotional_events` 카드 + `HomeEntryPopup` 진입 팝업에 얹는다.

### 카드 A — 베타 테스터 (featured, position 5, audience='all')
- **제목:** `Dewy 1호 테스터 모집 🎁`
- **부제:** `안드로이드 한정 · 출시 후 구독 2개월 연장 + 1호 뱃지`
- **CTA 라벨:** `테스터 신청` → 신청 폼(또는 `/auth`)
- **뱃지:** `출시 전 한정`

### 카드 B — 부케 할인권 (position 15)
- **제목:** `꽃 머지 깨고 부케 20만원 할인권 💐`
- **부제:** `최종 단계 도달 + SNS 인증 · 선착순 100명`
- **CTA 라벨:** `게임 시작` → `/merge-game`
- **뱃지:** `선착순`

### 진입 팝업 (show_as_popup=true, audience='guest')
- 첫 진입 1회, **베타 카드**를 노출(신규 유입 전환). 본문 카피:
  - 헤드라인: `출시 전, 1호 테스터가 되어주세요`
  - 서브: `안드로이드 한정 — 구독 2개월 연장 + 1호 뱃지`
  - 버튼: `신청하기` / `다음에`

## 2. 배너 카피 변형 (홈 상단 띠배너용, 한 줄)
- `🎁 Dewy 1호 테스터 모집 — 안드로이드 한정, 출시 후 구독 2개월 더!`
- `💐 꽃 머지 최종 단계 깨면 부케 20만원 할인권 (선착순)`

## 3. 🎨 이미지 생성 프롬프트 (배경, 텍스트 없음)
**팝업/배너 공용 배경:**
```
A mobile in-app event popup background, 1080x1350, soft Korean wedding aesthetic.
A glossy 3D gradient heart (pink-coral-blue, matching the app icon) on the left, a small
elegant bridal bouquet on the right, blush-pink to ivory gradient, soft glow, sparkles.
Clean modern UI feel, generous empty center for Korean text and a CTA button area.
No text, no letters, no numbers, no watermark. Soft cinematic light, high detail. --ar 4:5
```
**띠배너(가로) 변형:** 위 프롬프트에서 `1080x1350`→`1200x400`, `--ar 4:5`→`--ar 3:1`, "empty center"→"empty right side for Korean text".

## 4. 체크
- [ ] 제목/부제 §2와 일치 · CTA 라우트 정확(`/merge-game`, `/auth`)
- [ ] 이미지 텍스트 없음 → 한글 오버레이 · 브랜드 컬러
- [ ] 부케 선착순 100명(확정) 표기 일치 · 인증 태그 @dewy_ai_weddig_planer
