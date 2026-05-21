# paper-illustration-01 — 일러스트 · 손그림 라인 아트

종이 15하트 등급 (Phase 3-E). 사용자 사진 1장을 **흑백 핸드드로잉 라인
일러스트**로 변환(gpt-image-2)해 흰 배경 위에 단정하게 올린다.

## 무드
- 담백·정갈, 미니멀
- 손으로 그린 듯한 펜 라인 아트
- 흰 배경 위 인물 일러스트 + 인사말 중심

## 캔버스
- **1000 × 1400** (세로)
- 배경 #FFFFFF (순백)
- A5 세로 (~148×210mm) 인쇄 적합

## 레이어 순서

```
z:2  영문 타이틀 "Our Wedding"   ← title_en
z:2  일러스트 변환된 인물          ← main_illustration (auto_illustration: true)
z:2  이름·인사말·날짜·식장         ← names_ko, intro_message, ...
```

발행 시 `main_illustration` 슬롯의 사진 path 가 `invitation-illustrate`
Edge function 으로 전달돼 gpt-image-2 가 흑백 라인 일러스트 PNG 를 생성한다.
변환된 결과는 흰 배경(`fit: contain`)으로 캔버스 위에 자연스럽게 얹힌다.

## Figma 작업 가이드

### 배경 PNG (`paper-illustration-01-bg.png`)
- 전체 #FFFFFF
- (선택) 얇은 라인 프레임·구분선 등 미니멀 장식만

### 풀시안 PNG (`paper-illustration-01-thumb.png`)
- 위 배경 + placeholder 일러스트 + 모든 텍스트 보임 — 갤러리 미리보기

## 슬롯 좌표

| 슬롯 ID | 좌표 (X, Y, W, H) | z | 내용 |
|---|---|---|---|
| title_en | 80, 90, 840, 80 | 2 | "Our Wedding" serif italic |
| main_illustration | 200, 220, 600, 720 | 2 | **일러스트 변환 — auto_illustration: true** |
| names_ko | 80, 980, 840, 50 | 2 | 신랑·신부 한글 이름 |
| intro_message | 120, 1060, 760, 180 | 2 | 인사말 (AI 추천) |
| wedding_date_short | 80, 1260, 840, 36 | 2 | 결혼 날짜 |
| venue_info | 80, 1310, 840, 36 | 2 | 식장 이름 |

## 폰트 권장
- 영문 타이틀: Serif italic 48pt, #1A1A1A
- 인사말 본문: Noto Serif KR 16pt, line-height 1.9

## 변환 프롬프트 (invitation-illustrate)
- 순수 흑백 펜 라인 아트만, 그레이스케일 음영·해칭 없음
- 순백(#FFFFFF) 배경 — 원본 배경은 완전 제거
- 인물 단순화: 포즈·헤어·실루엣·표정을 최소한의 우아한 선으로
- 인물은 알아볼 수 있되 손그림 느낌 (사진 트레이싱이 아닌)
- 텍스트·프레임·서명 없음

## 가격 정책 (이 템플릿)
- `price_hearts = 15` — 종이 일러스트 등급 (gpt-image-2 1회 호출 비용 + 마진)
- 사용자가 사진을 첨부하지 않으면 변환 호출 안 됨 (가격은 차감)

## 발행 시 동작 흐름
```
1. wizard 에서 사진 1장 첨부
2. distributePhotos: image_order=1 슬롯에 사진 매핑
3. applyIllustrationToSlots: auto_illustration 슬롯 →
   invitation-illustrate 호출 (gpt-image-2) → 일러스트 path 로 덮어쓰기
4. spend_hearts(15, "invitation_publish")
5. result 페이지 → PDF 다운로드
```

## 디자인 메모
- 인물 상반신·전신이 또렷한 사진일수록 라인 아트 변환 품질이 좋음
- `fit: contain` 이라 변환된 흰 배경 PNG 가 슬롯 안에 잘려나가지 않고 들어감
