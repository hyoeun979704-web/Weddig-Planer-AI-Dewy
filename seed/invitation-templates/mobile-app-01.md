# mobile-app-01 — 모바일 · 앱형 세로 스크롤

레퍼런스: "Save the Date" 풀세트 — 표지·인사말·갤러리·캘린더·식순·오시는길·
참석안내를 세로 블록으로 쌓은 앱/웹 초대장 스타일.

## 무드
- 모바일 트렌드 "앱과 유사한" 비주얼. ROMANTIC, 수채 파스텔.
- 섹션 라벨(Invitation / Gallery / Timing / Location 등)은 배경 PNG.

## ★ 엔진 경계 (중요)
현재 모바일 뷰어는 **정적 단일 캔버스(이미지 1장)** 다. 따라서:
- ✅ 표지·인사말·갤러리·캘린더·약도 = 슬롯으로 정상 렌더.
- ⚠️(a) 식순(Timing) = `user_data` field 없음 → placeholder, 사용자가 스튜디오 입력.
- 🚧 RSVP 폼·방명록·좋아요·sticky 버튼·오프닝 애니메이션 = **정적 캔버스 불가.**
  → 본 템플릿은 "참석 회신은 QR/카카오톡으로" **정적 안내 + QR** 로 대체.
  진짜 인터랙션이 필요하면 `docs/invitation-app-style-engine.md` 의 확장 필요.
- 드레스코드 컬러 칩은 **배경 PNG** 로 그림(슬롯 색은 디자인 타임 고정).

## 캔버스
- **1080 × 3600** (세로 긴 스크롤). bg `#FBFAF8`.
- 표지 사진 영역 0~1350. 이후 섹션이 세로로 이어짐.

## 배경 PNG (`mobile-app-01-bg.png`) — 섹션 골격 전담
- 섹션 구분선/카드 배경 + 라벨 텍스트("Invitation","Gallery","Timing","Dress code",
  "Location") + 드레스코드 **컬러 칩 4개** + 수채 파스텔 텍스처.

## 슬롯 좌표 (layout JSON)
| 슬롯 ID | 좌표 (X,Y,W,H) | 내용 | 등급 |
|---|---|---|---|
| cover_photo | 0,0,1080,1350 | 표지 사진 (image_order 1) | ✅ |
| cover_title | 80,120,920,60 | "SAVE THE DATE" (locked) | ✅ |
| cover_names | 80,1130,920,70 | 이름 (placeholder, script) | ✅ |
| cover_date | 80,1230,920,44 | wedding_date | ✅ |
| intro_message | 100,1480,880,280 | 인사말 (AI) | ✅ |
| groom_parents / bride_parents | 100,1800/1844 | 혼주 | ✅ |
| gallery_1 | 90,1960,430,540 | 갤러리 사진 (image_order 2) | ✅ |
| gallery_2 | 560,1960,430,540 | 갤러리 사진 (image_order 3) | ✅ |
| wedding_calendar | 240,2580,600,300 | 캘린더 | ✅ |
| timing | 140,2960,800,200 | 식순 (placeholder) | ⚠️(a) |
| venue_map | 140,3220,800,240 | 약도 (운영자 PNG) | ✅ |
| venue_address | 100,3480,880,60 | venue_address | ✅ |
| rsvp_notice | 100,3540,760,40 | 참석 안내 (locked, 🚧 대체) | 🚧→정적 |
| share_qr | 880,3500,100,100 | 공유/회신 QR | ✅ |

## 사진
- 총 3장(표지 1 + 갤러리 2). image_order 1/2/3 → 갤러리 "사진 3장" 표시.

## 메모
- price_hearts = 0. 텍스트 가독성 위해 표지 오버레이 텍스트는 흰색 + 배경 PNG 에
  상단/하단 그라데이션 오버레이 권장.
</content>
