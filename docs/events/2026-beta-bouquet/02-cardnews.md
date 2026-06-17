# 이벤트 카드뉴스 (인스타/스레드 캐러셀 6장)

> 선행: `README.md` §1~§3. 저장·공유 유발형 — 정보로 끌고 → 이벤트로 전환.

## 1. 슬라이드별 카피

| # | 역할 | 카피 |
|---|---|---|
| 1 | 표지(후킹) | **"출시 전 딱 1000명만"** — Dewy 1호 테스터 모집 🎁 |
| 2 | 공감 | 결혼준비 앱 6개 깔았다 지웠죠? → **체크리스트·예산·스드메·청첩장 한 앱에** |
| 3 | 차별점 | 남들 없는 기능 — **방구석 드레스 투어 / AI 메이크업 / 무료 청첩장** |
| 4 | 테스터 혜택 | **[테스터·안드로이드 한정]** 1개월 구독 + 하트 50 ＋ 출시 후 **구독 2개월 더** + **1호 뱃지** |
| 5 | 누구나 혜택 | **[누구나]** SNS+플스토어 후기 → 하트 +50 / 꽃 머지 깨면 **부케 20만원 할인권** 💐 |
| 6 | CTA | ❤️ + DM으로 이메일 보내기 → 신청! · `dewy-wedding.com` |

**해시태그(글 하단):**
`#예비신부 #결혼준비 #스몰웨딩 #셀프웨딩 #청첩장 #스드메 #웨딩앱 #베타테스터 #방구석드레스투어`

**캡션(첫 줄 후킹):** `청첩장 5만원 아끼고, 드레스도 미리 입어보는 앱 나왔어요 (+테스터 혜택)`

## 2. 카피 원칙
- 1번 슬라이드 첫 줄에서 후킹, 4·5번에서 혜택, 6번에서만 행동 요청.
- §2 수치 그대로(테스터=안드로이드 한정, 후기=누구나, 부케=가안 선착순).
- 과장 금지 — "최고/1위" 류 단정 표현 쓰지 않기.

## 3. 🎨 이미지 생성 프롬프트
**표지(슬라이드 1):**
```
A 1080x1350 Instagram carousel cover for a wedding app event. Minimal, premium Korean
wedding magazine style. Centered glossy 3D gradient heart (pink-coral-blue), thin gold
accent line frame, blush-pink to cream gradient background, tiny sparkles and a few
scattered rose petals. Lots of clean empty space top and bottom for a bold Korean
headline. No text, no letters, no numbers, no watermark. Soft, airy, editorial. --ar 4:5
```
**속지(슬라이드 2~6, 일관성 유지):**
```
A matching 1080x1350 slide background for the same wedding app carousel. Same blush-pink
to cream gradient, same soft sparkles, minimal editorial style, a thin gold corner accent.
Mostly empty with a clean central area for Korean text and small app screenshot mockups.
No text, no letters, no numbers, no watermark. --ar 4:5
```
> 슬라이드 3·5엔 드레스 투어 before/after, 꽃 머지·부케 컷을 작은 목업으로 합성.

## 4. 체크
- [ ] 6장 톤·여백 일관(같은 그라데이션)
- [ ] 4·5번 혜택 §2와 일치 · 트랙 분리 명확
- [ ] 이미지 텍스트 없음 → 한글 오버레이
