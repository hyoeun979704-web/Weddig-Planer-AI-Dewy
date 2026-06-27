import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, Phone, MessageCircle, Image as ImageIcon, X } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import PlaceInquirySheet from "@/components/place/PlaceInquirySheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fetchBusinessProductDetail } from "@/features/consumer/data/shop";

interface ProductDetail {
  id: string;
  place_id: string;
  name: string;
  price: number | null;
  description: string | null;
  image_url: string | null;
  detail_images: string[];
  placeName: string | null;
  placeThumb: string | null;
  phone: string | null; // 전화 문의 번호(inquiry_phone ?? tel)
}

// 업체 프로필 상품 상세페이지. 썸네일(없으면 업체 대표이미지)·가격·설명·관련 포트폴리오 +
// 하단 CTA: 문의하기(전화 / 인앱 채팅). 결제지원 상품의 '구매하기'는 Phase C에서 추가.
const ProductDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [p, setP] = useState<ProductDetail | null>(null);
  const [related, setRelated] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [askOpen, setAskOpen] = useState(false);   // 문의 방법 선택 시트
  const [chatOpen, setChatOpen] = useState(false);  // 인앱 문의/채팅
  const [lightbox, setLightbox] = useState<{ urls: string[]; i: number } | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const res = await fetchBusinessProductDetail(id);
    if (!res) { setP(null); setLoading(false); return; }
    const { product, place, related: relPhotos } = res;
    const placeName: string | null = place?.name ?? null;
    const placeThumb: string | null = place?.main_image_url ?? null;
    const phone: string | null = (place?.inquiry_phone || place?.tel) ?? null;
    setP({
      id: product.id, place_id: product.place_id, name: product.name, price: product.price,
      description: product.description, image_url: product.image_url,
      detail_images: product.detail_images,
      placeName, placeThumb, phone,
    });
    setRelated(relPhotos);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setLightbox(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  if (loading) {
    return <div className="min-h-screen bg-background app-col mx-auto flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }
  if (!p) {
    return (
      <div className="min-h-screen bg-background app-col mx-auto flex flex-col items-center justify-center text-center px-6 font-sans break-keep">
        <p className="text-lg font-bold text-foreground mb-2">상품을 찾을 수 없어요</p>
        <button onClick={() => navigate(-1)} className="mt-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold">돌아가기</button>
      </div>
    );
  }

  const hero = p.image_url ?? p.placeThumb;
  // 문의하기: 전화번호가 있으면 선택 시트(전화/채팅), 없으면 바로 인앱 채팅.
  const onInquiry = () => { if (p.phone) setAskOpen(true); else setChatOpen(true); };

  return (
    <div className="min-h-screen bg-background app-col mx-auto flex flex-col font-sans break-keep">
      <PageHeader title="상품" />

      <div className="flex-1 pb-28">
        {hero && (
          <button type="button" onClick={() => setLightbox({ urls: [hero], i: 0 })} className="block w-full aspect-[4/3] bg-muted">
            <img src={hero} alt={p.name} className="w-full h-full object-cover" />
          </button>
        )}
        <div className="px-4 py-5 space-y-3">
          {p.placeName && <p className="text-sm font-semibold text-primary">{p.placeName}</p>}
          <h1 className="text-xl font-extrabold text-foreground leading-snug text-balance">{p.name}</h1>
          {p.price != null && <p className="text-lg font-extrabold text-primary">{p.price.toLocaleString()}원</p>}
          {p.description && <p className="text-sm text-foreground whitespace-pre-line leading-relaxed pt-1">{p.description}</p>}

          {p.detail_images.length > 0 && (
            <div className="space-y-2 pt-1">
              {p.detail_images.map((u) => (
                <button key={u} type="button" onClick={() => setLightbox({ urls: p.detail_images, i: p.detail_images.indexOf(u) })} className="block w-full">
                  <img src={u} alt="" className="w-full rounded-xl" loading="lazy" />
                </button>
              ))}
            </div>
          )}

          {related.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-xs font-bold text-foreground flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5 text-primary" /> 관련 포트폴리오</p>
              <div className="grid grid-cols-3 gap-1.5">
                {related.map((u, idx) => (
                  <button key={u} type="button" onClick={() => setLightbox({ urls: related, i: idx })} className="rounded-lg overflow-hidden bg-muted aspect-square block">
                    <img src={u} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 하단 CTA — 문의하기 (결제지원 상품 '구매하기'는 Phase C) */}
      <div className="sticky bottom-0 bg-card/95 backdrop-blur-sm border-t border-border px-4 pt-3 safe-bottom-cta">
        <button
          onClick={onInquiry}
          className="w-full flex items-center justify-center gap-1.5 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold"
        >
          <MessageCircle className="w-4 h-4" /> 문의하기
        </button>
      </div>

      {/* 문의 방법 선택 (전화 / 채팅) */}
      <Dialog open={askOpen} onOpenChange={setAskOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle className="text-center text-base">문의 방법 선택</DialogTitle></DialogHeader>
          <div className="space-y-2 pt-1">
            {p.phone && (
              <a href={`tel:${p.phone}`} className="flex items-center justify-center gap-2 py-3 rounded-xl border border-border bg-card text-foreground text-sm font-semibold">
                <Phone className="w-4 h-4" /> 전화 문의
              </a>
            )}
            <button
              type="button"
              onClick={() => { setAskOpen(false); setChatOpen(true); }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold"
            >
              <MessageCircle className="w-4 h-4" /> 채팅 문의
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 인앱 문의/채팅 */}
      <PlaceInquirySheet placeId={p.place_id} placeName={p.placeName ?? undefined} open={chatOpen} onOpenChange={setChatOpen} />

      {/* 라이트박스 */}
      {lightbox && (
        <div className="fixed inset-0 z-[120] bg-black/90 flex items-center justify-center" onClick={() => setLightbox(null)} role="dialog" aria-modal="true">
          <button type="button" aria-label="닫기" onClick={() => setLightbox(null)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center"><X className="w-5 h-5" /></button>
          <img src={lightbox.urls[lightbox.i]} alt="" className="max-w-[92vw] max-h-[82vh] object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
};

export default ProductDetailPage;
