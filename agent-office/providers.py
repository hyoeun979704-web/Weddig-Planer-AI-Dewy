"""시각 자산 생성 — provider 추상화.

파이프라인은 provider 인터페이스에만 의존한다.
- DryRunProvider: CLI/인증 없이도 터미널에서 흐름 검증(실제 호출 안 함).
- HiggsfieldCLIProvider: 설치된 `higgsfield` CLI 를 subprocess 로 호출.
  실제 규약: `higgsfield generate create <model> --prompt "..." --wait`
  (--wait 가 업로드/폴링까지 처리하고 결과 URL 을 stdout 에 출력)

사전 1회: `npm i -g @higgsfield/cli` + `higgsfield auth login`(브라우저 인증).
"""

import re
import subprocess
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Protocol

_URL_RE = re.compile(r"https?://[^\s\"'<>]+")
_IMG_EXT = (".png", ".jpg", ".jpeg", ".webp", ".mp4", ".mov", ".gif")


@dataclass
class AssetSpec:
    prompt: str
    aspect_ratio: str = "9:16"  # 프롬프트에 반영(모델별 파라미터는 별도 — model 문서 참고)
    out_path: str = ""


@dataclass
class AssetResult:
    ok: bool
    path: Optional[str] = None
    url: Optional[str] = None
    raw: str = ""


class VisualAssetProvider(Protocol):
    def generate(self, spec: AssetSpec) -> AssetResult: ...


class DryRunProvider:
    """CLI/인증 없이 파이프라인 흐름만 터미널에서 확인하는 모드."""

    def generate(self, spec: AssetSpec) -> AssetResult:
        print(f"[DRY-RUN] higgsfield generate create … --prompt '{spec.prompt[:60]}...' --wait → {spec.out_path}")
        return AssetResult(ok=True, path=spec.out_path, raw="dry-run")


def _pick_asset_url(stdout: str) -> Optional[str]:
    """--wait stdout 에서 결과 URL 추출. 미디어 확장자 우선, 없으면 첫 URL."""
    urls = _URL_RE.findall(stdout)
    if not urls:
        return None
    for u in urls:
        if u.lower().split("?")[0].endswith(_IMG_EXT):
            return u
    return urls[-1]  # 보통 마지막 줄에 최종 결과가 온다


class HiggsfieldCLIProvider:
    """설치된 higgsfield CLI 호출 → 결과 URL 다운로드."""

    def __init__(self, cli: str, model: str, args_template: list[str],
                 wait_timeout: str = "15m", timeout_sec: int = 1200):
        self.cli = cli
        self.model = model
        self.args_template = args_template
        self.wait_timeout = wait_timeout
        self.timeout_sec = timeout_sec

    def generate(self, spec: AssetSpec) -> AssetResult:
        args = [self.cli] + [
            a.format(model=self.model, prompt=spec.prompt) for a in self.args_template
        ]
        if "--wait" in args and "--wait-timeout" not in args:
            args += ["--wait-timeout", self.wait_timeout]

        try:
            proc = subprocess.run(args, capture_output=True, text=True, timeout=self.timeout_sec)
        except FileNotFoundError:
            return AssetResult(ok=False, raw=f"CLI 미설치: '{self.cli}' (npm i -g @higgsfield/cli)")
        except subprocess.TimeoutExpired:
            return AssetResult(ok=False, raw=f"타임아웃({self.timeout_sec}s)")

        if proc.returncode != 0:
            # 인증 안 됐으면 여기서 실패(higgsfield auth login 필요).
            return AssetResult(ok=False, raw=(proc.stderr or proc.stdout)[:600])

        url = _pick_asset_url(proc.stdout)
        if not url:
            return AssetResult(ok=False, raw="결과 URL 미발견 — `--json` 으로 응답 스키마 확인 필요. stdout: " + proc.stdout[:300])

        try:
            if spec.out_path:
                urllib.request.urlretrieve(url, spec.out_path)
                return AssetResult(ok=True, path=spec.out_path, url=url, raw=proc.stdout[:300])
        except Exception as e:  # noqa: BLE001 - 다운로드 실패해도 URL 은 반환
            return AssetResult(ok=True, path=None, url=url, raw=f"URL 확보(다운로드 실패: {e})")
        return AssetResult(ok=True, path=None, url=url, raw=proc.stdout[:300])
