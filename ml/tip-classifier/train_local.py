#!/usr/bin/env python3
"""Tip 영상 토픽 분류 — 로컬 CPU 학습 (PyTorch MLP, 멀티라벨).

HuggingFace 모델 다운로드가 차단된 환경에서도 끝까지 돌도록, 사전학습 트랜스포머
대신 **TF-IDF 특징 → 직접 학습하는 PyTorch MLP**(처음부터 backprop)로 멀티라벨
분류기를 학습한다. 비교군: 다수예측 baseline, TF-IDF+LogReg(얕은 ML).

입력:  data/tip_videos.jsonl  (export_tip_videos.py 또는 MCP 덤프 산출물)
출력:  results/metrics.json, results/per_class.csv, results/loss_curve.png,
       results/comparison.png
"""
from __future__ import annotations
import json, random
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
from scipy.sparse import hstack
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.multiclass import OneVsRestClassifier
from sklearn.metrics import f1_score, precision_score, recall_score
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

SEED = 42
random.seed(SEED); np.random.seed(SEED); torch.manual_seed(SEED)

TOPICS = ['family_meeting','newlywed_home','wedding_gifts','legal_paperwork',
    'bridal_care','ceremony','wedding_hall','studio','dress_shop',
    'makeup_shop','hanbok','tailor_shop','honeymoon','appliance',
    'invitation_venue','general']
T2I = {t:i for i,t in enumerate(TOPICS)}
K = len(TOPICS)

HERE = Path(__file__).resolve().parent
RES = HERE/"results"; RES.mkdir(exist_ok=True)


def load():
    rows = [json.loads(l) for l in (HERE/"data/tip_videos.jsonl").read_text(encoding="utf-8").splitlines() if l.strip()]
    texts = [r["text"] for r in rows]
    Y = np.zeros((len(rows), K), dtype=np.float32)
    for i, r in enumerate(rows):
        for l in r["labels"]:
            if l in T2I: Y[i, T2I[l]] = 1.0
    return texts, Y, rows


def split(n):
    idx = np.arange(n); rng = np.random.default_rng(SEED); rng.shuffle(idx)
    a, b = int(n*0.70), int(n*0.85)
    return idx[:a], idx[a:b], idx[b:]


def metrics(y, p):
    return dict(
        micro_f1=round(float(f1_score(y, p, average="micro", zero_division=0)), 4),
        macro_f1=round(float(f1_score(y, p, average="macro", zero_division=0)), 4),
        micro_precision=round(float(precision_score(y, p, average="micro", zero_division=0)), 4),
        micro_recall=round(float(recall_score(y, p, average="micro", zero_division=0)), 4),
    )


class MLP(nn.Module):
    def __init__(self, d_in, d_hidden=(512, 128), k=K, p=0.3):
        super().__init__()
        layers, d = [], d_in
        for h in d_hidden:
            layers += [nn.Linear(d, h), nn.ReLU(), nn.Dropout(p)]; d = h
        layers += [nn.Linear(d, k)]
        self.net = nn.Sequential(*layers)
    def forward(self, x): return self.net(x)


def main():
    texts, Y, rows = load()
    n = len(texts)
    tr, va, te = split(n)
    print(f"data: {n} | train {len(tr)} val {len(va)} test {len(te)}")

    # --- 특징: 단어(1-2gram) + 문자(2-4gram, 한국어 형태 견고) ---
    wv = TfidfVectorizer(analyzer="word", ngram_range=(1, 2), max_features=20000, min_df=2)
    cv = TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 4), max_features=20000, min_df=2)
    Xw = wv.fit_transform([texts[i] for i in tr])
    Xc = cv.fit_transform([texts[i] for i in tr])
    def feat(idxs):
        return hstack([wv.transform([texts[i] for i in idxs]),
                       cv.transform([texts[i] for i in idxs])]).tocsr()
    Xtr = hstack([Xw, Xc]).tocsr(); Xva = feat(va); Xte = feat(te)
    Ytr, Yva, Yte = Y[tr], Y[va], Y[te]
    d_in = Xtr.shape[1]
    print(f"features: {d_in}")

    results = {}

    # --- Baseline 0: 항상 최빈 라벨(ceremony) 예측 ---
    prior = (Ytr.mean(0) > 0.5).astype(int)  # train 과반 라벨만(보통 없음→대체)
    if prior.sum() == 0:
        prior = np.zeros(K, dtype=int); prior[int(Ytr.sum(0).argmax())] = 1
    P_naive = np.tile(prior, (len(te), 1))
    results["baseline_majority"] = metrics(Yte, P_naive)

    # --- Baseline 1: TF-IDF + OneVsRest LogReg (얕은 ML) ---
    lr = OneVsRestClassifier(LogisticRegression(max_iter=1000, C=4.0))
    lr.fit(Xtr, Ytr)
    results["tfidf_logreg"] = metrics(Yte, lr.predict(Xte))

    # --- DL: PyTorch MLP (멀티라벨, pos_weight 로 불균형 보정) ---
    dev = "cpu"
    def to_t(X): return torch.tensor(X.toarray(), dtype=torch.float32, device=dev)
    Xtr_t, Xva_t, Xte_t = to_t(Xtr), to_t(Xva), to_t(Xte)
    Ytr_t = torch.tensor(Ytr, device=dev); Yva_t = torch.tensor(Yva, device=dev)

    pos = Ytr.sum(0); neg = len(tr) - pos
    pos_weight = torch.tensor(np.clip(neg/np.maximum(pos, 1), 1, 20), dtype=torch.float32, device=dev)

    model = MLP(d_in).to(dev)
    opt = torch.optim.Adam(model.parameters(), lr=1e-3, weight_decay=1e-5)
    lossf = nn.BCEWithLogitsLoss(pos_weight=pos_weight)

    EPOCHS, BS = 60, 64
    tr_losses, va_losses, va_f1s = [], [], []
    best_f1, best_state, patience, bad = -1, None, 12, 0
    for ep in range(EPOCHS):
        model.train(); perm = torch.randperm(len(tr)); tot = 0.0
        for s in range(0, len(tr), BS):
            bi = perm[s:s+BS]
            opt.zero_grad()
            loss = lossf(model(Xtr_t[bi]), Ytr_t[bi])
            loss.backward(); opt.step(); tot += loss.item()*len(bi)
        model.eval()
        with torch.no_grad():
            vl = lossf(model(Xva_t), Yva_t).item()
            vp = (torch.sigmoid(model(Xva_t)).cpu().numpy() >= 0.5).astype(int)
        vf1 = f1_score(Yva, vp, average="micro", zero_division=0)
        tr_losses.append(tot/len(tr)); va_losses.append(vl); va_f1s.append(vf1)
        if vf1 > best_f1:
            best_f1, best_state, bad = vf1, {k: v.clone() for k, v in model.state_dict().items()}, 0
        else:
            bad += 1
            if bad >= patience: print(f"early stop @ep{ep}"); break
    model.load_state_dict(best_state)

    # threshold tuning on val
    model.eval()
    with torch.no_grad():
        va_prob = torch.sigmoid(model(Xva_t)).cpu().numpy()
        te_prob = torch.sigmoid(model(Xte_t)).cpu().numpy()
    best_t, best_vf1 = 0.5, -1
    for t in np.arange(0.20, 0.61, 0.05):
        f = f1_score(Yva, (va_prob >= t).astype(int), average="micro", zero_division=0)
        if f > best_vf1: best_vf1, best_t = f, float(round(t, 2))
    P_mlp = (te_prob >= best_t).astype(int)
    results["pytorch_mlp"] = metrics(Yte, P_mlp)
    results["pytorch_mlp"]["best_threshold"] = best_t
    results["pytorch_mlp"]["epochs_trained"] = len(tr_losses)

    # --- per-class F1 (MLP) ---
    per = []
    for i, t in enumerate(TOPICS):
        per.append((t, int(Yte[:, i].sum()),
                    round(float(f1_score(Yte[:, i], P_mlp[:, i], zero_division=0)), 3)))
    (RES/"per_class.csv").write_text(
        "topic,test_support,mlp_f1\n" + "\n".join(f"{t},{s},{f}" for t, s, f in per), encoding="utf-8")

    # --- disagreement: 규칙(=라벨)과 모델이 다른 test 예시 (정성) ---
    disagree = []
    for j, i in enumerate(te):
        rule = set(rows[i]["labels"])
        mdl = {TOPICS[c] for c in range(K) if P_mlp[j, c]}
        if mdl != rule:
            disagree.append({"text": texts[i][:90], "rule": sorted(rule), "model": sorted(mdl)})
    results["meta"] = {"n": n, "features": int(d_in), "n_disagree_test": len(disagree),
                       "test_size": len(te)}

    # --- 적용 전(규칙) / 후(모델) 비교: 과다태깅 정제 효과 ---
    rule_cnt, mdl_cnt = [], []
    removed = added = subset = superset = other = same = 0
    cleanups = []  # 모델이 규칙의 라벨을 덜어낸(과다태깅 교정) 사례
    for j, i in enumerate(te):
        rule = set(rows[i]["labels"]); mdl = {TOPICS[c] for c in range(K) if P_mlp[j, c]}
        rule_cnt.append(len(rule)); mdl_cnt.append(len(mdl))
        removed += len(rule - mdl); added += len(mdl - rule)
        if mdl == rule: same += 1
        elif mdl < rule: subset += 1
        elif mdl > rule: superset += 1
        else: other += 1
        if mdl < rule:  # 순수 정제(모델 ⊂ 규칙)
            cleanups.append((len(rule - mdl), texts[i][:80], sorted(rule), sorted(mdl)))
    before_after = {
        "rule_avg_tags": round(float(np.mean(rule_cnt)), 2),
        "model_avg_tags": round(float(np.mean(mdl_cnt)), 2),
        "tags_removed_total": removed, "tags_added_total": added,
        "videos_model_narrowed": subset, "videos_model_broadened": superset,
        "videos_identical": same, "videos_other": other, "test_size": len(te),
    }
    results["before_after"] = before_after
    cleanups.sort(reverse=True)
    md = ["# 적용 전(규칙) / 후(모델) — 과다태깅 정제 사례\n",
          f"\ntest {len(te)}건: 모델이 규칙보다 **좁힌** 영상 {subset}건, 넓힌 {superset}건, 동일 {same}건.",
          f" 규칙이 단 태그 총 {removed}개를 모델이 덜어냄(과다태깅 교정).\n",
          "\n| 영상(앞 80자) | 규칙 (전) | 모델 (후) |\n|---|---|---|"]
    for _, t, r, m in cleanups[:10]:
        md.append(f"| {t.replace('|','/')} | {', '.join(r)} | {', '.join(m) or '(없음)'} |")
    (RES/"before_after_examples.md").write_text("\n".join(md), encoding="utf-8")

    (RES/"metrics.json").write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    (RES/"disagreements.json").write_text(json.dumps(disagree[:20], ensure_ascii=False, indent=2), encoding="utf-8")

    # --- charts ---
    plt.figure(figsize=(7, 4))
    plt.plot(tr_losses, label="train loss")
    plt.plot(va_losses, label="val loss")
    plt.plot(va_f1s, label="val micro-F1")
    plt.xlabel("epoch"); plt.legend(); plt.title("PyTorch MLP training")
    plt.tight_layout(); plt.savefig(RES/"loss_curve.png", dpi=120); plt.close()

    names = ["baseline_majority", "tfidf_logreg", "pytorch_mlp"]
    micro = [results[k]["micro_f1"] for k in names]
    macro = [results[k]["macro_f1"] for k in names]
    x = np.arange(len(names)); w = 0.35
    plt.figure(figsize=(7, 4))
    plt.bar(x-w/2, micro, w, label="micro-F1")
    plt.bar(x+w/2, macro, w, label="macro-F1")
    for xi, mi, ma in zip(x, micro, macro):
        plt.text(xi-w/2, mi+.01, f"{mi:.2f}", ha="center", fontsize=9)
        plt.text(xi+w/2, ma+.01, f"{ma:.2f}", ha="center", fontsize=9)
    plt.xticks(x, ["majority", "TF-IDF+LogReg", "PyTorch MLP"]); plt.ylim(0, 1)
    plt.legend(); plt.title("Model comparison (test set)")
    plt.tight_layout(); plt.savefig(RES/"comparison.png", dpi=120); plt.close()

    # before/after: 영상당 평균 태그 수 (규칙 vs 모델) + 변화 분해
    fig, ax = plt.subplots(1, 2, figsize=(10, 4))
    ax[0].bar(["rule (before)", "model (after)"], [before_after["rule_avg_tags"], before_after["model_avg_tags"]],
              color=["#888", "#1f77b4"])
    for xi, v in enumerate([before_after["rule_avg_tags"], before_after["model_avg_tags"]]):
        ax[0].text(xi, v+.02, f"{v:.2f}", ha="center")
    ax[0].set_ylabel("avg tags / video"); ax[0].set_title("Tags per video: rule vs model")
    ax[1].bar(["narrowed", "broadened", "identical", "other"],
              [subset, superset, same, other], color=["#2ca02c", "#d62728", "#aaa", "#ff7f0e"])
    ax[1].set_title("How model changed rule tagging (test)")
    plt.tight_layout(); plt.savefig(RES/"before_after.png", dpi=120); plt.close()

    print("\n=== BEFORE/AFTER (rule vs model, test) ===")
    print(f"avg tags/video: rule {before_after['rule_avg_tags']} -> model {before_after['model_avg_tags']}")
    print(f"narrowed {subset} | broadened {superset} | identical {same} | other {other}")
    print(f"rule tags removed by model: {removed} | added: {added}")

    print("\n=== RESULTS (test) ===")
    for k in names:
        print(f"{k:<20} micro={results[k]['micro_f1']:.3f}  macro={results[k]['macro_f1']:.3f}")
    print(f"MLP best_threshold={best_t}  disagree={len(disagree)}/{len(te)}")
    print("saved -> results/{metrics.json,per_class.csv,loss_curve.png,comparison.png}")


if __name__ == "__main__":
    main()
