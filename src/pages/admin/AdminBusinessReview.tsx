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
  invitation_venue: "상견례 장소",
};

const AdminBusinessReview = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<PendingBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("admin_list_pending_businesses");
    if (error) {
      toast.error("목록을 불러오지 못했어요");
      setItems([]);
    } else {
      setItems((data ?? []) as PendingBusiness[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

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

      <main className="p-4">
        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : items.length === 0 ? (
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
      </main>
    </div>
  );
};

export default AdminBusinessReview;
