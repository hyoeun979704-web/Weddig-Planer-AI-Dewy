# 1:1 문의 접수 알림 설정 (메일로 받기)

목표: 고객이 **고객센터 1:1 문의**를 넣으면, 관리자 UI 없이 **운영자 메일(kheceo@dewy-wedding.com)로
바로 알림**을 받아 메일로 답장. 전부 서버 사이드라 **앱(클라이언트 번들) 무게에는 영향이 없다.**

구성: `inquiries` INSERT → **Database Webhook** → Edge Function `notify-inquiry` → **Resend** 메일 발송.

> 현재 상태: 함수 코드(`supabase/functions/notify-inquiry`)는 준비됨. 아래 3단계 설정 후 동작.
> 설정 전에도 문의 접수(테이블 insert) 자체는 정상 동작하며, 알림만 비활성 상태다.

---

## 1) Resend(무료) 메일 키 발급
1. https://resend.com 가입(무료 티어: 월 3,000건/일 100건 — 베타엔 충분).
2. **API Keys → Create** → 키(`re_...`) 복사.
3. (권장) **Domains → Add `dewy-wedding.com`** → 안내된 DNS(SPF/DKIM) 등록 → 인증.
   - 인증 전에는 발신자를 `Dewy <onboarding@resend.dev>`(기본값)로 둬도 발송은 됩니다.
   - 인증 후에는 `NOTIFY_FROM=Dewy <noreply@dewy-wedding.com>` 로 바꾸면 도달률이 좋아집니다.

## 2) Edge Function 시크릿 등록 + 배포
Supabase 대시보드 → **Edge Functions → Secrets** 에 등록:

| 키 | 값 |
|---|---|
| `RESEND_API_KEY` | 위에서 발급한 `re_...` |
| `NOTIFY_WEBHOOK_SECRET` | 아무 긴 랜덤 문자열(웹훅 보호용, 3단계에서 동일하게 사용) |
| `NOTIFY_TO` (선택) | 기본 `kheceo@dewy-wedding.com` |
| `NOTIFY_FROM` (선택) | 도메인 인증 후 `Dewy <noreply@dewy-wedding.com>` |

> `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` 는 Edge Functions 기본 제공(문의자 이메일을 찾아
> 메일 회신 주소로 넣는 데 사용). 별도 등록 불필요.

배포:
```bash
supabase functions deploy notify-inquiry
```

## 3) Database Webhook 연결
Supabase 대시보드 → **Database → Webhooks → Create a new hook**:
- Table: `public.inquiries`
- Events: **Insert**
- Type: **Supabase Edge Functions** → `notify-inquiry`
- HTTP Headers 에 추가: `x-webhook-secret = (2단계의 NOTIFY_WEBHOOK_SECRET 와 동일 값)`

저장하면 끝. 이후 문의가 들어오면 메일이 도착하고, **메일 회신**으로 답할 수 있습니다(문의자 이메일이
reply-to 로 설정됨).

---

## 점검
- 앱 고객센터에서 테스트 문의 1건 작성 → 메일 수신 확인.
- 안 오면 Edge Functions **Logs** 에서 `notify-inquiry` 오류 확인(키/시크릿/발신 도메인 점검).
- 보안: `NOTIFY_WEBHOOK_SECRET` 미설정 시 함수는 500 으로 막혀 무단 호출/메일 스팸을 방지한다.

## 참고: 답변을 앱에도 반영하려면(선택)
메일로만 답하면 사용자의 `/my-inquiries` 화면 상태는 `pending` 그대로다. 사용자 앱에도 답변을
보여주려면, 운영자가 Supabase 에서 해당 행의 `answer` 입력 + `status='answered'` 로 갱신하면 된다
(`my-inquiries` 가 이를 표시). 이건 관리자 UI 없이 콘솔에서 처리 가능.
