"""마케팅 시각 자산 파이프라인 — 텍스트 기획안 → 비주얼 프롬프트 → Higgsfield CLI → 저장.

설계서 3번 구현. provider 추상화(providers.py)에만 의존하므로 Higgsfield CLI 규약이
확정되기 전에도 --dry-run 으로 터미널에서 흐름을 돌려볼 수 있다.

실행:
    python visual_pipeline.py "성수동 가을 야외 웨딩" --aspect 9:16
    python visual_pipeline.py "..." --dry-run        # CLI 없이 흐름만 확인

실행 전 가정:
  - (실제 생성 시) Higgsfield CLI 설치 + config.py 의 명령 템플릿이 실제 규약과 일치.
  - 산출물은 assets/ 에 저장되며 사람이 검수 후 사용(자동 게시 없음).
"""

import argparse
import datetime as _dt
import re
from pathlib import Path

import config
import lighting as lighting_lib
from providers import AssetSpec, DryRunProvider, HiggsfieldCLIProvider


def to_visual_prompt(brief: str, lighting: str = "") -> str:
    """기획안(brief) → 이미지 생성용 프롬프트. LLM 없이 동작하도록 규칙 기반 래핑.
    lighting 키가 주어지면 해당 포트레이트 조명 묘사를 덧붙인다(인물/커플 사진)."""
    base = (
        f"{brief}. 한국 웨딩 감성, 고급스러운 색감, 인물 중심, 광고용 고해상도. 텍스트/워터마크 없음."
    )
    light = lighting_lib.lighting_prompt(lighting) if lighting else ""
    if not light:
        base += " 따뜻하고 자연스러운 조명."
    return base + light


def _slug(text: str) -> str:
    s = re.sub(r"\s+", "-", text.strip())
    s = re.sub(r"[^0-9A-Za-z가-힣\-]", "", s)
    return (s[:40] or "asset").strip("-")


def run(brief: str, aspect: str, dry_run: bool, lighting: str = "") -> int:
    asset_dir = Path(__file__).parent / config.ASSET_DIR
    asset_dir.mkdir(exist_ok=True)
    ts = _dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    out_path = str(asset_dir / f"{ts}-{_slug(brief)}.png")

    spec = AssetSpec(prompt=to_visual_prompt(brief, lighting), aspect_ratio=aspect, out_path=out_path)

    if dry_run:
        provider = DryRunProvider()
    else:
        provider = HiggsfieldCLIProvider(
            cli=config.HIGGSFIELD_CLI,
            model=config.HIGGSFIELD_MODEL,
            args_template=config.HIGGSFIELD_GENERATE_ARGS,
            wait_timeout=config.HIGGSFIELD_WAIT_TIMEOUT,
        )

    print(f"[시각 파이프라인] brief='{brief}' aspect={aspect} model={config.HIGGSFIELD_MODEL} dry_run={dry_run}")
    result = provider.generate(spec)

    try:
        import runlog
        runlog.record_run("visual", "시각 디자이너", "done" if result.ok else "fail",
                          str(result.path or result.url or ""), f"이미지: {brief[:30]}")
    except Exception:
        pass

    if result.ok:
        where = result.path or result.url
        print(f"✅ 생성 완료: {where}\n   사람이 검수 후 사용하세요(자동 게시 없음).")
        return 0
    print(f"❌ 실패: {result.raw}")
    return 1


def main() -> int:
    ap = argparse.ArgumentParser(description="Dewy 마케팅 시각 자산 파이프라인")
    ap.add_argument("brief", nargs="*", help="시각 자산 기획안(텍스트)")
    ap.add_argument("--aspect", default="9:16", help="화면비(기본 9:16 릴스/쇼츠)")
    ap.add_argument("--lighting", default="", help="포트레이트 조명 프리셋 키(--list-lighting 으로 확인)")
    ap.add_argument("--list-lighting", action="store_true", help="사용 가능한 조명 프리셋 목록")
    ap.add_argument("--dry-run", action="store_true", help="CLI 호출 없이 흐름만 확인")
    args = ap.parse_args()
    if args.list_lighting:
        print("조명 프리셋:", lighting_lib.list_keys())
        return 0
    if not args.brief:
        ap.error("기획안(brief)을 입력하세요. 예: visual_pipeline.py \"성수동 야외 웨딩\" --lighting rembrandt")
    return run(" ".join(args.brief).strip(), args.aspect, args.dry_run, args.lighting)


if __name__ == "__main__":
    raise SystemExit(main())
