# AI 이미지 생성 기능 아키텍처 (청첩장 제외) — 260701

> 요청: "청첩장 생성 외 이미지 생성 기능 아키텍처 정리." AI 스튜디오의 생성 기능(드레스·메이크업·
> 헤어·스드메·사진보정·컨설팅)을 실측 매핑. 청첩장 생성(invitation-illustration/cutout/retouch/mirror)은 제외.

## 1. 공통 파이프라인 (전 기능 동일 골격)
```
사용자 사진 업로드 ──▶ Storage(*-uploads) ──▶ Edge Function(dewy-*/photo-enhance/consulting)
   │                                              │
   │                          ┌──── (일부) Gemini 사전 분석·추천 ────┐
   │                          ▼                                       │
   └───────────────▶ OpenAI images/edits (gpt-image-2) ◀─────────────┘
                                 │
                     결과 이미지 ──▶ Storage(*-results) ──▶ MyResults(내 결과물)
                     잡 상태 ──▶ DB(*_fittings·*_jobs·*_previews·consulting_reports): pending→done/refunded
```
- **이미지 생성기(단일 코어)**: **OpenAI `gpt-image-2`** (`https://api.openai.com/v1/images/edits`) — 전 기능 공통.
  단일 소스 `supabase/functions/_shared/llm.ts`(`MODELS.image`).
- **보조 LLM(분석·추천)**: **Gemini** `2.5-flash`(헤어 9그리드 추천)·`2.5-pro`(컨설팅 비전 분석).
- **비동기**: `EdgeRuntime.waitUntil`로 백그라운드 생성(요청은 즉시 job id 반환, 폴링/알림으로 완료).
- **과금**: 하트 `spend_hearts` RPC(기능별 5~30) + 첫사용 50% 할인(`*_usage` 테이블) + 실패 시 `earn_hearts` 환불.
- **관측**: 각 job 테이블 status. 임시 업로드 정리 = `cleanup-ai-uploads`.

## 2. 기능별 매핑
| 기능 | 프론트(page) | Edge fn | 생성기 | 잡 테이블 / 결과 버킷 | 하트 | 성별 |
|---|---|---|---|---|---|---|
| 방구석 드레스 투어 | `DressFitting.tsx` | `dewy-fitting` | OpenAI | `dress_fittings` / `dress-results` | 5 | **신부만** |
| 드레스 체형추천 | DressFitting→recommend | `dewy-dress-recommend` | OpenAI | `dress_fittings`(mode=recommend) | 5 | **신부만** |
| 착붙 메이크업 | `MakeupFitting.tsx` | `dewy-makeup` | OpenAI | `makeup_fittings` / `makeup-results` | 5 | **신부만** |
| 메이크업 추천 | MakeupFitting→recommend | `dewy-makeup-recommend` | OpenAI | `makeup_fittings`(recommend) | 5 | **신부만** |
| 헤어 변형 미리보기 | `HairPreview.tsx` | `dewy-hair-preview` | **Gemini추천 + OpenAI생성** | `hair_preview_jobs`·`hair_preview_usage` / `invitation-uploads/{u}/hair/` | 5 | **신부만**(`bride.png` 하드코딩) |
| 스드메 완성본 | `SdmPreview.tsx` | `dewy-sdm` | OpenAI | `sdm_previews` / `sdm-results` | 10 | **신부만** |
| 사진 체형보정 | `PhotoFix.tsx` | `photo-enhance-batch` | OpenAI | `photo_retouch_jobs`·`photo_retouch_usage` | 5/장(≤35) | **성별무관** ✅ |
| 2026 웨딩컨설팅 | `WeddingConsulting.tsx` | `wedding-consulting` | **Gemini분석 + OpenAI보드** | `consulting_reports`·`consulting_boards` | 10/섹션 | **신부만** |

- 결과 뷰 공통: `MyResults.tsx`(내 결과물 모아보기 — 헤어·드레스·메이크업·보정·컨설팅 탭).
- 컨설팅은 2단 팬아웃: START(비전 분석·하트 차감) → BOARD(섹션별 A4 보드 self-invoke) → `consulting_board_done` RPC.

## 3. 신랑/신부(성별) 갭 — 실측
- **role(bride/groom) 신호는 존재**(`user_wedding_settings.role`, `useWeddingSchedule`/`usePersonaInsights`로 읽음)
  하지만 **이미지 생성 경로엔 전달되지 않는다.** (P3 는 카드 *순서*만 role 로 바꿨고, 생성 프롬프트는 신부 전제.)
- **6/8 기능이 신부 전제** 프롬프트(IDENTITY/FACE_LOCK "her", 신부 메이크업·헤어·드레스). `photo-enhance`만 성별무관.
- 대표 하드코딩: `dewy-hair-preview` 가 업로드 blob 을 `"bride.png"` 로 고정(신부 가정).

## 4. 신랑 지원에 필요한 변경(플랜 초안)
1. **프론트**: 각 기능 요청 body 에 `role`(bride/groom) 파라미터 배선. 온보딩 role 을 기본값으로,
   기능 진입 시 성별 토글(기본=내 role) — 없으면 신부 유지(회귀 0).
2. **Edge 프롬프트 성별 분기**: 남성 IDENTITY/FACE_LOCK, 남성 헤어(길이·스타일)·**예복(수트)** 후보,
   남성 그루밍 메이크업(선택). 드레스→예복으로 도메인 치환.
3. **hair-preview**: `bride.png` 동적 파일명 + 남성 헤어 9그리드 프롬프트(`STYLE_GRID`/`COLOR_GRID` 남성판).
4. **consulting**: 비전 분석 스키마(ANALYSIS_GUIDE) 신랑판(수트·셔츠·타이·그루밍) 또는 남녀 통합 스키마.
5. **점진 착수 권장 순서**(ROI): ① 헤어(남성 헤어 수요 큼·구조 단순) → ② 예복(드레스 파이프 치환) →
   ③ 컨설팅 신랑 섹션 → ④ 메이크업(남성 그루밍, 수요 낮음). 사진보정은 이미 성별무관(불필요).

## 5. 검증 메모(정직)
- 이번 세션 P3 는 카드 *정렬 로직*만 유닛테스트(8케이스). **실제 스튜디오 화면·신랑 e2e 미확인**(현재 신랑
  생성 자체가 없음). 위 신랑 지원은 신규 기능 개발 건 — 프롬프트 남성판이 실제 작업량의 핵심.
