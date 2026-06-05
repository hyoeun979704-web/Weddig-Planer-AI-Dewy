import { useNavigate } from "react-router-dom";
import { Clock, ChevronRight, Gamepad2, Users, ClipboardList } from "lucide-react";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";

// 생성 대기 화면 안내 — "창을 닫아도 됨" + 예상 소요시간 + 그동안 할 일 유도.
//  - 결혼 상세정보 미입력 → 입력 유도(맞춤 추천 명분)
//  - 이미 입력 → 미니게임 / 커뮤니티로 유도
// 서버가 백그라운드로 생성하고 완료되면 전역 알림이 뜨므로 안심하고 이동 가능.

const ProcessingGuide = ({ etaText }: { etaText?: string }) => {
  const navigate = useNavigate();
  const { weddingSettings, isLoading } = useWeddingSchedule();

  const hasDate =
    !!weddingSettings.wedding_date || weddingSettings.wedding_date_tbd;
  const hasRegion =
    !!weddingSettings.wedding_region || weddingSettings.wedding_region_tbd;
  const onboarded =
    (hasDate && hasRegion) || !!weddingSettings.planning_stage;

  return (
    <div className="mt-2 rounded-2xl border border-border bg-muted/30 p-4 text-left">
      {etaText && (
        <div className="flex items-center gap-1.5 text-[12px] text-foreground">
          <Clock className="w-3.5 h-3.5 text-primary" />
          <span>
            예상 소요 <span className="font-semibold">{etaText}</span>
          </span>
        </div>
      )}
      <p className="mt-1 text-[12px] text-muted-foreground leading-relaxed">
        창을 닫거나 다른 화면으로 가도 계속 진행돼요. 완료되면 알림으로
        알려드릴게요. 기다리는 동안 아래를 해보세요 👇
      </p>

      <div className="mt-3 space-y-2">
        {isLoading ? null : !onboarded ? (
          <button
            type="button"
            onClick={() => navigate("/mypage?setup=wedding")}
            className="w-full flex items-center justify-between rounded-xl bg-primary/10 border border-primary/20 px-3 py-3"
          >
            <span className="flex items-center gap-2 text-[13px] font-medium text-primary">
              <ClipboardList className="w-4 h-4" />
              결혼 정보 입력하고 맞춤 추천 받기
            </span>
            <ChevronRight className="w-4 h-4 text-primary" />
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => navigate("/merge-game")}
              className="w-full flex items-center justify-between rounded-xl bg-background border border-border px-3 py-3"
            >
              <span className="flex items-center gap-2 text-[13px] font-medium text-foreground">
                <Gamepad2 className="w-4 h-4 text-primary" />
                미니게임 하며 기다리기
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <button
              type="button"
              onClick={() => navigate("/community")}
              className="w-full flex items-center justify-between rounded-xl bg-background border border-border px-3 py-3"
            >
              <span className="flex items-center gap-2 text-[13px] font-medium text-foreground">
                <Users className="w-4 h-4 text-primary" />
                커뮤니티에서 후기·꿀팁 보기
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ProcessingGuide;
