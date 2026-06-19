import { useEffect, useState, useCallback } from "react";
import { Megaphone, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface EventRow {
  id: string;
  title: string;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  banner_image_url: string | null;
  detail_images: string[] | null;
}

// 업체가 올린 이미지는 vendor-images(공개) 버킷의 public URL. 과거/외부 경로만 저장된
// 행도 깨지지 않게 http/data/blob 가 아니면 public URL 로 변환(드리프트 방어).
const pub = (url?: string | null): string | null => {
  if (!url) return null;
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  try { return supabase.storage.from("vendor-images").getPublicUrl(url).data.publicUrl || url; } catch { return url; }
};

// 진행중 이벤트(소비자 혜택) — 전환 직결이라 상세정보가 아닌 **기본정보 탭** 혜택군에 노출.
// 쿠폰(PlaceCoupons)과 같은 자리. 배너 탭 → 상세 모달.
const PlaceEvents = ({ placeId }: { placeId: string }) => {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [active, setActive] = useState<EventRow | null>(null);

  const load = useCallback(async () => {
    // select("*") — banner_image_url/detail_images 가 라이브 DB 에 없어도 422 안 나게(드리프트 방어).
    const { data } = await supabase
      .from("business_events" as any)
      .select("*").eq("place_id", placeId).eq("moderation_status", "approved")
      .order("created_at", { ascending: false });
    setEvents((data ?? []) as unknown as EventRow[]);
  }, [placeId]);

  useEffect(() => { load(); }, [load]);

  if (events.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="font-bold text-sm flex items-center gap-1.5"><Megaphone className="w-4 h-4 text-primary" /> 진행중 이벤트</h3>
      {events.map((e) => (
        <button
          key={e.id}
          type="button"
          onClick={() => setActive(e)}
          className="w-full text-left rounded-xl border border-border bg-card overflow-hidden active:opacity-90"
        >
          {pub(e.banner_image_url) && (
            <div className="aspect-[2/1] bg-muted">
              <img src={pub(e.banner_image_url)!} alt={e.title} className="w-full h-full object-cover" loading="lazy" />
            </div>
          )}
          <div className="p-3 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{e.title}</p>
              {e.description && <p className="text-[13px] text-muted-foreground mt-0.5 line-clamp-1 whitespace-pre-line">{e.description}</p>}
              {(e.starts_at || e.ends_at) && (
                <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />{e.starts_at ?? ""}{e.ends_at ? ` ~ ${e.ends_at}` : ""}
                </p>
              )}
            </div>
          </div>
        </button>
      ))}

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden max-h-[85vh] overflow-y-auto">
          {active && (
            <>
              {pub(active.banner_image_url) && (
                <div className="aspect-[2/1] bg-muted">
                  <img src={pub(active.banner_image_url)!} alt={active.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-5 space-y-3">
                <DialogHeader>
                  <DialogTitle className="text-left">{active.title}</DialogTitle>
                </DialogHeader>
                {(active.starts_at || active.ends_at) && (
                  <p className="text-[12px] text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />{active.starts_at ?? ""}{active.ends_at ? ` ~ ${active.ends_at}` : ""}
                  </p>
                )}
                {active.description && (
                  <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{active.description}</p>
                )}
                {(active.detail_images ?? []).length > 0 && (
                  <div className="space-y-2">
                    {(active.detail_images ?? []).map((url) => (
                      <img key={url} src={pub(url)!} alt="" className="w-full rounded-lg" />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlaceEvents;
