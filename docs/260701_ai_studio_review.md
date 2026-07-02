# 260701 — AI 스튜디오 아키텍처 리뷰: 경쟁툴 전수조사 + 분석 + 개선

> 요청: "메이튜·스노우 등 AI 편집툴 전수조사 → 이 서비스의 AI 스튜디오 아키텍처·이미지분석·
> 프롬프트 분석·개선. 결과물은 **웨딩촬영·본식 당일 모습 미리보기**에 초점 — 당일은 외모
> 최고점(전문 헤어·메이크업·조명·작가 보정)이므로 **보정 강도 조절** 제공."
> 조사 소스: 웹 리서치(2026-07-01), 커뮤니티 프롬프트 서베이, 레포 전체 코드 분석.

## TL;DR

- **P0 2건 수정**: ① 스드메 얼굴사진 30일 자동삭제가 무동작(no-op)이던 버그(개인정보처리방침
  위반 지속) ② 멈춘 스드메 잡(10하트)이 영구 미환불이던 reaper 공백.
- **아키텍처 개선(핵심)**: 이미지 생성 프롬프트 조립을 **클라이언트 → 서버로 이관**(신뢰 경계
  확립). 기존엔 인증 사용자가 임의 프롬프트를 보내 회사 OpenAI 키로 어떤 이미지든 생성 가능
  했다(무료 하트 적립 경로 존재 → 사실상 무료 임의 생성 + 콘텐츠 정책·브랜드 리스크).
- **보정 강도(리터치 레벨) 신설**: natural(자연 그대로) / studio(화보 보정, UI 기본) / glam(풀
  보정) 3레벨 — 어느 레벨에서도 얼굴 기하·비대칭·정체성은 불변(프롬프트 보장). 드레스 투어·
  드레스 추천·메이크업·메이크업 추천·스드메 5개 플로우 전체 적용.
- **중복 제거**: 5개 엣지 함수의 복붙 골격(인증·차감·환불·다운로드·OpenAI 호출)을
  `_shared/studioEdge.ts` 로 단일화. 프롬프트 모듈은 `_shared/studio/*` 단일 소스로 이관하고
  웹(`packages/*`)은 재수출 심으로 전환(드리프트 0).
- **동기/비동기 통일**: dress-recommend·makeup-recommend 가 동기(200) 응답이라 워커 월클럭 킬
  시 하트 유실 위험 → dewy-fitting 과 같은 202+폴링 패턴으로 통일(reaper 가 커버).

---

## 1. 경쟁 AI 편집툴 전수조사 (요약)

상세 수치·URL 은 조사 시점(2026-07-01) 웹 소스 기준.

| 앱 | 웨딩 관련 핵심 | UX 패턴 | 가격(KRW) | 기술 |
|---|---|---|---|---|
| **SNOW**(네이버) | AI 프로필 30장 팩(웨딩 컨셉 포함), AI 증명사진 | 셀피 10~20장, **사진 품질 가이드 명시**(생얼·모자/선글라스 금지·1인·얼굴 크게), 비동기+푸시 | Standard(24h) 2,200~3,300 / **Express(1h) 6,600 — 속도 티어 이원가격** | 퍼유저 얼굴학습(LoRA류). 이용자 여성 80%·iOS 75%·20대 55% |
| **EPIK**(스노우) | AI 이어북 60장 — "강한 단일 컨셉"이 범용보다 크게 히트 | 정면+측면 각도 다양성 8~12장 요구 | 24h 5,500 / 2h 8,800, PRO 월 5,500 | 동일 계열 |
| **캐럿 CARAT** | 드레스 화보 컨셉 | **매일 1회 무료**(리텐션 훅), ~10분 | 팩 6,000 | — |
| **Remini** | AI Headshots·Baby AI, 복원 before/after 슬라이더 | 셀피 8~12장 | 주 $9.99 구독 | **프라이버시 수치 공시 모범**: 원본 1일·얼굴데이터 7~20일 후 삭제. 바디 임의보정 논란(옵트인 필요 교훈) |
| **Lensa** | Magic Avatars 50~200장 | 10~20장, ~20분 | 50장 $3.99~200장 $7.99(장수 팩) | 퍼유저 SD 파인튜닝, 학습 후 즉시 삭제 |
| **메이튜 Meitu** | AI 인물보정·실사화 필터(2025 한국 바이럴), 배경 편집 | **일 3회 무료 → VIP 업셀** | VIP 월 9,900 | — |
| **妙鸭 Miaoya** | 디지털 분신 1회 학습 → 39+ 템플릿 반복 착장 | 20장(전신·중간·클로즈업 명시), **"More Like Me" 유사도 슬라이더** | 최초 1,900원 바이럴 | **아바타 재사용 모델 — Dewy 에 가장 이식성 높음** |
| **FaceApp** | 헤어스타일·컬러·메이크업 필터 1장 즉시 | 단일샷 GAN | Pro 연 $19.99 | 원산지 신뢰 논란 사례 |
| **YouCam**(Perfect Corp) | AR 메이크업 실시간(200+ 랜드마크), 생성형 헤어, **웨딩드레스 트라이온 B2B** | 라이브 온디바이스 | 구독 | 트라이온 → **전환율 2.5배** 실적(업체 연결 근거 데이터) |
| **PhotoDirector** | **웨딩드레스 아바타 트라이온 공식 상품화**(신랑 턱시도판 별도) | 13~20장 학습 | 연 $39.99 | — |
| **Nano Banana 트렌드** | 커플 셀피 1~2장 → 프리웨딩 화보(2025-09~ 글로벌 바이럴) | 프롬프트 컬렉션 장르화 | — | **단일샷 컨텍스트 편집이 팩 학습형을 대체 중** — Dewy 의 gpt-image edits 접근과 동일 계열 |

**베스트 프랙티스 → Dewy 적용 판정**

| 패턴 | 업계 표준 | Dewy 현재 | 이번 적용 / 로드맵 |
|---|---|---|---|
| (a) 결제 전 사진 품질 게이트 | 전 앱 공통(무효 사진 업로드 시점 반려) | 파일크기·mime 만 검사 | ⬜ 로드맵 P1 — 얼굴검출·블러·다인 게이트 |
| (b) 비동기 잡+알림, 속도 티어 | SNOW 2,200/6,600 이원가격 | 202+폴링(2곳은 동기였음) | ✅ 동기 2곳 비동기 통일 / 속도 티어는 로드맵 |
| (c) 컨셉 팩 머천다이징 | EPIK 이어북 | 씬 6종 | ⬜ 로드맵 — 스드메 리허설·야외스냅·한복 팩 |
| (d) 결과 갤러리·공유·전환 고리 | 30~60장 팩, before/after | 1장·갤러리 있음 | ⬜ 로드맵 — before/after 슬라이더·업체 견적 연결 |
| (e) 정체성 보존 기대치 | 유사도 불만 = 1위 이탈 사유, 妙鸭 More Like Me | identity lock 정교 | ✅ **보정 강도 3레벨**(정체성 불변 유지) |
| (f) 무료 훅 | 캐럿 일1회·메이투 일3회 | 헤어·컨설팅 첫회 50% | ⬜ 로드맵 — 일일 무료/할인 통일 검토 |
| (g) 보관기간 수치 공시·안전 | Remini 모범 | 30일 삭제(정책) — **스드메는 실제로 안 지워짐** | ✅ P0 수정 / 공시 문구·워터마크는 로드맵 |

**전략 시사점**: 일회성 프로필 팩은 붐-버스트(SNOW MAU -30%). Dewy 는 준비 여정(드레스 비교→
업체 견적문의)에 묶인 **반복 유틸리티 + 전환 고리**로 설계해야 하며, 이는 타 앱이 못 가진 해자다.

### 커뮤니티 웨딩 프롬프트 서베이 (웨딩촬영·본식 미리보기 관점)

- **표준 프롬프트 구조**(커뮤니티 최다 유통): [롤: world-class wedding photographer] →
  [Identity Lock] → [장면: 장소+의상+포즈+감정(동작으로)] → [카메라/렌즈: 85mm f/1.4 등] →
  [조명 레시피] → [보정 강도] → [네거티브]. 현 Dewy 프롬프트와 골격 일치 — 카메라/렌즈 앵커만 부재.
- **보정 3레벨 어휘**(이번 retouch.ts 에 반영):
  natural = `visible pores, natural skin grain, documentary` /
  studio = `smooth skin without losing texture, brighten under-eyes, even tone, professional
  color grade, protect white garment neutrality` /
  glam = `Vogue-style editorial, ultra-high-detail retouching, glossy magazine finish`.
- **본인다움의 핵심 = 얼굴 비대칭 보존**(`preserve facial asymmetry, ethnic features`) — 반영함.
- **안티패턴**: ① 플라스틱 피부("realistic"만 쓰면 오히려 이상화 — 결점을 명시적으로 허가)
  ② **연쇄 편집 3~4회부터 얼굴 열화** — 항상 원본에서 재생성(운영 규칙) ③ 흰 드레스가
  아이보리로 오염되는 웜 캐스트(`white garment neutrality` — 반영함) ④ 커플 아이컨택 렌더 붕괴
  (`foreheads touching, eyes closed` 포즈로 회피).
- **한국 특화 공백 = 기회**: 웨딩홀 버진로드·신부대기실·폐백 프롬프트는 공개 커뮤니티에 사실상
  없음. Dewy 의 CEREMONY 씬(빈 홀·버진로드 입장)은 이미 이 공백을 채우는 자산 — 신부대기실·
  한복/폐백(부위 명칭: jeogori·chima·otgoreum·norigae·binyeo) 씬 확장이 차별화 지점.

### 쓰레드(Threads) 프롬프트 서베이 (260702 추가 — 후속 PR)

> 한계 고지: threads.com 직접 fetch 는 egress 정책상 차단 — 검색 인덱스에 노출된 본문
> 스니펫 + 2차 소스(블로그·기사) 기반. 댓글로 유통되는 프롬프트 전문 일부는 미확보.

- **유통 구조**: 프롬프트 나눔 계정(@jeju_harry 허브, @miniminim71 등)이 본문에 예시
  이미지 + "프롬프트는 댓글에" 포맷으로 배포, 팔로우/DM 유도. 나노바나나 누적 5억 장+,
  사리(전통의상 변신) 트렌드만 2억 장+ — **웨딩/격식 착장 변신이 최대 유스케이스군**.
- **표준 문형** = ① 문두 identity 선언("This is the reference copy the face and don't
  change facial feature") ② 신부 완성 상태 서술(gown+veil+bouquet — 착장 서술만으로
  브라이덜 헤어·메이크업이 자동 완성됨) ③ 장면 ④ 렌즈·비율(85mm/105mm macro, 4:5)
  ⑤ 감정은 행동으로("groom wiping a tear" > "happy"). 한국어 최소형: "우아한 웨딩드레스
  입고 멋진 예식장에 서있는 모습으로 그려줘"(@bboya0704).
- **불만 1순위 = 얼굴 바뀜**: "헤어 정리·피부 보정하다 원본 얼굴과 달라진다"(@jeju_harry
  팔로워 다수) → "원본 얼굴 유지 강화 버전"(이목구비 그대로, 헤어·피부만 최소 적용)이
  별도 바이럴. 통용 고정구: "the exact same face as the uploaded image, no alteration,
  100% identical" / "얼굴, 옷, 포즈는 그대로 유지". → Dewy identity lock 이 이미 이보다
  정교(이목구비 항목별+비대칭) — 방향 검증됨.
- **분석→생성 결합은 시장 공백**: 쓰레드에선 분석형 프롬프트(얼평·퍼컬·골격 컨설팅)와
  변신형 프롬프트가 따로 유통 — "얼굴형·퍼컬 분석 → 어울리는 스타일 선택 → 생성"을 한
  흐름으로 묶은 사례 미발견. 예비신부 수요는 오프라인 퍼컬 16타입+골격진단 상품
  (@colorzoomin)의 인기로 입증. → **본 개편의 TAILORED(무언분석) 블록이 이 공백을 선점**.
- **반영**: ① 결과물 기준을 "웨딩 당일"로(일상 복사 앵커 제거 — WEDDING-DAY HAIR/MAKEUP/
  GROOMING 섹션) ② 맞춤 모드 TAILORED 무언분석 ③ shotFramingBlock 에 렌즈 앵커(전신
  50mm·상반신 85mm·클로즈업 105mm macro 룩) 추가.

---

## 2. 현 아키텍처 분석

허브(`AIStudio.tsx`) → 7개 독립 플로우(컨설팅·스드메·드레스투어/추천·메이크업/추천·헤어·포토픽스).
공통 패턴: 업로드 → (프롬프트 조립) → 엣지 함수 → 하트 차감 → row 생성 → gpt-image →
결과 버킷 → 폴링. 이미지 생성 = OpenAI `gpt-image-2` images/edits(모델 단일 소스
`_shared/llm.ts`), 분석 = Gemini Flash(헤어 추천) / OpenAI Responses(컨설팅 12타입 퍼스널컬러).

**이미지 분석 2계열**
1. **모델 암묵 분석**(드레스/메이크업 추천·스드메): 별도 비전 단계 없이 gpt-image 가 "분석+디자인+
   적용"을 한 번에. 비용 최소·지연 최소, 분석 근거는 사용자에게 안 보임.
2. **명시 구조화 분석**(헤어·컨설팅): Gemini structured output(후보 목록 whitelist + fit% 랭킹) /
   Responses JSON(12서브타입·hex 스와치·부위별 fit). 컨설팅의 `[DATA] 바인딩 + WIREFRAME` 보드
   프롬프트는 수준급.

**잘 된 것**: 정체성 고정 프롬프트의 정교함(이목구비 항목별 명시·비대칭 인지), 씬 promptBlock
품질(빈 홀 강제 등), 하트 차감→실패 환불 경로 전반, 컨설팅 fan-out(월클럭 회피)·reaper·빈 분석
검증, 헤어의 whitelist 검증 + 폴백, 30일 삭제 인프라, `label(표시) vs value(매칭)` 분리 관행.

**발견 이슈(수정 전)**

| # | 심각도 | 이슈 |
|---|---|---|
| 1 | **P0** | `cleanup-ai-uploads` 의 `TARGET_BUCKETS` 에 `sdm-uploads/sdm-results` 누락 — RPC(20260626100000)는 반환하는데 함수가 걸러내 **스드메 얼굴사진 30일 삭제가 no-op**(개인정보처리방침 위반 지속) |
| 2 | **P0** | `reap_stuck_generation_jobs()` 에 `sdm_previews` 블록 없음 — 워커 킬 시 10하트 잡 영구 pending·미환불(`idx_sdm_previews_pending` 인덱스만 있고 소비자 없음). hair 블록은 원격에만 적용돼 리포 파일 stale |
| 3 | **P1(보안·비용)** | dewy-fitting/sdm/makeup/dress-recommend/makeup-recommend 가 **클라이언트가 조립한 `body.prompt` 를 그대로 신뢰** — 인증 사용자가 임의 프롬프트로 회사 OpenAI 키 사용 가능(무료 하트 경로 존재), identity/워터마크 금지 규칙 제거 가능, prompt_params 기록과 실제 프롬프트 괴리(감사 공백) |
| 4 | P1 | dress-recommend·makeup-recommend 가 **동기(200)** — 30~60초 블로킹, 워커 월클럭 킬 시 응답 유실(reaper 는 있음), 나머지 플로우와 UX 불일치 |
| 5 | P2 | 5개 함수에 json/download/base64/markFailed/refund 헬퍼 **복붙 5벌**(드리프트 위험) |
| 6 | P2 | identity lock 문구가 6곳에 상이한 표현으로 중복(subjectPrompt·fittingScenes·makeupScenes·sdmPrompt·consulting SHARED×2) |
| 7 | P2 | 에러코드 매핑 불일치 — photoFix/consulting 만 `error.context.json()` 파싱, dress/sdm/makeup 은 raw throw(하트 부족 UX 플로우별 상이) |
| 8 | P2 | OpenAI 호출 재시도/백오프 없음(일시 429 → 전체 실패·재결제 UX) |
| 9 | P2 | 결제 전 이중클릭 멱등성 없음(빠른 더블탭 = 이중 차감·이중 잡) |
| 10 | P3 | `ai_prompts` 런타임 오버라이드 인프라가 스튜디오 이미지 프롬프트에 미연결(어드민 핫픽스 불가) |
| 11 | 제품 | **보정 강도 부재** — 전 프롬프트가 "Do NOT beautify" 일괄 강제 → "본식 당일(전문 보정된) 모습 미리보기" 목적과 불일치(요청자 지적 사항) |

---

## 3. 이번에 적용한 개선

### 3.1 P0 수정
- `supabase/functions/cleanup-ai-uploads/index.ts` — `TARGET_BUCKETS` 에 sdm 2버킷 추가(이슈 1).
- `supabase/migrations/20260701100000_reap_sdm_hair_jobs.sql` — reaper 에 `sdm_previews` +
  `hair_preview_jobs` 블록 추가(전체 함수 멱등 재정의, 이슈 2). hair 블록 리포 정착 포함.

### 3.2 프롬프트 신뢰 경계 — 서버 조립 이관 (이슈 3·4·5·11)
- **단일 소스 이동**: 프롬프트 빌더·씬·어휘 사전을 `supabase/functions/_shared/studio/` 로 이관
  (fittingScenes·makeupScenes·sdmPrompt·shotTypes·bodyShapes·dressDescription·makeupDescription
  + 신규 retouch·stylePreference). 순수 TS(플랫폼 API 없음)로 **Deno·Vite 겸용**. 웹의
  `packages/shared/src/data/*`·`packages/lib/src/{dress,makeup}Description.ts` 는 재수출 심 —
  기존 `@/data`·`@/lib` 경로 유지, 사본 0(드리프트 방지 원칙 준수).
  주의: **프롬프트 수정은 이제 `supabase/functions/_shared/studio/` 에서** — main 머지 시 함수
  배포 paths 필터도 올바르게 트리거된다.
- **서버 계약(v2)**: 클라이언트는 구조화 파라미터만 전송, `prompt` 필드는 수신 자체를 안 함.
  - 공통: `scene_code`(사전 검증) · `shot_type`(enum) · `gender` · `retouch_level`(enum)
  - dewy-fitting: `dress_sample_id`(메타 **서버 조회**) | `custom_dress`(enum 객체 — 사전 기반
    직렬화라 주입 불가) | `suit_text`(신랑 자유 텍스트: 제어문자 제거·300자 제한, SUIT SCHEMA
    슬롯에만 삽입)
  - dewy-dress-recommend: `body_shape`(BODY_SHAPES 코드 검증 → 가이드 서버 조회) +
    `style_preference`(개인화 구조화 슬롯 — 항목 40자·목록 4개 제한·허용문자 필터)
  - dewy-makeup: `makeup_sample_id`(메타 서버 조회) | `custom_makeup`(enum 객체)
  - dewy-makeup-recommend: `style_preference` 슬롯
  - dewy-sdm: 위 조합 + `hair_style` 은 성별별 허용 목록(sdmHairStyles)만 통과
  - 남는 자유 텍스트 표면 = `suit_text` + style_preference 토큰뿐이며, 둘 다 identity/금지 규칙
    섹션을 건드릴 수 없는 슬롯 내부 삽입 + 살균. (완전 whitelist 화는 수트 카탈로그 도입 시)
- **골격 공용화**: `_shared/studioEdge.ts` — 인증(getClaims)·json 응답·스토리지/URL 다운로드·
  base64·`callImageEdit`(OpenAI 호출+에러코드화)·`spendHearts`·`makeJobFailureHandlers`(테이블·
  환불사유 파라미터화 — 기존 reason 문자열 유지)·`runInBackground`. 5개 함수 전부 이 골격 사용.
- **비동기 통일**: dress-recommend·makeup-recommend 를 202+`EdgeRuntime.waitUntil`+폴링으로 전환.
  FE 는 원래 `fitting_id` 만 읽고 결과 페이지에서 폴링하므로 **응답 계약 호환**(reaper 커버 확인).
- **구 클라이언트 호환**: 배포 전환 창(수 분)에 구 웹이 v1 body(prompt 포함)를 보내면 서버는
  prompt 를 무시하고 구조화 필드로 조립 — `shot_type` 미전송은 full 폴백, 맞춤 드레스 미전송은
  기본 드레스 문구 폴백(성능 저하일 뿐 실패 없음). scene_code·body_shape·hair_style·sample_id 는
  v1 도 보내므로 카탈로그·추천 경로는 완전 호환.

### 3.3 보정 강도(리터치 레벨) — 요청 사항 (이슈 11)
- 설계 전제: **웨딩촬영·본식 = 외모 최고점**(전문 헤어·메이크업·조명·작가 후보정). 미리보기가
  이를 반영하되, 유사도 불만(경쟁앱 1위 이탈 사유)을 피하기 위해 **정체성은 전 레벨 불변**.
- `_shared/studio/retouch.ts`(단일 소스, 커뮤니티 3레벨 어휘 반영):
  - `natural` 자연 그대로 — 블록 미삽입(기존 프롬프트 그대로 = 서버 기본값·구 클라 회귀 0)
  - `studio` 화보 보정(**UI 기본값**) — "한국 웨딩 스튜디오 납품본": 질감·모공 유지 스무딩,
    톤 정리·잡티/다크서클 제거·언더아이 밝힘·눈 생기·전문 컬러 그레이드(피부 언더톤·흰 드레스
    중립 보호)
  - `glam` 풀 보정 — 매거진 커버급: 광택 마감·플라이어웨이 정리·시네마틱 그레이드("natural
    texture 유지" 지침을 의도적으로 완화한다고 명시)
  - 모든 레벨: "NEVER alter facial geometry, feature shapes, proportions, **facial asymmetry**,
    ethnic features, age, body shape" — 보정은 피부 마감·조명·폴리시에만.
- 삽입 위치: fitting/recommend 는 VENUE 직전, 메이크업은 LIGHTING 직전, 스드메는 BACKGROUND
  직전(스모크 렌더로 확인). `prompt_params.retouch_level` 로 기록(감사·재현).
- FE: `src/components/fitting/RetouchLevelPicker.tsx`(라디오 3칩, ≥44pt 터치 타깃,
  role=radiogroup + aria) — 5개 플로우 review 단계에 삽입. "얼굴 생김새는 어떤 강도에서도
  바뀌지 않아요" 신뢰 카피 포함.
- 적용 범위: 드레스 투어(신부/신랑)·드레스 추천(신부/신랑)·메이크업·메이크업 추천·스드메.
  헤어 미리보기·컨설팅 보드는 목적이 "스타일 비교/분석"이라 제외(로드맵에서 재검토).

### 3.4 개인화 유지 (초개인화 차원)
- 기존 클라 애드덤(`buildDressPromptAddendum` 등)은 서버 이관 시 유실될 뻔 → `style_preference`
  구조화 슬롯으로 이관. FE 매퍼 `toStylePreferencePayload()`(weddingContext.ts), 서버 렌더러
  `_shared/studio/stylePreference.ts`(살균 + 기존과 동일한 "STYLE PREFERENCE (secondary)" 골격).
  → 컨설팅 신호(퍼스널컬러·실루엣·립톤)가 추천 생성에 계속 반영(교차 surface 일관성 유지).

### 3.5 검증
- `npm run build` ✅ / `npm run test` 1293/1293 ✅ / `npm run lint` 0 error ✅ /
  `check:integrity` 0 error ✅ / 8개 엣지 함수 esbuild 번들 ✅.
- 프롬프트 스모크 렌더(esbuild+node): 레벨별 RETOUCH 블록 유무·삽입 위치·natural=기존 동일·
  신랑 대명사·style_preference 주입 살균(개행 지시문·태그 제거) 확인.
- **한계 명시**: 실제 gpt-image 생성 e2e(보정 레벨별 화질·유사도)는 sandbox 에서 불가 —
  배포 후 실기기에서 studio/glam 결과의 유사도·피부 질감을 눈으로 확인 필요(특히 glam 레벨이
  과미화로 "내가 아님"이 되지 않는지). `admin/prompts` 카탈로그로 렌더된 프롬프트 검수 가능.

---

## 4. 개인화 기회 매트릭스 (AI 스튜디오 surface × 신호 × 깊이)

| Surface | 가용 신호 | 현재 깊이 | 목표 깊이(여지) |
|---|---|---|---|
| 드레스 추천 | 체형(자가선택)·퍼스널컬러(컨설팅)·선호 태그 | ④ 생성형 맞춤 + 추천이유(가이드) | ⑤ 컨설팅 분석 자동 주입(체형 자가선택 → 사진 분석 대체), taste 스와이프 신호 연동 |
| 메이크업 추천 | 퍼스널컬러·립/치크/아이 톤 | ④ | ⑤ 추천 이유 텍스트 표면화(현재 이미지에만 반영, 근거 미노출) |
| 스드메 미리보기 | 씬·헤어·드레스·메이크업 선택 | ③ 조합 큐레이션 | ④ 컨설팅 결과로 기본값 프리필(현재 전원 빈 값에서 시작) |
| 헤어 미리보기 | Gemini 얼굴 분석 → fit 랭킹 | ⑤ (모범) | 교차: 추천 스타일을 스드메 헤어 기본값으로 |
| 드레스 투어 | D-day·페르소나(카드 정렬만) | ② | ③ 찜한 업체 드레스/제휴 업체 카탈로그 연결(전환 고리) |
| 결과 갤러리 | 생성 이력 | ① | ③ A/B 비교 뷰·마음에 든 스타일 → 업체 견적문의 CTA |

---

## 5. 남은 작업 (deferred 로드맵, 우선순위순)

1. **P1 사진 품질 사전 게이트**(하트 차감 전): 얼굴 1개·최소 해상도·블러·가림 검사(경쟁 전앱
   공통 — CS·환불 분쟁 예방). Gemini Flash 저비용 판정 or 클라 얼굴검출.
2. **P1 OpenAI 재시도/백오프**: `callImageEdit` 에 429/5xx 1회 재시도(공용화로 이제 1곳 수정).
3. **P1 이중클릭 멱등성**: 요청 idempotency key(클라 UUID) 또는 진행중 잡 존재 검사.
4. **P2 에러코드 매핑 통일**: dress/sdm/makeup 데이터 레이어도 `error.context.json()` 파싱
   (photoFix 패턴 재사용) — 하트 부족 UX 일관화.
5. **P2 identity lock 문구 단일화**: subjectPrompt·fittingScenes·makeupScenes·sdmPrompt·
   consulting 6벌 → `studio/identity.ts` 한 벌(이번 이관으로 물리적 준비 완료).
6. **P2 보관기간 수치 공시 + 처리 직후 원본 삭제**: 업로드 원본은 생성 완료 시 즉시 삭제
   가능(30일 대기 불필요 — Remini 모범). 개인정보처리방침 문구에 수치 명시.
7. **P2 컨셉 팩 머천다이징**: 신부대기실·한복/폐백(부위 명칭 사전)·야외 스냅 씬 추가 — 한국
   특화 공백(커뮤니티에 없음 = 차별화). EPIK 교훈: 강한 단일 컨셉이 히트.
8. **P3 before/after 슬라이더 + 업체 전환 고리**: 결과 페이지에서 원본 비교, 마음에 든 드레스
   → 유사 실루엣 입점 업체/견적문의 연결(YouCam 전환 2.5배 근거).
9. **P3 속도 티어/일일 무료**: SNOW Standard/Express 검증 모델, 캐럿 일1회 무료 훅 — 하트
   경제와 통합 설계 필요(전상법 환불 규정 유의).
10. **P3 `ai_prompts` 연결**: 서버 조립으로 물리적 준비 완료 — retouch 블록·씬 블록을
    `getPrompt()` 오버라이드 가능하게(어드민 핫픽스).
11. **P3 생성물 AI 라벨/워터마크 + "실제 시술 결과와 다를 수 있음" 고지**: 작가·업체 분쟁
    예방(2026 커뮤니티 이슈), 컨설팅·스드메 결과 페이지 우선.
12. **운영 규칙(문서화)**: 연쇄 편집 금지 — 결과물 위 재편집 3~4회부터 얼굴 열화. 재생성은
    항상 원본 업로드에서.

## 6. 변경 파일

- 신규: `supabase/functions/_shared/studio/{retouch,stylePreference,fittingScenes,makeupScenes,sdmPrompt,shotTypes,bodyShapes,dressDescription,makeupDescription}.ts`,
  `supabase/functions/_shared/studioEdge.ts`, `src/components/fitting/RetouchLevelPicker.tsx`,
  `supabase/migrations/20260701100000_reap_sdm_hair_jobs.sql`, `packages/shared/src/data/retouch.ts`
- 재작성(서버 조립): `supabase/functions/{dewy-fitting,dewy-dress-recommend,dewy-makeup,dewy-makeup-recommend,dewy-sdm}/index.ts`
- 수정: `supabase/functions/cleanup-ai-uploads/index.ts`, 5개 페이지
  (DressFitting·DressRecommend·MakeupFitting·MakeupRecommend·SdmPreview),
  `packages/lib/src/weddingContext.ts`(+`toStylePreferencePayload`)
- 심 전환: `packages/shared/src/data/{fittingScenes,makeupScenes,sdmPrompt,shotTypes,bodyShapes}.ts`,
  `packages/lib/src/{dressDescription,makeupDescription}.ts`
