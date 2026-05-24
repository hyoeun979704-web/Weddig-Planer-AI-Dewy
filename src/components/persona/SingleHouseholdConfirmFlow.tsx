// 1인 진행(부모 부재) 확인 흐름 — v2 §4.3 + §5.
//
// 행동 신호(singleHouseholdHint) 누적 시 SoftConfirmCard + inline 3-옵션
// (신부측/신랑측/양쪽) 입력. 사용자가 측을 선택하면 해당 has_parents_* 를 false 로
// 저장 + 동의 기록. 양쪽 둘 다는 single_household 페르소나로 자동 전환.

import { useEffect, useRef, useState } from "react";
import { X, Sparkles, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { setSensitivePreference } from "@/lib/sensitiveConsent";
import { markConfirmed, markDismissed, SIGNAL_KEYS } from "@/lib/behavioralSignals";
import { toast } from "sonner";
import SoftConfirmCard from "./SoftConfirmCard";

interface Props {
  show: boolean;
  onChange: () => void;
}

type Stage = "confirm" | "choose-side";
type Side = "bride" | "groom" | "both";

// Round 9 self-review P0 — choose-side 단계 영구화. 사용자가 '받기' 누른 뒤 side
// 선택 안 하고 닫으면 stage 가 휘발돼 진입 경로가 없었음. PregnancyConfirmFlow 의
// stage 영구화 패턴 차용. user 별 key 라 cross-account leak 없음.
const STAGE_KEY = (userId: string) => `dewy:single-household-stage:${userId}`;

export default function SingleHouseholdConfirmFlow({ show, onChange }: Props) {
  const { user } = useAuth();
  const [stage, setStage] = useState<Stage>("confirm");
  const [saving, setSaving] = useState(false);
  // useAuth async 라 첫 render 에 user=null. hydratedFromStorage 가드로 hydration
  // 전엔 localStorage write 안 함(PregnancyConfirmFlow 의 F#3 패턴).
  const [hydratedFromStorage, setHydratedFromStorage] = useState(false);

  // user 등장 직후 1회만 hydrate.
  useEffect(() => {
    if (!user || hydratedFromStorage) return;
    try {
      const stored = localStorage.getItem(STAGE_KEY(user.id));
      if (stored === "choose-side") setStage("choose-side");
    } catch {
      /* ignore */
    }
    setHydratedFromStorage(true);
  }, [user, hydratedFromStorage]);

  // stage 변경 시 localStorage 동기. hydration 전엔 write 안 함 (clobber 회피).
  useEffect(() => {
    if (!user || !hydratedFromStorage) return;
    try {
      if (stage === "choose-side") {
        localStorage.setItem(STAGE_KEY(user.id), "choose-side");
      } else {
        localStorage.removeItem(STAGE_KEY(user.id));
      }
    } catch {
      /* ignore */
    }
  }, [stage, user, hydratedFromStorage]);

  const reloadTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (reloadTimerRef.current != null) window.clearTimeout(reloadTimerRef.current);
    };
  }, []);

  if (!user) return null;
  if (!show && stage !== "choose-side") return null;

  const handleConfirm = () => {
    if (saving) return;
    // markConfirmed 는 side 선택 후로 미룸. stage 만 전환 + localStorage 영구화.
    setStage("choose-side");
  };

  const handleDecline = () => {
    markDismissed(SIGNAL_KEYS.singleHouseholdHint);
    onChange();
  };

  const handleSelectSide = async (side: Side) => {
    if (saving) return;
    setSaving(true);
    try {
      // bride / both → has_parents_bride=false. groom / both → has_parents_groom=false.
      if (side === "bride" || side === "both") {
        await setSensitivePreference({ field: "has_parents_bride", value: false });
      }
      if (side === "groom" || side === "both") {
        await setSensitivePreference({ field: "has_parents_groom", value: false });
      }
      if (!mountedRef.current) return;
      markConfirmed(SIGNAL_KEYS.singleHouseholdHint);
      toast.success("1인 진행 가이드를 활성화했어요");
      onChange();
      if (mountedRef.current) {
        reloadTimerRef.current = window.setTimeout(() => {
          reloadTimerRef.current = null;
          window.location.reload();
        }, 1200);
      }
    } catch (e) {
      console.error("single household confirm failed", e);
      if (mountedRef.current) {
        toast.error("저장에 실패했어요. 잠시 후 다시 시도해주세요.");
      }
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  };

  const handleSkip = () => {
    if (saving) return;
    markDismissed(SIGNAL_KEYS.singleHouseholdHint);
    setStage("confirm");
    onChange();
  };

  if (stage === "confirm") {
    return (
      <SoftConfirmCard
        tone="neutral"
        title="혼자 준비하시는 분들을 위한 가이드도 있어요"
        description="친정·시댁 역할 부재 시 양가 분담을 1인 변형으로, 정서적 톤도 함께 조정해드려요."
        onConfirm={handleConfirm}
        onDecline={handleDecline}
        isBusy={false}
      />
    );
  }

  // 2단계: 양가 중 어느 쪽이 부재인지 선택.
  return (
    <section className="mx-4 my-3 rounded-2xl border border-border bg-card p-3.5 relative">
      <button
        type="button"
        aria-label="건너뛰기"
        onClick={handleSkip}
        disabled={saving}
        className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center opacity-50 hover:opacity-100 disabled:opacity-30"
      >
        <X className="w-3.5 h-3.5" />
      </button>
      <div className="pr-6">
        <div className="flex items-center gap-1.5 mb-1">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <p className="text-[13px] font-bold text-foreground">어느 쪽 부모님이 안 계신가요?</p>
        </div>
        <p className="text-[11px] text-muted-foreground leading-snug mb-3">
          알려주시면 분담 시뮬레이터·양가 인사 가이드를 적절히 조정해요. 마이페이지에서 언제든 변경 가능해요.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {([
            { v: "bride" as const, label: "신부측" },
            { v: "groom" as const, label: "신랑측" },
            { v: "both" as const, label: "양쪽 모두" },
          ]).map((opt) => (
            <button
              key={opt.v}
              type="button"
              onClick={() => handleSelectSide(opt.v)}
              disabled={saving}
              className="py-2 rounded-xl bg-primary/10 text-primary text-[12px] font-bold active:scale-[0.98] transition-transform disabled:opacity-60 inline-flex items-center justify-center gap-1"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
