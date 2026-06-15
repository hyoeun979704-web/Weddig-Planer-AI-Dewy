import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ChevronDown, Send, Store, FileText, Check } from "lucide-react";
import { toast } from "sonner";
import Seo from "@/components/Seo";
import PageHeader from "@/components/PageHeader";
import LoginRequiredOverlay from "@/components/LoginRequiredOverlay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useVendorBoard, type VendorBoardItem } from "@/hooks/useVendorBoard";
import {
  VENDOR_SLOTS,
  VENDOR_SLOT_GROUPS,
  VENDOR_STATUS_META,
  type VendorSlot,
  type VendorSlotStatus,
} from "@/lib/vendorBoard";

const STATUS_ORDER: VendorSlotStatus[] = ["undecided", "quoting", "booked"];

// 한 슬롯 카드 — 접힌 상태는 라벨+상태칩+선택업체, 펼치면 상태/업체명/CTA 편집.
const SlotCard = ({
  slot,
  item,
  onSave,
}: {
  slot: VendorSlot;
  item: VendorBoardItem | undefined;
  onSave: (patch: { status?: VendorSlotStatus; vendorName?: string | null }) => Promise<void>;
}) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(item?.vendor_name ?? "");
  const [saving, setSaving] = useState(false);

  const status = item?.status ?? "undecided";
  const meta = VENDOR_STATUS_META[status];
  const vendorLabel = item?.vendor_name || (item?.place_id ? "선택한 업체" : null);

  const setStatus = async (s: VendorSlotStatus) => {
    setSaving(true);
    await onSave({ status: s });
    setSaving(false);
  };

  const saveName = async () => {
    setSaving(true);
    await onSave({ vendorName: name.trim() || null });
    setSaving(false);
    toast.success("저장했어요");
  };

  return (
    <li className="rounded-2xl border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 p-3.5 text-left active:bg-muted/40 transition-colors"
      >
        <span className={`w-2 h-2 rounded-full shrink-0 ${meta.dot}`} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground text-[14px] truncate">{slot.label}</p>
          {vendorLabel && <p className="text-[12px] text-muted-foreground truncate mt-0.5">{vendorLabel}</p>}
        </div>
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${meta.chip}`}>{meta.label}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="px-3.5 pb-3.5 space-y-3 border-t border-border pt-3">
          {/* 상태 선택 */}
          <div className="grid grid-cols-3 gap-1.5">
            {STATUS_ORDER.map((s) => {
              const m = VENDOR_STATUS_META[s];
              const active = status === s;
              return (
                <button
                  key={s}
                  type="button"
                  disabled={saving}
                  onClick={() => setStatus(s)}
                  className={`h-9 rounded-lg text-[12px] font-semibold border transition-colors ${
                    active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                  }`}
                >
                  {active && <Check className="w-3 h-3 inline mr-0.5 -mt-0.5" />}
                  {m.label}
                </button>
              );
            })}
          </div>

          {/* 업체명 직접 기록 — 외부(미입점) 업체도 보드에서 관리 */}
          <div className="flex gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="선택한 업체명 (직접 입력)"
              className="h-9 text-[13px]"
            />
            <Button size="sm" variant="outline" className="shrink-0" onClick={saveName} disabled={saving}>
              저장
            </Button>
          </div>

          {/* 연결 CTA — 견적/둘러보기/내부기능. 공급 없는 슬롯엔 죽은 버튼을 두지 않는다. */}
          <div className="flex flex-wrap gap-2">
            {slot.quoteCategory && (
              <Button
                size="sm"
                className="flex-1 min-w-[120px]"
                onClick={() => navigate(`/quote/new?category=${slot.quoteCategory}&slot=${slot.key}`)}
              >
                <Send className="w-3.5 h-3.5 mr-1" /> 견적 받기
              </Button>
            )}
            {slot.internalLink && (
              <Button
                size="sm"
                className="flex-1 min-w-[120px]"
                onClick={() => navigate(slot.internalLink as string)}
              >
                <FileText className="w-3.5 h-3.5 mr-1" /> 만들러 가기
              </Button>
            )}
            {slot.browseLabel && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 min-w-[120px]"
                onClick={() => navigate(`/vendors/${encodeURIComponent(slot.browseLabel as string)}`)}
              >
                <Store className="w-3.5 h-3.5 mr-1" /> 둘러보기
              </Button>
            )}
          </div>
        </div>
      )}
    </li>
  );
};

// 소비자: 결혼 준비에 필요한 모든 업체 카테고리를 한 보드에서 정리(쓰레드 체크리스트 패턴).
const VendorBoard = () => {
  const { user } = useAuth();
  const { items, loading, saveSlot, summary } = useVendorBoard();

  const decidedPct = summary.total > 0 ? Math.round((summary.booked / summary.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-background app-col mx-auto pb-24">
      <Seo title="내 업체 보드 | Dewy" description="결혼 준비에 필요한 모든 업체를 한 보드에서 정리하세요. 베뉴·스튜디오·드레스·스냅·청첩장까지 미정/견적중/예약완료로 한눈에." path="/board" />
      <PageHeader title="내 업체 보드" />
      {!user && (
        <LoginRequiredOverlay
          message="결혼 준비 업체를 한 보드에서 정리하세요"
          features={["카테고리별 진행 현황", "견적·예약 자동 반영", "미정/견적중/예약완료 관리"]}
        />
      )}

      <main className="px-4 py-5">
        {/* 진행 요약 헤더 */}
        <div className="rounded-2xl bg-[hsl(var(--pink-100))] p-4 mb-5">
          <p className="text-[13px] text-muted-foreground">예약 확정한 업체</p>
          <p className="text-[28px] font-extrabold text-primary leading-tight">
            {summary.booked}
            <span className="text-[16px] text-muted-foreground font-bold"> / {summary.total}</span>
          </p>
          <div className="mt-2 h-2 bg-white/70 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${decidedPct}%` }} />
          </div>
          <p className="mt-2 text-[12px] text-muted-foreground">
            견적 받는 중 {summary.quoting}곳 · 한 슬롯을 눌러 상태와 업체를 채워보세요.
          </p>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-5">
            {VENDOR_SLOT_GROUPS.map((group) => {
              const slots = VENDOR_SLOTS.filter((s) => s.group === group);
              if (slots.length === 0) return null;
              return (
                <section key={group}>
                  <h2 className="text-[13px] font-bold text-muted-foreground mb-2 px-1">{group}</h2>
                  <ul className="space-y-2">
                    {slots.map((slot) => (
                      <SlotCard
                        key={slot.key}
                        slot={slot}
                        item={items[slot.key]}
                        onSave={(patch) => saveSlot(slot.key, patch).then(() => undefined)}
                      />
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default VendorBoard;
