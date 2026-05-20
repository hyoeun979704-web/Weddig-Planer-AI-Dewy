# free-classic-01 — 클래식 · 커플 사진 강조

레퍼런스: "Kim Dong hyun + Choi Eun seo" (컨페티 사진) 스타일.

## 무드
- 클래식·정중·격식
- 상단 절반 큰 커플 사진 + 하단 절반 정보 카드
- 양면 카드 한 장 시뮬레이션 (1면 디자인)

## 캔버스
- **1000 × 1400** (세로)
- 배경 #FAF8F4 (워머 화이트)
- 인쇄 시 A5 세로 (~148×210mm)

## Figma 작업 가이드

### 배경 PNG (`free-classic-01-bg.png`)
배경에 포함시킬 요소:
- 상단 0~700 영역 — 사진 자리 (사용자 사진으로 교체될 영역, 배경은 회색 사각형 또는 빈 채로)
- 하단 700~1400 영역 — 워머 화이트 #FAF8F4 배경
- (선택) 하단 INVITATION / LOCATION 섹션 사이 구분선 — 두께 0.5px, 색 #DDDDDD

### 풀시안 PNG (`free-classic-01-thumb.png`)
- 위 배경 + placeholder 사진 + 모든 텍스트 보임

## 슬롯 좌표

| 슬롯 ID | 좌표 (X, Y, W, H) | z | 내용 |
|---|---|---|---|
| main_photo | 0, 0, 1000, 700 | 1 | 큰 커플 사진 |
| name_en_groom | 60, 60, 420, 50 | 3 | 사진 위 신랑 영문 이름 (좌상단) |
| name_en_bride | 540, 640, 420, 50 | 3 | 사진 위 신부 영문 이름 (우하단) |
| wedding_date_en | 540, 60, 400, 40 | 3 | 사진 위 결혼 날짜 (우상단) |
| venue_label | 60, 590, 420, 30 | 3 | 사진 위 식장 이름 (좌하단) |
| intro_label | 60, 760, 880, 30 | 2 | "INVITATION" 정적 |
| intro_message | 60, 810, 540, 220 | 2 | 한국어 인사말 (AI 추천) |
| groom_parents | 60, 1060, 540, 30 | 2 | 신랑 부모님 |
| bride_parents | 60, 1100, 540, 30 | 2 | 신부 부모님 |
| wedding_datetime_full | 60, 1180, 540, 30 | 2 | 결혼 일시 |
| venue_full | 60, 1220, 540, 30 | 2 | 식장 주소 |
| location_label | 660, 810, 280, 30 | 2 | "LOCATION" 정적 |
| venue_map | 660, 850, 280, 200 | 2 | 약도 PNG 슬롯 |
| venue_map_address | 660, 1080, 280, 60 | 2 | 약도 아래 주소 텍스트 |

## 폰트 권장
- 영문 이름 (사진 위): Script 폰트, italic, 32pt, 흰색 (예: Allura, Great Vibes)
- "INVITATION" / "LOCATION": 14pt 세리프, letter-spacing 4px, 회색
- 한글 인사말: Noto Sans KR / Pretendard, 14pt, line-height 1.8
- 본문 메타: 13pt

## 추가 디자인 메모
- 사진 영역에는 placeholder 회색 박스만 두고 사용자가 자기 사진으로 교체
- 사진 위에 흰 텍스트가 가독성 있도록 사진 자체에 살짝 어두운 그라데이션 또는 vignette 추가 가능
- 약도(map) 슬롯은 사용자가 식장 약도 PNG 를 별도 업로드 (V2 에서 카카오맵 자동 약도)
