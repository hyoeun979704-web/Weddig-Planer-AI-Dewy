#!/bin/bash
# Dewy — Claude Code (web) SessionStart hook.
# 새 원격 세션마다 의존성을 설치해 build·lint·test 가 바로 돌게 한다.
# 로컬(맥/리눅스 개발자) 세션에는 영향 없음 — 원격에서만 실행.
set -euo pipefail

# 원격(Claude Code on the web) 환경에서만 동작. 로컬 세션은 즉시 종료.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}"

# 이미 설치돼 있으면(컨테이너 캐시 재사용) 건너뛴다 — 멱등.
if [ -d node_modules ] && [ -f node_modules/.package-lock.json ]; then
  echo "[session-start] node_modules present — skipping install"
  exit 0
fi

# ci 보다 install 선호: 컨테이너 캐시를 활용하고 lockfile 드리프트에 관대.
echo "[session-start] installing npm dependencies…"
npm install --no-audit --no-fund
echo "[session-start] dependencies ready"
