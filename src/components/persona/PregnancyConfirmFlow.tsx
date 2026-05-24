// 임신 페르소나 2단계 확인 흐름 — v2 §5 + §4.3.
//
// 1단계: SoftConfirmCard ("임신 중이신 분들을 위한 가이드가 있어요" — 받기/괜찮아요)
// 2단계: 받기 → pregnant=true + 동의 기록 atomic 저장(upsert via setSensitivePreference)
//         → 같은 카드에서 출산예정일 inline 입력. 입력하면 차수 자동 계산 활성.
//         "건너뛰기" 선택 시 모든 차수별 가이드는 보수적인 "중기" 기본값 사용.
//
// F#4: navigate('/mypage?openWeddingInfo=1') 제거 — 소비자 없음. 같은 화면에서 끝냄.
// F#11: 약속한 차수별 개인화가 즉시 활성화되도록 due date 인라인 수집.

import { useState } from "react";
import { Calendar as CalIcon, X, Sparkles, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { setSensitivePreference } from "@/lib/sensitiveConsent";
import { markConfirmed, markDismissed, SIGNAL_KEYS } from "@/lib/behavioralSignals";
import { toast } from "sonner";
import SoftConfirmCard from "./SoftConfirmCard";

interface Props {
  /** 부모에서 카드 노출/숨김 가드(shouldPromptConfirm 결과 + 임신=false 가드). */
  show: boolean;
  /** 외부 신호 재평가 트리거 (부모 setState ↑↑). */
  onChange: () => void;
}

type Stage = "confirm" | "due-date";

export default function PregnancyConfirmFlow({ show, onChange }: Props) {
  const { user } = useAuth();
  const [stage, setStage] = useState<Stage>("confirm");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [saving, setSaving] = useState(false);

  if (!show || !user) return null;

  const handleConfirm = async () => {
    setSaving(true);
    try {
      // upsert + 동의 기록 atomic. 행 없는 사용자도 OK (F#3·F#4).
      await setSensitivePreference({
        userId: user.id,
        field: "pregnant",
        value: true,
        consentType: "sensitive_health_pregnancy_v1",
        agreedForConsent: true,
      });
      markConfirmed(SIGNAL_KEYS.pregnancyInterest);
      // 2단계로 — 같은 화면에서 due date 받음 (F#11).
      setStage("due-date");
    } catch (e) {
      console.error("pregnancy confirm failed", e);
      toast.error("저장에 실패했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  };

  const handleDecline = () => {
    markDismissed(SIGNAL_KEYS.pregnancyInterest);
    onChange();
  };

  const handleSaveDueDate = async () => {
    if (!dueDate) return;
    setSaving(true);
    try {
      // pregnancy_due_date 만 추가 저장 (pregnant 는 이미 true). upsert 동일 패턴.
      await setSensitivePreference({
        userId: user.id,
        field: "pregnant",          // 같은 컬럼 재기입은 무해, 트리거가 idempotent
        value: true,
        consentType: "sensitive_health_pregnancy_v1",
        agreedForConsent: true,
        extraPatch: { pregnancy_due_date: format(dueDate, "yyyy-MM-dd") },
      });
      toast.success("본식 시점 차수에 맞춰 일정·드레스·신혼여행을 정리해드릴게요");
      // 토스트가 사용자에게 보이도록 1.2초 후 onChange — refetch.
      setTimeout(() => {
        onChange();
        window.location.reload();
      }, 1200);
    } catch (e) {
      console.error("due date save failed", e);
      toast.error("저장에 실패했어요. 마이페이지에서 다시 입력하실 수 있어요.");
      onChange();
    } finally {
      setSaving(false);
    }
  };

  const handleSkipDueDate = () => {
    toast.info("나중에 마이페이지에서 출산예정일을 입력하시면 더 정확해져요", { duration: 3500 });
    setTimeout(() => {
      onChange();
      window.location.reload();
    }, 800);
  };

  if (stage === "confirm") {
    return (
      <SoftConfirmCard
        tone="warm"
        title="임신 중에 결혼 준비하시는 분들을 위한 가이드가 있어요"
        description="본식 시점 차수에 맞춰 일정·드레스·신혼여행이 자동으로 맞춰져요. 한 번에 받아보시겠어요?"
        confirmLabel={saving ? "저장 중…" : "받기"}
        declineLabel="지금은 괜찮아요"
        onConfirm={handleConfirm}
        onDecline={handleDecline}
      />
    );
  }

  // 2단계: 출산예정일 inline 입력. 사용자가 건너뛰어도 가이드는 활성됨.
  return (
    <section className="mx-4 my-3 rounded-2xl border border-pink-200 bg-pink-50 p-3.5 relative">
      <button
        type="button"
        aria-label="건너뛰기"
        onClick={handleSkipDueDate}
        className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center opacity-50 hover:opacity-100"
      >
        <X className="w-3.5 h-3.5" />
      </button>
      <div className="pr-6">
        <div className="flex items-center gap-1.5 mb-1">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <p className="text-[13px] font-bold text-foreground">
            출산예정일을 알려주시면 더 정확해요
          </p>
        </div>
        <p className="text-[11px] text-muted-foreground leading-snug mb-2.5">
          본식 시점 임신 차수(초기/중기/후기) 를 계산해 가봉·신혼여행·동선을 자동 조정해요.
          입력 안 하셔도 "중기" 보수적 기본값으로 안내해드려요.
        </p>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="w-full mb-2 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-pink-200 text-[12px] font-semibold"
            >
              <CalIcon className="w-3.5 h-3.5" />
              {dueDate ? format(dueDate, "yyyy.MM.dd") : "출산예정일 선택"}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dueDate} onSelect={setDueDate} className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSaveDueDate}
            disabled={!dueDate || saving}
            className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-[12px] font-bold disabled:opacity-60 active:scale-[0.98] transition-transform inline-flex items-center justify-center gap-1.5"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            저장
          </button>
          <button
            type="button"
            onClick={handleSkipDueDate}
            disabled={saving}
            className="flex-1 py-2 rounded-xl bg-transparent border border-pink-200 text-foreground text-[12px] font-semibold active:scale-[0.98] transition-transform"
          >
            건너뛰기
          </button>
        </div>
      </div>
    </section>
  );
}
