# 260620 웨딩촬영 시안 생성 — 설계서 (coming_v2 "웨딩촬영 시안" 정식 구현)

> 스드메 합본 엔진(dewy-sdm + shotTypes)을 키워 **촬영 전 참고용 시안**을 자동 생성하고 **PDF 2장**으로 묶는다.
> AI 스튜디오 `wedding-photo`(현재 coming_v2 잠금) 카드의 실제 구현. 사용자 결정 반영(2026-06-20):
> **커플 컷 = 단독 먼저 + 베스트에포트**, **PDF = 1장 단독 / 2장 커플**.

## 0. 핵심 전제
- **비동기 30분 허용**: 실제 시안 제작 시간 대비 매우 짧음 → **high 품질** 사용(인터랙티브 아님이라 지연 OK).
- **gpt-image 한계**: ① 2인(신부+신랑) 정체성을 한 장에 모두 닮게 = 가장 약함 → 커플 컷은 **베스트에포트**.
  ② 입력 이미지 다수 → **레퍼런스는 이미지로 안 넣고 vision으로 텍스트화**(입력 한도·타인 얼굴 오염 회피).
- **30분 단일 엣지함수 불가**: Supabase 엣지 런타임 wall-clock 한도로 `waitUntil` 30분 불가 →
  **잡 큐 + pg_cron 워커**로 컷을 1개씩 처리하고 8컷 완료 시 마감.

## 1. 입력 / 중간 / 출력 (확정 스펙)
**입력**
- 신부: ① 촬영 헤어·메이크업 완료 사진 ② 촬영 드레스 착용 사진. (①이 없으면 → **AI스튜디오 메이크업/헤어로 안내** 후 차단.)
- 신랑: ① 촬영 헤어 셋팅 사진(**얼굴은 기본 그루밍/내추럴 메이크업으로 프롬프팅**) ② 촬영 슈트 착용 사진.
- 소품: 예시 선택 또는 사진 첨부(선택).

**중간 — 레퍼런스(선택, 최대 8장)**
- 첨부 사진/예시를 **vision(gemini-2.5-flash)으로 분석 → 스타일 텍스트**(포즈·구도·톤·분위기)로 변환해 프롬프트에 주입.
- 이미지 자체는 합성 입력으로 넣지 않음(정체성은 신부/신랑 실사진에서만).

**출력 — 8컷(1 컨셉)**
| # | subject | framing | PDF |
|---|---|---|---|
| 1 | 신부 단독 | 전신 | **1 (단독)** |
| 2 | 신부 단독 | 상반신 | 1 |
| 3 | 신랑 단독 | 전신 | 1 |
| 4 | 신랑 단독 | 상반신 | 1 |
| 5 | 인물 위주(커플) | 전신 | **2 (커플)** |
| 6 | 인물 위주(커플) | 상반신 | 2 |
| 7 | 배경/풍경 위주(커플) | 전신 | 2 |
| 8 | 배경/풍경 위주(커플) | 상반신 | 2 |

- **레퍼런스 있으면**: 최대 반영 후, 기본 8컷 기준 **빠진 컷을 채워** 다양·풍부하게.
- **PDF 2장**: 1장=단독 4컷(#1~4), 2장=커플 4컷(#5~8). 클라 jsPDF(이미 vendor-pdf 사용)로 생성.

## 2. 아키텍처 (잡 큐 — 30분 대응)
```
photoshoot_drafts (concept)        photoshoot_draft_cuts (8 rows/concept)
- id, user_id, status              - id, draft_id, cut_index(1~8)
- bride_*_path, groom_*_path       - subject(bride|groom|couple)
- props, refs_text(vision결과)     - framing(full|bust)
- hearts_spent, pdf_paths[]        - prompt, status(pending|done|failed), result_path
- error_message, created_at        - error_message
```
- **생성 흐름**: 요청 → 하트 차감 → drafts(pending) + cuts ×8(pending) insert → 202 반환.
- **워커**: `pg_cron`(매 1분)이 `process-photoshoot-cut` 엣지함수를 `pg_net`으로 호출 → **pending cut 1~2개**를 high로 생성·업로드·done. (컷당 high ~1~3분 × 8 = 약 8~30분 → 30분 예산 부합.)
- **마감**: 모든 cut done 이면 draft.status=done + (클라가 결과 화면에서 PDF 2장 생성) 또는 서버 조립.
- 실패 컷은 재시도 N회 후 skip(부분 결과라도 제공), 전량 실패 시 하트 환불.
- 재사용: `shotTypes.shotFramingBlock`(full/bust), 신부 프롬프트는 sdmPrompt 패턴, 신랑은 신규 identity 블록(기본 그루밍).

## 3. 프롬프트 설계
- **신부/신랑 단독 컷**: 해당 인물 사진 1~2장(헤메/드레스 or 헤어/슈트) + identity lock + shotFramingBlock + 소품/레퍼런스 텍스트. 스드메와 동일 안정성.
- **신랑 identity**: 신부 블록과 대칭, 단 "**얼굴은 과하지 않은 기본 그루밍(내추럴) 메이크업, 정돈된 피부·눈썹**, 정체성 유지".
- **커플 컷(베스트에포트)**: Image1=신부(정체성), Image2=신랑(정체성), 역할 명시("두 사람을 각각 닮게, 얼굴 섞지 말 것"). 배경위주는 인물 비중을 낮추고 풍경 강조라 정체성 부담↓.

## 4. 하트 비용(정할 것)
- 8컷 × high = 개별(5)·스드메(10)보다 훨씬 비쌈. 제안: **컨셉당 40~60하트**(원가+여유). 출시 전 확정 필요.
- 입력 게이트로 헛생성 방지(신부 헤메 사진 필수, 신랑 사진 필수).

## 5. 단계별 구현 플랜
- **P1 (단독 4컷 MVP)**: drafts/cuts 테이블 + 버킷/RLS, `dewy-photoshoot-start`(검증·하트·row), `process-photoshoot-cut`(컷 1개 생성) + pg_cron, 페이지(입력 위저드)+결과 폴링, **PDF 1장(단독)** 생성. 커플 컷 제외.
- **P2 (커플 4컷 베스트에포트)**: 커플 프롬프트 + PDF 2장.
- **P3 (레퍼런스 vision)**: 최대 8장 분석→텍스트, 빠진 컷 보강.
- **P4 (소품)**: 예시/사진 소품 반영.
- 카드: `wedding-photo` 를 coming_v2 → active 로 전환(P1~P2 완료 시).

## 6. 리스크 / 검증
- **2인 정체성**(P2 핵심 리스크): 베스트에포트 명시, 배경위주부터 적용해 부담 분산.
- **엣지 런타임 한도**: 잡 큐로 단일 30분 실행 회피(위 §2).
- **비용**: high×8 → 하트 단가·환불 정책 필수.
- **검증 한계(현 세션)**: 이 환경은 아웃바운드 네트워크 전면 차단이라 **실 생성·PDF 결과를 직접 못 봄**. 코드/빌드/스키마까지만 확인하고, 실제 컷 품질·2인 정체성은 **배포 후 실측** 필요(검증 규칙 준수).

## 7. 재사용 지점(중복 금지)
- 합성 엔진/프레이밍: `src/data/shotTypes.ts`, `src/data/sdmPrompt.ts`, `supabase/functions/dewy-sdm`.
- 하트: `spend_hearts`/`earn_hearts`. 잡 알림: `pendingJobs`+`GenerationNotifier`(type 추가).
- PDF: 기존 vendor-pdf(jsPDF). vision: `MODELS.geminiFlash`.
- 버킷 RLS: `makeup_simulation` 마이그레이션 패턴.
