# paper-cutout-01 — 누끼 · 인물이 텍스트 위로

종이 5하트 등급. 사용자 사진 1장을 두 번 사용 — 원본은 배경에 깔리고,
누낀(배경 제거) 버전은 텍스트 위로 떠올라 **인물이 텍스트 사이에 끼는**
효과를 만든다.

## 무드
- 감성적·드라마틱
- 사진 인물의 표정을 살리는 디자인
- 인물 어깨·머리가 텍스트와 자연스럽게 겹침

## 캔버스
- **1000 × 1400** (세로)
- 배경 #FAF6F1 (워머 베이지)
- A5 세로 (~148×210mm) 인쇄 적합

## 레이어 순서 (핵심)

```
z:1  배경 사진 (원본)         ← 첫 슬롯 (main_photo_bg)
z:2  영문 타이틀 (흰색)       ← title_en
z:2  인사말·날짜·식장 텍스트   ← intro_message, wedding_date_short, ...
z:3  누낀 사진 (인물만)        ← main_photo_cutout (auto_cutout: true)
```

발행 시 `main_photo_cutout` 슬롯의 사진 path 가 remove.bg 로 전달돼 배경
제거 PNG 가 생성된다. 같은 사용자 사진을 사용하지만(image_order=1) z:3 으로
올라와 텍스트 위로 떠오른다.

## Figma 작업 가이드

### 배경 PNG (`paper-cutout-01-bg.png`)
배경에 포함시킬 요소:
- 상단 0~1000 영역 — 사진 자리. 회색 box 또는 darker 그라데이션(텍스트 가독성)
- 하단 1000~1400 영역 — #FAF6F1 베이지 배경
- (선택) 사진 영역 위에 살짝 어두운 vertical gradient #00000000 → #00000040 — 흰 텍스트 가독성

### 풀시안 PNG (`paper-cutout-01-thumb.png`)
- 위 배경 + placeholder 사진 + 모든 텍스트 보임
- 갤러리 미리보기 — 풀시안 PNG

## 슬롯 좌표

| 슬롯 ID | 좌표 (X, Y, W, H) | z | 내용 |
|---|---|---|---|
| main_photo_bg | 0, 0, 1000, 1000 | 1 | 원본 사진 (배경) |
| title_en | 80, 380, 840, 240 | 2 | "We're Getting Married" 흰 핸드라이팅 |
| main_photo_cutout | 0, 0, 1000, 1000 | 3 | **누낀 사진 — auto_cutout: true** |
| intro_message | 80, 1060, 840, 160 | 2 | 인사말 (AI 추천) |
| wedding_date_short | 80, 1240, 840, 30 | 2 | 결혼 날짜 |
| venue_info | 80, 1290, 840, 30 | 2 | 식장 이름 |

## 폰트 권장
- 영문 타이틀: Script italic 96pt, 흰색 #FFFFFF (예: Allura, Lavanderia)
- 인사말 본문: Pretendard / Noto Sans KR 16pt, line-height 1.8

## 가격 정책 (이 템플릿)
- `price_hearts = 5` — remove.bg 1회 호출 비용 흡수 + 약간 마진
- 사용자가 사진을 첨부하지 않으면 누끼 호출 안 됨 (가격은 차감)

## 발행 시 동작 흐름
```
1. wizard 에서 사진 1장 첨부
2. distributePhotos: image_order=1 슬롯 두 개 모두 같은 사진 매핑
   ├── main_photo_bg.path = 원본 path
   └── main_photo_cutout.path = 원본 path (아직 누끼 안 됨)
3. applyCutoutToSlots:
   ├── auto_cutout: true 인 main_photo_cutout 검출
   ├── invitation-cutout Edge function 호출 (원본 path → 누낀 path)
   └── main_photo_cutout.path 를 누낀 path 로 덮어쓰기
4. spend_hearts(5, "invitation_publish")
5. invitations row 저장 + result 페이지
```

## 디자인 메모
- 누낀 슬롯이 사진 영역(z:3, 0~1000)에 그대로 머무르도록 좌표가 원본과 동일
- 즉 같은 위치에 두 번 그려지지만, z:2 의 텍스트가 그 사이에 끼어 인물이
  텍스트 *위*로 보이는 착시
- 가독성을 위해 배경 사진에 부드러운 다크 그라데이션 (배경 PNG 에 포함)
- 사용자가 인물 잘린 사진(반신·전신)을 넣으면 효과가 가장 잘 살아남
