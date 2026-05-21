import { useState } from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import WeddingInfoSetupModal from "@/components/wedding-planner/WeddingInfoSetupModal";

/**
 * 가입 직후 첫 화면(홈)의 비강제 온보딩 진입점.
 *
 * 로그인했지만 아직 결혼 정보를 입력하지 않은 사용자에게만 노출되며,
 * PersonaDashboard 가 비어 있는 자리를 채운다(같은 data-tutorial 앵커를 달아
 * 홈 튜토리얼이 이 카드를 가리키도록 함). 강제 모달이 아니라 사용자가 직접
 * 탭할 때만 입력 모달이 열린다 — 건너뛰어도 다시 강제로 뜨지 않는다.
 */
const HomeOnboardingCard = () => {
  const { user } = useAuth();
  const { weddingSettings, isLoading } = useWeddingSchedule();
  const [open, setOpen] = useState(false);

  if (!user || isLoading) return null;

  const hasDateInfo =
    !!weddingSettings.wedding_date || weddingSettings.wedding_date_tbd;
  const hasRegionInfo =
    !!weddingSettings.wedding_region || weddingSettings.wedding_region_tbd;
  const onboarded =
    (hasDateInfo && hasRegionInfo) || !!weddingSettings.planning_stage;
  if (onboarded) return null;

  return (
    <div className="px-4 pt-4" data-tutorial="persona-dashboard">
      <button
        onClick={() => setOpen(true)}
        className="w-full text-left rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-accent/20 p-5 active:scale-[0.99] transition-transform"
      >
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            1분이면 끝나요
          </span>
        </div>
        <h3 className="text-[16px] font-bold text-foreground">
          결혼 정보 입력하고 맞춤 추천 받기
        </h3>
        <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">
          예식일·지역만 알려주시면 D-Day, 추천 체크리스트, 예산을 한 번에
          챙겨드려요.
        </p>
        <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-primary">
          지금 시작하기 <ArrowRight className="w-4 h-4" />
        </span>
      </button>

      <WeddingInfoSetupModal isOpen={open} onClose={() => setOpen(false)} />
    </div>
  );
};

export default HomeOnboardingCard;
