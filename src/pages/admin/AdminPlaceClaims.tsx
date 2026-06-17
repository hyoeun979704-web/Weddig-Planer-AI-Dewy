import { useEffect, useState, useCallback } from "react";
import { Loader2, Check, X, MapPin } from "lucide-react";
import AdminGuard from "@/components/admin/AdminGuard";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Claim {
  id: string;
  place_id: string;
  place_name: string;
  place_city: string | null;
  user_id: string;
  business_number: string | null;
  note: string | null;
  created_at: string;
}

const AdminPlaceClaims = () => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await (supabase as any).rpc("admin_list_place_claims");
    if (error) {
      toast({ title: "불러오기 실패", description: error.message, variant: "destructive" });
    } else {
      setClaims((data ?? []) as Claim[]);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const review = async (c: Claim, approved: boolean) => {
    setBusy(c.id);
    const { data, error } = await (supabase as any).rpc("admin_review_place_claim", {
      p_claim_id: c.id,
      p_approved: approved,
    });
    setBusy(null);
    const res = data as { ok?: boolean; error?: string } | null;
    if (error || !res?.ok) {
      toast({ title: "처리 실패", description: res?.error || error?.message, variant: "destructive" });
      return;
    }
    toast({ title: approved ? "승인됨 — 소유권이 연결됐어요" : "반려됨" });
    load();
  };

  return (
    <AdminGuard>
      <AdminLayout title="업체 관리권한 요청" description="기존 업체 페이지 소유권 주장(claim) 검토 — 승인 시 해당 회원에게 연결">
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : claims.length === 0 ? (
          <div className="text-center py-20 text-sm text-muted-foreground">대기 중인 요청이 없어요.</div>
        ) : (
          <div className="space-y-3 max-w-2xl">
            {claims.map((c) => (
              <div key={c.id} className="p-4 rounded-xl border border-border bg-background">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-foreground">{c.place_name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      {c.place_city && (<><MapPin className="w-3 h-3" /> {c.place_city} · </>)}
                      사업자 {c.business_number || "-"}
                    </p>
                    {c.note && <p className="text-xs text-muted-foreground mt-1">메모: {c.note}</p>}
                    <p className="text-[11px] text-muted-foreground mt-1">{new Date(c.created_at).toLocaleString("ko-KR")}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" onClick={() => review(c, true)} disabled={busy === c.id} className="gap-1">
                      <Check className="w-4 h-4" /> 승인
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => review(c, false)} disabled={busy === c.id} className="gap-1">
                      <X className="w-4 h-4" /> 반려
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminLayout>
    </AdminGuard>
  );
};

export default AdminPlaceClaims;
