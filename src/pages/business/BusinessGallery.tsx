import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Loader2, UtensilsCrossed, FolderPlus } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ImageUploader from "@/components/admin/ImageUploader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBranches } from "@/hooks/useBranches";
import { toast } from "sonner";
import { confirm } from "@/components/ui/confirm-dialog";

interface MediaItem {
  id: string;
  kind: string;
  image_url: string | null;
  title: string | null;
  price: number | null;
  album_id: string | null;
}
interface Album {
  id: string;
  title: string;
  shoot_date: string | null;
  venue_name: string | null;
  style_tags: string[] | null;
  product_id: string | null;
}
interface ProductOpt { id: string; name: string }

const NEW_ALBUM = "__new__";

// 업체 사진/메뉴 관리. invitation_venue = 메뉴 등록. 그 외 = 포트폴리오 앨범(폴더) 등록:
// 앨범(place_media_albums)에 공통 메타(식장·스타일·상품·촬영일) 1회 설정 → 사진 여러 장 귀속.
const BusinessGallery = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedId, selected, loading: branchesLoading } = useBranches();

  const [loading, setLoading] = useState(true);
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [products, setProducts] = useState<ProductOpt[]>([]);

  const [imageUrl, setImageUrl] = useState("");
  const [title, setTitle] = useState(""); // 메뉴명
  const [price, setPrice] = useState("");
  // 앨범 선택: 기존 앨범 id 또는 NEW_ALBUM(새 앨범 만들기).
  const [albumSel, setAlbumSel] = useState<string>(NEW_ALBUM);
  const [albTitle, setAlbTitle] = useState("");
  const [albShootDate, setAlbShootDate] = useState("");
  const [albVenue, setAlbVenue] = useState("");
  const [albTags, setAlbTags] = useState("");
  const [albProduct, setAlbProduct] = useState("");
  const [albDesc, setAlbDesc] = useState("");

  const [adding, setAdding] = useState(false);
  const [uploaderKey, setUploaderKey] = useState(0);

  const isMenu = category === "invitation_venue";

  const loadAll = useCallback(async (pid: string) => {
    const [mediaRes, albumRes, prodRes] = await Promise.all([
      supabase.from("place_media" as any).select("id, kind, image_url, title, price, album_id")
        .eq("place_id", pid).order("display_order", { ascending: true }).order("created_at", { ascending: true }),
      supabase.from("place_media_albums" as any).select("id, title, shoot_date, venue_name, style_tags, product_id")
        .eq("place_id", pid).order("created_at", { ascending: false }),
      supabase.from("business_products" as any).select("id, name").eq("place_id", pid).order("created_at", { ascending: false }),
    ]);
    setItems((mediaRes.data ?? []) as unknown as MediaItem[]);
    setAlbums((albumRes.data ?? []) as unknown as Album[]);
    setProducts((prodRes.data ?? []) as unknown as ProductOpt[]);
  }, []);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("get_my_listing");
      if (error) { toast.error("정보를 불러오지 못했어요"); setLoading(false); return; }
      const row = Array.isArray(data) ? data[0] : data;
      if (row?.place_id) {
        setPlaceId(row.place_id);
        setCategory(row.category);
        await loadAll(row.place_id);
      }
      setLoading(false);
    })();
  }, [loadAll]);

  const resetForm = () => {
    setImageUrl(""); setTitle(""); setPrice("");
    setAlbTitle(""); setAlbShootDate(""); setAlbVenue(""); setAlbTags(""); setAlbProduct(""); setAlbDesc("");
    setUploaderKey((k) => k + 1);
  };

  const handleAdd = async () => {
    if (!user || !placeId) return;
    if (!imageUrl.trim()) { toast.error("이미지를 올려주세요"); return; }
    if (isMenu && !title.trim()) { toast.error("메뉴명을 입력해주세요"); return; }
    setAdding(true);
    try {
      let albumId: string | null = null;
      if (!isMenu) {
        if (albumSel === NEW_ALBUM) {
          if (!albTitle.trim()) { toast.error("앨범 제목을 입력해주세요 (예: 260402_경복궁)"); return; }
          const { data: alb, error: albErr } = await (supabase as any)
            .from("place_media_albums")
            .insert({
              place_id: placeId,
              owner_user_id: user.id,
              title: albTitle.trim(),
              shoot_date: albShootDate || null,
              venue_name: albVenue.trim() || null,
              style_tags: albTags.split(",").map((t) => t.trim()).filter(Boolean),
              product_id: albProduct || null,
              description: albDesc.trim() || null,
            })
            .select("id")
            .single();
          if (albErr || !alb) { toast.error("앨범 생성에 실패했어요"); return; }
          albumId = alb.id as string;
        } else {
          albumId = albumSel;
        }
      }
      const { error } = await supabase.from("place_media").insert({
        place_id: placeId,
        owner_user_id: user.id,
        kind: isMenu ? "menu" : "photo",
        image_url: imageUrl.trim(),
        title: isMenu ? title.trim() : null,
        price: isMenu && price ? parseInt(price, 10) : null,
        display_order: items.length,
        album_id: albumId,
      } as any);
      if (error) { toast.error("추가에 실패했어요"); return; }
      await loadAll(placeId);
      // 방금 만든 앨범엔 사진을 이어 담기 편하도록 선택 유지.
      if (!isMenu && albumSel === NEW_ALBUM && albumId) setAlbumSel(albumId);
      resetForm();
      toast.success(isMenu ? "메뉴를 추가했어요" : "사진을 앨범에 추가했어요");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm({ title: isMenu ? "이 메뉴를 삭제할까요?" : "이 사진을 삭제할까요?", confirmText: "삭제", destructive: true }))) return;
    const { error } = await supabase.from("place_media").delete().eq("id", id);
    if (error) { toast.error("삭제에 실패했어요"); return; }
    setItems((prev) => prev.filter((i) => i.id !== id));
    toast.success("삭제했어요");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background app-col mx-auto flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!placeId) {
    return (
      <div className="min-h-screen bg-background app-col mx-auto">
        <PageHeader title="사진/메뉴 관리" />
        <div className="px-5 py-20 text-center">
          <p className="text-muted-foreground">먼저 업체 기본 정보를 저장해주세요.</p>
          <Button className="mt-6" onClick={() => navigate("/business/edit")}>업체 정보 입력</Button>
        </div>
      </div>
    );
  }

  // 앨범별 그룹핑(사진). 앨범 없는 사진은 null 키("기타").
  const albumById = new Map(albums.map((a) => [a.id, a]));
  const photoGroups = new Map<string | null, MediaItem[]>();
  for (const m of items) {
    const key = isMenu ? null : (m.album_id ?? null);
    if (!photoGroups.has(key)) photoGroups.set(key, []);
    photoGroups.get(key)!.push(m);
  }

  return (
    <div className="min-h-screen bg-background app-col mx-auto">
      <PageHeader title={isMenu ? "메뉴 관리" : "포트폴리오 관리"} />

      <main className="p-4 pb-24 space-y-5">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-[12px] text-emerald-800">
          {isMenu ? "메뉴는" : "포트폴리오는"} 운영자 검토 없이 <b>즉시 노출</b>돼요.
          {!isMenu && " 같은 식장/패키지 작업은 한 앨범으로 묶으면 더 잘 노출돼요."}
        </div>

        {/* Add form */}
        <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
          <div className="flex items-center gap-2">
            {isMenu ? <UtensilsCrossed className="w-4 h-4 text-primary" /> : <FolderPlus className="w-4 h-4 text-primary" />}
            <h2 className="text-sm font-semibold text-foreground">{isMenu ? "메뉴 등록" : "사진 등록"}</h2>
          </div>

          {isMenu && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">메뉴명</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 코스 A" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">가격(원)</Label>
                <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="59000" />
              </div>
            </div>
          )}

          {/* 앨범 선택(사진만) */}
          {!isMenu && (
            <div className="space-y-2">
              <Label className="text-xs">앨범</Label>
              <select
                value={albumSel}
                onChange={(e) => setAlbumSel(e.target.value)}
                className="w-full text-sm border border-border rounded-md px-2 py-2 bg-background text-foreground"
              >
                <option value={NEW_ALBUM}>+ 새 앨범 만들기</option>
                {albums.map((a) => (
                  <option key={a.id} value={a.id}>{a.title}</option>
                ))}
              </select>

              {albumSel === NEW_ALBUM && (
                <div className="space-y-2 border border-dashed border-border rounded-lg p-2.5">
                  <div className="space-y-1.5">
                    <Label className="text-xs">앨범 제목 *</Label>
                    <Input value={albTitle} onChange={(e) => setAlbTitle(e.target.value)} placeholder="예: 260402_경복궁" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">촬영일</Label>
                      <Input type="date" value={albShootDate} onChange={(e) => setAlbShootDate(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">진행 장소(식장)</Label>
                      <Input value={albVenue} onChange={(e) => setAlbVenue(e.target.value)} placeholder="그랜드웨딩홀 강남" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">스타일 태그 (쉼표)</Label>
                    <Input value={albTags} onChange={(e) => setAlbTags(e.target.value)} placeholder="필름, 내추럴, 야외" />
                  </div>
                  {products.length > 0 && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">연결 상품/패키지 (선택)</Label>
                      <select
                        value={albProduct}
                        onChange={(e) => setAlbProduct(e.target.value)}
                        className="w-full text-sm border border-border rounded-md px-2 py-2 bg-background text-foreground"
                      >
                        <option value="">연결 안 함</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label className="text-xs">설명 (선택)</Label>
                    <Input value={albDesc} onChange={(e) => setAlbDesc(e.target.value)} placeholder="이 작업에 대한 짧은 설명" />
                  </div>
                  <p className="text-[11px] text-muted-foreground">진행 장소·스타일·상품은 앨범에 한 번만 설정하면 사진들에 공통 적용돼요.</p>
                </div>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">{isMenu ? "메뉴 사진" : "사진"}</Label>
            {user && (
              <ImageUploader
                key={uploaderKey}
                bucket="vendor-images"
                pathPrefix={`${user.id}/`}
                initialUrl={imageUrl || undefined}
                onUploaded={(_, url) => setImageUrl(url)}
              />
            )}
            <Input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="또는 외부 이미지 URL (https://...)"
              className="mt-2"
            />
          </div>

          <Button onClick={handleAdd} disabled={adding} className="w-full">
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1" /> {isMenu ? "메뉴 추가" : "사진 추가"}</>}
          </Button>
        </div>

        {/* List — 메뉴는 평면, 사진은 앨범 그룹 */}
        {items.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            {isMenu ? "등록된 메뉴가 없어요" : "등록된 사진이 없어요"}
          </p>
        ) : isMenu ? (
          <div className="grid grid-cols-2 gap-3">
            {items.map((m) => (
              <MediaCard key={m.id} m={m} isMenu onDelete={handleDelete} />
            ))}
          </div>
        ) : (
          <div className="space-y-5">
            {Array.from(photoGroups.entries()).map(([albId, group]) => {
              const alb = albId ? albumById.get(albId) : null;
              return (
                <div key={albId ?? "loose"} className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-foreground">{alb?.title ?? "기타 사진"}</h3>
                    {alb?.venue_name && <span className="text-[11px] text-primary">📍 {alb.venue_name}</span>}
                    {(alb?.style_tags ?? []).slice(0, 3).map((t) => (
                      <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">#{t}</span>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {group.map((m) => (
                      <MediaCard key={m.id} m={m} isMenu={false} onDelete={handleDelete} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

const MediaCard = ({ m, isMenu, onDelete }: { m: MediaItem; isMenu: boolean; onDelete: (id: string) => void }) => (
  <div className="bg-card rounded-2xl border border-border overflow-hidden">
    <div className="aspect-square bg-muted">
      {m.image_url && <img src={m.image_url} alt={m.title ?? ""} className="w-full h-full object-cover" />}
    </div>
    <div className="p-2.5">
      {isMenu && (
        <>
          <p className="text-[13px] font-semibold text-foreground truncate">{m.title}</p>
          {m.price != null && <p className="text-[12px] text-muted-foreground">{m.price.toLocaleString()}원</p>}
        </>
      )}
      <button onClick={() => onDelete(m.id)} className="mt-1 text-[11px] text-destructive inline-flex items-center gap-1">
        <Trash2 className="w-3 h-3" /> 삭제
      </button>
    </div>
  </div>
);

export default BusinessGallery;
