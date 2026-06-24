"""에이전트 오피스 회귀 테스트(stdlib unittest — 추가 설치 없이 실행).

    cd agent-office && python -m unittest discover -s tests

핵심 결정론 로직(deslop·quality 룰·승인 큐·가드레일)을 검증한다. LLM·브라우저·GUI 는 제외.
"""

import os
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import deslop  # noqa: E402
import quality  # noqa: E402


class TestDeslop(unittest.TestCase):
    def test_em_dash_and_throat_removed(self):
        out = deslop.clean("결론부터 말하면, 좋은 — 정말 좋은 — 서비스.")
        self.assertNotIn("—", out)
        self.assertFalse(out.startswith("결론부터 말하면"))

    def test_review_flags_hype(self):
        r = deslop.review("혁신적이고 압도적인 최고의 서비스")
        self.assertLess(r["score"], 10)
        self.assertTrue(any("과장" in i for i in r["issues"]))

    def test_clean_text_scores_high(self):
        r = deslop.review("성수동 웨딩홀을 예산과 위치 기준으로 차분히 비교했습니다. 각 홀의 수용 인원과 대관료를 정리했어요.")
        self.assertGreaterEqual(r["score"], 9)

    def test_aggressive_tone_flagged(self):
        # 실데이터 회귀: 공격적 표현은 브랜드 톤 위반 → 강한 감점 + 플래그.
        r = deslop.review("썩은 웨딩 업계를 뒤집는 듀이! 판을 바꾸겠습니다.")
        self.assertTrue(any("공격적" in i for i in r["issues"]))
        self.assertLessEqual(r["score"], 6)

    def test_slang_hype_flagged(self):
        r = deslop.review("이번엔 빡세게 준비했어요. 찐 정보만 담은 레전드 글이에요.")
        self.assertTrue(any("슬랭" in i or "과장" in i for i in r["issues"]))

    def test_throat_intro_flagged(self):
        r = deslop.review("안녕하세요 참새신부입니다. 오늘은 스드메 순서를 알려드릴게요.")
        self.assertTrue(any("도입부" in i for i in r["issues"]))

    def test_emoji_and_exclaim_overuse_flagged(self):
        r = deslop.review("최고예요!!!!! 진짜 좋아요!! 💍✨🌸💗😍🎉🥰👰 완전 추천 ㅠㅠ")
        joined = " ".join(r["issues"])
        self.assertTrue("이모지" in joined or "느낌표" in joined or "감탄사" in joined)
        self.assertLess(r["score"], 9)


class TestQuality(unittest.TestCase):
    def test_short_penalized(self):
        score, issues = quality.rule_score("짧음")
        self.assertTrue(any("짧" in i for i in issues))

    def test_evaluate_passes_good(self):
        good = ("# 성수동 웨딩홀 5곳\n예비부부가 고민하는 성수동, 채광 좋은 홀부터 정리했어요. "
                "수용 인원과 대관료, 식대 범위를 표로 비교해 발품을 줄였습니다.")
        r = quality.evaluate(good, "성수동 웨딩홀")
        self.assertTrue(r["passed"])
        self.assertIsNone(r["judge"])  # 키 없는 환경: 룰만

    def test_evaluate_flags_slop(self):
        r = quality.evaluate("결론부터 말하면, 혁신적이고 최고의 — 압도적인 — 서비스!", "x")
        self.assertFalse(r["passed"])

    def test_golden_runs(self):
        rows = quality.run_golden()
        self.assertTrue(len(rows) >= 1)
        self.assertIn("score", rows[0])


class TestQueueAndGuardrails(unittest.TestCase):
    """runlog/guardrails 는 파일을 쓰므로 임시 BASE 로 격리."""

    def _isolated(self, modname):
        mod = __import__(modname)
        self._tmp = tempfile.TemporaryDirectory()
        mod.BASE = Path(self._tmp.name)
        return mod

    def test_queue_default_pending_and_set(self):
        runlog = self._isolated("runlog")
        runlog.RUNS = runlog.BASE / "runs.jsonl"
        runlog.QUEUE = runlog.BASE / "queue.json"
        self.assertEqual(runlog.get_status("a.md"), "pending")  # 섀도 기본
        runlog.set_status("a.md", "approved")
        self.assertEqual(runlog.get_status("a.md"), "approved")
        with self.assertRaises(ValueError):
            runlog.set_status("a.md", "bogus")

    def test_circuit_breaker_trips_and_resets(self):
        g = self._isolated("guardrails")
        g.USAGE = g.BASE / "usage.json"
        g.FAIL_STREAK_TRIP = 3
        for _ in range(3):
            g.record(success=False)
        ok, _why = g.can_run()
        self.assertFalse(ok)  # 연속 실패 → 차단
        g.reset()
        ok2, _ = g.can_run()
        self.assertTrue(ok2)

    def test_daily_cap(self):
        g = self._isolated("guardrails")
        g.USAGE = g.BASE / "usage.json"
        g.DAILY_CALL_CAP = 2
        g.record(True); g.record(True)
        ok, _ = g.can_run()
        self.assertFalse(ok)  # 캡 도달


if __name__ == "__main__":
    unittest.main()
