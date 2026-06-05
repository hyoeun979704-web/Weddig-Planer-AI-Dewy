# 네이버 검색광고(파워링크) 키워드 ↔ 랜딩 · UTM 매핑

> 목적: 소액 CPC 테스트로 "어떤 키워드가 실제 설치·가입으로 이어지는지" 데이터 확보.
> 원칙(전략 3순위): **연결 URL = 플레이스토어가 아니라 공식 랜딩페이지.** 사용자가 설치 전
> "이 앱이 뭔지" 이해해야 전환율이 오르고, AEO/SEO에도 공식 랜딩이 유리하다.
> 랜딩은 이미 배포된 한글 가이드 페이지를 그대로 사용(중복 제작 불필요).

## UTM 규칙 (marketing-plan.md 공통 토대 준수)

| 파라미터 | 값 | 설명 |
|---|---|---|
| `utm_source` | `naver_sa` | 네이버 검색광고(Search Ad) |
| `utm_medium` | `cpc` | 유료 클릭 |
| `utm_campaign` | `app_install_2026q3` | 캠페인 단위(분기) |
| `utm_term` | `{키워드}` | 검색 키워드 |
| `utm_content` | `{랜딩 슬러그}` | 소재/랜딩 구분 |

> GA4 / `src/lib/behavioralSignals.ts` 에서 `utm_source=naver_sa` 기준으로 가입·전환 확인.

## 키워드 → 랜딩 매핑 (8종, 소액 시작)

| # | 키워드 | 광고그룹 | 연결 랜딩(공식 페이지) | 매칭 의도 |
|---|---|---|---|---|
| 1 | 결혼어플추천 | 추천형 | `/결혼어플추천` | 앱 추천 직접 탐색(핵심) |
| 2 | 웨딩앱추천 | 추천형 | `/결혼어플추천` | 동의어, 플래그십으로 통합 |
| 3 | 결혼준비앱 | 추천형 | `/결혼준비앱추천` | 준비 앱 일반 탐색 |
| 4 | 웨딩플래너앱 | AI형 | `/ai웨딩플래너앱` | 플래너/AI 의도 |
| 5 | 결혼준비체크리스트 | 기능형 | `/결혼준비체크리스트앱` | 체크리스트 니즈 |
| 6 | 스드메체크리스트 | 기능형 | `/스드메준비앱` | 스드메 정리 니즈 |
| 7 | 웨딩예산관리 | 기능형 | `/웨딩예산관리앱` | 예산 관리 니즈 |
| 8 | 모바일청첩장앱 | 기능형 | `/모바일청첩장앱` | 청첩장 제작 니즈 |

## 추적 URL (복붙용)

광고 "연결 URL"에 아래를 그대로 입력. (한글 슬러그는 브라우저가 자동 인코딩)

```
https://dewy-wedding.com/결혼어플추천?utm_source=naver_sa&utm_medium=cpc&utm_campaign=app_install_2026q3&utm_term=결혼어플추천&utm_content=app_reco
https://dewy-wedding.com/결혼어플추천?utm_source=naver_sa&utm_medium=cpc&utm_campaign=app_install_2026q3&utm_term=웨딩앱추천&utm_content=app_reco
https://dewy-wedding.com/결혼준비앱추천?utm_source=naver_sa&utm_medium=cpc&utm_campaign=app_install_2026q3&utm_term=결혼준비앱&utm_content=prep_app
https://dewy-wedding.com/ai웨딩플래너앱?utm_source=naver_sa&utm_medium=cpc&utm_campaign=app_install_2026q3&utm_term=웨딩플래너앱&utm_content=ai_planner
https://dewy-wedding.com/결혼준비체크리스트앱?utm_source=naver_sa&utm_medium=cpc&utm_campaign=app_install_2026q3&utm_term=결혼준비체크리스트&utm_content=checklist
https://dewy-wedding.com/스드메준비앱?utm_source=naver_sa&utm_medium=cpc&utm_campaign=app_install_2026q3&utm_term=스드메체크리스트&utm_content=sdm
https://dewy-wedding.com/웨딩예산관리앱?utm_source=naver_sa&utm_medium=cpc&utm_campaign=app_install_2026q3&utm_term=웨딩예산관리&utm_content=budget
https://dewy-wedding.com/모바일청첩장앱?utm_source=naver_sa&utm_medium=cpc&utm_campaign=app_install_2026q3&utm_term=모바일청첩장앱&utm_content=invitation
```

## 광고 문안 힌트 (제목 15자 / 설명 45자 내외 — 네이버 규격 확인 후 조정)

| 키워드 | 제목(예) | 설명(예) |
|---|---|---|
| 결혼어플추천 | 결혼어플추천 Dewy | 체크리스트·예산·스드메를 한 앱에서. AI 웨딩플래너 |
| 결혼준비앱 | 결혼준비앱 듀이 | D-Day 일정·예산·양가분담까지 한곳에서 정리 |
| 웨딩플래너앱 | AI 웨딩플래너 Dewy | 결혼 준비 질문에 AI가 시기·예산 맞춰 답변 |
| 결혼준비체크리스트 | 결혼 체크리스트 앱 | 예식일 넣으면 D-Day 기준 자동 정리 |
| 웨딩예산관리 | 웨딩 예산관리 앱 | 항목·양가분담·지역 평균까지 한눈에 |
| 모바일청첩장앱 | 모바일청첩장 무료 | 앱에서 만들고 링크로 바로 공유 |

## 운영 가이드 (소액 테스트)

- **시작 예산:** 일 5,000~10,000원, 키워드별 입찰 최소화 후 데이터 보고 조정.
- **매칭:** 초기엔 구문/일치 위주(광범위 매칭은 예산 낭비). 검색어 리포트로 음성키워드 추가.
- **품질:** 키워드–랜딩 적합도가 높을수록 CPC↓ — 위 매핑은 키워드별 전용 랜딩이라 적합도 유리.
- **측정 지표:** 키워드별 CTR → 랜딩 체류 → 가입/설치 전환(CPI). 주간 표로 정리해 증액 판단.
- ⚠️ 랜딩 가이드 페이지에는 설치/베타 CTA가 있어야 전환이 측정됨 — `/beta` 또는 Play 링크 CTA 추가는 별도 단계(URL 확보 후).
