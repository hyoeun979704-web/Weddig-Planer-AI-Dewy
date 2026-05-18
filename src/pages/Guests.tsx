import { useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Plus, Pencil, Trash2, Users, Loader2 } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useGuestList, type GuestDraft } from "@/hooks/useGuestList";
import {
  GUEST_RSVP_LABEL,
  GUEST_RSVP_ORDER,
  GUEST_SIDE_LABEL,
  type GuestItem,
  type GuestRsvpStatus,
  type GuestSide,
} from "@/lib/guestList";
import { cn } from "@/lib/utils";

type SideFilter = "all" | GuestSide;
type StatusFilter = "all" | GuestRsvpStatus;

const emptyDraft: GuestDraft = {
  name: "",
  side: "shared",
  relationship: null,
  rsvp_status: "pending",
  attending_count: 1,
  contact: null,
  notes: null,
};

const RSVP_CHIP_STYLE: Record<GuestRsvpStatus, string> = {
  attending: "bg-emerald-100 text-emerald-700",
  maybe: "bg-yellow-100 text-yellow-800",
  pending: "bg-muted text-muted-foreground",
  declined: "bg-destructive/10 text-destructive",
};

const Guests = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { items, stats, isLoading, addGuest, updateGuest, deleteGuest } = useGuestList();

  const [sideFilter, setSideFilter] = useState<SideFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [draft, setDraft] = useState<GuestDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);

  const visible = useMemo(() => {
    return items.filter(
      (g) =>
        (sideFilter === "all" || g.side === sideFilter) &&
        (statusFilter === "all" || g.rsvp_status === statusFilter),
    );
  }, [items, sideFilter, statusFilter]);

  const startEdit = (g: GuestItem) => {
    setEditingId(g.id);
    setDraft({
      name: g.name,
      side: g.side,
      relationship: g.relationship,
      rsvp_status: g.rsvp_status,
      attending_count: g.attending_count,
      contact: g.contact,
      notes: g.notes,
    });
  };

  const resetDraft = () => {
    setDraft(emptyDraft);
    setEditingId(null);
  };

  const submitDraft = async () => {
    if (!draft.name.trim()) return;
    const patch: GuestDraft = {
      ...draft,
      name: draft.name.trim(),
      relationship: draft.relationship?.trim() || null,
      contact: draft.contact?.trim() || null,
      notes: draft.notes?.trim() || null,
    };
    if (editingId) {
      await updateGuest.mutateAsync({ id: editingId, patch });
    } else {
      await addGuest.mutateAsync(patch);
    }
    resetDraft();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
        <PageHeader title="하객 리스트" />
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <Users className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-lg font-bold text-foreground mb-2">로그인이 필요합니다</h2>
          <Button onClick={() => navigate("/auth")} className="mt-3">로그인하기</Button>
        </div>
        <BottomNav activeTab={location.pathname} onTabChange={(href) => navigate(href)} />
      </div>
    );
  }

  const isSubmitting = addGuest.isPending || updateGuest.isPending;

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      <PageHeader title="하객 리스트" />

      <main className="pb-24">
        {/* Summary */}
        <section className="p-4">
          <div className="p-5 bg-gradient-to-r from-primary/15 to-primary/5 rounded-2xl border border-primary/20">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-muted-foreground">예상 참석</p>
                <p className="text-3xl font-extrabold text-primary leading-tight">
                  {stats.expectedHeads.all}
                  <span className="text-base font-semibold text-muted-foreground ml-1">명</span>
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  ({stats.total}팀 등록 · 총 {stats.totalHeads}명 입력)
                </p>
              </div>
              <Users className="w-10 h-10 text-primary/40" aria-hidden />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <SideStat label="신랑측" count={stats.expectedHeads.groom} />
              <SideStat label="신부측" count={stats.expectedHeads.bride} />
              <SideStat label="공통" count={stats.expectedHeads.shared} />
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 leading-snug">
              불참 응답은 예상 참석에서 제외, 미응답은 보수적으로 포함됩니다.
            </p>
          </div>
        </section>

        {/* Add / edit form */}
        <section className="px-4 pb-3">
          <div className="p-4 bg-card rounded-2xl border border-border">
            <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-1.5">
              <Plus className="w-4 h-4" />
              {editingId ? "하객 수정" : "하객 추가"}
            </h2>
            <div className="space-y-2">
              <Input
                placeholder="이름 (필수)"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                maxLength={60}
              />
              <div className="grid grid-cols-2 gap-2">
                <Select value={draft.side} onValueChange={(v) => setDraft((d) => ({ ...d, side: v as GuestSide }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(GUEST_SIDE_LABEL) as GuestSide[]).map((s) => (
                      <SelectItem key={s} value={s}>{GUEST_SIDE_LABEL[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={draft.rsvp_status}
                  onValueChange={(v) => setDraft((d) => ({ ...d, rsvp_status: v as GuestRsvpStatus }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GUEST_RSVP_ORDER.map((s) => (
                      <SelectItem key={s} value={s}>{GUEST_RSVP_LABEL[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="관계 (예: 직장, 친구, 가족)"
                  value={draft.relationship ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, relationship: e.target.value }))}
                  maxLength={30}
                />
                <Input
                  type="number"
                  min={0}
                  max={20}
                  placeholder="참석 인원"
                  value={draft.attending_count}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, attending_count: Math.max(0, Math.min(20, Number(e.target.value) || 0)) }))
                  }
                />
              </div>
              <Input
                placeholder="연락처 (선택)"
                value={draft.contact ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, contact: e.target.value }))}
                maxLength={60}
              />
              <Input
                placeholder="메모 (선택, 200자 이내)"
                value={draft.notes ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                maxLength={200}
              />
              <div className="flex gap-2 pt-1">
                <Button
                  onClick={submitDraft}
                  disabled={isSubmitting || !draft.name.trim()}
                  className="flex-1"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingId ? "수정" : "추가")}
                </Button>
                {editingId && (
                  <Button variant="outline" onClick={resetDraft}>취소</Button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Filter chips */}
        <section className="px-4 pb-2 space-y-2">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
            <FilterChip label="전체" active={sideFilter === "all"} onClick={() => setSideFilter("all")} />
            {(Object.keys(GUEST_SIDE_LABEL) as GuestSide[]).map((s) => (
              <FilterChip
                key={s}
                label={GUEST_SIDE_LABEL[s]}
                active={sideFilter === s}
                onClick={() => setSideFilter(s)}
              />
            ))}
          </div>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
            <FilterChip label="모든 상태" active={statusFilter === "all"} onClick={() => setStatusFilter("all")} />
            {GUEST_RSVP_ORDER.map((s) => (
              <FilterChip
                key={s}
                label={`${GUEST_RSVP_LABEL[s]} (${stats.byStatus[s]})`}
                active={statusFilter === s}
                onClick={() => setStatusFilter(s)}
              />
            ))}
          </div>
        </section>

        {/* List */}
        <section className="px-4">
          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : visible.length === 0 ? (
            <EmptyState
              emoji=""
              title={items.length === 0 ? "아직 등록된 하객이 없어요" : "필터 조건에 맞는 하객이 없어요"}
              variant="inline"
            />
          ) : (
            <ul className="space-y-2">
              {visible.map((g) => (
                <li
                  key={g.id}
                  className="p-3.5 bg-card rounded-xl border border-border flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-semibold text-foreground truncate">{g.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {GUEST_SIDE_LABEL[g.side]}
                      </span>
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-semibold", RSVP_CHIP_STYLE[g.rsvp_status])}>
                        {GUEST_RSVP_LABEL[g.rsvp_status]}
                      </span>
                      <span className="text-[11px] text-muted-foreground">· {g.attending_count}명</span>
                    </div>
                    {(g.relationship || g.contact || g.notes) && (
                      <p className="text-[12px] text-muted-foreground mt-0.5 truncate">
                        {[g.relationship, g.contact, g.notes].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => startEdit(g)}
                    className="p-2 text-muted-foreground hover:text-primary transition-colors"
                    aria-label="수정"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteGuest.mutate(g.id)}
                    className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                    aria-label="삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <BottomNav activeTab={location.pathname} onTabChange={(href) => navigate(href)} />
    </div>
  );
};

const SideStat = ({ label, count }: { label: string; count: number }) => (
  <div className="bg-white/70 rounded-lg py-1.5">
    <p className="text-[10px] text-muted-foreground">{label}</p>
    <p className="text-sm font-bold text-foreground">{count}</p>
  </div>
);

const FilterChip = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={cn(
      "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap border transition-colors",
      active
        ? "bg-primary text-primary-foreground border-primary"
        : "bg-card border-border text-muted-foreground hover:border-foreground/30",
    )}
  >
    {label}
  </button>
);

export default Guests;
