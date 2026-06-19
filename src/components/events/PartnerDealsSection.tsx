import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BadgeCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";

const MAX_DEALS = 12;

interface PartnerDeal {
  id: string;
  place_id: string;
  title: string;
  description: string | null;
  ends_at: string | null;
  bannerUrl: string | null;
  /** 배너 이미지가 있으면 '이벤트 상세페이지 등록'(시각형), 없으면 '텍스트 등록' */
  hasDetail: boolean;
  /** 제휴(파트너) 업체 — 같은 구분 안에서 우선 노출 */
  isPartner: boolean;
  featured: boolean;
  placeName: string | null;
}

// 업체 이미지는 vendor-images(공개) public URL. 경로만 저장된 레거시 행 방어.
const pub = (url?: string | null): string | null => {
  if (!url) return null;
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  try { return supabase.storage.from("vendor-images").getPublicUrl(url).data.publicUrl || url; } catch { return url; }
};

/**
 * 이벤트 탭 — 파트너(입점 업체) 혜택 섹션. 승인(moderation approved)된 진행 중
 * business_events 노출. 노출 순위:
 *   1) 이벤트 상세페이지 등록(배너 이미지 있음)  2) 텍스트 등록(배너 없음)
 *   — 각 구분 안에서 제휴업체(is_partner) 우선, 그다음 유료 고정(featured), 최신순.
 * 행이 없으면 섹션 자체를 그리지 않는다.
 */
const PartnerDealsSection = () => {
  const navigate = useNavigate();
  const [deals, setDeals] = useState<PartnerDeal[]>([]);
  // 큐레이션 게이트 — 예식 지역이 설정된 사용자에겐 그 지역 업체 혜택만.
  const { weddingSettings } = useWeddingSchedule();
  const userRegion = weddingSettings.wedding_region;

  useEffect(() => {
    let mounted = true;
    (async () => {
      const nowIso = new Date().toISOString();
      const { data, error } = await (supabase as any)
        .from("business_events")
        .select("id, place_id, title, description, ends_at, featured_until, banner_image_url")
        .eq("moderation_status", "approved")
        .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
        .order("created_at", { ascending: false })
        .limit(MAX_DEALS * 3);
      if (error || !data || !mounted) return;

      const now = Date.now();
      const candidates = (data as any[]).map((r) => ({
        id: r.id as string,
        place_id: r.place_id as string,
        title: r.title as string,
        description: (r.description ?? null) as string | null,
        ends_at: (r.ends_at ?? null) as string | null,
        bannerUrl: pub(r.banner_image_url ?? null),
        hasDetail: !!r.banner_image_url,
        featured: !!r.featured_until && new Date(r.featured_until).getTime() > now,
        isPartner: false,
        placeName: null as string | null,
      }));
      if (candidates.length === 0) return;

      // 업체명·지역·제휴여부 일괄 조회 (N+1 방지)
      const placeIds = Array.from(new Set(candidates.map((r) => r.place_id)));
      const { data: places } = await (supabase as any)
        .from("places")
        .select("place_id, name, city, is_partner")
        .in("place_id", placeIds);
      const placeOf = new Map<string, { name: string; city: string | null; is_partner: boolean | null }>(
        ((places ?? []) as { place_id: string; name: string; city: string | null; is_partner: boolean | null }[]).map(
          (p) => [p.place_id, { name: p.name, city: p.city, is_partner: p.is_partner }],
        ),
      );
      if (!mounted) return;

      const rows = candidates
        .map((r) => ({ ...r, isPartner: placeOf.get(r.place_id)?.is_partner === true }))
        // 큐레이션 게이트: 예식 지역 설정 사용자에겐 그 지역 업체만.
        .filter((r) => {
          if (!userRegion) return true;
          const city = placeOf.get(r.place_id)?.city;
          return !!city && city === userRegion;
        })
        // 노출 순위: ① 상세페이지형(배너 有) → ② 텍스트형. 각 구분 안에서 제휴 → 유료고정 → 최신.
        .sort((a, b) =>
          Number(b.hasDetail) - Number(a.hasDetail) ||
          Number(b.isPartner) - Number(a.isPartner) ||
          Number(b.featured) - Number(a.featured),
        )
        .slice(0, MAX_DEALS);
      setDeals(rows.map((r) => ({ ...r, placeName: placeOf.get(r.place_id)?.name ?? null })));
    })();
    return () => {
      mounted = false;
    };
  }, [userRegion]);

  if (deals.length === 0) return null;

  return (
    <section className="px-4 pt-6">
      <div className="flex items-center gap-1.5 mb-3">
        <BadgeCheck className="w-4 h-4 text-primary" />
        <h2 className="text-[15px] font-bold text-foreground">파트너 혜택</h2>
        <span className="text-[10px] text-muted-foreground">
          {userRegion ? `${userRegion} 인증 입점 업체` : "인증 입점 업체"}
        </span>
      </div>
      <div className="space-y-2">
        {deals.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => navigate(`/vendor/${d.place_id}`)}
            className="w-full bg-card rounded-2xl border border-border text-left overflow-hidden active:scale-[0.99] transition-transform"
          >
            {/* 상세페이지형(배너 이미지) — 시각적으로 먼저 눈에 띄도록 배너 노출 */}
            {d.bannerUrl && (
              <div className="aspect-[2/1] bg-muted">
                <img src={d.bannerUrl} alt={d.title} className="w-full h-full object-cover" loading="lazy" />
              </div>
            )}
            <div className="p-4">
              <div className="flex items-center gap-1.5 flex-wrap">
                {d.isPartner && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold shrink-0">제휴</span>
                )}
                {d.featured && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground font-bold shrink-0">추천</span>
                )}
                <p className="text-sm font-semibold text-foreground truncate">{d.title}</p>
              </div>
              {d.description && (
                <p className="text-[12px] text-muted-foreground mt-1 line-clamp-2">{d.description}</p>
              )}
              <p className="text-[11px] text-muted-foreground mt-1.5">
                {d.placeName ?? "파트너 업체"}
                {d.ends_at ? ` · ${new Date(d.ends_at).toLocaleDateString("ko-KR")} 까지` : ""}
              </p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};

export default PartnerDealsSection;
