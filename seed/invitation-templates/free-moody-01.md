# free-moody-01 — 무디 · Getting Married

레퍼런스: "Getting Married / Jeong Hyeok & Eun Ha Su" 스타일.

## 무드
- 무디·드라마틱·핑크 액센트
- 좌(검정) · 우(흰) 양면 카드 한 캔버스에 시뮬레이션
- 좌측 검정 카드: 큰 사진 + "Getting Married" pink 핸드라이팅 타이틀
- 우측 흰 카드: 인사말 + 큰 캘린더 + 식 정보

## 캔버스
- **2000 × 1400** (가로 양면)
- 배경 좌측 절반(#000) + 우측 절반(#FFF) — 배경 PNG가 처리
- 양면 인쇄 시 2면을 각각 1000×1400 으로 자르거나, 한 장 가로 PDF로

## Figma 작업 가이드

### 배경 PNG (`free-moody-01-bg.png`)
배경에 포함시킬 요소:
- **좌측 절반 (0~1000)**: 검정 #000000
- **우측 절반 (1000~2000)**: 흰색 #FFFFFF
- 우측 인사말과 부모님 영역 사이 — `+` 또는 미세 라인 장식 (X 1500, Y 380, 작게)
- 좌측 사진 자리 (Y 200~1300) 는 비워둠 (사용자 사진으로 교체)

### 풀시안 PNG (`free-moody-01-thumb.png`)
- 위 배경 + placeholder 사진 + 모든 텍스트 보임
- 갤러리 미리보기 — 1000×700 정도로 리사이즈해서 사용

## 슬롯 좌표

### 좌측 (검정 카드)
| 슬롯 ID | 좌표 (X, Y, W, H) | z | 내용 |
|---|---|---|---|
| title_en | 80, 80, 840, 200 | 3 | "Getting Married" 핑크 핸드라이팅, 가운데 |
| wedding_date_en_top | 80, 280, 840, 30 | 3 | 결혼일 (영문) |
| main_photo | 0, 200, 1000, 1100 | 1 | 큰 커플 사진 |
| names_en_bottom | 80, 1310, 840, 40 | 3 | 사진 아래 영문 이름 |

### 우측 (흰 카드)
| 슬롯 ID | 좌표 (X, Y, W, H) | z | 내용 |
|---|---|---|---|
| intro_message | 1100, 120, 820, 220 | 2 | 인사말 (AI 추천) |
| groom_parents_with_name | 1100, 420, 820, 30 | 2 | 신랑 부모님 |
| bride_parents_with_name | 1100, 460, 820, 30 | 2 | 신부 부모님 |
| wedding_calendar | 1240, 560, 540, 420 | 2 | 큰 캘린더 |
| wedding_datetime | 1100, 1080, 820, 30 | 2 | 결혼 일시 |
| venue_name | 1100, 1130, 820, 30 | 2 | 식장 이름 |
| venue_address | 1100, 1180, 820, 60 | 2 | 식장 주소 |

## 폰트 권장
- **"Getting Married"**: Script 폰트, italic, 96pt, **핑크 #F4A8C2**
- 영문 이름 하단 (사진 위): Serif italic, 24pt, 흰색
- 한글 인사말: Pretendard 16pt, line-height 1.8
- 캘린더: Serif (예: Cormorant Garamond)

## 추가 디자인 메모
- "Getting Married" 핑크 타이틀이 시그니처 — 충분히 크게, 약간 기울인 핸드라이팅
- 검정 사진 카드 안에 텍스트가 들어가므로 사진 자체에 살짝 darker 그라데이션 권장
- 양면을 따로 인쇄하려면 좌·우 절반을 별도 PDF 로 export — 사용자가 발행 시점에 옵션 선택 (V2)
