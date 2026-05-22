import { useEffect, useState, useCallback } from "react";
import { Megaphone, Package, Image as ImageIcon, UtensilsCrossed, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface EventRow { id: string; title: string; description: string | null; starts_at: string | null; ends_at: string | null; }
interface ProductRow { id: string; name: string; price: number | null; description: string | null; image_url: string | null; }
interface MediaRow { id: string; kind: string; image_url: string | null; title: string | null; price: number | null; }

// 업체 상세페이지의 기업회원 등록 콘텐츠(이벤트·상품·사진/메뉴) 노출.
// 승인된 것만 RLS 로 내려오며, 데이터 없는 섹션은 렌더하지 않는다.
const PlaceBusinessSections = ({ placeId, category }: { placeId: string; category: string }) => {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [media, setMedia] = useState<MediaRow[]>([]);
  const isMenu = category === "invitation_venue";

  const load = useCallback(async () => {
    const [ev, pr, md] = await Promise.all([
      supabase.from("business_events" as any).select("id, title, description, starts_at, ends_at").eq("place_id", placeId).eq("moderation_status", "approved").order("created_at", { ascending: false }),
      supabase.from("business_products" as any).select("id, name, price, description, image_url").eq("place_id", placeId).eq("moderation_status", "approved").order("created_at", { ascending: false }),
      supabase.from("place_media" as any).select("id, kind, image_url, title, price").eq("place_id", placeId).order("display_order", { ascending: true }),
    ]);
    setEvents((ev.data ?? []) as unknown as EventRow[]);
    setProducts((pr.data ?? []) as unknown as ProductRow[]);
    setMedia((md.data ?? []) as unknown as MediaRow[]);
  }, [placeId]);

  useEffect(() => { load(); }, [load]);

  if (events.length === 0 && products.length === 0 && media.length === 0) return null;

  return (
    <div className="space-y-5">
      {/* 사진 / 메뉴 */}
      {media.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-bold text-sm flex items-center gap-1.5">
            {isMenu ? <UtensilsCrossed className="w-4 h-4 text-primary" /> : <ImageIcon className="w-4 h-4 text-primary" />}
            {isMenu ? "메뉴" : "사진"}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {media.map((m) => (
              <div key={m.id} className="rounded-xl border border-border overflow-hidden bg-card">
                <div className="aspect-square bg-muted">
                  {m.image_url && <img src={m.image_url} alt={m.title ?? ""} className="w-full h-full object-cover" />}
                </div>
                {isMenu && (
                  <div className="p-2">
                    <p className="text-[12px] font-semibold text-foreground truncate">{m.title}</p>
                    {m.price != null && <p className="text-[11px] text-muted-foreground">{m.price.toLocaleString()}원</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 상품 */}
      {products.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-bold text-sm flex items-center gap-1.5"><Package className="w-4 h-4 text-primary" /> 상품</h3>
          <div className="grid grid-cols-2 gap-2">
            {products.map((p) => (
              <div key={p.id} className="rounded-xl border border-border overflow-hidden bg-card">
                <div className="aspect-square bg-muted">
                  {p.image_url && <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />}
                </div>
                <div className="p-2">
                  <p className="text-[12px] font-semibold text-foreground truncate">{p.name}</p>
                  {p.price != null && <p className="text-[11px] text-muted-foreground">{p.price.toLocaleString()}원</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 이벤트 */}
      {events.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-bold text-sm flex items-center gap-1.5"><Megaphone className="w-4 h-4 text-primary" /> 진행중 이벤트</h3>
          {events.map((e) => (
            <div key={e.id} className="rounded-xl border border-border bg-card p-3">
              <p className="text-sm font-semibold text-foreground">{e.title}</p>
              {e.description && <p className="text-[13px] text-muted-foreground mt-0.5 whitespace-pre-line">{e.description}</p>}
              {(e.starts_at || e.ends_at) && (
                <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />{e.starts_at ?? ""}{e.ends_at ? ` ~ ${e.ends_at}` : ""}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PlaceBusinessSections;
