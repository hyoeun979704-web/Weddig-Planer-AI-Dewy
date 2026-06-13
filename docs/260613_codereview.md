# 260613 코드리뷰 — 에이전트 오피스 + 세션 앱 변경

> 범위: 이 세션에서 추가/변경된 ① 에이전트 오피스(`agent-office/`) 전체 ② 앱 신규 기능(오류
> 모니터링·인앱 알림·에이전트 산출물 어드민·번들·confirm). 방법: agent-office 는 직접 6차원
> 적대적 리뷰, 앱 변경은 서브에이전트 보안·정확성 스윕 + 교차 확인. 버그는 즉시 수정.

## TL;DR
- **보안 PASS** — 신규 RLS 3종(`client_error_logs`·`app_notifications`·`agent_outputs`) 모두 적정.
  service_role 키 미노출, SQL 인젝션·하드코딩 시크릿 0. 스크랩 인젝션 방어(researcher) 내장.
- **정확성 PASS** — 앱 신규 파일(errorLog·ErrorBoundary·알림·어드민)에서 P0/P1 결함 0(서브에이전트
  검증). async/await·레이스·무한루프 이슈 없음.
- **P0 버그 1건 즉시 수정** — 브리지가 DB CHECK 한도 초과 시 조용히 실패하던 것 절단으로 차단.
- **검증 인프라 신설** — agent-office unittest 10건(전부 통과)·골든셋·런타임 가드레일.

## 1. 에이전트 오피스 — 6차원 리뷰
- **정확성/견고성**: 모든 외부 의존(LLM/브라우저/Supabase/GUI)이 미설치·미인증 시 graceful no-op·
  dry-run 으로 분기. 로깅·브리지 실패가 본 작업을 막지 않음(전부 try/except). ✅
- **보안**: GUARDRAILS.md(파일 규약) + 런타임 강제(`guardrails.py` 비용캡·서킷브레이커).
  스크랩 텍스트=데이터로만(인젝션 방어), 자동발행 금지(AUTO_PUBLISH=False), service_role 로컬 전용. ✅
- **성능**: 라우팅=Haiku(최저가)·고난도만 상위 모델. 야간 배치/캐시는 P5 조건부. ✅
- **테스트**: `tests/test_office.py` unittest 10건(deslop·quality·큐·가드레일) — stdlib, 추가설치 0, 10/10 통과. ✅
- **유지보수성**: 모델 배분·프리셋·가드레일을 단일 소스(config·lighting·GUARDRAILS)로. DRY. ✅
- **아키텍처**: 블랙보드(runlog)·매니저-워커·승인 큐·자기개선 루프가 청사진과 일치. CrewAI 는
  2~4 에이전트엔 무겁다는 점 명시(필요 시 함수 회귀). ✅

### 발견·조치
| 발견 | 심각도 | 조치 |
|---|---|---|
| 브리지가 body/issues 를 DB CHECK 한도로 안 잘라 긴 초안 업로드가 PostgREST 400 으로 조용히 실패 | P0 | `supabase_bridge.push_output` 절단(body≤20000·issues≤2000·media_url≤500) — 본 커밋 |
| CrewAI/browser-use 모델 문자열이 LiteLLM 프리픽스 누락(첫 실행 오류 위험) | P1 | `config.CREW_*`(anthropic/...) 분리 — #274(7b3b147) |
| 비용캡·서킷브레이커가 정책(문서)만 있고 미강제 | P1 | `guardrails.py` 런타임 강제 + 크루 연결 — #274 |
| 회귀 테스트 부재 | P1 | unittest 10건 — #274 |

## 2. 보안
- `client_error_logs`(#262): INSERT public(로깅)·SELECT admin. 길이 CHECK 로 페이로드 남용 차단. 노이즈 필터.
- `app_notifications`(#263): INSERT 정책 없음 → 클라 위조 불가, SECURITY DEFINER 트리거만 생성. 본인 행만 read/update/delete.
- `agent_outputs`(#271): admin 전용 read/write, service_role INSERT(RLS 우회). kind·deslop_score CHECK.
- 인젝션: `researcher.py` 스크랩 텍스트는 '데이터로만' 프리앰블 + 허용 도메인 화이트리스트 + 읽기 전용.
- service_role 키: `.env`(gitignore)·로컬 전용, 코드/클라 미노출(서브에이전트 확인).

## 3. P0/버그
- **(이번)** 브리지 절단 누락 → 조용한 업로드 실패. **수정 완료**(본 커밋, `supabase_bridge.py`).
- (앱 신규 파일) P0/P1 0건 — errorLog·ErrorBoundary·알림·어드민 페이지 모두 clean(서브에이전트 검증).

## 4. 앱 변경 (이 세션)
- 오류 모니터링(#262), 인앱 알림+기업승인 트리거(#263), 마감 폴리시 번들 503→288kB·confirm(#264),
  AdMob(#261), 에이전트 산출물 어드민(#271). 라우트·사이드바 연결 확인, vitest 423/423 유지.

## 적용 마이그레이션
| 마이그레이션 | 내용 | PR |
|---|---|---|
| `20260613060000_client_error_logs` | 오류 로깅 + RLS | #262 |
| `20260613070000_app_notifications` | 범용 알림 + 기업승인 트리거 | #263 |
| `20260613080000_agent_outputs` | 산출물 승인 큐 + RLS | #271 |

## 남은 작업 (deferred)
- **실 e2e(키/설치 필요, 당신 PC)**: 마케팅 크루(crewai+ANTHROPIC_KEY), Higgsfield 생성(auth login),
  browser-use 리서처(설치+브라우저). 첫 실행 시 동작 확인 필수.
- **agent-office CI**: 현재 unittest 는 로컬만(앱 CI 는 vitest). 원하면 별도 GH Actions python 잡 추가.
- **자동 게시 경로**: 의도적 미구현(승인까지만). 채널 API 연동 시 P5.
- **A2A·관측 SaaS·n8n**: 볼륨/복잡도 임계 도달 시 조건부(청사진 P5).
- 앱: 토스트 호출처 코스메틱 통일·운영자 admin window.confirm 잔여(저우선).
