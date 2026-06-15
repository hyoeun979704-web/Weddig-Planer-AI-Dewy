import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ChevronDown, Send, Store, FileText, Check, Plus, Trash2, Scale } from "lucide-react";
import { toast } from "sonner";
import Seo from "@/components/Seo";
import PageHeader from "@/components/PageHeader";
import LoginRequiredOverlay from "@/components/LoginRequiredOverlay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useVendorBoard, type VendorBoardItem, type VendorBoardSlotPatch } from "@/hooks/useVendorBoard";
import {
  VENDOR_SLOTS,
  VENDOR_SLOT_GROUPS,
  VENDOR_STATUS_META,
  type VendorSlot,
  type VendorSlotStatus,
} from "@/lib/vendorBoard";

const STATUS_ORDER: VendorSlotStatus[] = ["undecided", "quoting", "booked"];

// 보드에 렌더할 슬롯의 최소 형태(코드 택소노미 슬롯 + 사용자 커스텀 슬롯 공용).
type BoardSlot = Pick<VendorSlot, "key" | "label" | "quoteCategory" | "browseLabel" | "internalLink">;

// 한 슬롯 카드 — 접힌 상태는 라벨+상태칩+선택업체, 펼치면 상태/업체명/메모/CTA 편집.
const SlotCard = ({
  slot,
  item,
  onSave,
  onDelete,
}: {
  slot: BoardSlot;
  item: VendorBoardItem | undefined;
  onSave: (patch: VendorBoardSlotPatch) => Promise<void>;
  onDelete?: () => Promise<void>;
}) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(item?.vendor_name ?? "");
  const [memo, setMemo] = useState(item?.memo ?? "");
  const [saving, setSaving] = useState(false);

  const status = item?.status ?? "undecided";
  const meta = VENDOR_STATUS_META[status];
  const vendorLabel = item?.vendor_name || (item?.place_id ? "선택한 업체" : null);

  const setStatus = async (s: VendorSlotStatus) => {
    setSaving(true);
    await onSave({ status: s });
    setSaving(false);
  };

  const saveDetails = async () => {
    setSaving(true);
    await onSave({ vendorName: name.trim() || null, memo: memo.trim() || null });
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
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="선택한 업체명 (직접 입력)"
            className="h-9 text-[13px]"
          />
          {/* 메모 — 가격·상담 메모 등 직접 기록 */}
          <Input
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="메모 (가격·상담 일정 등)"
            className="h-9 text-[13px]"
          />
          <Button size="sm" variant="outline" className="w-full" onClick={saveDetails} disabled={saving}>
            저장
          </Button>

          {/* 연결 CTA — 견적/둘러보기/내부기능. 공급 없는 슬롯엔 죽은 버튼을 두지 않는다. */}
          {(slot.quoteCategory || slot.internalLink || slot.browseLabel) && (
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
              {/* 찜한 후보 여러 곳을 나란히 비교 → 결정 */}
              {slot.quoteCategory && (
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 min-w-[120px]"
                  onClick={() => navigate(`/compare?category=${slot.quoteCategory}`)}
                >
                  <Scale className="w-3.5 h-3.5 mr-1" /> 후보 비교
                </Button>
              )}
            </div>
          )}

          {/* 커스텀 슬롯은 사용자가 추가한 것이라 삭제 가능 */}
          {onDelete && (
            <button
              type="button"
              onClick={() => void onDelete()}
              className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> 이 항목 삭제
            </button>
          )}
        </div>
      )}
    </li>
  );
};

// 소비자: 결혼 준비에 필요한 모든 업체 카테고리를 한 보드에서 정리(쓰레드 체크리스트 패턴).
const VendorBoard = () => {
  const { user } = useAuth();
  const { items, customSlots, loading, saveSlot, removeSlot, addCustomSlot, summary } = useVendorBoard();
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [savingNew, setSavingNew] = useState(false);

  const decidedPct = summary.total > 0 ? Math.round((summary.booked / summary.total) * 100) : 0;

  const addSlot = async () => {
    const label = newLabel.trim();
    if (!label) return;
    setSavingNew(true);
    const res = await addCustomSlot(label);
    setSavingNew(false);
    if (!res.ok) { toast.error("추가에 실패했어요."); return; }
    setNewLabel("");
    setAdding(false);
    toast.success(`'${label}' 항목을 추가했어요`);
  };

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

            {/* 직접 추가한 항목 — 사람마다 다른 니치 카테고리를 사용자가 직접 관리 */}
            <section>
              <h2 className="text-[13px] font-bold text-muted-foreground mb-2 px-1">직접 추가</h2>
              <ul className="space-y-2">
                {customSlots.map((slot) => (
                  <SlotCard
                    key={slot.key}
                    slot={slot}
                    item={items[slot.key]}
                    onSave={(patch) => saveSlot(slot.key, patch).then(() => undefined)}
                    onDelete={() => removeSlot(slot.key)}
                  />
                ))}
              </ul>

              {adding ? (
                <div className="mt-2 flex gap-2">
                  <Input
                    autoFocus
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") void addSlot(); }}
                    placeholder="예: 헤어·네일, 축가, 폐백 등"
                    className="h-10 text-[13px]"
                  />
                  <Button size="sm" className="shrink-0" onClick={addSlot} disabled={savingNew}>
                    {savingNew ? <Loader2 className="w-4 h-4 animate-spin" /> : "추가"}
                  </Button>
                  <Button size="sm" variant="outline" className="shrink-0" onClick={() => { setAdding(false); setNewLabel(""); }}>
                    취소
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAdding(true)}
                  className="mt-2 w-full h-11 rounded-2xl border border-dashed border-border flex items-center justify-center gap-1.5 text-[13px] font-medium text-muted-foreground active:bg-muted/40 transition-colors"
                >
                  <Plus className="w-4 h-4" /> 항목 직접 추가
                </button>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
};

export default VendorBoard;
