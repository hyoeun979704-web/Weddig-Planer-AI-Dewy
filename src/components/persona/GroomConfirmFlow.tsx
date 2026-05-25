// 신랑 모드 확인 흐름 — v2 §4.3 + §5.
//
// 행동 신호(groomRoleHint) 누적 시 SoftConfirmCard 노출 → "받기" 누르면 role='groom'
// 저장. role 은 민감 정보 아님 — user_consents 기록 없이 user_wedding_settings UPDATE.
// role 변경은 미션·헤더·AI 호칭에 즉시 반영.
//
// 마이그레이션(React Query): window.location.reload() 제거 — upsert 후
// useInvalidateWeddingSettings() 로 ['wedding_settings', userId] 캐시 무효화만 하면
// PersonaDashboard / 헤더 / AI 호칭 모두 자동 refetch.

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useInvalidateWeddingSettings } from "@/hooks/useWeddingSchedule";
import { supabase } from "@/integrations/supabase/client";
import { markConfirmed, markDismissed, SIGNAL_KEYS } from "@/lib/behavioralSignals";
import { toast } from "sonner";
import SoftConfirmCard from "./SoftConfirmCard";

interface Props {
  show: boolean;
  onChange: () => void;
}

export default function GroomConfirmFlow({ show, onChange }: Props) {
  const { user } = useAuth();
  const invalidateWeddingSettings = useInvalidateWeddingSettings();
  const [saving, setSaving] = useState(false);

  if (!user || !show) return null;

  const handleConfirm = async () => {
    if (saving) return;
    setSaving(true);
    try {
      // role 은 민감 아님 — 직접 update. user_wedding_settings 행이 없을 가능성 대비
      // INSERT … ON CONFLICT 패턴 (SECURITY DEFINER RPC 사용 안 함 — role 은 PIPA 대상 X).
      const { error } = await supabase
        .from("user_wedding_settings")
        .upsert({ user_id: user.id, role: "groom" }, { onConflict: "user_id" });
      if (error) throw error;
      markConfirmed(SIGNAL_KEYS.groomRoleHint);
      toast.success("신랑 관점 가이드를 활성화했어요");
      onChange();
      void invalidateWeddingSettings();
    } catch (e) {
      console.error("groom confirm failed", e);
      toast.error("저장에 실패했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  };

  const handleDecline = () => {
    markDismissed(SIGNAL_KEYS.groomRoleHint);
    onChange();
  };

  return (
    <SoftConfirmCard
      tone="cool"
      title="신랑이 직접 준비하시는 분들을 위한 가이드가 있어요"
      description="예복·예물·신랑 양가 분담을 먼저 보여드리고 AI 호칭도 신랑님으로 맞춰드릴게요."
      confirmLabel={saving ? "저장 중…" : "받기"}
      declineLabel="지금은 괜찮아요"
      onConfirm={handleConfirm}
      onDecline={handleDecline}
      isBusy={saving}
    />
  );
}
