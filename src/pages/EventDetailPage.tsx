import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Calendar, Loader2, Store, Send } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";

interface EventDetail {
  id: string;
  place_id: string;
  title: string;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  banner_image_url: string | null;
  detail_images: string[] | null;
  placeName: string | null;
  placeThumb: string | null;
}

// 업체 이미지(vendor-images 공개 버킷) public URL. 경로형 레거시 행 방어.
const pub = (url?: string | null): string | null => {
  if (!url) return null;
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  try { return supabase.storage.from("vendor-images").getPublicUrl(url).data.publicUrl || url; } catch { return url; }
};

// 업체 이벤트 상세페이지. 배너·상세 이미지가 있는 '상세페이지형' 이벤트 진입점.
// 하단 CTA: 업체 확인하기(업체 상세) / 신청하기(업체 문의·예약 동선).
const EventDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ev, setEv] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    (async () => {
      // select("*") — detail_images 등 컬럼 드리프트 방어.
      const { data } = await (supabase.from("business_events" as any).select("*").eq("id", id).maybeSingle() as any);
      if (!mounted) return;
      if (!data) { setEv(null); setLoading(false); return; }
      let placeName: string | null = null, placeThumb: string | null = null;
      if (data.place_id) {
        const { data: p } = await (supabase.from("places" as any).select("name, main_image_url").eq("place_id", data.place_id).maybeSingle() as any);
        placeName = p?.name ?? null;
        placeThumb = pub(p?.main_image_url ?? null);
      }
      if (!mounted) return;
      setEv({
        id: data.id, place_id: data.place_id, title: data.title, description: data.description ?? null,
        starts_at: data.starts_at ?? null, ends_at: data.ends_at ?? null,
        banner_image_url: pub(data.banner_image_url ?? null),
        detail_images: (data.detail_images ?? null) as string[] | null,
        placeName, placeThumb,
      });
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background app-col mx-auto flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!ev) {
    return (
      <div className="min-h-screen bg-background app-col mx-auto flex flex-col items-center justify-center text-center px-6 font-sans break-keep">
        <p className="text-lg font-bold text-foreground mb-2">이벤트를 찾을 수 없어요</p>
        <button onClick={() => navigate("/deals")} className="mt-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold">이벤트 보러가기</button>
      </div>
    );
  }

  const hero = ev.banner_image_url ?? ev.placeThumb;

  return (
    <div className="min-h-screen bg-background app-col mx-auto flex flex-col font-sans break-keep">
      <PageHeader title="이벤트" />

      <div className="flex-1 pb-28">
        {hero && (
          <div className="aspect-[2/1] bg-muted">
            <img src={hero} alt={ev.title} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="px-4 py-5 space-y-3">
          {ev.placeName && <p className="text-sm font-semibold text-primary">{ev.placeName}</p>}
          <h1 className="text-xl font-extrabold text-foreground leading-snug text-balance">{ev.title}</h1>
          {(ev.starts_at || ev.ends_at) && (
            <p className="text-[13px] text-muted-foreground flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />{ev.starts_at ?? ""}{ev.ends_at ? ` ~ ${ev.ends_at}` : ""}
            </p>
          )}
          {ev.description && (
            <p className="text-sm text-foreground whitespace-pre-line leading-relaxed pt-1">{ev.description}</p>
          )}
          {(ev.detail_images ?? []).length > 0 && (
            <div className="space-y-2 pt-2">
              {(ev.detail_images ?? []).map((u) => {
                const src = pub(u);
                return src ? <img key={u} src={src} alt="" className="w-full rounded-xl" loading="lazy" /> : null;
              })}
            </div>
          )}
        </div>
      </div>

      {/* 하단 CTA — 업체 확인하기 / 신청하기 */}
      <div className="sticky bottom-0 bg-card/95 backdrop-blur-sm border-t border-border px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/vendor/${ev.place_id}`)}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl border border-border bg-card text-foreground text-sm font-semibold"
          >
            <Store className="w-4 h-4" /> 업체 확인하기
          </button>
          <button
            onClick={() => navigate(`/vendor/${ev.place_id}`)}
            className="flex-[1.4] flex items-center justify-center gap-1.5 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold"
          >
            <Send className="w-4 h-4" /> 신청하기
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventDetailPage;
