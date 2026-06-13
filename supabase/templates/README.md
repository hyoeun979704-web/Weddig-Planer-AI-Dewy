# Supabase Auth 이메일 템플릿 (Dewy 한글·브랜드)

Supabase 대시보드 → **Authentication → Emails → Templates** 의 각 템플릿에 아래 파일 내용을 붙여넣으세요.
제목(Subject)은 각 파일 상단 주석에 적어둠. 변수(`{{ .ConfirmationURL }}`, `{{ .Token }}`)는 Supabase가 자동 치환하므로 그대로 둡니다.

| Supabase 템플릿 | 파일 | 제목 |
|---|---|---|
| Confirm signup | `confirm-signup.html` | [Dewy] 이메일 인증을 완료해 주세요 💍 |
| Reset Password | `reset-password.html` | [Dewy] 비밀번호 재설정 안내 |
| Magic Link | `magic-link.html` | [Dewy] 로그인 링크 |
| Change Email Address | `change-email.html` | [Dewy] 이메일 변경 확인 |
| Reauthentication | `reauthentication.html` | [Dewy] 본인 확인 코드 |
| Invite user | `invite.html` | [Dewy] 초대장이 도착했어요 |

> 발신자 도메인(`dewy-wedding.com`)으로 나가려면 Resend 도메인 인증 + 커스텀 SMTP가 적용돼야 합니다(별개).
