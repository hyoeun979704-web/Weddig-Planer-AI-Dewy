# mobile-cutout-01 — 모바일 누끼 · 인물이 떠오르는

모바일 10하트 등급 (Phase 3-D). `paper-cutout-01` 의 모바일 버전.
사용자 사진 1장을 두 번 사용 — 원본은 배경에 깔리고, 누낀(배경 제거)
버전은 타이틀 위로 떠올라 **인물이 텍스트 사이에 끼는** 효과를 만든다.

## 무드
- 감성적·드라마틱, 인스타 스토리 비율에 최적화
- 사진 인물의 표정을 살리는 디자인
- 인물 어깨·머리가 타이틀과 자연스럽게 겹침

## 캔버스
- **1080 × 1920** (세로, 인스타 스토리 9:16)
- 배경 #FAF6F1 (워머 베이지)
- 모바일 청첩장 — 발행 후 share_slug 로 공유

## 레이어 순서 (핵심)

```
z:1  배경 사진 (원본)         ← 첫 슬롯 (main_photo_bg)
z:2  영문 타이틀 (흰색)       ← title_en
z:2  인사말·이름·날짜·식장     ← intro_message, names_ko, ...
z:3  누낀 사진 (인물만)        ← main_photo_cutout (auto_cutout: true)
```

발행 시 `main_photo_cutout` 슬롯의 사진 path 가 remove.bg(`invitation-cutout`)
로 전달돼 배경 제거 PNG 가 생성된다. 같은 사용자 사진을 사용하지만
(image_order=1) z:3 으로 올라와 타이틀 위로 떠오른다.

## Figma 작업 가이드

### 배경 PNG (`mobile-cutout-01-bg.png`)
- 상단 0~1200 영역 — 사진 자리. 부드러운 다크 vertical gradient
  (#00000000 → #00000040) 로 흰 텍스트 가독성 확보
- 하단 1200~1920 영역 — #FAF6F1 베이지 카드 배경

### 풀시안 PNG (`mobile-cutout-01-thumb.png`)
- 위 배경 + placeholder 사진 + 모든 텍스트 보임 — 갤러리 미리보기

## 슬롯 좌표

| 슬롯 ID | 좌표 (X, Y, W, H) | z | 내용 |
|---|---|---|---|
| main_photo_bg | 0, 0, 1080, 1200 | 1 | 원본 사진 (배경) |
| title_en | 80, 420, 920, 320 | 2 | "We're Getting Married" 흰 핸드라이팅 |
| main_photo_cutout | 0, 0, 1080, 1200 | 3 | **누낀 사진 — auto_cutout: true** |
| intro_message | 80, 1280, 920, 280 | 2 | 인사말 (AI 추천) |
| names_ko | 80, 1580, 920, 50 | 2 | 신랑·신부 한글 이름 |
| wedding_date_short | 80, 1660, 920, 40 | 2 | 결혼 날짜 |
| venue_info | 80, 1720, 920, 40 | 2 | 식장 이름 |

## 폰트 권장
- 영문 타이틀: Script italic 110pt, 흰색 #FFFFFF
- 인사말 본문: Pretendard / Noto Sans KR 24pt, line-height 1.8

## 가격 정책 (이 템플릿)
- `price_hearts = 10` — 모바일 누끼 등급 (remove.bg 1회 호출 비용 + 마진)
- 사용자가 사진을 첨부하지 않으면 누끼 호출 안 됨 (가격은 차감)

## 발행 시 동작 흐름
```
1. wizard 에서 사진 1장 첨부
2. distributePhotos: image_order=1 슬롯 두 개 모두 같은 사진 매핑
3. applyCutoutToSlots: auto_cutout 슬롯 → invitation-cutout 호출 → 누낀 path
4. spend_hearts(10, "invitation_publish")
5. result 페이지 → "공유 링크 발급하기" (publish_invitation)
```

## 디자인 메모
- 누낀 슬롯이 사진 영역(z:3, 0~1200)에 그대로 머무르도록 좌표가 원본과 동일
- 사용자가 인물 잘린 사진(반신·전신)을 넣으면 효과가 가장 잘 살아남
