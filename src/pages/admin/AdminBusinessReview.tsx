import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import EmptyState from "@/components/ui/empty-state";

interface PendingBusiness {
  id: string;
  business_name: string;
  business_number: string;
  representative_name: string;
  service_category: string;
  is_verified: boolean | null;
  created_at: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  wedding_hall: "웨딩홀",
  studio: "스드메",
  hanbok: "한복",
  suit: "예복",
  honeymoon: "허니문",
  appliance: "혼수가전",
  jewelry: "예물/예단",
  invitation_venue: "청첩장 모임",
  tailor_shop: "예복",
};

const AdminBusinessReview = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<PendingBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);

  const [listings, setListings] = useState<{ place_id: string; name: string; city: string | null; category: string }[]>([]);
  const [processingListing, setProcessingListing] = useState<string | null>(null);
  const [events, setEvents] = useState<{ id: string; title: string; description: string | null }[]>([]);
  const [processingEvent, setProcessingEvent] = useState<string | null>(null);
  const [products, setProducts] = useState<{ id: string; name: string; price: number | null }[]>([]);
  const [processingProduct, setProcessingProduct] = useState<string | null>(null);

  // 업체정보·이벤트·상품 반려 시 사유 입력 대상. { type, id } 로 한 번에 하나만.
  const [rejectTarget, setRejectTarget] = useState<{ type: "listing" | "event" | "product"; id: string } | null>(null);
  const [sectionNote, setSectionNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [biz, list, evt, prod] = await Promise.all([
      (supabase as any).rpc("admin_list_pending_businesses"),
      (supabase as any).rpc("admin_list_pending_listings"),
      (supabase as any).rpc("admin_list_pending_events"),
      (supabase as any).rpc("admin_list_pending_products"),
    ]);
    if (biz.error || list.error || evt.error || prod.error) {
      toast.error("일부 검토 목록을 불러오지 못했어요. 다시 시도해주세요");
    }
    setItems(biz.error ? [] : (biz.data ?? []) as PendingBusiness[]);
    setListings(list.error ? [] : ((list.data ?? []) as any[]).map((p) => ({ place_id: p.place_id, name: p.name, city: p.city, category: p.category })));
    setEvents(evt.error ? [] : ((evt.data ?? []) as any[]).map((e) => ({ id: e.id, title: e.title, description: e.description })));
    setProducts(prod.error ? [] : ((prod.data ?? []) as any[]).map((p) => ({ id: p.id, name: p.name, price: p.price })));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const clearReject = () => { setRejectTarget(null); setSectionNote(""); };

  const reviewProduct = async (id: string, approved: boolean, reviewNote?: string) => {
    setProcessingProduct(id);
    const { data, error } = await (supabase as any).rpc("admin_review_product", { p_id: id, p_approved: approved, p_note: reviewNote ?? null });
    setProcessingProduct(null);
    const res = data as { ok?: boolean } | null;
    if (error || !res?.ok) { toast.error("처리에 실패했어요"); return; }
    toast.success(approved ? "상품을 승인했어요" : "상품을 반려했어요");
    clearReject();
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const reviewEvent = async (id: string, approved: boolean, reviewNote?: string) => {
    setProcessingEvent(id);
    const { data, error } = await (supabase as any).rpc("admin_review_event", { p_id: id, p_approved: approved, p_note: reviewNote ?? null });
    setProcessingEvent(null);
    const res = data as { ok?: boolean } | null;
    if (error || !res?.ok) { toast.error("처리에 실패했어요"); return; }
    toast.success(approved ? "이벤트를 승인했어요" : "이벤트를 반려했어요");
    clearReject();
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  const reviewListing = async (placeId: string, approved: boolean, reviewNote?: string) => {
    setProcessingListing(placeId);
    const { data, error } = await (supabase as any).rpc("admin_review_listing", {
      p_place_id: placeId,
      p_approved: approved,
      p_note: reviewNote ?? null,
    });
    setProcessingListing(null);
    const res = data as { ok?: boolean } | null;
    if (error || !res?.ok) { toast.error("처리에 실패했어요"); return; }
    toast.success(approved ? "리스팅을 승인했어요" : "리스팅을 반려했어요");
    clearReject();
    setListings((prev) => prev.filter((l) => l.place_id !== placeId));
  };

  const review = async (id: string, approved: boolean, reviewNote?: string) => {
    setProcessing(id);
    const { data, error } = await (supabase as any).rpc("admin_review_business", {
      p_profile_id: id,
      p_approved: approved,
      p_note: reviewNote ?? null,
    });
    setProcessing(null);
    const res = data as { ok?: boolean; error?: string } | null;
    if (error || !res?.ok) {
      toast.error(res?.error === "forbidden" ? "권한이 없어요" : "처리에 실패했어요");
      return;
    }
    toast.success(approved ? "승인했어요" : "반려했어요");
    setRejectingId(null);
    setNote("");
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto">
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center h-14 px-4">
          <button onClick={() => navigate("/admin")} className="w-10 h-10 flex items-center justify-center -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-center font-semibold text-lg pr-10">기업회원 검토</h1>
        </div>
      </header>

      <main className="p-4 space-y-6">
        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
        <>
        <section>
          <h2 className="text-xs font-medium text-muted-foreground mb-2 px-1">가입 검토 ({items.length})</h2>
          {items.length === 0 ? (
            <EmptyState icon={Building2} title="검토 대기중인 기업회원이 없어요" />
          ) : (
          <div className="space-y-3">
            {items.map((b) => (
              <div key={b.id} className="bg-card rounded-2xl border border-border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-foreground">{b.business_name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {CATEGORY_LABELS[b.service_category] ?? b.service_category} · 대표 {b.representative_name}
                    </p>
                    <p className="text-xs text-muted-foreground">사업자번호 {b.business_number}</p>
                  </div>
                  <span className={`text-[11px] px-2 py-1 rounded-full shrink-0 ${b.is_verified ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                    {b.is_verified ? "국세청 인증" : "미인증"}
                  </span>
                </div>

                {rejectingId === b.id ? (
                  <div className="mt-3 space-y-2">
                    <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="반려 사유를 입력하세요" rows={2} />
                    <div className="flex gap-2">
                      <Button variant="destructive" size="sm" className="flex-1" disabled={processing === b.id} onClick={() => review(b.id, false, note)}>
                        반려 확정
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => { setRejectingId(null); setNote(""); }}>
                        취소
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" className="flex-1" disabled={processing === b.id} onClick={() => review(b.id, true)}>
                      <Check className="w-4 h-4 mr-1" /> 승인
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => { setRejectingId(b.id); setNote(""); }}>
                      <X className="w-4 h-4 mr-1" /> 반려
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
          )}
        </section>

        <section>
          <h2 className="text-xs font-medium text-muted-foreground mb-2 px-1">업체 정보 검토 ({listings.length})</h2>
          {listings.length === 0 ? (
            <EmptyState icon={Building2} title="검토 대기중인 업체 정보가 없어요" />
          ) : (
          <div className="space-y-3">
            {listings.map((l) => (
              <div key={l.place_id} className="bg-card rounded-2xl border border-border p-4">
                <p className="font-bold text-foreground">{l.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {CATEGORY_LABELS[l.category] ?? l.category}{l.city ? ` · ${l.city}` : ""}
                </p>
                <button onClick={() => navigate(`/vendor/${l.place_id}`)} className="text-xs text-primary font-medium mt-1">상세 미리보기</button>
                {rejectTarget?.type === "listing" && rejectTarget.id === l.place_id ? (
                  <div className="mt-3 space-y-2">
                    <Textarea value={sectionNote} onChange={(e) => setSectionNote(e.target.value)} placeholder="반려 사유를 입력하세요 (사업자에게 전달됩니다)" rows={2} />
                    <div className="flex gap-2">
                      <Button variant="destructive" size="sm" className="flex-1" disabled={processingListing === l.place_id} onClick={() => reviewListing(l.place_id, false, sectionNote)}>반려 확정</Button>
                      <Button variant="outline" size="sm" className="flex-1" onClick={clearReject}>취소</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" className="flex-1" disabled={processingListing === l.place_id} onClick={() => reviewListing(l.place_id, true)}>
                      <Check className="w-4 h-4 mr-1" /> 승인
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" disabled={processingListing === l.place_id} onClick={() => { setRejectTarget({ type: "listing", id: l.place_id }); setSectionNote(""); }}>
                      <X className="w-4 h-4 mr-1" /> 반려
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
          )}
        </section>

        <section>
          <h2 className="text-xs font-medium text-muted-foreground mb-2 px-1">이벤트 검토 ({events.length})</h2>
          {events.length === 0 ? (
            <EmptyState icon={Building2} title="검토 대기중인 이벤트가 없어요" />
          ) : (
          <div className="space-y-3">
            {events.map((e) => (
              <div key={e.id} className="bg-card rounded-2xl border border-border p-4">
                <p className="font-bold text-foreground">{e.title}</p>
                {e.description && <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-line">{e.description}</p>}
                {rejectTarget?.type === "event" && rejectTarget.id === e.id ? (
                  <div className="mt-3 space-y-2">
                    <Textarea value={sectionNote} onChange={(ev) => setSectionNote(ev.target.value)} placeholder="반려 사유를 입력하세요 (사업자에게 전달됩니다)" rows={2} />
                    <div className="flex gap-2">
                      <Button variant="destructive" size="sm" className="flex-1" disabled={processingEvent === e.id} onClick={() => reviewEvent(e.id, false, sectionNote)}>반려 확정</Button>
                      <Button variant="outline" size="sm" className="flex-1" onClick={clearReject}>취소</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" className="flex-1" disabled={processingEvent === e.id} onClick={() => reviewEvent(e.id, true)}>
                      <Check className="w-4 h-4 mr-1" /> 승인
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" disabled={processingEvent === e.id} onClick={() => { setRejectTarget({ type: "event", id: e.id }); setSectionNote(""); }}>
                      <X className="w-4 h-4 mr-1" /> 반려
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
          )}
        </section>

        <section>
          <h2 className="text-xs font-medium text-muted-foreground mb-2 px-1">상품 검토 ({products.length})</h2>
          {products.length === 0 ? (
            <EmptyState icon={Building2} title="검토 대기중인 상품이 없어요" />
          ) : (
          <div className="space-y-3">
            {products.map((p) => (
              <div key={p.id} className="bg-card rounded-2xl border border-border p-4">
                <p className="font-bold text-foreground">{p.name}</p>
                {p.price != null && <p className="text-xs text-muted-foreground mt-0.5">{p.price.toLocaleString()}원</p>}
                {rejectTarget?.type === "product" && rejectTarget.id === p.id ? (
                  <div className="mt-3 space-y-2">
                    <Textarea value={sectionNote} onChange={(e) => setSectionNote(e.target.value)} placeholder="반려 사유를 입력하세요 (사업자에게 전달됩니다)" rows={2} />
                    <div className="flex gap-2">
                      <Button variant="destructive" size="sm" className="flex-1" disabled={processingProduct === p.id} onClick={() => reviewProduct(p.id, false, sectionNote)}>반려 확정</Button>
                      <Button variant="outline" size="sm" className="flex-1" onClick={clearReject}>취소</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" className="flex-1" disabled={processingProduct === p.id} onClick={() => reviewProduct(p.id, true)}>
                      <Check className="w-4 h-4 mr-1" /> 승인
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" disabled={processingProduct === p.id} onClick={() => { setRejectTarget({ type: "product", id: p.id }); setSectionNote(""); }}>
                      <X className="w-4 h-4 mr-1" /> 반려
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
          )}
        </section>
        </>
        )}
      </main>
    </div>
  );
};

export default AdminBusinessReview;
