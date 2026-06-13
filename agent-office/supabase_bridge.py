"""로컬 에이전트 → Supabase `agent_outputs` 브리지 (앱 어드민 승인 큐).

에이전트가 만든 초안/이미지를 Supabase 에 올리면 운영자가 앱 어드민(/admin/agent-outputs)에서
폰으로 ✅승인/✖반려 한다. SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY 가 env 에 있을 때만 동작
(없으면 no-op — 로컬 파일 큐만 사용). 외부 의존 0(urllib).

⚠️ service_role 키는 RLS 를 우회한다. 로컬 .env 에만 두고 절대 깃·클라이언트에 넣지 말 것.
"""

import json
import os
import urllib.request


def _cfg():
    return os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_ROLE_KEY")


def enabled() -> bool:
    url, key = _cfg()
    return bool(url and key)


def push_output(kind: str, title: str, source: str = "", body=None,
                media_url=None, deslop_score=None, issues=None):
    """agent_outputs 에 1건 INSERT(status=pending). env 없으면 no-op(None)."""
    url, key = _cfg()
    if not (url and key):
        return None
    payload = json.dumps({
        "kind": kind, "title": title[:300], "source": (source or None),
        "body": body, "media_url": media_url,
        "deslop_score": deslop_score, "issues": issues,
        "status": "pending",
    }).encode("utf-8")
    req = urllib.request.Request(
        f"{url}/rest/v1/agent_outputs", data=payload, method="POST",
        headers={
            "apikey": key, "Authorization": f"Bearer {key}",
            "Content-Type": "application/json", "Prefer": "return=representation",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:  # noqa: BLE001 - 브리지 실패가 로컬 생성을 막지 않게
        print(f"[bridge] push 실패(무시): {e}")
        return None


def fetch_approved(limit: int = 50):
    """승인된 산출물 조회(게시 단계에서 사용). env 없으면 []."""
    url, key = _cfg()
    if not (url and key):
        return []
    endpoint = f"{url}/rest/v1/agent_outputs?status=eq.approved&order=reviewed_at.desc&limit={limit}"
    req = urllib.request.Request(endpoint, headers={"apikey": key, "Authorization": f"Bearer {key}"})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:  # noqa: BLE001
        print(f"[bridge] fetch 실패(무시): {e}")
        return []
