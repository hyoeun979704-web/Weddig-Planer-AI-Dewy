import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Package, Image as ImageIcon, UtensilsCrossed, X, ChevronLeft, ChevronRight as ChevronRightIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { loadTasteTags } from "@/lib/tasteQuiz";
import { normalizeTagsToMoods } from "@/lib/tasteTaxonomy";

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

// 업체가 올린 이미지는 vendor-images(공개) 버킷의 public URL 로 저장된다. 다만 과거/외부
// 경로만 저장된 행(드리프트)도 깨지지 않게, http/data/blob 가 아니면 public URL 로 변환한다.
const pub = (url?: string | null): string | null => {
  if (!url) return null;
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  try {
    return supabase.storage.from("vendor-images").getPublicUrl(url).data.publicUrl || url;
  } catch {
    return url;
  }
};

// 업체 상세페이지의 기업회원 등록 콘텐츠(포트폴리오 앨범·상품·이벤트·메뉴) 노출.
// 승인된 것만 RLS 로 내려오며, 데이터 없는 섹션은 렌더하지 않는다.
const PlaceBusinessSections = ({ placeId, category }: { placeId: string; category: string }) => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [media, setMedia] = useState<MediaRow[]>([]);
  const [albums, setAlbums] = useState<AlbumRow[]>([]);
  // 사진 풀스크린 라이트박스(좌우 이동). 포트폴리오/상품 이미지를 크게 본다.
  const [lightbox, setLightbox] = useState<{ urls: string[]; i: number } | null>(null);
  // 포트폴리오 필터(스타일·식장·패키지) — 칩 선택 상태. 미선택 시 전체 노출.
  const [filter, setFilter] = useState<{ kind: "style" | "venue" | "product"; value: string } | null>(null);
  const isMenu = category === "invitation_venue";
  // 취향(미니퀴즈) 무드 — 있으면 앨범 피드를 그 취향에 가까운 순으로 정렬(delta③). 1회 로드.
  const tasteMoods = useMemo(() => new Set<string>(loadTasteTags()), []);

  const load = useCallback(async () => {
    const [pr, md, alb] = await Promise.all([
      supabase.from("business_products" as any).select("id, name, price, description, image_url").eq("place_id", placeId).eq("moderation_status", "approved").order("created_at", { ascending: false }),
      // select("*") — place_media 컬럼 드리프트 방어. 있으면 함께 내려옴.
      supabase.from("place_media" as any).select("*").eq("place_id", placeId).order("display_order", { ascending: true }),
      // 앨범 테이블이 라이브에 아직 없으면 error → 빈 배열로 폴백(평면 렌더).
      supabase.from("place_media_albums" as any).select("id, title, venue_name, style_tags, description, product_id").eq("place_id", placeId).order("created_at", { ascending: false }),
    ]);
    setProducts((pr.data ?? []) as unknown as ProductRow[]);
    setMedia((md.data ?? []) as unknown as MediaRow[]);
    setAlbums((alb.data ?? []) as unknown as AlbumRow[]);
  }, [placeId]);

  useEffect(() => { load(); }, [load]);

  // Esc 로 라이트박스 닫기.
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowLeft") setLightbox((l) => (l ? { ...l, i: (l.i - 1 + l.urls.length) % l.urls.length } : l));
      if (e.key === "ArrowRight") setLightbox((l) => (l ? { ...l, i: (l.i + 1) % l.urls.length } : l));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  // 데이터 파생(그룹핑·필터옵션)은 products/media/albums 에만 의존 → useMemo 로 고정.
  // (라이트박스·필터 등 다른 state 변경 시 매번 Map 재생성·재그룹핑하던 렌더 폭주 제거.)
  // 주의: hook 은 조기 return 보다 위에서 무조건 호출(react-hooks/rules-of-hooks).
  const { productName, albumById, photosByAlbum, orderedAlbumKeys, shownAlbums, styleOpts, venueOpts, productOpts, hasFilters, tasteSorted } = useMemo(() => {
    const productName = new Map(products.map((p) => [p.id, p.name]));
    const albumById = new Map(albums.map((a) => [a.id, a]));

    // 포트폴리오 그룹핑: 앨범 있는 사진은 앨범별로, 없으면 "기타". 앨범 등록 순서 유지.
    const photosByAlbum = new Map<string | null, MediaRow[]>();
    for (const m of media) {
      const key = m.album_id ?? null;
      if (!photosByAlbum.has(key)) photosByAlbum.set(key, []);
      photosByAlbum.get(key)!.push(m);
    }
    // 사진 있는 앨범. 취향이 있으면 (앨범 무드 ∩ 취향) 겹침 수 내림차순으로 안정 정렬(동점=등록순).
    // 앨범 무드는 자유텍스트일 수 있어 정규화 후 비교(VendorList 와 동일 규칙). 취향 없으면 등록순 유지.
    const albumsWithPhotos = albums.filter((a) => photosByAlbum.has(a.id));
    const tasteOrdered =
      tasteMoods.size === 0
        ? albumsWithPhotos
        : albumsWithPhotos
            .map((a, i) => ({ a, i, t: normalizeTagsToMoods(a.style_tags ?? []).filter((m) => tasteMoods.has(m)).length }))
            .sort((x, y) => y.t - x.t || x.i - y.i)
            .map(({ a }) => a);
    const tasteSorted = tasteMoods.size > 0 && tasteOrdered.some((a) => normalizeTagsToMoods(a.style_tags ?? []).some((m) => tasteMoods.has(m)));
    const orderedAlbumKeys: (string | null)[] = [
      ...tasteOrdered.map((a) => a.id as string | null),
      ...(photosByAlbum.has(null) ? [null] : []),
    ];

    // 필터 옵션 — 사진이 있는 앨범 기준(스타일·식장·패키지).
    const shownAlbums = albums.filter((a) => photosByAlbum.has(a.id));
    const styleOpts = Array.from(new Set(shownAlbums.flatMap((a) => a.style_tags ?? []))).slice(0, 12);
    const venueOpts = Array.from(new Set(shownAlbums.map((a) => a.venue_name).filter(Boolean) as string[])).slice(0, 12);
    const productOpts = Array.from(
      new Map(shownAlbums.filter((a) => a.product_id).map((a) => [a.product_id as string, productName.get(a.product_id as string) ?? ""])).entries(),
    ).filter(([, n]) => n) as [string, string][];
    const hasFilters = shownAlbums.length > 1 && styleOpts.length + venueOpts.length + productOpts.length > 0;
    return { productName, albumById, photosByAlbum, orderedAlbumKeys, shownAlbums, styleOpts, venueOpts, productOpts, hasFilters, tasteSorted };
  }, [products, media, albums, tasteMoods]);

  if (products.length === 0 && media.length === 0) return null;

  const matchAlbum = (a: AlbumRow | null): boolean => {
    if (!filter) return true;
    if (!a) return false; // 필터 적용 시 '기타' 묶음 제외
    if (filter.kind === "style") return (a.style_tags ?? []).includes(filter.value);
    if (filter.kind === "venue") return a.venue_name === filter.value;
    if (filter.kind === "product") return a.product_id === filter.value;
    return true;
  };
  const visibleAlbumKeys = orderedAlbumKeys.filter((k) => matchAlbum(k ? albumById.get(k) ?? null : null));

  const openLightbox = (urls: (string | null | undefined)[], i: number) => {
    const clean = urls.map((u) => pub(u)).filter(Boolean) as string[];
    if (clean.length) setLightbox({ urls: clean, i: Math.max(0, Math.min(i, clean.length - 1)) });
  };

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
              {media.map((m, idx) => (
                <div key={m.id} className="rounded-xl border border-border overflow-hidden bg-card">
                  <button
                    type="button"
                    onClick={() => openLightbox(media.map((x) => x.image_url), idx)}
                    className="block w-full aspect-square bg-muted"
                    aria-label={`${m.title ?? "메뉴"} 크게 보기`}
                  >
                    {pub(m.image_url) && <img src={pub(m.image_url)!} alt={m.title ?? ""} className="w-full h-full object-cover" loading="lazy" />}
                  </button>
                  <div className="p-2">
                    <p className="text-[12px] font-semibold text-foreground truncate">{m.title}</p>
                    {m.price != null && <p className="text-[11px] text-muted-foreground">{m.price.toLocaleString()}원</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {tasteSorted && !filter && (
                <p className="text-[11px] text-primary">내 취향에 가까운 작업부터 보여드려요.</p>
              )}
              {hasFilters && (
                <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-0.5">
                  <FilterChip label="전체" active={!filter} onClick={() => setFilter(null)} />
                  {productOpts.map(([id, name]) => (
                    <FilterChip key={`p-${id}`} label={`패키지 · ${name}`} active={filter?.kind === "product" && filter.value === id} onClick={() => setFilter({ kind: "product", value: id })} />
                  ))}
                  {venueOpts.map((v) => (
                    <FilterChip key={`v-${v}`} label={`📍 ${v}`} active={filter?.kind === "venue" && filter.value === v} onClick={() => setFilter({ kind: "venue", value: v })} />
                  ))}
                  {styleOpts.map((t) => (
                    <FilterChip key={`s-${t}`} label={`#${t}`} active={filter?.kind === "style" && filter.value === t} onClick={() => setFilter({ kind: "style", value: t })} />
                  ))}
                </div>
              )}
              {visibleAlbumKeys.map((albId) => {
                const alb = albId ? albumById.get(albId) : null;
                const photos = photosByAlbum.get(albId) ?? [];
                const tags = alb ? (alb.style_tags ?? []) : [];
                // 앨범 없는 단독 사진은 행 자체 메타(레거시) 사용.
                const looseVenue = !alb && photos[0]?.venue_name;
                const pkg = alb?.product_id ? productName.get(alb.product_id) : undefined;
                const albumUrls = photos.map((p) => p.image_url);
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
                      {photos.map((m, idx) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => openLightbox(albumUrls, idx)}
                          className="rounded-xl border border-border overflow-hidden bg-card aspect-square block"
                          aria-label="사진 크게 보기"
                        >
                          {pub(m.image_url) && <img src={pub(m.image_url)!} alt={m.title ?? alb?.title ?? ""} className="w-full h-full object-cover" loading="lazy" />}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 상품 — 카드 탭 시 상세 모달(이미지·설명·관련 포트폴리오) */}
      {products.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-bold text-sm flex items-center gap-1.5"><Package className="w-4 h-4 text-primary" /> 상품</h3>
          <div className="grid grid-cols-2 gap-2">
            {products.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => navigate(`/product/${p.id}`)}
                className="text-left rounded-xl border border-border overflow-hidden bg-card active:opacity-90 hover:border-primary/40 transition-colors"
              >
                <div className="aspect-square bg-muted">
                  {pub(p.image_url) && <img src={pub(p.image_url)!} alt={p.name} className="w-full h-full object-cover" loading="lazy" />}
                </div>
                <div className="p-2">
                  <p className="text-[12px] font-semibold text-foreground truncate">{p.name}</p>
                  {p.price != null && <p className="text-[11px] text-muted-foreground">{p.price.toLocaleString()}원</p>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 사진 풀스크린 라이트박스 */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[120] bg-black/90 flex items-center justify-center"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
        >
          <button type="button" aria-label="닫기" onClick={() => setLightbox(null)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
          <img src={lightbox.urls[lightbox.i]} alt="" className="max-w-[92vw] max-h-[82vh] object-contain" onClick={(e) => e.stopPropagation()} />
          {lightbox.urls.length > 1 && (
            <>
              <button
                type="button" aria-label="이전 사진"
                onClick={(e) => { e.stopPropagation(); setLightbox((l) => (l ? { ...l, i: (l.i - 1 + l.urls.length) % l.urls.length } : l)); }}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                type="button" aria-label="다음 사진"
                onClick={(e) => { e.stopPropagation(); setLightbox((l) => (l ? { ...l, i: (l.i + 1) % l.urls.length } : l)); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center"
              >
                <ChevronRightIcon className="w-6 h-6" />
              </button>
              <p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/80 text-sm tabular-nums">{lightbox.i + 1} / {lightbox.urls.length}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

const FilterChip = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
      active ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"
    }`}
  >
    {label}
  </button>
);

export default PlaceBusinessSections;
