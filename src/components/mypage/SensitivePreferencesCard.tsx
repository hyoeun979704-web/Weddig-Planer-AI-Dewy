// 마이페이지 추가 정보 (민감) 자기 관리 카드 — v2 §5.4 Forgettable + §5.5 카피 톤.
//
// 모달에서 직접 입력 받지 않는 3종(임신/재혼/부모 부재)을 사용자가 명시적으로
// 켜고 끄는 채널. 행동 신호 + 부드러운 확인 카드와 함께 두 갈래 진입을 제공:
//   - 자동 추론 (행동 누적 → SoftConfirmCard) — 메인 진입
//   - 자기 관리 (본 카드) — 마이페이지에서 직접 토글
//
// "잊혀짐 (§5.4)" — 사용자가 OFF 토글 시 즉시 컬럼 NULL/false 화 + 관련 콘텐츠
// 노출 중단. 동의 기록은 PIPA 의무로 보존 (revoked_at 마킹은 별도 작업).

import { useState, useEffect, useRef } from "react";
import { Settings2, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import { resetSignal, SIGNAL_KEYS } from "@/lib/behavioralSignals";
import { setSensitivePreference, type SensitiveField } from "@/lib/sensitiveConsent";
import { toast } from "sonner";

type Saving = "none" | "pregnant" | "marital" | "parents-bride" | "parents-groom";

export default function SensitivePreferencesCard() {
  const { user } = useAuth();
  const { weddingSettings } = useWeddingSchedule();
  const [saving, setSaving] = useState<Saving>("none");
  const [expanded, setExpanded] = useState(false);
  // F#D2 — reload 타이머 cleanup. unmount 시 stale reload 가 SPA 라우팅 덮어쓰지 않도록.
  // F#15 — 추가로 mounted ref 로 in-flight RPC 후 unmount 된 컴포넌트에 toast/state 안 시도.
  const reloadTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (reloadTimerRef.current != null) window.clearTimeout(reloadTimerRef.current);
    };
  }, []);
  const scheduleReload = (ms: number) => {
    if (!mountedRef.current) {
      // 이미 unmount 된 상태면 reload 도 schedule 안 함 — 다른 surface 가 적절히 refresh.
      return;
    }
    if (reloadTimerRef.current != null) window.clearTimeout(reloadTimerRef.current);
    reloadTimerRef.current = window.setTimeout(() => {
      reloadTimerRef.current = null;
      window.location.reload();
    }, ms);
  };

  if (!user) return null;

  // 통합 sensitive 토글 — set_sensitive_preference RPC v2 가:
  //   ① UPSERT (ON CONFLICT) — 행 없어도 신규 생성, race-safe (F#3·F#E4)
  //   ② server-derived consent_type + agreed (p_field 매핑 기반) — client 변조 X (F#E1·E2·E7)
  //   ③ 실제 active 전환 시에만 consent INSERT — 중복/spurious revoke 0 (F#5·E5·E11)
  //   ④ user_agent / consent_version 자동 첨부 (F#E3·E6)
  // 페이지 리로드는 toast 가 보이도록 ref 기반 timer + cleanup (F#D2).
  const updateField = async (
    field: SensitiveField,
    value: boolean | "first" | "remarriage" | null,
    label: Saving,
  ) => {
    setSaving(label);
    try {
      await setSensitivePreference({ field, value });
      // OFF 전환 시 관련 행동 신호도 함께 폐기 — 사용자가 명시적으로 잊고 싶다는 의미.
      if (field === "pregnant" && value === false) {
        resetSignal(SIGNAL_KEYS.pregnancyInterest);
      }
      if (field === "marital_history" && value !== "remarriage") {
        resetSignal(SIGNAL_KEYS.remarriageInterest);
      }
      // F#15 — RPC 후 unmount 됐으면 toast/reload 시도 안 함. 다른 surface 가 다음 mount 시 refetch.
      if (mountedRef.current) {
        toast.success("설정이 저장됐어요");
        scheduleReload(1200);
      }
    } catch (e) {
      console.error("sensitive pref update failed", e);
      if (mountedRef.current) {
        toast.error("저장에 실패했어요. 다시 시도해주세요.");
      }
    } finally {
      if (mountedRef.current) setSaving("none");
    }
  };

  // 모든 토글이 단순 (field, next-value) 만 전달. consent_type / agreed / recordConsent
  // 같은 client-derived 의 인수는 server-derived 로 이전돼 caller 책임 0.
  const togglePregnant = () =>
    updateField("pregnant", !weddingSettings.pregnant, "pregnant");
  // 3-state cycle (NULL → 'remarriage' → 'first' → NULL).
  const toggleRemarriage = () => {
    const cur = weddingSettings.marital_history;
    const next: "first" | "remarriage" | null =
      cur === null ? "remarriage" : cur === "remarriage" ? "first" : null;
    updateField("marital_history", next, "marital");
  };
  // has_parents_*=false 가 active(부재) 신호. 서버가 자동 도출해 consent_type 도 분리.
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
