---
title: Dewy 콘텐츠 배포 매트릭스
file: content-distribution.md
version: 2.0
snapshot_date: 2026-06-23
owner: hyoeun
purpose: "단일 소스(blog_core) 1개 → 플랫폼별 맞춤 재구성(transform) → 6채널 배포"
pairs_with: [wedding-intel.md, partner-brand-profile.md]
core_principle: "Single Source of Truth → Platform-Native Transform (복붙 X, 재구성 O)"
parsing_contract: "publisher는 ```yaml 펜스만 파싱. 산문은 사람용."
ANTI_TEMPLATE_RULE: >
  ★최우선★ 고정 템플릿 금지. spec은 '의도·구조 가이드'이지 채워넣는 양식이 아니다.
  매 게시마다 §4 variation_pools에서 훅·구조를 로테이션. 최근 N개와 동일 구조면 재추첨.
curation_legend: { manual: 사람만, auto: 자동 갱신, hybrid: 자동 append+사람 확정 }
curation_map:
  "§0 personas": manual
  "§1 content_model": manual
  "§2 channel_matrix": manual
  "§3 flow": manual
  "§4 variation_pools": hybrid
  "§5 channel_playbook": manual
  "§6 transform_mandate": manual
  "§7 partner_content": manual
  "§8 legal": manual
---

# Dewy 콘텐츠 배포 매트릭스 (content-distribution.md) · v2

> **시스템 목적:** `blog_core` 1개를 만들면 → 채널별 *페르소나·포맷·구조로 재구성* → 6채널 배포.
> 소스는 1개(Single Source of Truth), 변환기는 N개. **복붙이 아니라 재구성이 목적이다.**
> **두 페르소나:** `me`(개인·효은) / `brand`(Dewy) — 분리 운영하되 "같은 우주".

---

<!-- curation: manual -->
## 0. 페르소나 보이스 맵

```yaml
personas:
  me:      # 개인(효은). 채널: threads, naver_blog
    voice: 반말·친근, 1인칭("내가 직접 알아봤어")
    identity: "AI 웨딩앱 만드는 개발자 신부"(build-in-public)
    avoid: 광고 톤, 영업 CTA 남발
  brand:   # Dewy. 채널: instagram, wordpress, youtube_shorts, cafe
    voice: 존댓말, 따뜻하지만 단정. "당신에게 맞는" 개인화 큐레이터
    avoid: 과한 영업, 일반론 방송
  coherence_rule: "개인의 빌딩 스토리 → 브랜드의 '진짜 사람이 만든다' 신뢰로 환류. 기존 Dewy/2MOOD 보이스와 동기화."
```

---

<!-- curation: manual -->
## 1. 콘텐츠 모델 — Single Source of Truth → Transform

```yaml
content_model:
  principle: "1 소스 · N 변환기. 복붙(X) ≠ 재구성(O). 재구성이 곧 시스템 목적."

  ssot:                       # 단일 진실의 원천 (텍스트 채널의 유일 원천)
    blog_core: "주제별 정보·큐레이션 본체 1개. 모든 텍스트 산출물의 소스."

  reusable_media:             # 1개 만들어 여러 채널 재사용
    clip: "짧은 컷전환 영상 1개 → 인스타 릴스 · 유튜브 숏폼 · 네이버 클립 (3채널 재사용)"

  separate_origin:            # blog_core와 별개의 원천
    dev_log: "레포 커밋 기반 개발일지(쓰레드 전용)"

  transforms:                 # ↓ 전부 blog_core를 '재구성'한 산출물 (별도 소스 아님)
    threads_intro: { from: blog_core, persona: me,    shape: 짧은 소개+다음편 유도 }
    ig_carousel:   { from: blog_core, persona: brand, shape: 카드뉴스(시각 분해) }
    naver_post:    { from: blog_core, persona: me,    shape: 상세 큐레이션 }
    wp_aio:        { from: blog_core, persona: brand, shape: AIO 질문-답·구조화 }
    cafe_post:     { from: blog_core, persona: brand, shape: 커뮤니티 톤 재서술 }
```

---

<!-- curation: manual -->
## 2. 채널 배포 매트릭스

> 각 채널 산출물 = `transform_of: blog_core`(또는 clip/dev_log). 같은 소스, 다른 형태.

```yaml
channels:
  threads:        { persona: me,    renders: [dev_log, threads_intro], cadence: 매일 }
  instagram:      { persona: brand, renders: [ig_carousel, clip(릴스)], cadence: "카드 매일급 / 릴스 2일1" }
  naver_blog:     { persona: me,    renders: [naver_post, clip],        cadence: 주2~3, seo: naver_native }
  wordpress:      { persona: brand, renders: [wp_aio],                  cadence: 주2~3, seo: google_aio }
  youtube_shorts: { persona: brand, renders: [clip],                    cadence: 2일1 }
  cafe:           { persona: brand, renders: [cafe_post],               cadence: 주2~3 }
```

---

<!-- curation: manual -->
## 3. 1주제 → 단일 소스 → 변환 → 배포

```
[주제: wedding-intel §8 스코어링 상위]
        ▼
  ┌─ blog_core (SINGLE SOURCE OF TRUTH) ─┐
  │            재구성(persona×format)     │
  ├─► threads_intro ─► 쓰레드 (me)
  ├─► ig_carousel ───► 인스타 (brand)
  ├─► naver_post ────► 네이버 블로그 (me, naver SEO)
  ├─► wp_aio ────────► 워드프레스 (brand, google AIO)
  └─► cafe_post ─────► 카페 (brand)
  clip (1개) ─────────► 인스타 릴스 · 유튜브 숏폼 · 네이버 클립
  dev_log (별도 원천) ─► 쓰레드 (me)
        ▼
[게시 전 검수 1회] → 발행
```

---

<!-- curation: hybrid -->
## 4. ANTI-TEMPLATE — 변형 풀

> 같은 소스를 매번 다른 형태로. 자동화는 게시마다 풀에서 훅·구조를 순환 선택.

```yaml
variation_pools:
  hook_styles: [질문형, 통계·숫자, 실패·후회담, "나/내가" 경험, 비포애프터, 체크리스트, 의외의 사실, 시즌 긴급]
  structures:  [리스트형, 스토리형, Q&A, 단일 딥다이브, 페르소나 대조, 미니가이드, 큐레이션 모음]
  cta_modes:   [정보만, 다음편 유도, 저장 유도, 댓글 질문, 부드러운 앱 언급]
  rotation_rule: "동일 채널 최근 5개와 hook+structure 조합 겹치면 재선택"
  guard: "상투적 인트로·동일 문장 시작 감지 시 재생성"
```

---

<!-- curation: manual -->
## 5. 채널별 의도 (※벚꽃 예시는 '참고용 1회 보기' — 양식 복제 금지)

- **쓰레드(me):** 친근·도움 + 레포 개발일지. "오늘 4월 벚꽃스냅 자료 모아봤어 — 예비쀼들 참고!" / "Dewy ○○ 기능 커밋, 삽질 후기".
- **인스타(brand):** 캐러셀(포즈/장소/의상 中 1) + 릴스(clip). 시각 우선·저장 유도.
- **네이버(me):** 디테일 큐레이션(명소·작가·체크리스트) + 클립. 네이버 검색 최적.
- **워드프레스(brand):** AIO — 질문-답·스키마·"○○에게 맞는" 각도. 구글 노출.
- **유튜브 숏폼(brand):** clip 동일. 첫 1초 훅.
- **카페(brand):** 정보의 커뮤니티 톤 재서술.

> 같은 주제(벚꽃)도 채널마다 훅·구조가 *다름*에 주목. 이 예시 자체를 틀로 재사용 금지.

---

<!-- curation: manual -->
## 6. Transform Mandate (구 '중복 가드' → 목적형으로 정정)

```yaml
transform_mandate:
  goal: "동일 소스(blog_core)를 채널별 persona×format×structure로 재구성한다 = 시스템 목적."
  safety_byproduct: "재구성이 충분하면 검색엔진 중복 페널티도 자연 회피(목적의 부산물일 뿐)."
  min_transform: "복붙 방지 최소선 — 제목·도입·구조·예시가 실질적으로 달라야."
  channel_separation:
    naver_post: { engine: naver,  voice: me }      # 네이버 자체 SEO
    wp_aio:     { engine: google, voice: brand }   # 구글 AIO — 분리 설계
  canonical: "필요 시 변형물에 원본(blog_core 게시처) 출처/canonical 링크."
```

---

<!-- curation: manual -->
## 7. 제휴업체 콘텐츠 연동 (Google Drive)

```yaml
partner_content:
  asset_source:
    gdrive_root: "<제휴업체 자료 폴더 — 공유 후 folder_id 기입>"
    structure: "gdrive_root/{partner_id}/  ← brand-profile.md + 사진/영상/로고"
    partner_id_format: "WH-SEL-001 (카테고리-지역-순번)"
  on_partner_feature:        # 제휴업체 소개 콘텐츠 생성 시
    - "해당 업체 폴더의 brand-profile.md(yaml 헤더) 로드"
    - "Dewy 보이스를 베이스로, 업체 brand.colors·voice·usp '반영'"
    - "persona_fit(persona_id)로 어떤 신부에게 맞는지 큐레이션 (wedding-intel §4)"
    - "assets.usage_rights 확인 후 제공 자료만 사용"
    - "제휴 표기 필수 (§8)"
  blend_rule: "Dewy 정체성이 베이스, 업체 브랜딩은 '존중·반영'. 업체색을 Dewy 위에 얹되 충돌 금지."
```

---

<!-- curation: manual -->
## 8. 법적 · 표기

```yaml
legal:
  disclosure: "제휴 무료/유료 콘텐츠는 채널 불문 '유료광고 포함'/'제휴' 표기(표시광고법)."
  copyright: "외부 매체 본문 복제 금지(메타·재해석만). 업체 제공 자료는 usage_rights 범위 내에서만."
  per_channel: "카페·블로그 동일 적용. 투명 표기가 진정성 브랜드 신뢰↑."
```

## 9. 연동
- **주제·우선순위:** `wedding-intel.md` §8 → 본 매트릭스 input.
- **페르소나 매칭:** `wedding-intel.md` §4(persona_id).
- **제휴 브랜딩:** `partner-brand-profile.md`(GDrive) → §7 partner_content.
- **검수:** 발행 전 1회(데일리 자습 2h).

## CHANGELOG
- **v2.0 (2026-06-23):** Single Source of Truth → Transform 모델로 §1·§3·§6 정돈(복붙 금지 → 재구성 의무) / §7 제휴업체 콘텐츠 GDrive 연동 신설 / partner-brand-profile.md 연결.
- **v1.0 (2026-06-23):** 채널 매트릭스·원자 모델·변형 풀·SEO 가드 초기 버전.

> **한계:** brand 보이스는 기존 Dewy/2MOOD 가이드 동기화 시 정확. GDrive folder_id는 폴더 공유 후 기입. cadence는 2주 가동 후 조정.
