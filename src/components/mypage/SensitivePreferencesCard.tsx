// 마이페이지 추가 정보 (민감) 자기 관리 카드 — v2 §5.4 Forgettable + §5.5 카피 톤.
//
// 모달에서 직접 입력 받지 않는 3종(임신/재혼/부모 부재)을 사용자가 명시적으로
// 켜고 끄는 채널. 행동 신호 + 부드러운 확인 카드와 함께 두 갈래 진입을 제공:
//   - 자동 추론 (행동 누적 → SoftConfirmCard) — 메인 진입
//   - 자기 관리 (본 카드) — 마이페이지에서 직접 토글
//
// "잊혀짐 (§5.4)" — 사용자가 OFF 토글 시 즉시 컬럼 NULL/false 화 + 관련 콘텐츠
// 노출 중단. 동의 기록은 PIPA 의무로 보존 (revoked_at 마킹은 별도 작업).

import { useState } from "react";
import { Settings2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import { resetSignal, SIGNAL_KEYS } from "@/lib/behavioralSignals";
import { toast } from "sonner";

type Saving = "none" | "pregnant" | "marital" | "parents-bride" | "parents-groom";

export default function SensitivePreferencesCard() {
  const { user } = useAuth();
  const { weddingSettings } = useWeddingSchedule();
  const [saving, setSaving] = useState<Saving>("none");
  const [expanded, setExpanded] = useState(false);

  if (!user) return null;

  const updateField = async (
    field: "pregnant" | "marital_history" | "has_parents_bride" | "has_parents_groom",
    value: boolean | "first" | "remarriage" | null,
    label: Saving
  ) => {
    setSaving(label);
    try {
      await (supabase as any)
        .from("user_wedding_settings")
        .update({ [field]: value })
        .eq("user_id", user.id);
      // OFF 전환 시 관련 행동 신호도 함께 폐기 — 사용자가 명시적으로 잊고 싶다는 의미.
      if (field === "pregnant" && value === false) {
        resetSignal(SIGNAL_KEYS.pregnancyInterest);
      }
      if (field === "marital_history" && value !== "remarriage") {
        resetSignal(SIGNAL_KEYS.remarriageInterest);
      }
      toast.success("설정이 저장됐어요");
      // 즉시 반영 위해 페이지 리로드 — useWeddingSchedule 재조회. 가벼운 패턴.
      window.location.reload();
    } catch (e) {
      console.error("sensitive pref update failed", e);
      toast.error("저장에 실패했어요. 다시 시도해주세요.");
    } finally {
      setSaving("none");
    }
  };

  const togglePregnant = () =>
    updateField("pregnant", !weddingSettings.pregnant, "pregnant");
  const toggleRemarriage = () =>
    updateField(
      "marital_history",
      weddingSettings.marital_history === "remarriage" ? "first" : "remarriage",
      "marital"
    );
  const toggleParentsBride = () =>
    updateField("has_parents_bride", !weddingSettings.has_parents_bride, "parents-bride");
  const toggleParentsGroom = () =>
    updateField("has_parents_groom", !weddingSettings.has_parents_groom, "parents-groom");

  const activeCount =
    (weddingSettings.pregnant ? 1 : 0) +
    (weddingSettings.marital_history === "remarriage" ? 1 : 0) +
    (!weddingSettings.has_parents_bride ? 1 : 0) +
    (!weddingSettings.has_parents_groom ? 1 : 0);

  return (
    <section className="mx-4 my-3 rounded-2xl border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-[13px] font-bold text-foreground">추가 정보</p>
            <p className="text-[11px] text-muted-foreground">
              {activeCount > 0
                ? `맞춤 가이드 ${activeCount}개 활성`
                : "임신·재혼·1인 진행 등 — 해당하시면 더 정확한 안내"}
            </p>
          </div>
        </div>
        <span className={`text-muted-foreground text-xs transition-transform ${expanded ? "rotate-180" : ""}`}></span>
      </button>

      {expanded && (
        <div className="border-t border-border px-4 py-3 space-y-3">
          <Row
            title="임신 중에 결혼 준비"
            description="본식 시점 차수에 맞춰 일정·드레스·신혼여행 가이드"
            active={weddingSettings.pregnant}
            loading={saving === "pregnant"}
            onToggle={togglePregnant}
          />
          <Row
            title="두 번째 결혼"
            description="작은 가족식 진행·양가 톤·자녀 동반 가이드"
            active={weddingSettings.marital_history === "remarriage"}
            loading={saving === "marital"}
            onToggle={toggleRemarriage}
          />
          <Row
            title="신부측 부모님 안 계세요"
            description="양가 분담 시뮬레이터를 1인 진행 변형으로"
            active={!weddingSettings.has_parents_bride}
            loading={saving === "parents-bride"}
            onToggle={toggleParentsBride}
          />
          <Row
            title="신랑측 부모님 안 계세요"
            description="양가 분담 시뮬레이터를 1인 진행 변형으로"
            active={!weddingSettings.has_parents_groom}
            loading={saving === "parents-groom"}
            onToggle={toggleParentsGroom}
          />
          <p className="text-[10px] text-muted-foreground leading-snug pt-1 border-t border-border">
            본 항목들은 민감정보로 분류돼 별도 동의 기록과 함께 보관돼요. 끄면
            관련 콘텐츠 노출이 즉시 중단되며, 동의 기록은 PIPA 규정상 일정 기간 보관 후 폐기됩니다.
          </p>
        </div>
      )}
    </section>
  );
}

function Row({
  title,
  description,
  active,
  loading,
  onToggle,
}: {
  title: string;
  description: string;
  active: boolean;
  loading: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-foreground">{title}</p>
        <p className="text-[11px] text-muted-foreground leading-snug">{description}</p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        disabled={loading}
        className={`shrink-0 w-10 h-6 rounded-full transition-colors relative ${
          active ? "bg-primary" : "bg-muted"
        } ${loading ? "opacity-60" : ""}`}
        aria-label={active ? "끄기" : "켜기"}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
            active ? "translate-x-[18px]" : "translate-x-0.5"
          } flex items-center justify-center`}
        >
          {loading && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
        </span>
      </button>
    </div>
  );
}
