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
  # 화자(author) = 효은의 두 얼굴(같은 사람, 다른 역할). "누구로서 쓰나".
  me:      # 예비신부+개발자 효은 — 개인 계정
    role: "예비신부이자 Dewy 만드는 개발자(나 자신)"
    voice: '1인칭 경험("내가 직접 알아봤어"). 어투는 채널이 결정 — 쓰레드=반말·친근 / 네이버 블로그=친근 존댓말(해요체)'
    register_rule: "화자(me)는 동일하되 어투 격식은 채널이 결정. 쓰레드=반말(짧은 개인 글), 네이버 블로그=해요체(정보글 규범 — 1인칭·경험담 유지, 어미만 ~했어요/~예요). 반말을 네이버에 쓰지 말 것."
    identity: 'build-in-public — 결혼 준비하며 앱도 만드는 진짜 사람'
    says: "준비하다 알게 된 것·삽질·후기 + 레포 개발일지"
    avoid: '광고 톤, 영업 CTA 남발'
    channels: [threads, naver_blog]
  brand:   # 업체 대표로서의 나(효은) — 브랜드 공식계정
    role: "Dewy 대표로서의 나(효은). 익명 브랜드가 아니라 '내가 운영하는 서비스'"
    voice: '존댓말, 따뜻하지만 단정. "당신에게 맞는" 개인화 큐레이터'
    identity: '진짜 사람(개발자 신부)이 만든 서비스의 대표 — 신뢰·전문'
    says: "큐레이션·가이드·업체 소개·제품 가치(개인 사담은 절제)"
    avoid: '과한 영업, 일반론 방송, 익명 대기업 톤'
    channels: [instagram, wordpress, youtube_shorts, cafe]
  coherence_rule: "둘 다 효은. me 의 빌딩 스토리(진짜 사람이 만든다)가 brand(대표)의 신뢰로 환류 — '내가 만든 앱이라 압니다'. 한 우주, 다른 모자."

  # 전 화자·전 채널 공통 톤 하한선(어기면 §4 가드가 재생성·감점). 캐주얼은 허용하되 '과도함·공격성'은 금지.
  # (실데이터 회귀: threads "썩은 웨딩 업계를 뒤집는"[공격], naver 슬랭·군더더기 도입부가 통과했었음)
  tone_floor:
    ban_aggressive: "공격적·대결적 표현 금지(예 '썩은 업계 뒤집기/갈아엎기', 경쟁사·업계 비방, 공포마케팅). 톤은 다정·응원·안심."
    limit_casual: "me 캐주얼은 OK지만 과한 슬랭(빡세게/찐 정보/레전드)·이모지 3개+·느낌표 남발·ㅋㅋ/ㅠㅠ 도배는 금지(절제)."
    no_filler: "상투 인트로('안녕하세요 …입니다','오늘은 … 알려드릴게요')·군더더기 강조어로 채우지 말 것. 구체 정보·숫자로 승부."

  # 보이스는 단일 고정 가이드가 아니라 3축 조합으로 매번 산출(고정 톤 금지).
  voice_resolution:
    formula: "최종 보이스 = 화자(me|brand) × topic_angle(wedding-intel §5 독자 앵글) × partner_overlay(있으면 §7)"
    source: "wedding-intel.md §6 voice_variation 이 단일 소스. 같은 화자라도 주제 키워드·독자·제휴업체별로 톤·강조점이 굴절."
```

### §0 보이스 샘플 (톤 확정용 — 같은 주제 '스드메 순서'를 화자×채널별로)

> ※ 톤 레퍼런스(복제용 템플릿 아님 — §4 variation_pools 로 매번 변주). 사용자 검수·확정 대상.

```yaml
voice_samples:
  me_threads:   "스드메 순서 나도 헷갈렸는데, 직접 다녀보고 정리함 👉 스→드→메가 국룰인 이유"
  me_naver:     "스드메 처음이라 막막했는데, 예약 순서·실패담·체크포인트 다 정리해뒀어요 (해요체 — 반말 아님)"
  brand_instagram: "스드메, 뭐부터? [카드 1/5] 스튜디오 먼저인 이유 — 저장해두고 보세요"
  brand_wordpress: "스드메 준비 순서: 스튜디오·드레스·메이크업을 언제, 왜 그 순서로 예약할까요?"
  brand_youtube:   "(0:01 훅) 스드메 순서 틀리면 돈 더 나가요 — 30초 정리"
```

---

<!-- curation: manual -->
## 1. 콘텐츠 모델 — Single Source of Truth → Transform

```yaml
content_model:
  principle: "1 소스 · N 변환기. 복붙(X) ≠ 재구성(O). 재구성이 곧 시스템 목적."

  ssot:                       # 단일 진실의 원천 (텍스트 채널의 유일 원천)
    blog_core: "주제별 정보·큐레이션 본체 1개. 모든 텍스트 산출물의 소스."
    store: "docs/blog-core/<topic-slug>.md (git 추적, 사람 검수 가능한 텍스트 SSOT). 주제는 wedding-intel §8 큐에서 선택."
    rationale: "git 텍스트라 버전·검수·재사용이 명확. (대안 Notion DB 는 검수 UI 는 좋으나 git 이력 약함 → 텍스트 우선.)"

  reusable_media:             # 1개 만들어 여러 채널 재사용
    clip: "짧은 컷전환 영상 1개 → 인스타 릴스 · 유튜브 숏폼 · 네이버 클립 (3채널 재사용)"

  separate_origin:            # blog_core와 별개의 원천
    dev_log: "레포 커밋 기반 개발일지(쓰레드 전용)"

  transforms:                 # ↓ 전부 blog_core를 '재구성'한 산출물 (별도 소스 아님)
    threads_intro: { from: blog_core, persona: me,    shape: 짧은 소개+다음편 유도 }
    ig_carousel:   { from: blog_core, persona: brand, shape: 카드뉴스(시각 분해) }
    naver_post:    { from: blog_core, persona: me,    shape: 상세 큐레이션, register: 해요체 }  # me이지만 네이버는 존댓말(§0 register_rule)
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
  hook_styles: [질문형, 통계·숫자, 실패·후회담, "나/내가 경험", 비포애프터, 체크리스트, 의외의 사실, 시즌 긴급]
  structures:  [리스트형, 스토리형, Q&A, 단일 딥다이브, 페르소나 대조, 미니가이드, 큐레이션 모음]
  cta_modes:   [정보만, 다음편 유도, 저장 유도, 댓글 질문, 부드러운 앱 언급]
  rotation_rule: "동일 채널 최근 5개와 hook+structure 조합 겹치면 재선택"
  guard: "상투적 인트로·동일 문장 시작 감지 시 재생성"
  # 운영 판정 기준(실행기 구현 시):
  guard_heuristics:
    cliché_intro: "'안녕하세요 신부님' '안녕하세요 …입니다' '오늘은 … 알려드릴게요' '결혼 준비 어떻게 하세요?' 등 사전 금지 인트로 매칭 시 재생성."
    tone_floor_guard: "§0 tone_floor 위반(공격적·대결적 표현·과한 슬랭/이모지/느낌표·ㅋㅋㅠㅠ 도배) 매칭 시 재생성. 룰 기준은 agent-office/deslop.py 와 동일(공통 단일 기준)."
    same_prefix: "최근 5개와 첫 문장 앞 12자 동일/유사(정규화 후 일치) 시 재생성."
    judge: "위 룰 통과 후에도 LLM-as-judge 가 '상투적' 플래그하면 1회 재생성(무한루프 방지 1회 한정)."
  rotation_state: "채널×(hook,structure,첫문장prefix) 최근 이력 저장 필요 — 실행기 단계의 소형 상태 테이블(이번 문서 범위 밖)."
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
    # 채우는 법: Drive 에서 제휴업체 루트 폴더 생성 → 공유 → URL 의 .../folders/<ID> 의 <ID> 를 위에 기입.
    # 인증·업로드는 기존 supabase/functions/_shared/googleDrive.ts(OAuth + uploadToFolder) 재사용.
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

## 9. 연동 — 문서 역할 분담 (중복 금지)

| 문서 | 역할(단일 진실) | 본 파이프라인과의 관계 |
|---|---|---|
| `marketing-plan.md` | **전략·포지셔닝·브랜드 팩트**(앱명·가격·기능·3대 메시지 축·UTM) | blog_core 작성 시 사실/메시지 근거 |
| `wedding-intel.md` | **주제 큐(§8) + 콘텐츠 페르소나(§4) + 키워드 앵글(§5) + 보이스 변주(§6)** | 본 매트릭스의 **input** |
| **`content-distribution.md`(본)** | **변환·배포 파이프라인**(SSOT→transform→6채널) | wedding-intel 입력을 받아 채널 산출물로 |
| `partner-brand-profile.md` | **제휴업체 브랜드 오버레이**(업체별 1파일, GDrive) | §7 partner_content 에서 로드 |

- **주제·우선순위:** `wedding-intel.md` §8 → 본 매트릭스 input.
- **페르소나 매칭:** `wedding-intel.md` §4(`mp_*` persona_id) → partner-brand-profile `persona_fit`.
- **제휴 브랜딩:** `partner-brand-profile.md`(GDrive) → §7 partner_content.
- **검수:** 발행 전 1회(데일리 자습 2h) → §10 의 `/admin/agent-outputs` 큐.

## 10. 실행기 설계 (executor_design — 다음 라운드 구현 청사진)

> 본 spec 을 **돌리는 주체**. 채널 API(네이버·유튜브·메타) 가 없어 **생성→스테이징→사람 게시**(HITL).
> 코드는 이번 범위 밖. 재사용 자산을 명시해 다음 라운드가 바로 착수하게 한다.

```yaml
executor_design:
  pipeline:
    1_parse:    "본 문서 + wedding-intel 의 yaml 펜스만 파싱(parsing_contract)."
    2_pick:     "wedding-intel §8 topic_scoring 상위에서 주제 1개 선택(+1차 persona_id·키워드 angle)."
    3_blog_core: "docs/blog-core/<slug>.md 작성/로드(SSOT)."
    4_vary:      "§4 variation_pools 에서 hook·structure 추첨 + rotation_state 로 최근5 중복 회피."
    5_transform: "§1 transforms 5종(threads_intro·ig_carousel·naver_post·wp_aio·cafe_post) + clip 브리프 생성. 보이스=§voice_resolution."
    6_stage:    "노션 + agent_outputs 큐 적재(status=pending)."
    7_review:   "/admin/agent-outputs 에서 사람 검수 → 승인."
    8_publish:  "사람이 각 채널에 게시(자동발행 채널 API 없음). 게시 URL 기록."
  reuse:
    generation: ".claude/skills/marketing-draft/ (생성 + Notion 발행)"
    queue:      "agent-office/supabase_bridge.py (push_output/fetch_approved → agent_outputs)"
    review_ui:  "/admin/agent-outputs (기존 라우트)"
    partner_assets: "supabase/functions/_shared/googleDrive.ts (OAuth + uploadToFolder)"
    schedule:   ".github/workflows/weekly-audit.yml (주간 cron 패턴)"
  hitl: "네이버/유튜브/메타 = API 부재 → 사람 게시. 노션·드라이브만 자동."
```

## CHANGELOG
- **v2.1 (2026-06-23):** 공백 보강 — blog_core 저장위치(§1 store)·voice_resolution(§0)·guard 운영기준(§4)·
  gdrive 기입절차(§7)·문서 역할분담표 + executor_design(§9·§10) 신설. wedding-intel.md 신규 연결.
- **v2.0 (2026-06-23):** Single Source of Truth → Transform 모델로 §1·§3·§6 정돈(복붙 금지 → 재구성 의무) / §7 제휴업체 콘텐츠 GDrive 연동 신설 / partner-brand-profile.md 연결.
- **v1.0 (2026-06-23):** 채널 매트릭스·원자 모델·변형 풀·SEO 가드 초기 버전. (같은 날 v1→v2 정돈.)

> **한계:** 보이스는 §0 voice_resolution(persona×주제앵글×파트너) 으로 산출 — 단일 고정 가이드 아님.
> GDrive folder_id는 폴더 공유 후 §7 절차로 기입. cadence·페르소나·스코어링 가중치는 2주 가동 후 조정.
> 채널 자동발행 API 부재 → §10 HITL(사람 게시). 실행기 코드는 다음 라운드.
