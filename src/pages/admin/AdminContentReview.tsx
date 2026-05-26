import { useState, useEffect, useCallback } from "react";
import { Loader2, Check, X, Calendar, Ticket, Megaphone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AdminGuard from "@/components/admin/AdminGuard";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

/**
 * 운영자 검토 페이지 — 기업회원이 등록한 이벤트·쿠폰 승인/반려.
 *
 * 두 종류 (business_events / business_coupons) 모두 같은 검토 워크플로:
 *   pending → approved (즉시 노출) / rejected (사유 기재)
 *
 * 운영자가 moderation_status 를 변경하면 protect_moderation_fields 트리거가
 * reviewed_at / reviewed_by 를 자동 채움. 일반 사용자에게는 approved 만 보임.
 */

type ContentType = "events" | "coupons";

interface BusinessEvent {
  id: string;
  place_id: string;
  owner_user_id: string;
  title: string;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  moderation_status: string;
  moderation_note: string | null;
  created_at: string;
}

interface BusinessCoupon {
  id: string;
  place_id: string;
  owner_user_id: string;
  title: string;
  discount_text: string;
  min_order_won: number | null;
  expires_at: string | null;
  is_active: boolean;
  moderation_status: string;
  moderation_note: string | null;
  created_at: string;
}

type AnyItem = BusinessEvent | BusinessCoupon;

const fmtDate = (s: string | null) => {
  if (!s) return "";
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString("ko-KR");
};

const STATUS_LABEL: Record<string, string> = {
  pending: "검토 대기",
  approved: "승인됨",
  rejected: "반려됨",
};

const AdminContentReview = () => {
  const [tab, setTab] = useState<ContentType>("events");
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [events, setEvents] = useState<BusinessEvent[]>([]);
  const [coupons, setCoupons] = useState<BusinessCoupon[]>([]);
  const [loading, setLoading] = useState(false);

  // 반려 다이얼로그
  const [rejectTarget, setRejectTarget] = useState<{ type: ContentType; id: string } | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const eventsQ = supabase
      .from("business_events" as any)
      .select("id, place_id, owner_user_id, title, description, starts_at, ends_at, moderation_status, moderation_note, created_at")
      .order("created_at", { ascending: false });
    if (filter === "pending") eventsQ.eq("moderation_status", "pending");

    const couponsQ = supabase
      .from("business_coupons" as any)
      .select("id, place_id, owner_user_id, title, discount_text, min_order_won, expires_at, is_active, moderation_status, moderation_note, created_at")
      .order("created_at", { ascending: false });
    if (filter === "pending") couponsQ.eq("moderation_status", "pending");

    const [eRes, cRes] = await Promise.all([eventsQ, couponsQ]);
    setEvents((eRes.data ?? []) as unknown as BusinessEvent[]);
    setCoupons((cRes.data ?? []) as unknown as BusinessCoupon[]);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const approve = async (type: ContentType, id: string) => {
    const table = type === "events" ? "business_events" : "business_coupons";
    const { error } = await (supabase as any)
      .from(table)
      .update({ moderation_status: "approved", moderation_note: null })
      .eq("id", id);
    if (error) {
      toast({ title: "승인 실패", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "승인됨", description: "사용자에게 노출됩니다." });
    await load();
  };

  const reject = async () => {
    if (!rejectTarget) return;
    const trimmed = rejectNote.trim();
    if (!trimmed) {
      toast({ title: "반려 사유 입력", description: "사유를 적어 기업회원에게 안내해주세요.", variant: "destructive" });
      return;
    }
    const table = rejectTarget.type === "events" ? "business_events" : "business_coupons";
    const { error } = await (supabase as any)
      .from(table)
      .update({ moderation_status: "rejected", moderation_note: trimmed })
      .eq("id", rejectTarget.id);
    if (error) {
      toast({ title: "반려 실패", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "반려됨", description: "기업회원에게 사유가 전달됩니다." });
    setRejectTarget(null);
    setRejectNote("");
    await load();
  };

  const renderActions = (type: ContentType, item: AnyItem) => {
    if (item.moderation_status === "approved") {
      return (
        <Button
          size="sm"
          variant="outline"
          onClick={() => approve(type, item.id)}
          disabled
        >
          승인 완료
        </Button>
      );
    }
    return (
      <div className="flex gap-2">
        <Button size="sm" onClick={() => approve(type, item.id)}>
          <Check className="w-4 h-4 mr-1" /> 승인
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => {
            setRejectTarget({ type, id: item.id });
            setRejectNote(item.moderation_note ?? "");
          }}
        >
          <X className="w-4 h-4 mr-1" /> 반려
        </Button>
      </div>
    );
  };

  const renderStatus = (status: string) => {
    const color =
      status === "approved" ? "bg-green-100 text-green-700"
      : status === "rejected" ? "bg-destructive/10 text-destructive"
      : "bg-amber-100 text-amber-700";
    return (
      <span className={`text-[11px] px-2 py-1 rounded-full ${color}`}>
        {STATUS_LABEL[status] ?? status}
      </span>
    );
  };

  return (
    <AdminGuard>
      <AdminLayout title="콘텐츠 검토" description="기업회원이 등록한 이벤트·쿠폰을 검토하고 승인/반려합니다.">
        <div className="flex items-center gap-2 mb-4">
          <Button
            size="sm"
            variant={filter === "pending" ? "default" : "outline"}
            onClick={() => setFilter("pending")}
          >
            검토 대기만
          </Button>
          <Button
            size="sm"
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
          >
            전체
          </Button>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as ContentType)}>
          <TabsList>
            <TabsTrigger value="events">
              <Megaphone className="w-4 h-4 mr-1" />
              이벤트 ({events.length})
            </TabsTrigger>
            <TabsTrigger value="coupons">
              <Ticket className="w-4 h-4 mr-1" />
              쿠폰 ({coupons.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="mt-4 space-y-3">
            {events.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                {filter === "pending" ? "검토 대기 중인 이벤트가 없어요" : "등록된 이벤트가 없어요"}
              </p>
            ) : (
              events.map((e) => (
                <div key={e.id} className="bg-card rounded-2xl border border-border p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-foreground">{e.title}</p>
                        {renderStatus(e.moderation_status)}
                      </div>
                      {e.description && (
                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">
                          {e.description}
                        </p>
                      )}
                      {(e.starts_at || e.ends_at) && (
                        <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {fmtDate(e.starts_at)}
                          {e.ends_at ? ` ~ ${fmtDate(e.ends_at)}` : ""}
                        </p>
                      )}
                      <p className="text-[11px] text-muted-foreground mt-1">
                        place_id: <code className="text-[10px]">{e.place_id.slice(0, 8)}…</code>
                        {" · 등록일: "}
                        {fmtDate(e.created_at)}
                      </p>
                      {e.moderation_status === "rejected" && e.moderation_note && (
                        <p className="text-[11px] text-destructive mt-2 whitespace-pre-line">
                          반려 사유: {e.moderation_note}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end">{renderActions("events", e)}</div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="coupons" className="mt-4 space-y-3">
            {coupons.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                {filter === "pending" ? "검토 대기 중인 쿠폰이 없어요" : "등록된 쿠폰이 없어요"}
              </p>
            ) : (
              coupons.map((c) => (
                <div key={c.id} className="bg-card rounded-2xl border border-border p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-foreground">{c.title}</p>
                        {renderStatus(c.moderation_status)}
                      </div>
                      <p className="text-sm text-primary font-semibold mt-1">
                        {c.discount_text}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1">
                        {c.min_order_won != null && (
                          <span>최소 {c.min_order_won.toLocaleString()}원</span>
                        )}
                        {c.expires_at && (
                          <span className="flex items-center gap-0.5">
                            <Calendar className="w-3 h-3" />
                            {fmtDate(c.expires_at)}까지
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        place_id: <code className="text-[10px]">{c.place_id.slice(0, 8)}…</code>
                        {" · 등록일: "}
                        {fmtDate(c.created_at)}
                      </p>
                      {c.moderation_status === "rejected" && c.moderation_note && (
                        <p className="text-[11px] text-destructive mt-2 whitespace-pre-line">
                          반려 사유: {c.moderation_note}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end">{renderActions("coupons", c)}</div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>반려 사유 입력</DialogTitle>
            </DialogHeader>
            <Textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="기업회원에게 전달될 반려 사유를 적어주세요"
              rows={4}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectTarget(null)}>
                취소
              </Button>
              <Button variant="destructive" onClick={reject}>
                반려 처리
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </AdminLayout>
    </AdminGuard>
  );
};

export default AdminContentReview;
