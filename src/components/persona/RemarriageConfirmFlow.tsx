// 재혼 확인 흐름 — v2 §4.3 + §5. PregnancyConfirmFlow 패턴 재사용.
//
// 행동 신호(remarriageInterest) 누적 임계값 도달 시 SoftConfirmCard 노출 →
// 사용자가 "받기" 누르면 marital_history='remarriage' 저장 + 동의 기록.
// 임신과 달리 inline 2단계 입력 없음 (single field).

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { setSensitivePreference } from "@/lib/sensitiveConsent";
import { markConfirmed, markDismissed, SIGNAL_KEYS } from "@/lib/behavioralSignals";
import { toast } from "sonner";
import SoftConfirmCard from "./SoftConfirmCard";

interface Props {
  show: boolean;
  onChange: () => void;
}

export default function RemarriageConfirmFlow({ show, onChange }: Props) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  const reloadTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (reloadTimerRef.current != null) window.clearTimeout(reloadTimerRef.current);
    };
  }, []);

  if (!user || !show) return null;

  const handleConfirm = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await setSensitivePreference({ field: "marital_history", value: "remarriage" });
      if (!mountedRef.current) return;
      markConfirmed(SIGNAL_KEYS.remarriageInterest);
      toast.success("작은 가족식 톤·자녀 동반 가이드를 활성화했어요");
      onChange();
      if (mountedRef.current) {
        reloadTimerRef.current = window.setTimeout(() => {
          reloadTimerRef.current = null;
          window.location.reload();
        }, 1200);
      }
    } catch (e) {
      console.error("remarriage confirm failed", e);
      if (mountedRef.current) {
        toast.error("저장에 실패했어요. 잠시 후 다시 시도해주세요.");
      }
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  };

  const handleDecline = () => {
    markDismissed(SIGNAL_KEYS.remarriageInterest);
    onChange();
  };

  return (
    <SoftConfirmCard
      tone="neutral"
      title="두 번째 시작을 준비하시는 분들을 위한 가이드가 있어요"
      description="작은 가족식 진행·양가 톤 다운·자녀 동반 시나리오까지 따로 정리해드릴 수 있어요."
      confirmLabel={saving ? "저장 중…" : "받기"}
      declineLabel="지금은 괜찮아요"
      onConfirm={handleConfirm}
      onDecline={handleDecline}
      isBusy={saving}
    />
  );
}
