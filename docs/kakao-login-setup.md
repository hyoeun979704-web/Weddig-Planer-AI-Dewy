# 카카오 로그인 설정 가이드

`Auth` 페이지의 "카카오로 계속하기" 버튼은 Supabase Auth의 OAuth 흐름(`signInWithOAuth({ provider: 'kakao' })`)을 사용합니다. 클라이언트 환경 변수는 추가로 필요 없으며, 모든 비밀값은 Supabase 대시보드에서 관리됩니다.

## 1. 카카오 개발자 콘솔

1. <https://developers.kakao.com> 접속 후 애플리케이션 생성
2. **앱 설정 → 플랫폼 → Web** 에서 사이트 도메인 등록
   - 로컬: `http://localhost:5173`, `http://localhost:8080`
   - 배포: `https://<your-vercel-domain>`
3. **제품 설정 → 카카오 로그인 → 활성화 ON**
4. **Redirect URI** 에 Supabase 콜백 URL 추가
   ```
   https://<YOUR-PROJECT-REF>.supabase.co/auth/v1/callback
   ```
5. **동의 항목**에서 필요한 스코프(닉네임, 프로필 이미지, 이메일 등) 동의 설정
6. **앱 키 → REST API 키** 복사 → Supabase의 `Client ID` 로 사용
7. **보안 → Client Secret → 코드 생성 / 활성화 상태로** → 복사 → Supabase의 `Client Secret` 로 사용

## 2. Supabase 대시보드

1. **Authentication → Providers → Kakao** 활성화
2. 위에서 복사한 값을 입력
   - **Client ID**: REST API 키
   - **Client Secret**: 활성화한 Client Secret
3. **Authentication → URL Configuration**
   - **Site URL**: 배포 도메인 (예: `https://dewy.kr`)
   - **Redirect URLs**: 개발/배포에서 사용할 URL 모두 추가
     ```
     http://localhost:5173/
     http://localhost:8080/
     https://<your-vercel-domain>/
     ```

## 3. 클라이언트 동작

- `src/contexts/AuthContext.tsx`의 `signInWithKakao()` 호출 시 Supabase가 카카오 인증 페이지로 리다이렉트합니다.
- 로그인 성공 후 `redirectTo: ${window.location.origin}/` 로 돌아오며, `onAuthStateChange` 가 세션을 즉시 반영합니다.
- 카카오에서 받은 프로필 정보는 `user.user_metadata` (이름) 와 `user.identities[].identity_data` (raw 데이터) 에서 확인할 수 있습니다.

## 4. 트러블슈팅

- **`redirect_uri_mismatch`**: 카카오 콘솔의 Redirect URI 와 Supabase 콜백 URL이 정확히 일치해야 합니다(끝의 슬래시 포함).
- **`KOE006` / 동의 항목 오류**: 카카오 동의 항목에서 이메일을 "선택 동의" 가 아닌 활성 상태로 두어야 Supabase user 의 `email` 컬럼이 채워집니다.
- **로컬 개발에서 세션 미반영**: Supabase 의 Redirect URLs 리스트에 로컬 주소가 포함되어 있는지 확인하세요.
