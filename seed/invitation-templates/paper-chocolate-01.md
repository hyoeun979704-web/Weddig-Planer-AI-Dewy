# paper-chocolate-01 — 초콜릿 · 손그림 위트

레퍼런스: 흰 초콜릿바 wrapper + 초록 손글씨 "Happy Wedding!" + 손그림 인물.

## 무드
- 센스·위트형 트렌드 청첩장(초콜릿바/답례품 wrapper 비율).
- CUTE, 친근·발랄. 친구 하객용. **사진 없음 — 손그림 일러스트가 주인공.**

## 캔버스
- **600 × 1500** (세로 긴 wrapper). bg `#FFFFFF`.
- 인쇄: 초콜릿바 포장 비율(≈ 55×150mm). 실제 wrapper 사양은 인쇄소 확인.

## 배경 PNG (`paper-chocolate-01-bg.png`) — 고정 장식 전담
- 흰 wrapper 바탕 + 미세 점선 테두리
- 상단 **초록 손글씨 "Happy Wedding!" + 리본** (Y 60~280)
- **손그림 인물 일러스트**(전통 혼례/봉춤 모티프) + 작은 꽃 스티커
- (선택) 하단 작은 손그림 아이콘(하트 프라이팬 등)

## 풀시안 PNG (`paper-chocolate-01-thumb.png`)
- 배경 + 슬롯 placeholder 텍스트 보이는 상태로 export.

## 슬롯 좌표 (layout JSON)
| 슬롯 ID | 좌표 (X,Y,W,H) | 내용 | 등급 |
|---|---|---|---|
| names_en | 60,300,480,60 | 영문 이름 (placeholder, script) | ✅ |
| intro_message | 70,600,460,220 | 인사말 (AI) | ✅ |
| groom_parents | 70,870,460,32 | GROOM 혼주 | ✅ |
| bride_parents | 70,912,460,32 | BRIDE 혼주 | ✅ |
| venue | 70,1010,460,32 | venue_name | ✅ |
| datetime | 70,1052,460,32 | wedding_date | ✅ |

## 폰트 권장
- 손글씨/스크립트(영문 이름·타이틀), 본문 둥근 산세리프.
- 컬러: 포인트 그린 `#2E7D32` + 핑크 `#C2185B`.

## 인쇄 안전 메모
- 손그림·타이틀은 전부 배경 PNG → 슬롯과 겹치지 않게 Y 좌표 확인.
- price_hearts = 0 (API 효과 없음). 사진 슬롯 없음 → 갤러리 "사진 없음" 표시.
</content>
