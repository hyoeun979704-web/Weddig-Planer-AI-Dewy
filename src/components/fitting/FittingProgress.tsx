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
  { label: "당신의 모습을 곰곰이 들여다보고 있어요", emoji: "📸", durationMs: 6_000 },
  { label: "당신만의 표정과 분위기를 기억해요", emoji: "💞", durationMs: 8_000 },
  { label: "꿈에 그리던 드레스를 정성스럽게 입혀드릴게요", emoji: "👰‍♀️", durationMs: 12_000 },
  { label: "당신을 위한 장면을 한 컷, 그려보는 중", emoji: "🌸", durationMs: 12_000 },
  { label: "마지막 빛결을 더해 가장 빛나는 순간으로", emoji: "✨", durationMs: 8_000 },
];

const TIPS = [
  "A라인 실루엣은 알파벳 A를 닮은 라인으로, 거의 모든 체형에 잘 어울리는 만능 디자인이에요.",
  "머메이드는 글래머러스한 매력을, 볼 가운은 동화 같은 분위기를 만들어요.",
  "오프숄더는 어깨선을 드러내 우아한 쇄골 라인을 살려주는 클래식한 네크라인이에요.",
  "스위트하트 네크라인은 하트 모양처럼 부드럽게 파여 사랑스러운 분위기를 더해줘요.",
  "튤은 풍성한 볼륨감, 사틴은 매끄러운 광택, 시폰은 가볍고 우아한 드레이프를 만들어요.",
  "퓨어 화이트는 화사한 봄·여름에, 아이보리·샴페인은 따뜻한 가을·겨울에 잘 어울려요.",
  "코르셋 백은 허리를 잡아주면서 등 라인을 강조해 본식에서 가장 사랑받는 백 디자인이에요.",
  "샴페인 톤 드레스는 따뜻한 피부톤에, 퓨어 화이트는 쿨톤에 특히 잘 어울려요.",
  "본식 드레스는 짧은 트레인, 야외 촬영은 긴 트레인이 사진에 더 잘 담겨요.",
  "비딩(beading)은 빛을 받으면 반짝이며 신부의 동선을 따라 빛나는 효과를 만들어요.",
  "한국 웨딩에서는 본식 드레스와 야외 촬영 드레스를 따로 고르는 경우가 많아요.",
  "튤 베일 1단은 가볍고 모던, 2단은 클래식하고 격식 있는 느낌을 줘요.",
  "꽃다발은 드레스 라인을 가리지 않을 정도의 크기가 사진에 가장 예뻐요.",
  "허리 라인이 자연스럽게 잡힌 드레스가 어떤 키에서도 가장 안정감 있어 보여요.",
  "오프숄더 드레스에는 짧은 헤어 또는 업스타일이, 홀터넥에는 다운 스타일이 잘 어울려요.",
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
        <div className="flex items-center justify-between text-[12px]">
          <span className="flex items-center gap-2 font-medium text-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
            <span className="text-lg leading-none">{STAGES[currentStageIdx].emoji}</span>
            <span>{STAGES[currentStageIdx].label}</span>
          </span>
          <span className="tabular-nums text-muted-foreground">{percent}%</span>
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

      {/* 드레스 팁 캐러셀 */}
      <div className="p-4 rounded-xl bg-background/70 border border-primary/15">
        <div className="flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[11px] font-semibold text-primary mb-1">알아두면 좋은 드레스 이야기</p>
            <p className="text-[13px] text-foreground leading-relaxed">{TIPS[tipIndex]}</p>
          </div>
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
            기다리는 동안 게임 한판 어때요?
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            꽃 머지 게임으로 포인트도 모으고, 시간도 잊어요 🌸
          </p>
        </div>
      </button>

      <p className="text-[11px] text-center text-muted-foreground leading-relaxed">
        완성된 모습은 자동으로 저장돼요. 잠시 다른 일을 보다 오셔도
        <br />
        「프리미엄 콘텐츠 → 갤러리」에서 확인하실 수 있어요 💌
      </p>
    </div>
  );
};
