#!/usr/bin/env python3
"""Supabase `tip_videos` -> 학습용 JSONL export (+ gold 손라벨 템플릿).

앱 DB 의 tip_videos 를 PostgREST 로 페이지네이션해서 내려받아, 분류 입력 텍스트
(title + description + tags + channel_name)와 약한 라벨(categories, 규칙 출력)을
JSONL 로 떨군다. 프로덕션 DB 는 읽기만 한다(SELECT 전용).

입력 텍스트 구성은 src/lib/tipClassify.ts `buildClassifyText` 와 동일한 순서로
맞춘다(title -> description -> tags -> channel). DB 에 transcript 컬럼은 없으므로
그 자리는 비운다.

사용:
    export SUPABASE_URL="https://<project>.supabase.co"
    export SUPABASE_KEY="<anon-or-service-key>"
    python export_tip_videos.py                       # -> data/tip_videos.jsonl
    python export_tip_videos.py --make-gold-template 250  # -> data/gold_template.csv
"""
from __future__ import annotations

import argparse
import csv
import json
import os
import sys
from pathlib import Path

import requests

# tipClassify.ts TOPIC_PATTERNS 의 16개 라벨(=value, 매칭 키). 표시 라벨이 아니라
# 백엔드 매칭 값이다(label vs value 분리 — AGENTS.md 검증 규칙).
TOPICS = [
    "family_meeting", "newlywed_home", "wedding_gifts", "legal_paperwork",
    "bridal_care", "ceremony", "wedding_hall", "studio", "dress_shop",
    "makeup_shop", "hanbok", "tailor_shop", "honeymoon", "appliance",
    "invitation_venue", "general",
]

DATA_DIR = Path(__file__).resolve().parent / "data"
PAGE_SIZE = 1000  # PostgREST 기본 상한 회피용 Range 페이지네이션


def _client():
    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_KEY", "")
    if not url or not key:
        sys.exit("환경변수 SUPABASE_URL / SUPABASE_KEY 를 설정하세요.")
    return url, key


def build_classify_text(row: dict) -> str:
    """tipClassify.ts buildClassifyText 와 동일 순서: title desc tags (transcript) channel."""
    title = row.get("title") or ""
    description = row.get("description") or ""
    tags = " ".join(row.get("tags") or [])
    channel = row.get("channel_name") or ""
    # transcript 컬럼은 DB 에 없음 -> 빈 칸. 다른 필드 사이 공백 1개로 join.
    return " ".join(p for p in [title, description, tags, channel] if p).strip()


def fetch_all(url: str, key: str) -> list[dict]:
    """tip_videos 전체를 Range 페이지네이션으로 수집. is_active 무관(가능한 한 많이)."""
    select = "id,video_id,title,description,tags,channel_name,search_query,categories,is_active"
    endpoint = f"{url}/rest/v1/tip_videos?select={select}&order=collected_at.asc"
    headers = {"apikey": key, "Authorization": f"Bearer {key}"}
    rows: list[dict] = []
    start = 0
    while True:
        h = dict(headers)
        h["Range-Unit"] = "items"
        h["Range"] = f"{start}-{start + PAGE_SIZE - 1}"
        resp = requests.get(endpoint, headers=h, timeout=60)
        if resp.status_code not in (200, 206):
            sys.exit(f"PostgREST {resp.status_code}: {resp.text[:300]}")
        batch = resp.json()
        rows.extend(batch)
        if len(batch) < PAGE_SIZE:
            break
        start += PAGE_SIZE
    return rows


def write_jsonl(rows: list[dict]) -> Path:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    out = DATA_DIR / "tip_videos.jsonl"
    kept = 0
    label_counts = {t: 0 for t in TOPICS}
    with out.open("w", encoding="utf-8") as f:
        for r in rows:
            text = build_classify_text(r)
            if not text:
                continue  # 빈 입력은 학습 무의미
            # 약한 라벨: 규칙 출력 중 알려진 토픽만(스키마 외 값 방어).
            weak = [c for c in (r.get("categories") or []) if c in TOPICS]
            for c in weak:
                label_counts[c] += 1
            f.write(json.dumps({
                "id": r.get("id"),
                "video_id": r.get("video_id"),
                "text": text,
                "labels": weak,                       # 약한 라벨(규칙=baseline)
                "search_query": r.get("search_query"),
                "is_active": r.get("is_active"),
            }, ensure_ascii=False) + "\n")
            kept += 1
    print(f"[ok] {kept}/{len(rows)} rows -> {out}")
    print("[label counts] (약한 라벨 분포)")
    for t in TOPICS:
        print(f"    {t:<18} {label_counts[t]}")
    unlabeled = sum(1 for r in rows if not [c for c in (r.get('categories') or []) if c in TOPICS])
    print(f"[note] 라벨 0개 행: {unlabeled} (멀티라벨이라 정상 — 일부는 off-topic)")
    return out


def make_gold_template(rows: list[dict], n: int) -> Path:
    """손라벨용 CSV 템플릿. label 컬럼을 사람이 '|' 로 구분해 교정 -> gold.csv 로 저장.

    무작위가 아니라 다양성 위해 search_query 별로 고르게 stratified 샘플.
    """
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    out = DATA_DIR / "gold_template.csv"
    # search_query 별 round-robin 으로 n 개 추출.
    by_q: dict[str, list[dict]] = {}
    for r in rows:
        if build_classify_text(r):
            by_q.setdefault(r.get("search_query") or "_", []).append(r)
    picked: list[dict] = []
    queues = list(by_q.values())
    i = 0
    while len(picked) < n and any(queues):
        q = queues[i % len(queues)]
        if q:
            picked.append(q.pop())
        i += 1
        if i % len(queues) == 0:
            queues = [q for q in queues if q]
            if not queues:
                break
    with out.open("w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["id", "video_id", "text", "rule_labels", "label  # 사람이 교정: 토픽들을 | 로 구분, off-topic 은 빈칸"])
        for r in picked:
            weak = [c for c in (r.get("categories") or []) if c in TOPICS]
            w.writerow([
                r.get("id"), r.get("video_id"),
                build_classify_text(r)[:500],
                "|".join(weak),
                "|".join(weak),  # 시작값 = 규칙 출력. 사람이 보고 고침.
            ])
    print(f"[ok] gold 템플릿 {len(picked)}건 -> {out}")
    print("    -> 각 행 마지막 컬럼(label)을 사람이 교정한 뒤 data/gold.csv 로 저장하세요.")
    print(f"    유효 토픽: {', '.join(TOPICS)}")
    return out


def main() -> None:
    ap = argparse.ArgumentParser(description="tip_videos export for DL training")
    ap.add_argument("--make-gold-template", type=int, metavar="N", default=0,
                    help="N건 손라벨 템플릿(data/gold_template.csv) 생성")
    args = ap.parse_args()

    url, key = _client()
    rows = fetch_all(url, key)
    print(f"[fetched] {len(rows)} tip_videos")
    if args.make_gold_template:
        make_gold_template(rows, args.make_gold_template)
    else:
        write_jsonl(rows)


if __name__ == "__main__":
    main()
