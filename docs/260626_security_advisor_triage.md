# 보안 advisor triage (search_path 외 잔여 항목)

작성: 2026-06-26 · 프로젝트 `qabeywyzjsgyqpjqsvkd` · 출처 `get_advisors(security)`

search_path 하드닝(21함수)은 `docs/260625_migration_baseline_plan.md` 에서 완료. 이 문서는
**나머지 보안 권고를 전수 triage** 해 "의도된/안전"과 "실제 조치 필요"를 분리한다. 결론부터:
**즉시 수정이 필요한 취약점은 없음.** 대부분 설계상 의도된 안전 패턴이고, 하드닝 여지가 있는
2건(공개버킷 리스팅·pg_net)은 저효용·중위험이라 staging 검증 후 별도 진행 권장.

## 1. rls_enabled_no_policy (15) — ✅ 안전(의도된 deny-all)

RLS 켜짐 + 정책 없음 = **전면 차단**(deny-all). 클라이언트는 못 읽고, service_role/
SECURITY DEFINER 함수만 접근. 이는 백엔드 전용 테이블의 **올바른 기본값**이다(반대로 RLS 꺼짐이
취약). 권고는 INFO 레벨 — "의도치 않은 잠금일 수 있음" 경고일 뿐.

**검증**: 15개 테이블 전부 클라이언트 코드(`src/` 의 `.from("…")`)에서 직접 읽는 곳이 **0건**.
즉 전부 백엔드(엣지펑션·워커·RPC) 전용 → deny-all 이 정확. 기능 깨짐 없음.

| 테이블 | 성격 |
|---|---|
| `_matoni_backup_places`·`collection_logs`·`naver_search_cache`·`view_events`·`geocode_admin`·`geocode_backfill_log`·`place_exclusions`·`ai_usage_minute` | 수집/캐시/집계 백엔드 전용 |
| `calendar_oauth_states`·`drive_oauth_states`·`mail_oauth_states`·`user_calendar_accounts`·`calendar_event_links` | OAuth 토큰/상태(시크릿) — DEFINER RPC 로만 접근, 직접노출 금지 |
| `design_purchase_intents` | 결제 인텐트 — RPC 경유 |
| `tutorial_tours` | 튜토리얼 allowlist — `complete_tutorial` DEFINER RPC 가 읽음 |

→ **조치 불필요.** (선택: 각 테이블에 `-- intentional deny-all` 주석/문서 링크)

## 2. public_bucket_allows_listing (8) — ⚠️ 저위험(공개 콘텐츠), 하드닝은 선택

공개 버킷 + 광범위 SELECT 정책 → 클라가 `.list()` 로 전체 파일 **열거** 가능. 단 **콘텐츠 자체는
이미 공개**(public 버킷)라 "숨겨진 게 노출"되는 건 아니고, 경로/파일명 열거만 가능.

| 버킷 | 위험 |
|---|---|
| `dress-samples`·`hair-samples`·`makeup-samples`·`invitation-assets`·`invitation-fonts`·`invitation-templates` | 공개 카탈로그 에셋 — 열거돼도 무해 |
| `community-images`·`vendor-images` | 사용자/업체 업로드 — 경로에 user_id 포함 가능(중간 위험) |

**검증**: 코드 전체에 `.storage….list(` 사용 **0건** → 정상 기능엔 리스팅 불필요. 공개 URL 읽기는
storage.objects SELECT 정책과 무관(public 버킷은 CDN 직접 서빙)하므로, broad SELECT 정책을
좁혀도 이미지 표시는 유지될 **것으로 예상**.

→ **권장 조치(선택, staging 검증 후)**: community-images·vendor-images 의 broad SELECT 정책을
제거하거나 `(storage.foldername(name))[1] = auth.uid()::text` 같이 본인 폴더로 한정. **단**
공개 URL 표시가 안 깨지는지 staging 실기기 확인 필수(블라스트 반경 큼 — 앱 전역 이미지). 효용 대비
위험이 있어 이번엔 문서화만, 별도 진행.

## 3. rls_policy_always_true (2) — ✅ 의도된 텔레메트리

| 테이블 | 정책 | 판단 |
|---|---|---|
| `client_error_logs` | `Anyone logs client errors` INSERT WITH CHECK(true) | 익명 포함 모든 클라가 에러 로그 기록 — **의도됨**(관측성) |
| `product_clicks` | `Anyone logs product clicks` INSERT WITH CHECK(true) | 클릭 텔레메트리 — **의도됨** |

INSERT-only(SELECT 없음)라 타인 데이터 열람 불가. 잔여 리스크 = 스팸/플러딩 — 필요 시 레이트리밋
(앱단 디바운스는 이미 존재). → **조치 불필요**, 남용 모니터링만.

## 4. security_definer_view (1) — ✅ 의도된 공개 뷰(invoker 전환 시 기능 깨짐)

`community_author_cards` = `community_posts/comments` 작성자의 `community_nickname·wedding_style·role`
을 묶어 **커뮤니티 작성자 배지**로 공개. SECURITY DEFINER 라 조회자 RLS(특히 user_wedding_settings
소유자 한정)를 우회해 **모든 참여자 카드**를 보여준다.

`security_invoker=true` 로 바꾸면 조회자는 **자기 카드만** 보게 돼 기능이 깨진다 → 공개 배지라는
설계상 DEFINER 가 맞다. → **조치 불필요(설계 의도)**. 단 **제품 관점 검토 권장**: 작성자 배지가
`wedding_style·role` 까지 공개해도 되는지(닉네임만으로 충분하면 뷰 컬럼 축소로 노출 최소화 가능 —
개인정보 최소수집 차원). 별도 제품 결정.

## 5. extension_in_public (1) — ⚠️ 저효용·고위험, 보류

`pg_net` 이 public 스키마에 설치됨(권고: 별도 스키마로 이동). pg_net 은 트리거/cron 의 HTTP 호출
(푸시알림 등)에 쓰여, 스키마 이동 시 `net.http_post` 참조 경로가 깨질 위험. 효용(정리)에 비해
위험(푸시 인프라 회귀)이 커 **보류**. 이동하려면 의존 함수 전수 점검 후 별도 작업.

## 6. *_security_definer_function_executable (anon 74 / authenticated 88) — 아키텍처 특성

SECURITY DEFINER 함수가 anon/authenticated 에 실행 가능 = **RPC 기반 설계의 정상 형태**(클라가
RPC 로만 권한작업 수행, 인가는 함수 내부에서). 권고 자체는 "노출 표면이 크다"는 정보성.

**진짜 리스크는 개수가 아니라 "함수 내부 인가 누락"** (회귀: `business_profiles` self-UPDATE 권한상승).
함수별 인가 검증은 본 triage 범위를 넘어 **전체 14차원 감사(Task #11)** 에서 DEFINER 함수 인가
체크 항목으로 다룬다. → 여기선 포인터만.

## 결론·후속

- **즉시 수정 필요 = 0.** 위 1·3·4·6 은 의도/안전, 2·5 는 저효용·중위험이라 staging 검증 후 별도.
- **후속 트랙**: ① community-images/vendor-images 버킷 리스팅 하드닝(staging 검증) ② author_cards
  공개 범위 제품 검토 ③ DEFINER 함수 인가 전수(=Task #11) ④ pg_net 스키마 이동(의존 점검 후).
