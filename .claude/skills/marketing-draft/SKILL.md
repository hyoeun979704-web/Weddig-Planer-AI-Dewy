---
name: marketing-draft
description: Generate Korean marketing draft content for the Dewy wedding app (네이버 블로그 글, 카페 글, 숏폼/클립/릴스/쇼츠 스크립트, 구글·메타 광고 카피) and publish each draft as a Notion page. Use whenever the user asks to write/create marketing drafts, blog posts, cafe posts, short-form scripts, or ad copy — especially when they want the output saved to Notion. Grounds copy in docs/marketing-plan.md.
---

# Marketing Draft → Notion

Dewy(듀이, AI 웨딩플래너 앱)의 마케팅 초안을 생성하고 **노션 페이지로 발행**한다.

## When to use
사용자가 "마케팅 초안 써줘 / 블로그 글 / 카페 글 / 숏폼(클립·릴스·쇼츠) 스크립트 / 광고 카피"를 요청할 때, 특히 **노션에 저장**까지 원할 때.

## Inputs & grounding (먼저 읽기)
- **`docs/marketing-plan.md`** — 포지셔닝 한 문장, 3대 메시지 축(편의/AI 차별점/페르소나), 채널 전략, 키워드, 부록 초안. 모든 카피는 여기에 근거한다. (없으면 사용자에게 알리고 일반 톤으로 진행)
- 핵심 사실(틀리지 말 것): 앱명 **Dewy(듀이)**, 웹+안드로이드/PWA, 프리미엄 구독 ₩4,900/월 + 하트 인앱결제, 페르소나 **일반/스몰/셀프웨딩**, 차별 기능 **방구석 드레스 투어·AI 메이크업 시뮬·AI 챗봇 플래너·무료 모바일/종이 청첩장**. 모르는 수치/주장은 지어내지 말 것.

## Workflow

1. **범위 확인** — 4종 중 무엇을, 몇 개씩 만들지 사용자 요청에서 파악. 불명확하면 4종 전부 기본 생성:
   - 블로그 글, 카페 글, 숏폼 스크립트, 광고 카피
2. **초안 작성** — 각 초안을 **개별 Markdown 파일**로 `/tmp/dewy-drafts/` 아래 저장. 형식·톤·체크리스트는 **`reference/draft-formats.md`** 를 따른다.
   - 파일명 규칙: `{유형}-{슬러그}.md` (예: `blog-결혼준비순서.md`, `shortform-드레스투어.md`)
   - 각 파일은 `# 제목` H1으로 시작 (노션 페이지 제목으로 쓰임)
3. **노션 발행** — 각 파일을 발행 스크립트로 노션 자식 페이지로 생성:
   ```bash
   python3 .claude/skills/marketing-draft/scripts/notion_publish.py --file /tmp/dewy-drafts/blog-결혼준비순서.md
   ```
   - 토큰/부모 페이지는 환경변수 `NOTION_TOKEN`, `NOTION_PARENT_PAGE_ID` 에서 자동으로 읽음 (아래 Setup).
   - 스크립트가 출력하는 **노션 페이지 URL** 을 수집해 사용자에게 목록으로 보고.
4. **발행 전 검증** — 실제 발행 전 `--dry-run` 으로 변환 결과(블록 수/유형) 확인 권장:
   ```bash
   python3 .claude/skills/marketing-draft/scripts/notion_publish.py --file <파일> --dry-run
   ```

## Setup (노션 자격증명 — 최초 1회)
환경변수가 없으면 스크립트가 에러를 내며 멈춘다. 사용자에게 다음을 안내:
1. https://www.notion.so/my-integrations → **New integration** 생성 → **Internal Integration Secret**(`ntn_...` 또는 `secret_...`) 복사 → `NOTION_TOKEN`.
2. 초안을 모아둘 **부모 페이지**를 노션에서 하나 만들고, 그 페이지 우측 `•••` → **Connections** → 위 integration 연결.
3. 부모 페이지 URL 끝 32자리 해시가 **페이지 ID** → `NOTION_PARENT_PAGE_ID` (하이픈 없어도 됨).
4. 두 값을 이 환경(예: Claude Code on the web 의 환경 변수 설정)에 등록. **절대 레포에 커밋하지 말 것.**

검증: `python3 scripts/notion_publish.py --file reference/draft-formats.md --dry-run` 가 정상이면 변환 OK. 실제 발행은 토큰 등록 후 한 파일로 테스트.

## Notes
- 스크립트는 표준 라이브러리만 사용(설치 불필요), Markdown 헤딩/리스트/체크박스/인용/구분선/코드/표·인라인 **굵게**/`코드` 지원, 100블록 초과 시 자동 분할 업로드.
- 카페 글은 플랫폼 정책상 **노골적 홍보 금지** — `reference/draft-formats.md` 의 신뢰형 톤을 지킬 것.
- 자작 후기/다중계정 유도 금지. 광고 카피는 첫 5초/첫 1줄 후킹 + 브랜드명 노출 원칙.
