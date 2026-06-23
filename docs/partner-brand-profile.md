---
# ============================================================
#  제휴업체 브랜드 프로파일 (자동화 파싱용 yaml 헤더)
#  사용법: 업체 1곳당 이 파일 1개. 폴더 gdrive_root/{partner_id}/brand-profile.md
#  ※ 빈 칸을 업체 입장에서 채운다. 채운 값이 콘텐츠 자동 생성에 그대로 반영됨.
# ============================================================
partner_id: "WH-SEL-001"        # 관리코드: 카테고리-지역-순번 (예: ST=스튜디오, DR=드레스, MU=메이크업, HB=한복, FL=플로리스트, SN=스냅, WH=웨딩홀)
name: ""                        # 업체명(정식)
category: ""                    # 웨딩홀/스튜디오/드레스/메이크업/한복/플로리스트/스냅 ...
region: ""                      # 지역(천안/아산/서울 ...)
status: "active"                # active | paused

brand:
  tagline: ""                   # 한 줄 소개/슬로건 (업체가 직접)
  keywords: []                  # 브랜드 핵심 단어 3~5 (예: 내추럴, 따뜻한, 감성)
  mood: []                      # 무드 (예: 모던, 클래식, 빈티지, 미니멀)
  colors:
    primary: "#"                # 메인 컬러 hex
    secondary: "#"              # 서브 컬러 hex
  logo: "gdrive:.../logo.png"   # 로고 파일 경로

voice:
  tone: ""                      # 어떤 말투로 소개되길 원하나 (예: 차분하고 신뢰감 있게)
  must_say: []                  # 꼭 들어갔으면 하는 표현/강점
  avoid: []                     # 금지어/지양 표현 (예: '저렴', '최저가')

usp: []                         # 차별점 3가지 — 다른 업체와 뭐가 다른가 (큐레이션 근거)

persona_fit: []                 # 어떤 신부에게 맞나 → wedding-intel.md §4 persona_id
                                #   예: [small_luxury, designer_late] / [small_budget, budget_analytic]

assets:
  folder: "gdrive:.../{partner_id}/"
  provided: []                  # 제공 자료 목록 (사진/영상/포트폴리오/후기)
  usage_rights: "ask_each_time" # ★법적 필수★ commercial_ok | dewy_channels_only | ask_each_time
  rights_note: ""               # 사용권 세부(기간/채널/크레딧 표기 조건 등)

partnership:
  tier: "free_first"            # free_first | paid_single | paid_package | automation_build
  free_done: false              # 무료 1회 촬영 완료 여부
  disclosure_agreed: false      # 제휴 표기('유료광고 포함'/'제휴') 동의 ★
  event: ""                     # 진행 중 이벤트/프로모션(있으면)

contact:
  manager: ""
  phone: ""
  email: ""

updated: "2026-MM-DD"
---

# {업체명} 브랜드 프로파일

> 이 문서는 Dewy 콘텐츠 자동화가 이 업체를 소개할 때 **그 업체의 브랜딩을 반영**하기 위한 정보야.
> Dewy 보이스가 베이스가 되고, 아래 정보가 그 위에 "이 업체다움"을 입힌다. 모든 항목을 채울수록 결과가 정확해진다.

## 1. 기본 정보
- **관리코드 / 업체명 / 카테고리 / 지역**을 yaml에 기입.
- 관리코드 예: `ST-CHA-003`(천안 스튜디오 3번), `DR-SEL-012`(서울 드레스 12번).

## 2. 브랜드 아이덴티티 (visual)
- **tagline**: 업체가 스스로를 한 줄로. (예: "공간을 그대로, 당신을 가장 당신답게")
- **colors**: 메인/서브 컬러 hex — 카드뉴스·썸네일 색감에 반영.
- **mood / keywords**: 무드와 핵심 단어 → 비주얼·카피 톤 결정.
- **logo**: GDrive 경로(워터마크/표기용).

## 3. 보이스 (verbal)
- **tone**: 이 업체가 *어떻게* 말해지길 원하는지.
- **must_say / avoid**: 꼭 넣을 강점, 절대 피할 표현. (예: '최저가' 금지 → 가치로 표현)

## 4. USP (큐레이션 근거)
- 다른 업체와 **무엇이 다른지** 3가지. 이게 "왜 Dewy가 이 업체를 추천하는가"의 근거가 됨.
  (예: 자연광 전문 / 한복 자체 제작 / 1:1 디렉팅)

## 5. 페르소나 적합도 (★Dewy의 무기)
- 이 업체가 **어떤 신부 페르소나에 맞는지** `persona_id`로. (wedding-intel.md §4와 동일 문자열)
- 이게 채워져야 "당신(○○ 신부)에겐 이 업체"라는 개인화 추천이 자동 생성됨.

## 6. 제공 자료 & 사용권 (★법적)
- **provided**: 받은 사진/영상/포트폴리오 목록.
- **usage_rights**: 반드시 명시.
  - `commercial_ok` — 마케팅 상업적 사용 가능
  - `dewy_channels_only` — Dewy 채널 내에서만
  - `ask_each_time` — 사용 시마다 허락 (기본값, 안전)
- 사용권이 불명확하면 자동화는 그 자료를 **쓰지 않는다**(기본 안전).

## 7. 제휴 단계 & 표기
- **tier**: 무료 1회 → 유료 단건 → 패키지 → 자동화 구축 사다리 중 현재 단계.
- **disclosure_agreed**: 제휴/유료광고 표기 동의 — `true`라야 콘텐츠에 정상 표기하고 게시.

---
> **작성 팁:** USP·persona_fit·usage_rights 이 3개가 핵심이야. USP는 큐레이션 신뢰, persona_fit은 개인화 추천, usage_rights는 법적 안전. 나머지는 비어 있어도 돌아가지만 이 셋은 꼭 채워줘.
