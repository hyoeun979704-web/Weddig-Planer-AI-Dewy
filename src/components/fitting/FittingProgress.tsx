import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Sparkles, Gamepad2 } from "lucide-react";

/**
 * 드레스 피팅 생성 중에 노출되는 인터랙티브 대기 화면.
 * 30~60초 대기 시간을 줄어든 것처럼 느끼게 한다.
 *
 * 구성:
 *  - 단계별 progress (시간 기반 가짜 진행, 5단계)
 *  - 꿀팁 캐러셀 (5초마다 순환)
 *  - 「게임으로 P 받기」 진입 카드
 */

const STAGES = [
  { label: "사진 분석 중", emoji: "📸", durationMs: 6_000 },
  { label: "얼굴 식별 매칭", emoji: "🪞", durationMs: 8_000 },
  { label: "드레스 적용 중", emoji: "👰", durationMs: 12_000 },
  { label: "배경 합성 중", emoji: "✨", durationMs: 12_000 },
  { label: "마무리 보정", emoji: "🎨", durationMs: 8_000 },
];

const TIPS = [
  "전신 사진일수록 신부 비율이 정확하게 그려져요.",
  "정면을 보는 자연스러운 표정이 가장 잘 인식돼요.",
  "선명한 사진을 쓰면 얼굴 식별 성공률이 올라가요.",
  "드레스 디자인은 카탈로그 메타데이터까지 함께 전달돼요.",
  "본식 씬은 빈 홀에 신부만 단독으로 생성됩니다.",
  "결과가 마음에 들지 않으면 다른 씬으로 한 번 더 도전해보세요.",
];

const TOTAL_MS = STAGES.reduce((a, s) => a + s.durationMs, 0);

interface Props {
  /** Edge Function 호출이 진행 중인지 (외부 isGenerating) */
  active: boolean;
}

export const FittingProgress = ({ active }: Props) => {
  const navigate = useNavigate();
  const [elapsed, setElapsed] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);

  // 시간 기반 가짜 진행률
  useEffect(() => {
    if (!active) {
      setElapsed(0);
      return;
    }
    const start = Date.now();
    const id = setInterval(() => {
      setElapsed(Date.now() - start);
    }, 250);
    return () => clearInterval(id);
  }, [active]);

  // 팁 캐러셀
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      setTipIndex((i) => (i + 1) % TIPS.length);
    }, 5_000);
    return () => clearInterval(id);
  }, [active]);

  if (!active) return null;

  // 현재 단계 인덱스 계산
  let runningSum = 0;
  let currentStageIdx = STAGES.length - 1;
  for (let i = 0; i < STAGES.length; i++) {
    runningSum += STAGES[i].durationMs;
    if (elapsed < runningSum) {
      currentStageIdx = i;
      break;
    }
  }

  const percent = Math.min(95, Math.round((elapsed / TOTAL_MS) * 100));

  return (
    <div className="mt-4 p-4 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 space-y-4">
      {/* 단계 표시 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[12px] text-muted-foreground">
          <span className="flex items-center gap-1.5 font-medium text-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
            {STAGES[currentStageIdx].emoji} {STAGES[currentStageIdx].label}…
          </span>
          <span className="tabular-nums">{percent}%</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="flex items-center gap-1 mt-2">
          {STAGES.map((s, i) => (
            <div
              key={s.label}
              className={`flex-1 h-1 rounded-full transition-colors ${
                i <= currentStageIdx ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
      </div>

      {/* 꿀팁 캐러셀 */}
      <div className="p-3 rounded-xl bg-background/60 border border-border">
        <div className="flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="text-[12px] text-foreground leading-relaxed">
            <span className="font-semibold">TIP.</span> {TIPS[tipIndex]}
          </p>
        </div>
      </div>

      {/* 게임 진입 */}
      <button
        onClick={() => navigate("/merge-game")}
        className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-primary/40 hover:shadow-md transition-shadow"
      >
        <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
          <Gamepad2 className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 text-left">
          <p className="font-bold text-foreground text-sm">
            기다리는 동안 게임으로 P 받기
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            꽃 머지 게임 · 광고 시청 시 2배 적립
          </p>
        </div>
      </button>

      <p className="text-[11px] text-center text-muted-foreground">
        결과는 자동으로 저장됩니다. 페이지를 닫아도 「프리미엄 콘텐츠 → 갤러리」에서 확인할 수 있어요.
      </p>
    </div>
  );
};
