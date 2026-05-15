import { useNavigate } from "react-router-dom";
import { TrendingDown, TrendingUp, Minus, ArrowRight } from "lucide-react";
import { useWeddingProfile } from "@/hooks/useWeddingProfile";
import { getRegionalAvgWithMeal } from "@/data/budgetData";

// Region key → 한글 라벨. budgetData.ts 키와 정확히 매칭.
const REGION_LABEL: Record<string, string> = {
  seoul: "서울",
  gyeonggi: "경기",
  incheon: "인천",
  busan: "부산",
  daegu: "대구",
  daejeon: "대전",
  gwangju: "광주",
  ulsan: "울산",
  sejong: "세종",
  gangwon: "강원",
  chungbuk: "충북",
  chungnam: "충남",
  jeonbuk: "전북",
  jeonnam: "전남",
  gyeongbuk: "경북",
  gyeongnam: "경남",
  jeju: "제주",
};

// 페르소나 인터뷰에서 "혜진+영수(일반·D-250·예산 7,000만)"가
// "내 예산이 평균보다 많은가 적은가 한눈에 보고 싶다"고 명시.
// 지역·하객 수 기반 평균과 비교해 차이 %를 표시합니다. 미설정
// 사용자에겐 노출하지 않아 노이즈를 만들지 않습니다.
const BudgetVsAverageCard = () => {
  const navigate = useNavigate();
  const profile = useWeddingProfile();

  if (!profile.isLoaded) return null;
  if (profile.totalBudget <= 0) return null;

  const avg = getRegionalAvgWithMeal(profile.region, profile.guestCount);
  if (!avg) return null;

  const diffPct = Math.round(((profile.totalBudget - avg.total) / avg.total) * 100);
  const absDiff = Math.abs(diffPct);

  // 3가지 톤: 평균보다 낮음 / 비슷함(±5%) / 높음.
  const tone =
    absDiff <= 5 ? "neutral" : diffPct < 0 ? "lower" : "higher";

  const palette = {
    lower: {
      icon: <TrendingDown className="w-3.5 h-3.5" />,
      label: `평균보다 ${absDiff}% 적어요`,
      sub: "여유 있는 편이에요",
      chip: "bg-emerald-50 text-emerald-700",
    },
    higher: {
      icon: <TrendingUp className="w-3.5 h-3.5" />,
      label: `평균보다 ${absDiff}% 많아요`,
      sub: "조정 여지가 있는지 살펴보세요",
      chip: "bg-rose-50 text-rose-700",
    },
    neutral: {
      icon: <Minus className="w-3.5 h-3.5" />,
      label: "평균과 비슷해요",
      sub: "안정적인 구간이에요",
      chip: "bg-muted text-muted-foreground",
    },
  }[tone];

  const regionLabel = REGION_LABEL[profile.region] ?? profile.region;

  return (
    <section className="px-4 pt-2">
      <button
        onClick={() => navigate("/budget")}
        className="w-full flex items-center gap-3 p-3 bg-card rounded-2xl border border-border/60 active:scale-[0.98] transition-transform text-left"
      >
        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${palette.chip}`}>
          {palette.icon}
          <span className="text-[11px] font-bold">{palette.label}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-bold text-foreground truncate">
            내 예산 {profile.totalBudget.toLocaleString()}만 · {regionLabel} 평균 {avg.total.toLocaleString()}만
          </p>
          <p className="text-[10px] text-muted-foreground truncate">
            하객 {profile.guestCount}명 · 식대 {avg.meal.toLocaleString()}만 포함 · {palette.sub}
          </p>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      </button>
    </section>
  );
};

export default BudgetVsAverageCard;
