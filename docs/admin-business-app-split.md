# 운영자/기업자 앱 분리 검토 (Admin/Business App Split)

> 현재는 **단일 SPA + 역할 게이팅**으로 충분하며, 아래 조건이 충족될 때 분리한다.
> 이 문서는 "지금 당장 분리"가 아니라, **나중에 분리하기 쉽도록** 준비·기준·절차를 정리한 것이다.

## 1. 현재 구조 (2026-05 기준)

- 하나의 Vite + React SPA. 소비자/기업회원/운영자가 같은 앱·도메인을 쓴다.
- 화면은 라우트로 구분:
  - 소비자: `/`, `/community`, `/ai-studio`, ...
  - 기업자: `/business/*` (onboard, dashboard, edit, gallery, coupons, inquiries)
  - 운영자: `/admin/*` (dashboard, business-review, users, reports, samples, invitation-*, ...)
- `/admin/*`·`/business/*` 라우트는 모두 `lazy(() => import(...))` **코드 분할** → 소비자는 해당 청크를 내려받지 않는다(번들·로딩 영향 미미).
- 접근 제어:
  - `/admin/*` → 라우트 레벨 `<AdminGuard>` (user_roles.admin) + 데이터단 RLS/SECURITY DEFINER RPC의 admin 체크.
  - `/business/*` → `useUserRole().isBusiness` + `approval_status` 게이트.
- 백엔드는 단일 Supabase 프로젝트(테이블·RLS·RPC·Edge Functions). **분리해도 백엔드는 공유**한다.

### "크기"에 대한 오해 정리
체감되는 크기는 **소스 트리**의 크기지, **소비자에게 배포되는 번들**이 아니다. admin/business는 lazy-load라 일반 사용자 성능에는 거의 영향이 없다. 따라서 분리의 1차 동기는 "성능"이 아니라 **조직/보안/배포 분리**다.

## 2. 분리를 정당화하는 트리거

아래 중 하나라도 해당되면 분리를 검토한다. (현재는 모두 미해당)

1. **조직 분리**: 기업/운영자 화면이 독립 제품·별도 팀으로 커져, 배포 주기·코드 오너십을 분리해야 할 때.
2. **보안 분리**: 운영자 도구를 사내망/별도 도메인/별도 인증으로 **물리적으로 격리**해야 할 때 (소비자 앱과 같은 출처에 admin 코드가 존재하는 것 자체를 줄이고 싶을 때).
3. **빌드/의존성 충돌**: admin 전용 무거운 라이브러리(차트/관리 테이블 등)가 소비자 빌드 설정과 충돌하거나 빌드 시간을 크게 늘릴 때.
4. **릴리스 리듬 차이**: 소비자 앱(앱스토어 심사 주기)과 운영자 웹의 배포 속도가 크게 달라질 때.

## 3. 분리 옵션 (비용 낮은 순)

### A. 멀티 엔트리 (같은 레포·같은 빌드 도구)
- `vite` 의 `rollupOptions.input` 에 `index.html`(소비자) + `admin.html`(운영자/기업) 두 진입점.
- 장점: 공유 코드 그대로 import, 레포 하나, 점진적. 운영자 번들이 소비자와 물리적으로 분리됨.
- 단점: 같은 배포 파이프라인(완전한 조직/보안 분리는 아님).

### B. 모노레포 + 공유 패키지
- `apps/consumer`, `apps/admin`(기업자 포함), `packages/shared`(supabase client, types, auth, ui).
- 장점: 앱별 독립 빌드·배포, 공유 코드는 패키지로 단일 출처.
- 단점: 모노레포 도구(pnpm workspace/turborepo) 도입·설정 비용.

### C. 완전 별도 레포/앱
- 운영자/기업 전용 앱을 별도 레포로.
- 장점: 최대 격리(보안·배포·오너십).
- 단점: 공유 코드 중복 또는 npm 패키지화 필요, 가장 큰 오버헤드.

> 권장 진화 경로: **현행(단일) → 필요 시 A(멀티 엔트리) → 더 커지면 B(모노레포)**. C는 보안 격리가 강하게 요구될 때만.

## 4. 분리해도 공유되는 것 (= 패키지화 후보)

분리 시 중복을 막기 위해 미리 경계를 명확히 둔다.

- `src/integrations/supabase/client.ts`, `types.ts` (DB 타입)
- `src/contexts/AuthContext.tsx` (인증)
- `src/hooks/useUserRole.ts` (역할)
- `src/components/ui/*` (shadcn 공용 컴포넌트), `src/lib/utils.ts`
- 디자인 토큰(tailwind.config), 전역 스타일
- 백엔드 전체(Supabase): 테이블/RLS/RPC/Edge Functions — **분리 대상 아님, 항상 공유**

## 5. 지금 해두면 좋은 준비 (분리 비용 선결제)

분리를 안 하더라도, 나중을 위해 아래를 점진적으로 정리하면 좋다.

- [ ] 폴더 경계 명확화: 운영자/기업 전용 코드를 `src/pages/admin/*`, `src/pages/business/*`, `src/components/business/*` 로 모으기(현재 부분적으로 됨).
- [ ] 소비자 코드가 admin/business 모듈을 **import 하지 않도록** 단방향 의존성 유지(공유는 `lib`/`ui`/`hooks` 경유).
- [ ] admin/business 전용 훅·유틸을 공용(`src/lib`, `src/hooks`)과 섞지 않기.
- [ ] 라우트는 계속 lazy-load 유지(엔트리 분리 시 그대로 떼어내기 쉬움).
- [ ] 권한 체크는 **항상 백엔드(RLS/RPC)에서도** 수행(프론트 분리 여부와 무관하게 보안 유지).

## 6. 분리 실행 절차 (옵션 A 기준, 추후)

1. `admin.html` 진입점 + `src/admin-main.tsx`(운영자/기업 라우터만) 추가.
2. `vite.config` 멀티 엔트리 설정, 공유 청크 분리.
3. 소비자 라우터에서 `/admin`·`/business` 라우트 제거(→ admin 엔트리로 이전).
4. 배포: `admin.html` 을 별도 경로/서브도메인으로 라우팅(예: `admin.dewy.app`).
5. (선택) 운영자 엔트리에 추가 인증 게이트(IP 제한, 별도 로그인 등).

## 7. 결론

- **현 단계 권장: 분리하지 않음.** 단일 앱 + 역할 게이팅 + lazy-load로 충분하고, 분리는 순오버헤드.
- 2장의 트리거(조직/보안/빌드/릴리스)가 생기면 옵션 A부터 점진적으로.
- 그 전까지 5장의 "선결제" 항목만 지키면, 나중 분리가 저렴해진다.
