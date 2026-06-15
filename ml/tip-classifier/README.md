# Tip 영상 토픽 분류기 — 딥러닝 실습 (NLP 멀티라벨 텍스트 분류)

> Dewy 앱의 규칙기반 부품(`src/lib/tipClassify.ts`)을 **직접 학습한 신경망**으로
> 교체하는 실습. 앱에 이미 흐르는 데이터(`tip_videos`)를 재사용하므로 별도
> 데이터 수집이 필요 없고, 결과물은 앱 업그레이드(향후 reclassify)로도 쓸 수 있다.
> **프로덕션 코드/DB는 건드리지 않는다 — 전부 이 `ml/` 폴더 + Colab에서만 돈다.**

## 1. 문제 정의

- **태스크**: 유튜브 영상(제목+설명+태그+채널명)을 16개 웨딩 토픽으로 분류.
- **유형**: **멀티라벨**(한 영상이 `한복`+`결혼식` 동시 가능) → 시그모이드 + BCE.
- **16 토픽**: `family_meeting, newlywed_home, wedding_gifts, legal_paperwork,
  bridal_care, ceremony, wedding_hall, studio, dress_shop, makeup_shop, hanbok,
  tailor_shop, honeymoon, appliance, invitation_venue, general`.

### 현재 앱은 어떻게 하나 (= 우리의 baseline)
`tipClassify.ts`의 `TOPIC_PATTERNS`(정규식 16개) + `ANTI_PATTERNS`(off-topic 무효화).
이 규칙의 출력이 DB `tip_videos.categories` 컬럼에 이미 저장돼 있다. 즉 **baseline
예측이 공짜로 주어진다.**

## 2. "그냥 규칙을 흉내내는 것 아닌가?" — 실습의 핵심 프레이밍

`categories`는 규칙이 만든 **약한 라벨(weak label)**이다. 여기에 모델을 그대로
맞추면 규칙을 distill 할 뿐 "정확도 향상" 스토리가 빈약하다. 그래서:

1. **학습**: 약한 라벨(규칙 출력) 전체로 모델을 학습 → 규칙을 **일반화**(정규식이
   못 잡는 표현·오타·문맥까지 커버하도록).
2. **평가**: 소량(200~300건)을 **사람이 직접 손라벨링한 gold 셋**(`data/gold.csv`)에서
   - 규칙(baseline) F1  vs  학습모델 F1 을 비교.
   - 이게 "규칙이 놓치는 케이스를 모델이 잡는다"는 **진짜 향상**의 증거.

> 이것이 **약한 지도학습(weak supervision)** — 노이즈 라벨로 학습하되 깨끗한
> 소량 gold로 평가하는, 실무에서 가장 흔한 패턴. 실습 보고서의 핵심 논점이 된다.

`gold.csv`가 아직 없으면 노트북은 약한 라벨 holdout으로 폴백하고 **"규칙 재현
측정일 뿐 실제 정확도 아님"**을 경고한다(정직한 한계 명시).

## 3. 실행 순서

```bash
# 0) 의존성 (로컬 export용. 학습은 Colab 권장)
pip install -r requirements.txt

# 1) 데이터 export: Supabase tip_videos → data/tip_videos.jsonl
export SUPABASE_URL="https://<project>.supabase.co"
export SUPABASE_KEY="<anon-or-service-key>"   # 읽기 전용이면 anon 으로 충분
python export_tip_videos.py                    # → data/tip_videos.jsonl (+ 통계 출력)

# 2) (선택·권장) gold 손라벨 템플릿 생성 → 채우기
python export_tip_videos.py --make-gold-template 250   # → data/gold_template.csv
#   엑셀/시트로 열어 각 행 label 컬럼을 사람이 교정 → data/gold.csv 로 저장

# 3) 학습·평가: train_classifier.ipynb 를 Colab 에 업로드
#    (런타임 → GPU). data/*.jsonl, data/gold.csv 를 같이 업로드하거나
#    드라이브 마운트. 셀 순서대로 실행.
```

## 4. 모델·평가

- **백본**: `klue/roberta-base` (한국어 사전학습). 가볍게 가려면 `klue/bert-base`.
- **헤드**: 16-way sigmoid (multi-label), `BCEWithLogitsLoss`.
- **지표**: micro-F1 / macro-F1 / per-class F1, threshold sweep(0.3~0.6).
- **비교표**(보고서 핵심):

  | 방법 | micro-F1 | macro-F1 | 비고 |
  |---|---|---|---|
  | 규칙(정규식, 앱 현재) | … | … | `categories` baseline |
  | TF-IDF + LogReg | … | … | 얕은 ML 비교군 |
  | **KLUE-RoBERTa (본 실습)** | … | … | 딥러닝 |

## 5. 산출물 (제출용 체크리스트)

- [ ] `data/tip_videos.jsonl` — 학습 데이터(규칙 약한 라벨 포함)
- [ ] `data/gold.csv` — 손라벨 평가셋(≥200)
- [ ] 학습 곡선(loss/F1) 그래프
- [ ] baseline vs 모델 비교표 + per-class F1
- [ ] 혼동/오분류 사례 분석(규칙이 틀렸는데 모델이 맞춘 예 5개)
- [ ] 저장된 모델 `model/` + 추론 함수 데모

## 6. 앱 연동(선택 — 실습 후)

모델이 규칙을 이기면, 추론을 엣지펑션(또는 배치 reclassify)으로 빼서
`tip_videos.categories`를 모델 출력으로 갱신할 수 있다. 단 이는 **별도 PR**로
다루고, 본 실습 범위는 `ml/` 안에서 끝낸다.

## 파일

| 파일 | 역할 |
|---|---|
| `export_tip_videos.py` | Supabase → `data/tip_videos.jsonl`, gold 템플릿 생성 |
| `train_classifier.ipynb` | 데이터 로드 → baseline → KLUE-RoBERTa 학습/평가 |
| `requirements.txt` | export·로컬 학습 의존성 |
| `data/` | 데이터 산출물(gitignore 권장 — 영상 메타·개인정보 주의) |
