import { useEffect, useState, useCallback } from "react";
import { Loader2, Check, X, MapPin } from "lucide-react";
import AdminGuard from "@/features/console/components/AdminGuard";
import AdminLayout from "@/features/console/components/AdminLayout";
import { Button } from "@/components/ui/button";
import {
  fetchPlaceClaims,
  reviewPlaceClaim,
  type Claim,
} from "@/features/console/data/placeClaims";
import { toast } from "@/hooks/use-toast";

// Claim 타입은 features/console/data/placeClaims 에서 import.

const AdminPlaceClaims = () => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setClaims(await fetchPlaceClaims());
    } catch (e) {
      toast({ title: "불러오기 실패", description: e instanceof Error ? e.message : "오류", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const review = async (c: Claim, approved: boolean) => {
    setBusy(c.id);
    const res = await reviewPlaceClaim(c.id, approved);
    setBusy(null);
    if (!res.ok) {
      toast({ title: "처리 실패", description: res.error, variant: "destructive" });
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
