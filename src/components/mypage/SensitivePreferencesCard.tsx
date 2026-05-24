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
import { useAuth } from "@/contexts/AuthContext";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import { resetSignal, SIGNAL_KEYS } from "@/lib/behavioralSignals";
import { setSensitivePreference, type SensitiveConsentType } from "@/lib/sensitiveConsent";
import { toast } from "sonner";

type Saving = "none" | "pregnant" | "marital" | "parents-bride" | "parents-groom";

export default function SensitivePreferencesCard() {
  const { user } = useAuth();
  const { weddingSettings } = useWeddingSchedule();
  const [saving, setSaving] = useState<Saving>("none");
  const [expanded, setExpanded] = useState(false);

  if (!user) return null;

  // 통합 sensitive 토글 — setSensitivePreference 가 다음을 보장:
  //   ① upsert(onConflict=user_id) — user_wedding_settings 행 없어도 신규 생성 (F#3)
  //   ② Supabase {error} 명시 throw — await 만으로 안 throw 되던 회귀(F#2) 회피
  //   ③ user_consents 동의 기록 함께 INSERT — PIPA 의무, 모든 진입 경로 일관(F#5)
  // 페이지 리로드는 toast 가 보이도록 setTimeout 1.2s 지연 (F#13).
  const updateField = async (
    field: "pregnant" | "marital_history" | "has_parents_bride" | "has_parents_groom",
    value: boolean | "first" | "remarriage" | null,
    consentType: SensitiveConsentType,
    agreedForConsent: boolean,
    label: Saving,
    // F#11 — 실제 consent 상태 변화가 없는 토글에선 consent INSERT 생략.
    // 예: marital_history first → null 은 "이미 non-remarriage" 였으므로 추가 revoke 행 불필요.
    recordConsent: boolean = true,
  ) => {
    setSaving(label);
    try {
      await setSensitivePreference({
        field,
        value,
        consentType,
        agreedForConsent,
        recordConsent,
      });
      // OFF 전환 시 관련 행동 신호도 함께 폐기 — 사용자가 명시적으로 잊고 싶다는 의미.
      if (field === "pregnant" && value === false) {
        resetSignal(SIGNAL_KEYS.pregnancyInterest);
      }
      if (field === "marital_history" && value !== "remarriage") {
        resetSignal(SIGNAL_KEYS.remarriageInterest);
      }
      toast.success("설정이 저장됐어요");
      // 토스트가 사용자에게 보이도록 1.2초 후 리로드 — 이전에는 같은 turn 에 reload 해 토스트가 destroy 됨(F#13).
      setTimeout(() => window.location.reload(), 1200);
    } catch (e) {
      console.error("sensitive pref update failed", e);
      toast.error("저장에 실패했어요. 다시 시도해주세요.");
    } finally {
      setSaving("none");
    }
  };

  const togglePregnant = () => {
    const next = !weddingSettings.pregnant;
    updateField("pregnant", next, "sensitive_health_pregnancy_v1", next, "pregnant");
  };
  // 3-state cycle (NULL → 'remarriage' → 'first' → NULL). 사용자가 "선택 안 함" 까지
  // 되돌아갈 수 있게 함. F#11 — consent 기록은 remarriage boolean 상태가 실제로
  // 바뀔 때만(NULL→remarriage / remarriage→first 두 케이스). first→NULL 은 이미
  // non-remarriage 상태였으므로 추가 revoke 행 생성하지 않음.
  const toggleRemarriage = () => {
    const cur = weddingSettings.marital_history;
    const next: "first" | "remarriage" | null =
      cur === null ? "remarriage" : cur === "remarriage" ? "first" : null;
    const wasRemarriage = cur === "remarriage";
    const isRemarriage = next === "remarriage";
    const consentStateChanged = wasRemarriage !== isRemarriage;
    updateField(
      "marital_history",
      next,
      "sensitive_family_remarriage_v1",
      isRemarriage,
      "marital",
      consentStateChanged,
    );
  };
  // F#10 — bride/groom 분리 consent_type. 한 type 으로 두 컬럼 토글하면 audit 가
  // 어느 쪽 변경인지 구별 못함. 별도 enum 사용.
  const toggleParentsBride = () => {
    const next = !weddingSettings.has_parents_bride;
    updateField(
      "has_parents_bride",
      next,
      "sensitive_family_no_parents_bride_v1",
      !next,
      "parents-bride",
    );
  };
  const toggleParentsGroom = () => {
    const next = !weddingSettings.has_parents_groom;
    updateField(
      "has_parents_groom",
      next,
      "sensitive_family_no_parents_groom_v1",
      !next,
      "parents-groom",
    );
  };

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
