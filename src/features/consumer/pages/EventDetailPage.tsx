import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Calendar, Loader2, Store, Send } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { fetchBusinessEventDetail, vendorPublicUrl } from "@/features/consumer/data/shop";
import { useRelatedEvents } from "@/hooks/useRelatedEvents";

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
  category: string | null;
}

// 업체 이미지(vendor-images 공개 버킷) public URL — data 레이어 공용 헬퍼 재사용.
const pub = vendorPublicUrl;

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
      const res = await fetchBusinessEventDetail(id);
      if (!mounted) return;
      if (!res) { setEv(null); setLoading(false); return; }
      const { event, place } = res;
      const placeName: string | null = place?.name ?? null;
      const placeThumb: string | null = pub(place?.main_image_url ?? null);
      const category: string | null = place?.category ?? null;
      setEv({
        id: event.id, place_id: event.place_id, title: event.title, description: event.description,
        starts_at: event.starts_at, ends_at: event.ends_at,
        banner_image_url: pub(event.banner_image_url ?? null),
        detail_images: event.detail_images,
        placeName, placeThumb, category,
      });
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [id]);

  // 관련 이벤트(큐레이션) — 같은 카테고리·활성업체·승인·진행중, 제휴등급 우선.
  const { data: related = [] } = useRelatedEvents({ category: ev?.category, excludeEventId: ev?.id });

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

        {/* 관련 이벤트 (큐레이션: 활성업체·승인·진행중·제휴등급 우선). 없으면 섹션 숨김. */}
        {related.length > 0 && (
          <div className="px-4 pt-2 pb-4 space-y-2 border-t border-border">
            <h2 className="text-[15px] font-bold text-foreground">관련 이벤트</h2>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
              {related.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => { navigate(`/event/${r.id}`); window.scrollTo({ top: 0 }); }}
                  className="flex-shrink-0 w-36 text-left rounded-xl border border-border overflow-hidden bg-card active:opacity-90"
                >
                  <div className="aspect-[3/2] bg-muted">
                    {r.thumb && <img src={r.thumb} alt={r.title} className="w-full h-full object-cover" loading="lazy" />}
                  </div>
                  <div className="p-2">
                    {r.placeName && <p className="text-[11px] text-primary font-semibold truncate">{r.placeName}</p>}
                    <p className="text-[12px] font-semibold text-foreground line-clamp-2 leading-snug">{r.title}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 하단 CTA — 업체 확인하기 / 신청하기 */}
      <div className="sticky bottom-0 bg-card/95 backdrop-blur-sm border-t border-border px-4 pt-3 safe-bottom-cta">
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
