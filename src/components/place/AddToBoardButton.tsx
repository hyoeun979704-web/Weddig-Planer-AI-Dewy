import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardCheck, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { primarySlotForQuoteCategory } from "@/lib/vendorBoard";
import { markBoardSlotBookedByQuoteCategory } from "@/hooks/useVendorBoard";
import { recordVendorBudget } from "@/lib/vendorBudget";
import { promptAmount } from "@/components/ui/amount-prompt";

// 업체 상세에서 '이 업체로 결정' → 내 업체 보드의 해당 카테고리 대표 슬롯에 기록한다.
// 입점/미입점 무관(모든 place 는 place_id 보유) — 미입점 업체도 그대로 결정·기록 가능.
// 보드 슬롯이 없는 카테고리(혼수가전 등)에서는 노출하지 않는다(죽은 버튼 방지).
const AddToBoardButton = ({ placeId, placeName, category }: { placeId: string; placeName: string; category: string }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const slot = primarySlotForQuoteCategory(category);
  const [chosen, setChosen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || !slot) { setChosen(false); return; }
    let alive = true;
    void supabase
      .from("vendor_board_items")
      .select("place_id")
      .eq("user_id", user.id)
      .eq("slot_key", slot.key)
      .maybeSingle()
      .then(({ data }) => { if (alive) setChosen((data as { place_id?: string | null } | null)?.place_id === placeId); });
    return () => { alive = false; };
  }, [user, slot, placeId]);

  if (!slot) return null;

  const record = async () => {
    if (!user) { navigate("/auth"); return; }
    setSaving(true);
    const res = await markBoardSlotBookedByQuoteCategory(user.id, category, placeId, placeName);
    setSaving(false);
    if (!res.ok) { toast.error("기록에 실패했어요. 잠시 후 다시 시도해 주세요"); return; }
    setChosen(true);
    toast.success(`내 보드 '${slot.label}'에 이 업체로 기록했어요`, {
      action: { label: "보드 보기", onClick: () => navigate("/board") },
    });
    // 앱 밖 계약 금액은 직접 입력받아 예산에도 반영(모르면 건너뜀).
    const amount = await promptAmount({
      title: `${placeName} 계약 금액`,
      description: "계약·견적 금액을 입력하면 내 예산에 자동 기록돼요. 아직 모르면 건너뛰어도 괜찮아요.",
      label: "계약 금액(만원)",
      confirmText: "예산에 기록",
    });
    if (amount != null) {
      const r = await recordVendorBudget({
        userId: user.id,
        placeCategory: category,
        vendorName: placeName,
        amountManwon: amount,
      });
      toast[r.ok ? "success" : "error"](r.ok ? "내 예산에도 금액을 기록했어요" : "예산 기록에 실패했어요");
    }
  };

  return (
    <div className="px-4 pt-3">
      <button
        type="button"
        onClick={chosen ? () => navigate("/board") : record}
        disabled={saving}
        className={`w-full flex items-center justify-between gap-2 rounded-xl border p-3 active:scale-[0.99] transition-transform ${
          chosen ? "border-emerald-300 bg-emerald-50" : "border-primary/40 bg-primary/5"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${chosen ? "bg-emerald-100" : "bg-primary/15"}`}>
            {chosen ? <Check className="w-4 h-4 text-emerald-600" /> : <ClipboardCheck className="w-4 h-4 text-primary" />}
          </div>
          <div className="text-left min-w-0">
            <p className="text-[13px] font-semibold text-foreground truncate">
              {chosen ? `내 보드 '${slot.label}'에 결정한 업체` : "이 업체로 결정 · 내 보드에 추가"}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {chosen ? "다른 업체로 결정하면 갱신돼요" : `'${slot.label}' 슬롯에 기록돼요`}
            </p>
          </div>
        </div>
        {saving ? (
          <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
        ) : (
          <span className="text-[11px] font-semibold text-primary shrink-0">{chosen ? "보드 →" : "추가"}</span>
        )}
      </button>
    </div>
  );
};

export default AddToBoardButton;
