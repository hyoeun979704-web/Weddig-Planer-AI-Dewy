---
name: marketing-draft
description: Dewy 마케팅 콘텐츠 배포 실행기 — 주제 1개를 단일 소스(blog_core)로 쓰고, 화자(me/대표)×독자(mp_*)×변형풀로 6채널(쓰레드·인스타·네이버블로그·워드프레스·유튜브숏폼·카페) 산출물로 재구성해 **노션에 적재**한다. docs/content-distribution.md 스펙을 따른다. Use whenever the user asks to 마케팅 초안/콘텐츠 생성·배포·노션 적재(블로그·카페·숏폼·카드뉴스·쓰레드 등).
---

# Marketing Content Pipeline → Notion (content-distribution 실행기)

`docs/content-distribution.md`(SSOT→Transform→6채널) 스펙을 그대로 돌린다: **주제 1개 → blog_core(단일 소스) → 화자×독자×변형으로 6채널 재구성 → 노션 적재.** "복붙이 아니라 재구성"이 목적.

## Inputs & grounding (반드시 먼저 읽기)
- **`docs/content-distribution.md`** — §0 화자(me/대표)·§1 transforms·§2 채널 매트릭스·§4 variation_pools·§6 transform_mandate·§7 제휴·§8 법적. (파이프라인 본체)
- **`docs/wedding-intel.md`** — §4 독자 타겟(mp_*)·§5 키워드→앵글·§6 보이스 변주·§8 주제 스코어링. (주제·독자·앵글)
- **`docs/marketing-plan.md`** — 포지셔닝·3대 메시지축·팩트(앱명 Dewy, ₩4,900/월+하트, 기능). **모르는 수치·주장 지어내기 금지.**
- (제휴 콘텐츠면) **`docs/partner-brand-profile.md`** + 해당 업체 brand-profile(§7) — 업체 오버레이.

## Workflow

### 1. 주제·독자·앵글 선택
- 주제: 사용자가 주면 그걸로. 없으면 **wedding-intel §8 스코어링 기준**(시즌/D-day·검색키워드·트렌드)으로 1개 제안 후 확인.
- 1차 **독자**(`mp_*`, wedding-intel §4) + **키워드 앵글**(§5) 결정. (예: 주제"스드메 순서" × mp_budget → "호구 안 되는 비교" 앵글)

### 2. blog_core 작성 (SINGLE SOURCE OF TRUTH)
- 주제 본체 1개를 **`docs/blog-core/<slug>.md`** 에 작성(git 추적 SSOT, content-distribution §1 store). 정보·큐레이션 충실하게. 이게 모든 텍스트 산출물의 원천.

### 3. 6채널 재구성 (transform) — 화자×독자×변형
각 산출물을 `/tmp/dewy-drafts/` 에 개별 .md(H1 제목 = 노션 페이지명, 채널·화자 라벨 포함)로. **blog_core 를 재구성**(제목·도입·구조·예시 실질적으로 다르게 — §6 min_transform):

| 산출물 | 화자(§0) | 채널 | shape |
|---|---|---|---|
| `threads_intro` | **me**(반말·경험담) | 쓰레드 | 짧은 소개 + 다음편 유도 |
| `naver_post` | **me** | 네이버블로그 | 상세 큐레이션·체크리스트 (네이버 SEO) |
| `ig_carousel` | **대표**(존댓말·큐레이터) | 인스타 | 카드뉴스(시각 분해, 저장 유도) |
| `wp_aio` | **대표** | 워드프레스 | AIO 질문-답·구조화 (구글 노출) |
| `cafe_post` | **대표** | 카페 | 커뮤니티 톤 재서술 (비홍보) |
| `clip_brief` | **대표** | 유튜브숏폼·인스타릴스·네이버클립(재사용) | 1초 훅 + 컷 구성(촬영 브리프) |

규칙(반드시):
- **화자 매핑 고정**: 공식계정(인스타·워드프레스·유튜브·카페)=대표, 개인(쓰레드·네이버)=me. 보이스 = `화자 × 독자앵글 × (제휴면)파트너오버레이`(content-distribution §0 voice_resolution).
- **ANTI-TEMPLATE**(§4): hook_style·structure 를 variation_pools 에서 **매번 다르게** 골라라. 상투적 인트로("안녕하세요 신부님")·동일 시작문장 금지.
- **제휴면**(§7·§8): 업체 brand·usp 반영 + **"제휴/유료광고 포함" 표기 필수**, usage_rights 범위 자료만.

### 4. 노션 적재 (토픽 트리)
blog_core 를 **토픽 페이지**로 먼저 발행하고, 6채널 산출물을 **그 페이지 밑**에 적재(트리 구성):
```bash
# (1) blog_core → 토픽 페이지. stderr 의 PAGE_ID 캡처
python3 .claude/skills/marketing-draft/scripts/notion_publish.py --file docs/blog-core/<slug>.md
#   stdout=페이지 URL, stderr="PAGE_ID:<id>" → <id> 를 아래 --parent 로

# (2) 각 채널 산출물 → 토픽 페이지 하위
python3 .claude/skills/marketing-draft/scripts/notion_publish.py --file /tmp/dewy-drafts/threads-<slug>.md --parent <PAGE_ID>
#   ... naver / ig / wp / cafe / clip 동일
```
- 토큰/부모는 env `NOTION_TOKEN`·`NOTION_PARENT_PAGE_ID`(아래 Setup). `--parent` 명시 시 그 페이지 밑에 생성.
- 발행 전 **`--dry-run`** 으로 블록 변환 확인 권장.
- 끝나면 **토픽 URL + 6채널 URL 트리**를 사용자에게 보고.

> 이 스킬은 **노션 적재까지**가 범위다(채널 자동발행 API 없음 — 사람이 노션에서 검수 후 각 채널에 게시). 다음 단계(agent_outputs 큐·스케줄)는 content-distribution §10.

## Setup (노션 자격증명 — 최초 1회)
환경변수 없으면 스크립트가 에러로 멈춘다:
1. https://www.notion.so/my-integrations → New integration → Internal Integration Secret → `NOTION_TOKEN`.
2. 부모 페이지 만들고 우측 `•••` → Connections → 위 integration 연결.
3. 부모 페이지 URL 끝 32자 해시 = `NOTION_PARENT_PAGE_ID`(하이픈 무관).
4. 두 값을 환경변수로 등록. **절대 레포에 커밋 금지.**

검증: `python3 .claude/skills/marketing-draft/scripts/notion_publish.py --file docs/content-distribution.md --dry-run` 가 정상이면 변환 OK.

## Notes
- 스크립트는 표준 라이브러리만(설치 불필요). Markdown 헤딩/리스트/체크박스/인용/구분선/코드/표·**굵게**/`코드` 지원, 100블록 초과 자동 분할.
- **카페**는 노골적 홍보 금지(신뢰형 톤) · 자작 후기·다중계정 금지.
- 단순 단건 초안만 원하면 위 §3 표의 해당 1종만 만들어 §4로 발행해도 된다(전체 6채널 강제 아님).
- 옛 4종(블로그/카페/숏폼/광고) 포맷 상세는 `reference/draft-formats.md` 참고.
