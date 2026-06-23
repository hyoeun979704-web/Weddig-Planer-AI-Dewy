---
title: Dewy 웨딩 인텔리전스 (주제·페르소나 입력)
file: wedding-intel.md
version: 1.0
snapshot_date: 2026-06-23
owner: hyoeun
purpose: "콘텐츠 파이프라인의 입력 — 무엇을(주제 §8) 누구에게(콘텐츠 페르소나 §4) 어떤 앵글로 쓸지 결정."
pairs_with: [content-distribution.md, partner-brand-profile.md]
parsing_contract: "publisher는 ```yaml 펜스만 파싱. 산문은 사람용."
curation_legend: { manual: 사람만, auto: 자동 갱신, hybrid: 자동 append+사람 확정 }
curation_map:
  "§4 content_personas": manual
  "§5 keyword_angle_map": hybrid
  "§6 voice_variation": manual
  "§8 topic_scoring": hybrid
note: >
  §ID는 content-distribution.md §9 연동이 부르는 번호와 맞춘다(§4 persona, §8 topic).
  중간 번호(§1~§3,§7)는 의도적으로 비워 content-distribution 의 동일 번호와 혼동을 피한다.
---

# Dewy 웨딩 인텔리전스 (wedding-intel.md) · v1

> **역할:** `content-distribution.md`의 **입력**. 주제 큐(§8)와 콘텐츠 페르소나(§4)를 공급한다.
> blog_core(SSOT)를 만들기 *전에* "이번엔 무슨 주제를, 어느 페르소나에게, 어떤 키워드 앵글로" 를 여기서 고른다.
> **단일 진실 분담:** 브랜드 팩트·전략 = `marketing-plan.md` / 변환·배포 = `content-distribution.md` / 주제·페르소나 = 본 문서.

---

<!-- curation: manual -->
## 4. 콘텐츠 페르소나 레지스트리 (마케팅 전용 — 앱 20모드와 별개)

> ⚠️ 이건 **콘텐츠 타겟 세그먼트**다. `src/lib/weddingPersona.ts`의 앱 20모드(분류 엔진)와 **다른 목적·다른 집합**.
> 충돌 방지 위해 **`mp_` 접두사** 고정. partner-brand-profile.md 의 `persona_fit` 은 여기 `id` 만 참조한다.

```yaml
content_personas:
  - id: mp_general
    label: 표준 종합형
    need: "흩어진 준비를 한 번에 정리 — 체크리스트·일정·예산 전반"
    channels: [naver_blog, wordpress]
    voice_angle: "신뢰감 있는 종합 가이드, '순서대로 차근차근'"
    keywords: [결혼준비앱, 결혼준비체크리스트, 결혼준비순서]
  - id: mp_budget
    label: 가성비형
    need: "비용 절감·항목 비교·현실 예산. 호구 안 되기"
    channels: [naver_blog, cafe]
    voice_angle: "냉정한 비교·실비 공개, '아낄 데/쓸 데' 구분"
    keywords: [웨딩예산관리, 스드메체크리스트, 스드메가격]
  - id: mp_small
    label: 스몰·하우스 감성형
    need: "소규모·하우스/한옥·직계 중심. 감성과 공간"
    channels: [instagram, naver_blog]
    voice_angle: "따뜻하고 사적인 무드, 공간·분위기 우선"
    keywords: [스몰웨딩, 하우스웨딩, 가족웨딩]
  - id: mp_self
    label: 셀프·DIY형
    need: "직접 준비·셀프 촬영·셀프 청첩장. 손맛"
    channels: [threads, naver_blog, youtube_shorts]
    voice_angle: "해보고 알려주는 1인칭 실전, '내가 직접 해봤어'"
    keywords: [셀프웨딩, 셀프촬영, 셀프청첩장]
  - id: mp_premium
    label: 프리미엄·디테일형
    need: "호텔·완성도·디자이너. 격식과 디테일"
    channels: [instagram, wordpress]
    voice_angle: "단정하고 큐레이티드, 디테일·완성도 강조"
    keywords: [호텔웨딩, 웨딩홀, 럭셔리웨딩]
  - id: mp_beginner
    label: 입문형
    need: "결혼 준비 0부터. 용어·순서·큰 그림"
    channels: [naver_blog, wordpress, cafe]
    voice_angle: "쉬운 말로 처음부터, '이것만 알면 됨'"
    keywords: [결혼준비순서, 결혼준비앱, 결혼준비시작]
  - id: mp_visual
    label: 트렌드·비주얼형
    need: "인스타 감성·포즈·스냅·드레스 트렌드"
    channels: [instagram, youtube_shorts, naver_blog]
    voice_angle: "비주얼 우선·저장 유도, 트렌드 큐레이션"
    keywords: [웨딩스냅, 벚꽃스냅, 웨딩드레스트렌드]
fallback: "신호 없으면 mp_general 로 폴백(빈 타겟 금지)."
```

---

<!-- curation: hybrid -->
## 5. 키워드 → 주제 → 앵글 매핑

> ★사용자 강조점★ **같은 키워드라도 페르소나별 앵글이 달라진다.** 한 주제로 blog_core 1개를 쓰되,
> content-distribution §1 transform 단계에서 페르소나별 앵글로 재구성. 출처: `naver-search-ads-keyword-map.md`(8키워드).

```yaml
keyword_angle_map:
  스몰웨딩:
    base_topic: "스몰웨딩 준비 총정리"
    angles: { mp_budget: "1천만원대 현실 비용", mp_premium: "프라이빗 호텔 스몰", mp_visual: "하우스 감성 연출", mp_small: "직계 30명 진행 동선" }
  스드메:
    base_topic: "스드메 순서·가격·체크리스트"
    angles: { mp_budget: "스드메 호구 안 되는 비교법", mp_beginner: "스드메가 뭐죠? 0부터", mp_visual: "스튜디오 컨셉별 고르기" }
  웨딩예산:
    base_topic: "웨딩 예산 짜기·양가 분담"
    angles: { mp_budget: "항목별 실비·아낄 데", mp_general: "예산 앱으로 한눈에", mp_beginner: "예산 처음 잡는 법" }
  모바일청첩장:
    base_topic: "모바일 청첩장 만들기"
    angles: { mp_self: "무료로 직접 만들기", mp_visual: "요즘 디자인 트렌드", mp_general: "정보·동선 한 번에" }
  결혼준비순서:
    base_topic: "결혼 준비 순서 (D-day 기준)"
    angles: { mp_beginner: "0부터 순서 총정리", mp_general: "예식일 넣으면 자동 정리" }
rule: "base_topic 1개 → blog_core 1개. angle 은 transform 단계 입력(채널×페르소나)."
```

---

<!-- curation: manual -->
## 6. 보이스 변주 규칙 (고정 가이드 금지)

> ★사용자 결정★ 보이스는 단일 가이드가 아니라 **3축 조합으로 매번 산출**된다.

```yaml
voice_variation:
  formula: "최종 보이스 = base_persona(me|brand, content-distribution §0) × topic_angle(§5) × partner_overlay(있으면)"
  base_persona: "content-distribution.md §0 의 me/brand 보이스가 토대."
  topic_angle: "§5 keyword_angle_map 의 페르소나 앵글이 톤·강조점을 굴절."
  partner_overlay: "제휴 콘텐츠면 partner-brand-profile.md 의 brand·voice·usp 를 Dewy 위에 얹음(§blend)."
  anti_fixed: "동일 톤·동일 인트로 반복 금지 — content-distribution §4 variation_pools 와 연동."
```

---

<!-- curation: hybrid -->
## 8. 주제·키워드 스코어링 (다음에 뭘 쓸지)

> 출력 = **랭킹된 주제 큐**. 각 항목에 1차 `persona_id` + 키워드 앵글 부착 → content-distribution §3 의 input.
> 점수 = 4신호 가중합. (가중치는 2주 가동 후 조정 — hybrid: 자동 append, 사람 확정.)

```yaml
topic_scoring:
  signals:
    seasonality:   { weight: 0.30, source: "예식 성수기(봄4~5·가을9~10) + D-day 구간 매핑(src/lib/tipCuration.ts PHASE_BOOSTS 재사용)" }
    search_demand: { weight: 0.30, source: "naver-search-ads-keyword-map.md 8키워드 + CTR/전환 리포트" }
    trend:         { weight: 0.25, source: "tip_videos 테이블 view 급상승 카테고리(최근 N일)" }
    persona_fit:   { weight: 0.15, source: "§4 페르소나 커버리지 — 최근 안 다룬 페르소나 가산(다양성)" }
  dday_phase_map:   # tipCuration PHASE_BOOSTS 와 동일 구간 — '지금 시점에 검색 많은 주제'
    "D-180+":   [웨딩홀, 예산]
    "D-120~180": [웨딩홀, 스튜디오, 드레스]
    "D-90~120":  [드레스, 메이크업, 한복]
    "D-60~90":   [메이크업, 예복, 혼수]
    "D-30~60":   [청첩장, 혼수, 허니문]
    "D-0~30":    [청첩장, 허니문, 본식준비]
  output: "상위 N개 주제 + 각 주제의 base_topic·1차 persona_id·키워드 angle. content-distribution §3 input."
  cadence: "주 1회 재스코어링(주간 워크플로 — 다음 라운드 구현)."
```

---

## 한계 · 갱신
- 본 문서는 **입력 스펙**이다 — 스코어링 자동화 코드는 다음 라운드(§8을 코드로). 지금은 사람이 §8 기준으로 주제 선택.
- `tip_videos` 트렌드·검색 전환 데이터는 **GA4/측정 연동 후** 정확(현재 측정 미배포 — `analytics-events-spec.md`).
- 마케팅 페르소나(mp_*)는 2주 운영 후 실제 반응 보고 통폐합/추가.

## CHANGELOG
- **v1.0 (2026-06-23):** 신규 — content-distribution.md 가 참조하던 미존재 입력 해소.
  §4 마케팅 페르소나 7종 신설 · §5 키워드 앵글 맵 · §6 보이스 변주 공식 · §8 주제 스코어링 모델.
