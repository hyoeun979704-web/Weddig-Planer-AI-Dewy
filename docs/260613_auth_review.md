# 260613 — 회원가입/로그인 로직 검토 (이메일·카카오·구글·애플)

> 대상: `src/pages/Auth.tsx`, `src/contexts/AuthContext.tsx`, `src/lib/native/oauth.ts`,
> 서버 트리거(`handle_new_user`) + DB 상태. 코드·DB 근거 기반.

## DB 상태 확인
- 사용자 12명 / 프로필 12개 → `handle_new_user` 트리거(프로필 생성 + 1,000P 가입보너스) 정상.
- 미인증 사용자 0명(이메일 confirm 즉시 또는 비활성).
- **`individual` 역할은 12명 중 1명만 보유** — 가입 시 역할이 부여되지 않음. UI는 "역할 없음"을 일반회원처럼 다루므로 당장 깨지진 않지만 `isIndividual` 신호는 신뢰 불가(권장: 트리거에서 individual 역할 부여 또는 UI에서 의존 제거).
- 보안 advisor: **leaked password protection 비활성**(WARN), security_definer_view 3건(ERROR), always-true RLS 2건 — auth 직접 관련은 leaked password protection.

## 즉시 수정 완료 (이 PR)
1. **에러 원문 노출 제거** (`Auth.tsx`) — 가입/로그인 실패 시 `toast.error(error.message)`로 Supabase 영문 raw 에러(내부 스키마·구현 단서)가 사용자에게 노출되던 것을 알려진 케이스만 친화 문구 + 그 외 제네릭(+console.warn)으로. 로그인엔 "이메일 미인증" 케이스 안내도 추가.
2. **비밀번호 최소 길이 6 → 8** (`Auth.tsx`) — 6자는 사전공격 취약(NIST/정보통신망법 권장 미달). 복합 문자 강제는 전환율 저하라 길이 기준만 상향. 신규 가입에만 적용(기존 사용자 영향 없음).
3. **손상된 마케팅 동의 캐시 무한 재시도 차단** (`AuthContext.tsx`) — `localStorage` pending 값이 malformed JSON일 때 제거하지 않아 매 로그인마다 파싱 실패가 반복되던 것을 즉시 정리.

## 보고 — 권장 수정 (별도 결정/작업 필요)

### A. 소셜 가입 시 기업회원 의도 소실 (중대, 동작 변경 필요)
`/auth?type=business`에서 카카오/구글/애플로 **가입**하면, OAuth 리다이렉트가 `${origin}/`로 돌아오며 `?type=business`가 사라지고 `account_type`도 metadata에 안 실림(Supabase `signInWithOAuth`는 가입 메타데이터 전달 불가). 결과: 기업 의도로 소셜 가입한 사용자가 홈으로 떨어지고 `/business/onboard`로 안 감 → 개인회원처럼 생성.
- 권장: 소셜 OAuth 직전 `localStorage`에 business 의도 저장(마케팅 동의와 동일 패턴) → 로그인 직후(App/AuthProvider 최상위) 의도가 있고 business 역할/metadata가 없으면 `/business/onboard`로 라우팅 후 정리. (Auth.tsx의 리다이렉트는 /auth 마운트 시에만 동작해 소셜 콜백 경로를 못 잡음 — 최상위 처리가 필요해 침습적, 별도 PR 권장.)
- 이메일 가입 기업 전환은 정상(직전 PR #248에서 수정됨).

### B. leaked password protection 활성화 (운영 설정)
Supabase 대시보드 → Authentication → Policies에서 "Leaked password protection"(HaveIBeenPwned 대조)을 켜면 유출된 비밀번호 가입/변경을 차단. 코드 변경 없이 보안 강화. (MCP로 토글 불가 — 대시보드에서 1클릭.)

### C. 소셜 로그인 중복 클릭 가드 (낮음)
`isGoogleLoading` 등으로 버튼 비활성하지만 OAuth 리다이렉트까지 짧은 틈에 재클릭 가능. 한 소셜 진행 중 세 버튼 모두 비활성 권장.

### D. 마케팅 동의 backfill 다중탭 경합 (낮음)
서로 다른 탭에서 다른 동의값으로 동시 가입 시 `localStorage` 단일 키가 덮어써질 수 있음. 키에 토큰을 더하거나 가입 직후 즉시 소비/삭제로 완화(현재는 첫 SIGNED_IN에서 소비).

### E. 가입 시 individual 역할 미부여
`handle_new_user`가 individual 역할을 안 넣음 → `isIndividual` 신뢰 불가. 트리거에 `INSERT user_roles(individual)` 추가 또는 UI에서 "역할 없음=개인"으로 명시.

## 정상 확인된 부분
- 만 14세 검증(생년월일 + 약관 동의 체크), 비밀번호 확인 일치, 중복 이메일 처리.
- `needsEmailConfirm` 분기(세션 없으면 메일 안내), `handle_new_user` 멱등(ON CONFLICT) + 포인트 실패 격리(EXCEPTION).
- 네이티브 OAuth는 Custom Tabs + 딥링크 콜백으로 분리 구현(웹뷰 navigation 안 함) — 정책 준수.
- signOut 시 behavioral signals wipe(계정 간 누수 방지).
</content>
