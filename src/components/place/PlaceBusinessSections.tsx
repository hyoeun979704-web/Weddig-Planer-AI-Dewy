import { useEffect, useState, useCallback } from "react";
import { Megaphone, Package, Image as ImageIcon, UtensilsCrossed, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface EventRow { id: string; title: string; description: string | null; starts_at: string | null; ends_at: string | null; }
interface ProductRow { id: string; name: string; price: number | null; description: string | null; image_url: string | null; }
interface MediaRow {
  id: string;
  kind: string;
  image_url: string | null;
  title: string | null;
  price: number | null;
  album_id?: string | null;
  // 앨범 미사용(단독) 사진 호환용 — 앨범 도입 전 행은 행 자체에 메타 보유.
  venue_name?: string | null;
  style_tags?: string[] | null;
  description?: string | null;
}
interface AlbumRow {
  id: string;
  title: string;
  venue_name: string | null;
  style_tags: string[] | null;
  description: string | null;
  product_id: string | null;
}

// 업체 상세페이지의 기업회원 등록 콘텐츠(포트폴리오 앨범·상품·이벤트·메뉴) 노출.
// 승인된 것만 RLS 로 내려오며, 데이터 없는 섹션은 렌더하지 않는다.
const PlaceBusinessSections = ({ placeId, category }: { placeId: string; category: string }) => {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [media, setMedia] = useState<MediaRow[]>([]);
  const [albums, setAlbums] = useState<AlbumRow[]>([]);
  const isMenu = category === "invitation_venue";

  const load = useCallback(async () => {
    const [ev, pr, md, alb] = await Promise.all([
      supabase.from("business_events" as any).select("id, title, description, starts_at, ends_at").eq("place_id", placeId).eq("moderation_status", "approved").order("created_at", { ascending: false }),
      supabase.from("business_products" as any).select("id, name, price, description, image_url").eq("place_id", placeId).eq("moderation_status", "approved").order("created_at", { ascending: false }),
      supabase.from("place_media" as any).select("*").eq("place_id", placeId).order("display_order", { ascending: true }),
      // 앨범 테이블이 라이브에 아직 없으면 error → 빈 배열로 폴백(평면 렌더).
      supabase.from("place_media_albums" as any).select("id, title, venue_name, style_tags, description, product_id").eq("place_id", placeId).order("created_at", { ascending: false }),
    ]);
    setEvents((ev.data ?? []) as unknown as EventRow[]);
    setProducts((pr.data ?? []) as unknown as ProductRow[]);
    setMedia((md.data ?? []) as unknown as MediaRow[]);
    setAlbums((alb.data ?? []) as unknown as AlbumRow[]);
  }, [placeId]);

  useEffect(() => { load(); }, [load]);

  if (events.length === 0 && products.length === 0 && media.length === 0) return null;

  const productName = new Map(products.map((p) => [p.id, p.name]));
  const albumById = new Map(albums.map((a) => [a.id, a]));

  // 포트폴리오 그룹핑: 앨범 있는 사진은 앨범별로, 없으면 "기타". 앨범 등록 순서 유지.
  const photosByAlbum = new Map<string | null, MediaRow[]>();
  for (const m of media) {
    const key = m.album_id ?? null;
    if (!photosByAlbum.has(key)) photosByAlbum.set(key, []);
    photosByAlbum.get(key)!.push(m);
  }
  const orderedAlbumKeys: (string | null)[] = [
    ...albums.filter((a) => photosByAlbum.has(a.id)).map((a) => a.id as string | null),
    ...(photosByAlbum.has(null) ? [null] : []),
  ];

  return (
    <div className="space-y-5">
      {/* 포트폴리오(사진, 앨범 그룹) / 메뉴 */}
      {media.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-sm flex items-center gap-1.5">
            {isMenu ? <UtensilsCrossed className="w-4 h-4 text-primary" /> : <ImageIcon className="w-4 h-4 text-primary" />}
            {isMenu ? "메뉴" : "포트폴리오"}
          </h3>

          {isMenu ? (
            <div className="grid grid-cols-2 gap-2">
              {media.map((m) => (
                <div key={m.id} className="rounded-xl border border-border overflow-hidden bg-card">
                  <div className="aspect-square bg-muted">
                    {m.image_url && <img src={m.image_url} alt={m.title ?? ""} className="w-full h-full object-cover" />}
                  </div>
                  <div className="p-2">
                    <p className="text-[12px] font-semibold text-foreground truncate">{m.title}</p>
                    {m.price != null && <p className="text-[11px] text-muted-foreground">{m.price.toLocaleString()}원</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {orderedAlbumKeys.map((albId) => {
                const alb = albId ? albumById.get(albId) : null;
                const photos = photosByAlbum.get(albId) ?? [];
                const tags = alb ? (alb.style_tags ?? []) : [];
                // 앨범 없는 단독 사진은 행 자체 메타(레거시) 사용.
                const looseVenue = !alb && photos[0]?.venue_name;
                const pkg = alb?.product_id ? productName.get(alb.product_id) : undefined;
                return (
                  <div key={albId ?? "loose"} className="space-y-1.5">
                    {(alb || looseVenue) && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {alb && <span className="text-[13px] font-semibold text-foreground">{alb.title}</span>}
                        {(alb?.venue_name || looseVenue) && (
                          <span className="text-[11px] text-primary">📍 {alb?.venue_name ?? looseVenue}</span>
                        )}
                        {pkg && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">패키지 · {pkg}</span>
                        )}
                        {tags.slice(0, 3).map((t) => (
                          <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">#{t}</span>
                        ))}
                      </div>
                    )}
                    {alb?.description && <p className="text-[11px] text-muted-foreground">{alb.description}</p>}
                    <div className="grid grid-cols-2 gap-2">
                      {photos.map((m) => (
                        <div key={m.id} className="rounded-xl border border-border overflow-hidden bg-card aspect-square">
                          {m.image_url && <img src={m.image_url} alt={m.title ?? alb?.title ?? ""} className="w-full h-full object-cover" />}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
