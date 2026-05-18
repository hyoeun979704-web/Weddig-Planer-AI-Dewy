# 카카오톡 채널 챗봇 등록 가이드

Dewy의 카카오톡 채널 챗봇은 **서비스 소개 + 앱 설치 유도(CTA)** 를 목적으로 합니다.
사용자가 카카오톡에서 채널을 친구 추가 후 발화하면, Supabase Edge Function이 카카오 i 오픈빌더의 **스킬(skill)** 응답 형식으로 카드/버튼을 돌려주고, 버튼을 누르면 Dewy 웹앱(`https://dewy.kr`)으로 이동합니다.

전체 구조:

```
사용자 발화
   │
   ▼
카카오톡 채널 → 카카오 i 오픈빌더(블록/시나리오)
                      │ 스킬 호출 (HTTPS POST)
                      ▼
       Supabase Edge Function: kakao-chatbot-skill
                      │
                      ▼
            카드/버튼 JSON 응답
```

---

## 1. 카카오 비즈니스 채널 개설

1. <https://center-pf.kakao.com> 접속 후 카카오 계정으로 로그인
2. **새 채널 만들기** → 채널 이름/검색용 아이디/카테고리(웨딩/결혼) 입력
3. 프로필 이미지로 `public/dewy-logo.png` 업로드, 소개 글 작성
4. 채널을 **공개 / 검색 허용** 으로 전환 (테스트 단계에서는 비공개 가능)
5. 채널 URL과 **검색용 아이디**(`@dewy` 등) 메모 — 이후 마케팅/딥링크에 사용

> 챗봇을 붙이려면 **카카오 비즈니스 채널**이어야 합니다(개인 채널 X). 비즈니스 채널 전환은 사업자 정보가 필요하고 무료입니다.

## 2. 카카오 i 오픈빌더에서 챗봇 생성

1. <https://i.kakao.com> 접속 (카카오 i 오픈빌더)
2. **봇 만들기 → 카카오톡 챗봇** 선택, 봇 이름 입력
3. **운영채널 연결** 에서 1번에서 만든 채널을 연결
   - 비즈니스 채널 인증이 끝나지 않았다면 "개발용 운영"으로도 테스트 가능

## 3. 스킬(Skill) 등록 — Vercel API Route 연결

> ⚠️ Supabase Edge Function은 API 게이트웨이가 `apikey` 헤더를 요구해서, 카카오 i 오픈빌더의 외부 호출이 막힙니다. 그래서 **Vercel Serverless Function** 으로 동일 로직을 노출합니다(파일: `api/kakao-chatbot.ts`). 이 엔드포인트는 인증이 없어서 카카오에서 바로 호출 가능합니다.

이 챗봇은 단일 엔드포인트가 사용자의 발화/액션에 따라 응답을 분기합니다. 스킬은 하나만 만들면 됩니다.

1. 오픈빌더 좌측 메뉴 **스킬 → +스킬 만들기**
2. 입력값:
   - **이름**: `dewy-info-skill`
   - **URL**: `https://<your-vercel-domain>/api/kakao-chatbot`
     - 운영 도메인 예: `https://dewy.kr/api/kakao-chatbot`
     - 프리뷰 배포 URL: `https://<branch>-<project>.vercel.app/api/kakao-chatbot`
   - **요청 방식**: POST
   - **요청 파라미터**: (비워둠 — 카카오 기본 페이로드 사용)
   - **헤더값 입력**: (비워둠 — 별도 인증 헤더 불필요)
3. **저장 → 발화 테스트** 에서 다음을 호출해 응답이 오는지 확인
   ```json
   {
     "userRequest": { "utterance": "서비스 소개" },
     "action": { "name": "about" }
   }
   ```
   `basicCard` 가 포함된 `version: "2.0"` JSON 이 떨어지면 연결 성공입니다.

## 4. 시나리오(블록) 구성

다음 블록들을 만들고 각 블록의 **스킬 데이터**를 위에서 등록한 `dewy-info-skill` 에 연결한 뒤, 스킬 응답을 그대로 출력하도록 설정합니다.

| 블록 이름 | 사용자 발화 예시 | 스킬의 `action.name` |
| --- | --- | --- |
| 웰컴 블록 (기본) | 시작, 안녕, 처음 | `welcome` |
| 서비스 소개 | 서비스 소개, Dewy 뭐야 | `about` |
| 주요 기능 | 기능, 뭐 할 수 있어 | `features` |
| 요금 안내 | 요금, 가격, 결제 | `pricing` |
| 앱 설치 | 앱 설치, 다운로드, 링크 | `install` |
| 폴백 블록 | (매칭 실패 시 자동) | `fallback` |

각 블록에서 스킬을 호출할 때 **추가 파라미터** 로 `action.name` 을 위 표대로 넣어주면 Edge Function이 정확한 카드를 돌려줍니다.

> 블록 단위로 `action.name` 을 지정하지 않아도, Edge Function은 `userRequest.utterance` 의 키워드로 자동 라우팅합니다. 두 방식 모두 지원됩니다.

### 폴백 블록

- 오픈빌더 → **시나리오 → 폴백 블록**
- 스킬에 `action.name = fallback` 으로 호출하도록 설정
- 응답에 "앱에서 더 자세히" CTA 카드가 자동으로 포함됨

### 웰컴 블록

- **시나리오 → 웰컴 블록**
- 사용자가 채널 추가 후 처음 진입 시 호출
- `action.name = welcome` 으로 호출

## 5. 배포 및 운영

`api/kakao-chatbot.ts` 는 Vercel 이 자동으로 서버리스 함수로 배포합니다. 별도 명령 없이 메인 브랜치에 머지하면 운영 URL에 반영됩니다.

```bash
# 로컬 동작 확인 (Vite 와 별도)
vercel dev

# 운영 배포
git push origin main  # Vercel auto-deploy
```

> `vercel.json` 의 SPA rewrite 규칙에 `api` 가 제외 패턴으로 추가되어 있어, `/api/kakao-chatbot` 으로 들어오는 요청이 `index.html` 로 리다이렉트되지 않습니다.

### 환경 변수 (선택)

| 키 | 기본값 | 설명 |
| --- | --- | --- |
| `DEWY_APP_URL` | `https://dewy.kr` | 모든 CTA 버튼이 향하는 웹앱 URL |
| `DEWY_LOGO_URL` | `${DEWY_APP_URL}/dewy-logo.png` | 카드 썸네일에 사용할 로고 이미지 URL |

운영 도메인이 바뀌면 Vercel 대시보드 → **Project → Settings → Environment Variables** 에서 위 값을 덮어쓰세요.

### Supabase Edge Function 은 왜 안 쓰나요?

`supabase/functions/kakao-chatbot-skill` 도 함께 들어 있지만, Supabase 의 API 게이트웨이는 `verify_jwt: false` 라도 `apikey` 헤더(또는 `?apikey=` 쿼리)를 요구해서 카카오 i 오픈빌더 같은 외부 webhook 시스템이 호출하기 까다롭습니다. 운영은 Vercel API Route 를 사용하세요.

## 6. 작동 점검

오픈빌더 우측 상단 **봇 테스트** 패널에서 아래 발화를 차례로 입력해 응답을 확인합니다.

- "안녕" → 웰컴 카드 + 퀵리플라이
- "서비스 소개" → 서비스 설명 + 앱 열기 카드
- "기능" → 리스트 카드(주요 기능)
- "요금" → 요금 안내 + 프리미엄 카드
- "앱 설치" → 앱 열기/카카오 로그인 버튼 2개 카드
- "asdf" 같은 미정의 발화 → 폴백 카드

테스트가 통과하면 우측 상단 **배포** 버튼으로 챗봇을 공개합니다.

## 7. 심사 및 공개

- 카카오톡 챗봇은 공개 전 **카카오 검수** 가 필요합니다 (보통 1~3 영업일).
- 검수 신청 시 시나리오·운영 정책·서비스 설명 자료를 첨부합니다.
- 검수 통과 후 채널 친구 추가 → 챗봇이 자동으로 응답하기 시작합니다.

## 8. 트러블슈팅

- **스킬 응답이 빈 메시지로 보일 때**: 응답 JSON 이 `{ "version": "2.0", "template": { "outputs": [...] } }` 구조인지 확인. `outputs` 가 빈 배열이면 카카오는 메시지를 출력하지 않습니다.
- **"Invalid Json" / 401 오류**: 카카오 스킬 URL 이 Supabase Edge Function 으로 잡혀 있는지 확인 — Vercel API Route (`/api/kakao-chatbot`) 로 바꿔야 합니다.
- **`/api/kakao-chatbot` 이 index.html 을 반환할 때**: `vercel.json` 의 rewrite 규칙에 `api` 가 제외 패턴에 포함돼 있는지 확인.
- **카드 이미지가 안 보일 때**: `DEWY_LOGO_URL` 이 HTTPS 이고, 카카오에서 접근 가능한 절대 URL 인지 확인.
- **버튼 링크가 인앱 브라우저에서만 열림**: 정상 동작. 외부 브라우저로 강제 이동하려면 카카오에서 제공하는 `extra` 옵션 또는 별도 랜딩 페이지가 필요합니다.
