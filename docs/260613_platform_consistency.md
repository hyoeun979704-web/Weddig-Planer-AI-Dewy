# 260613 웹/안드로이드/iOS 프론트-백엔드 정합성 검토

> 질문: "iOS/안드로이드/웹의 백엔드는 하나여야 하는데 아닌 것 같다."
> 결론: **데이터 백엔드(인증·DB·스토리지)는 단일 Supabase 프로젝트로 통일돼 있다.**
> 갈라질 수 있는 유일한 틈은 **빌드 타임 env** 한 곳. 아래에 근거와 권장 가드.

## TL;DR

- ✅ **단일 백엔드**: 코드 전역에서 참조하는 Supabase 프로젝트 ref 는 `qabeywyzjsgyqpjqsvkd` **하나뿐**.
  web/Android/iOS 모두 같은 클라이언트(`src/integrations/supabase/client.ts`)로 같은 DB·Auth·Storage 에 붙는다.
- ✅ **인가 일관성**: `list_tables` 확인 결과 public 110+ 테이블 **전부 RLS enabled**. 클라이언트가
  웹이든 앱이든 백엔드(RLS)가 권한을 강제 → 플랫폼별 우회 불가.
- ✅ **플랫폼 분기는 격리됨**: 분기 단일 소스 `src/lib/platform.ts`. 차이는 ① 세션 저장소
  (네이티브=Preferences, 웹=localStorage) ② OAuth 콜백(네이티브=딥링크) ③ 안전영역 소스뿐 —
  **데이터 경로는 분기 없음**.
- ✅ **`api/` 는 두 번째 백엔드가 아님**: Vercel SSR(`ssr.ts`·`guide.ts`, 크롤러/AEO용) + 카카오
  챗봇 웹훅(`kakao-chatbot.ts`). 앱(`src/`)은 `/api/` 를 호출하지 않으며(grep 0건), 이들도 **같은
  Supabase 프로젝트**를 읽는다. anon 키도 `client.ts` 기본값과 `api/ssr.ts` 하드코딩이 **동일**.
- ⚠️ **유일한 위험 — 빌드 타임 env 분기**: `SUPABASE_URL`/`ANON` 은 빌드 시 `VITE_SUPABASE_URL`
  등으로 결정되고, 없으면 하드코딩 기본값(=실제 프로젝트)로 폴백. 웹(Vercel 빌드)과
  네이티브(APK/IPA 빌드)가 **서로 다른 env 를 주입하면 조용히 다른 프로젝트로 갈라질 수 있다.**

## 근거 (확인 방법)

| 항목 | 확인 | 결과 |
|---|---|---|
| 프로젝트 ref 유일성 | `grep supabase.co\|project_id` (src·api·config.toml·capacitor.config) | `qabeywyzjsgyqpjqsvkd` 1개 |
| 클라이언트 단일화 | `src/integrations/supabase/client.ts:60` | 단일 `createClient`, storage/redirect만 플랫폼 분기 |
| RLS 강제 | Supabase `list_tables` | public 110+ 테이블 전부 `rls_enabled: true` |
| 앱→api 호출 | `grep "/api/" src/` | 0건 (api 는 크롤러·웹훅 전용) |
| anon 키 일치 | `client.ts` 기본값 vs `api/ssr.ts` | 동일 키 |

## ⚠️ 권장 — 빌드 타임 env 분기 가드

현재는 web/native 모두 기본값(같은 프로젝트)으로 수렴해 실질 통일 상태다. 다만 누군가 Vercel 의
`VITE_SUPABASE_URL` 만 다른 프로젝트로 바꾸면 **웹만 갈라진다(에러 없이)**. 재발 방지책:

1. **(저비용) CI 가드** — `scripts/check-integrity.mjs`(이미 FE/BE 정합성 가드 존재, PR #282)에
   "빌드 산출 `dist/` 의 Supabase URL == 기대 프로젝트 ref" 어서션 추가. web/native 빌드 모두에서 실행.
2. **(선택) 기본값 = 단일 소스** — `client.ts` 와 `api/ssr.ts` 가 같은 상수를 import 하도록 공유
   (`src/integrations/supabase/projectRef.ts` 등). 지금은 두 곳에 하드코딩(값은 같으나 드리프트 여지).
3. **(운영) 문서화** — Vercel 환경변수 `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` 가
   `qabeywyzjsgyqpjqsvkd` 와 일치해야 함을 배포 런북에 명시(또는 아예 env 미설정 → 기본값 사용).

> 본 검토는 정적 코드 + DB 스키마(list_tables) 레벨. 실제 web/native 빌드 산출물의 주입값
> 동일성은 각 빌드 파이프라인(Vercel env vs 로컬 APK 빌드 env)에서 1회 확인 권장.
