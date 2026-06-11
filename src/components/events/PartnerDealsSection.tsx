import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BadgeCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const MAX_DEALS = 10;

interface PartnerDeal {
  id: string;
  place_id: string;
  title: string;
  description: string | null;
  ends_at: string | null;
  featured: boolean;
  placeName: string | null;
}

/**
 * 이벤트 탭 — 파트너(입점 업체) 혜택 섹션. 승인(moderation approved)된
 * business_events 중 진행 중인 것만, featured(유료 상단 고정) 우선 노출.
 * 행이 없으면 섹션 자체를 그리지 않는다 (현재 파트너 0곳 — 빈 박스 방지).
 */
const PartnerDealsSection = () => {
  const navigate = useNavigate();
  const [deals, setDeals] = useState<PartnerDeal[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const nowIso = new Date().toISOString();
      const { data, error } = await (supabase as any)
        .from("business_events")
        .select("id, place_id, title, description, ends_at, featured_until")
        .eq("moderation_status", "approved")
        .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
        .order("created_at", { ascending: false })
        .limit(MAX_DEALS * 2);
      if (error || !data || !mounted) return;

      const now = Date.now();
      const rows = (data as any[])
        .map((r) => ({
          id: r.id as string,
          place_id: r.place_id as string,
          title: r.title as string,
          description: (r.description ?? null) as string | null,
          ends_at: (r.ends_at ?? null) as string | null,
          featured: !!r.featured_until && new Date(r.featured_until).getTime() > now,
          placeName: null as string | null,
        }))
        // 유료 고정 우선, 그 안에선 최신순(이미 created_at desc 정렬됨)
        .sort((a, b) => Number(b.featured) - Number(a.featured))
        .slice(0, MAX_DEALS);
      if (rows.length === 0) return;

      // 업체명 일괄 조회 (N+1 방지)
      const placeIds = Array.from(new Set(rows.map((r) => r.place_id)));
      const { data: places } = await (supabase as any)
        .from("places")
        .select("place_id, name")
        .in("place_id", placeIds);
      const nameOf = new Map<string, string>(
        ((places ?? []) as { place_id: string; name: string }[]).map((p) => [
          p.place_id,
          p.name,
        ]),
      );
      if (!mounted) return;
      setDeals(rows.map((r) => ({ ...r, placeName: nameOf.get(r.place_id) ?? null })));
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (deals.length === 0) return null;

  return (
    <section className="px-4 pt-6">
      <div className="flex items-center gap-1.5 mb-3">
        <BadgeCheck className="w-4 h-4 text-primary" />
        <h2 className="text-[15px] font-bold text-foreground">파트너 혜택</h2>
        <span className="text-[10px] text-muted-foreground">인증 입점 업체</span>
      </div>
      <div className="space-y-2">
        {deals.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => navigate(`/vendor/${d.place_id}`)}
            className="w-full p-4 bg-card rounded-2xl border border-border text-left active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center gap-2">
              {d.featured && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground font-bold shrink-0">
                  추천
                </span>
              )}
              <p className="text-sm font-semibold text-foreground truncate">
                {d.title}
              </p>
            </div>
            {d.description && (
              <p className="text-[12px] text-muted-foreground mt-1 line-clamp-2">
                {d.description}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground mt-1.5">
              {d.placeName ?? "파트너 업체"}
              {d.ends_at
                ? ` · ${new Date(d.ends_at).toLocaleDateString("ko-KR")} 까지`
                : ""}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
};

export default PartnerDealsSection;
