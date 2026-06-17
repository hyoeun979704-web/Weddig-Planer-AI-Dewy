# 유튜브 광고 (UAC / 인스트림 + 쇼츠, 15초)

> 선행: `README.md` §1~§3. 소액 집행 → 목적 = **소재·타겟별 CPI 데이터 확보**(marketing-plan §4).

## 1. 텍스트 자산 (UAC 입력용)
**헤드라인 (30자 이내 × 3)**
- `결혼준비, AI랑 둘이 끝내기`
- `드레스샵 가기 전에 미리보기`
- `Dewy 1호 테스터 모집 중`

**설명 (90자 이내 × 2)**
- `체크리스트·예산·스드메·청첩장 한 앱에. 방구석 드레스 투어로 발품 전에 미리보기. 지금 무료로 시작.`
- `안드로이드 테스터 혜택: 출시 후 구독 2개월 연장 + 1호 뱃지. SNS 후기·꽃 머지 이벤트로 하트·부케 할인권까지.`

**CTA:** `지금 무료로 시작` → `dewy-wedding.com`(랜딩) 또는 플레이스토어 딥링크. 링크엔 README §4 UTM 부착(`utm_source=youtube`, `utm_content=youtube`).

## 2. 15초 영상 콘티 (첫 5초에 핵심 + 브랜드명)
| 초 | 화면 | 자막/내레이션 |
|---|---|---|
| 0~1 | 내 사진 → 드레스가 입혀지는 전환 | "드레스샵 가기 전에, 우리 사진으로" |
| 2~4 | 드레스 5종 슬라이드 + 청첩장 완성 컷 | "드레스·메이크업·청첩장까지 AI가" |
| 5~10 | 앱 홈 + 이벤트 배너(베타/부케) | "지금 Dewy 1호 테스터 모집 중" |
| 11~15 | 로고(그라데이션 하트) + CTA | "무료로 시작 · Dewy" |

> 쇼츠 노출용은 동일 영상을 **9:16로 크롭**해 동시 업로드(추가 제작비 0).

## 3. 타겟팅 메모
- 한국 / 연령 25~40 / 성별 전체
- 라이프이벤트 **"약혼·결혼 예정"**(핵심)
- 맞춤 잠재고객: "결혼 준비"·"웨딩홀"·"스드메"·"청첩장" 관심·검색
- 예산: 일 1.5~2만원 분할, 48h 후 승자 소재 집중. KPI = CPI·가입 전환·소재별 CTR.

## 4. A/B 변형 (소재 3종, 같은 메시지 다른 후킹)
- ①드레스 투어 임팩트(위 콘티) ②AI 챗봇 "이것까지 다 해줘?" ③청첩장 0원 제작 타임랩스.

## 5. 🎨 이미지 생성 프롬프트 (썸네일/엔드카드, 16:9)
```
A 16:9 video end-card for a wedding app ad. Centered glossy 3D gradient heart logo
(pink-coral-blue), blush-pink to ivory gradient background, soft bokeh, a faint bridal
bouquet and dress silhouette on the sides, sparkles. Empty lower-third band for a Korean
CTA. No text, no letters, no numbers, no watermark. Clean, premium, soft light. --ar 16:9
```

## 6. 체크
- [ ] 헤드라인 30자/설명 90자 이내 · 첫 5초에 베네핏+브랜드
- [ ] 테스터 혜택 §2와 일치(안드로이드 한정 명시)
- [ ] 쇼츠용 9:16 크롭 버전 별도 export
