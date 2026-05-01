# 운영자(admin) 권한 부여 가이드

`/admin` 영역 접근에는 `user_roles` 테이블의 `admin` 역할이 필요합니다.
일반 사용자가 잘못 접근하면 자동으로 차단됩니다.

## 본인 계정에 admin 부여

### 방법 1: Supabase Studio (가장 단순)

1. Supabase 대시보드 → **Table Editor** → `user_roles`
2. **Insert Row** 클릭
3. 입력:
   - `user_id`: 본인 계정의 UUID (`auth.users` 테이블에서 본인 이메일로 조회 후 복사)
   - `role`: `admin`
4. Save

### 방법 2: SQL Editor

Supabase 대시보드 → **SQL Editor** → 다음 쿼리 실행:

```sql
-- 본인 이메일로 user_id 찾아 admin 역할 부여
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'help@dewy-wedding.com'  -- 본인 이메일로 변경
ON CONFLICT (user_id, role) DO NOTHING;
```

## 확인

1. 앱에서 본인 계정으로 로그인
2. 브라우저 주소창에 `https://dewy-wedding.com/admin` 입력
3. **운영자 대시보드**가 표시되면 성공
4. 일반 사용자라면 **"접근 권한이 없습니다"** 화면 표시

## 어드민 영역 진입 경로

| 경로 | 설명 |
|---|---|
| `/admin` | 대시보드 (통계 요약) |
| `/admin/dress-samples` | 드레스 카탈로그 관리 |
| (향후) `/admin/makeup-samples` | 메이크업 카탈로그 |
| (향후) `/admin/invitation-templates` | 청첩장 템플릿 |
| (향후) `/admin/wedding-photo-refs` | 촬영 시안 |
| (향후) `/admin/service-waitlist` | 사전알림 신청 관리 |
| (향후) `/admin/users` | 사용자 관리 |

## 어드민 vs 업체(business) 권한

본 프로젝트의 권한 시스템:

| 역할 | 사용 목적 | 접근 영역 |
|---|---|---|
| **admin** | 듀이 운영자 (대표) | `/admin/*` 전체 |
| **business** | 입점 업체 (사장님) | `/business/*` (본인 업체만) |
| **individual** | 일반 사용자 (예비 부부) | 일반 서비스 |

→ `admin`과 `business`는 **별개 역할**. 같은 계정이 두 역할을 동시에
가질 수 없도록 설계되지 않았으므로, 본인 운영자 계정은 `admin`만
부여하면 됩니다.

## 권한 회수

권한을 제거하려면:

```sql
DELETE FROM public.user_roles
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'help@dewy-wedding.com')
  AND role = 'admin';
```

## 트러블슈팅

### "접근 권한이 없습니다" 가 계속 표시될 때
- 로그아웃 → 재로그인 (역할 캐시 갱신)
- 브라우저 새로고침 (강력 새로고침 Ctrl+Shift+R)
- `user_roles` 테이블에 본인 user_id + 'admin' row가 있는지 재확인

### 어드민 페이지에서 "Permission denied" 데이터 에러
- `dress_samples` 테이블의 RLS가 INSERT/UPDATE/DELETE를 service_role로
  제한하는 경우, 클라이언트(anon) 키로는 쓰기 불가
- 이 경우 어드민용 RLS 정책 추가 필요:

```sql
-- 어드민 사용자는 모든 작업 가능
CREATE POLICY "Admins can manage dress_samples"
ON public.dress_samples FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
```
