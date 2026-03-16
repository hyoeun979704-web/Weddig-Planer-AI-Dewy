import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ChevronLeft, Star, MapPin, Phone, Clock, Car, ExternalLink } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useVendor, useWeddingHallDetail, useVendorReviews, categoryRouteMap } from "@/hooks/useVendors";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AdvantageCard {
  id: string;
  emoji: string;
  title: string;
  description: string | null;
  sort_order: number;
}

interface GalleryImage {
  id: string;
  image_url: string;
  caption: string | null;
  sort_order: number;
}

const VendorDetailPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const { data: vendor, isLoading } = useVendor(id || "");
  const { data: hallDetail } = useWeddingHallDetail(id || "");
  const { data: reviews = [] } = useVendorReviews(id || "");
  const [advantages, setAdvantages] = useState<AdvantageCard[]>([]);
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [galleryIndex, setGalleryIndex] = useState(0);

  useEffect(() => {
    if (!id) return;
    const vendorId = parseInt(id, 10);
    if (isNaN(vendorId)) return;

    Promise.all([
      supabase.from('vendor_advantage_cards').select('*').eq('vendor_id', vendorId).order('sort_order'),
      supabase.from('vendor_gallery_images').select('*').eq('vendor_id', vendorId).order('sort_order'),
    ]).then(([aRes, gRes]) => {
      if (aRes.data) setAdvantages(aRes.data as AdvantageCard[]);
      if (gRes.data) setGallery(gRes.data as GalleryImage[]);
    });
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background max-w-[430px] mx-auto">
        <Skeleton className="h-56 w-full" />
        <div className="p-4 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-background max-w-[430px] mx-auto flex items-center justify-center">
        <p className="text-muted-foreground">업체를 찾을 수 없습니다</p>
      </div>
    );
  }

  const snsInfo = vendor.sns_info as Record<string, string> | null;

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center px-4 h-14">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center -ml-2">
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground flex-1 text-center -mr-8 truncate">{vendor.name}</h1>
        </div>
      </header>

      <main className="pb-20">
        {/* Thumbnail */}
        <div className="aspect-[16/9] bg-muted overflow-hidden">
          {vendor.thumbnail_url ? (
            <img src={vendor.thumbnail_url} alt={vendor.name} className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.src = "/placeholder.svg"; }} />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
              <span className="text-5xl">{categoryRouteMap[vendor.category_type]?.emoji || "🏢"}</span>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium px-2 py-0.5 bg-primary/10 text-primary rounded-full">
              {vendor.category_type}
            </span>
            <div className="flex items-center gap-0.5">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="text-sm font-semibold">{vendor.avg_rating?.toFixed(1)}</span>
              <span className="text-sm text-muted-foreground">({vendor.review_count})</span>
            </div>
          </div>

          <h2 className="text-xl font-bold text-foreground mb-3">{vendor.name}</h2>

          <div className="space-y-2 text-sm text-muted-foreground">
            {vendor.address && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span>{vendor.address}</span>
              </div>
            )}
            {vendor.tel && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 flex-shrink-0" />
                <a href={`tel:${vendor.tel}`} className="text-primary underline">{vendor.tel}</a>
              </div>
            )}
            {vendor.business_hours && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 flex-shrink-0" />
                <span>{vendor.business_hours}</span>
              </div>
            )}
            {(vendor.parking_location || vendor.parking_hours) && (
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 flex-shrink-0" />
                <span>{[vendor.parking_location, vendor.parking_hours].filter(Boolean).join(" · ")}</span>
              </div>
            )}
          </div>

          {vendor.amenities && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {vendor.amenities.split(",").map((a, i) => (
                <span key={i} className="text-xs px-2 py-1 bg-muted rounded-full text-muted-foreground">
                  {a.trim()}
                </span>
              ))}
            </div>
          )}

          {vendor.keywords && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {vendor.keywords.split(",").map((k, i) => (
                <span key={i} className="text-xs px-2 py-1 bg-primary/5 text-primary rounded-full">
                  #{k.trim()}
                </span>
              ))}
            </div>
          )}

          {/* 업체 상세 소개 */}
          {(vendor as Record<string, unknown>).description && (
            <div className="mt-3 p-3 bg-muted/50 rounded-xl">
              <p className="text-sm text-foreground leading-relaxed">
                {(vendor as Record<string, unknown>).description as string}
              </p>
            </div>
          )}

          {/* SNS Links */}
          {snsInfo && Object.keys(snsInfo).length > 0 && (
            <div className="mt-3 flex gap-2">
              {Object.entries(snsInfo).map(([platform, url]) => (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs px-3 py-1.5 bg-muted rounded-full text-foreground hover:bg-accent transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  {platform}
                </a>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Wedding Hall Details */}
        {vendor.category_type === "웨딩홀" && hallDetail && (
          <>
            <div className="p-4">
              <h3 className="text-base font-bold text-foreground mb-3">웨딩홀 상세 정보</h3>
              <div className="grid grid-cols-2 gap-3">
                {hallDetail.meal_type && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">식사 유형</p>
                    <p className="text-sm font-semibold text-foreground mt-1">{hallDetail.meal_type}</p>
                  </div>
                )}
                {hallDetail.meal_cost_range && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">식대 범위</p>
                    <p className="text-sm font-semibold text-foreground mt-1">{hallDetail.meal_cost_range}</p>
                  </div>
                )}
                {hallDetail.rental_cost_range && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">대관료 범위</p>
                    <p className="text-sm font-semibold text-foreground mt-1">{hallDetail.rental_cost_range}</p>
                  </div>
                )}
                {hallDetail.parking_info && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">주차</p>
                    <p className="text-sm font-semibold text-foreground mt-1">{hallDetail.parking_info}</p>
                  </div>
                )}
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* 장점 카드 */}
        {advantages.length > 0 && (
          <>
            <Separator />
            <div className="p-4">
              <h3 className="text-base font-bold text-foreground mb-3">이런 점이 좋아요</h3>
              <div className="grid grid-cols-2 gap-2">
                {advantages.map((card) => (
                  <div key={card.id} className="bg-primary/5 rounded-xl p-3 flex items-start gap-2">
                    <span className="text-xl flex-shrink-0">{card.emoji}</span>
                    <div>
                      <p className="text-sm font-semibold text-foreground leading-tight">{card.title}</p>
                      {card.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{card.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* 포토 갤러리 */}
        {gallery.length > 0 && (
          <>
            <Separator />
            <div className="p-4">
              <h3 className="text-base font-bold text-foreground mb-3">포토 갤러리 ({gallery.length})</h3>
              {/* 메인 이미지 */}
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-muted mb-2">
                <img
                  src={gallery[galleryIndex].image_url}
                  alt={gallery[galleryIndex].caption ?? `gallery ${galleryIndex + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.src = '/placeholder.svg'; }}
                />
                {gallery[galleryIndex].caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/40 px-3 py-1.5">
                    <p className="text-xs text-white">{gallery[galleryIndex].caption}</p>
                  </div>
                )}
                {gallery.length > 1 && (
                  <div className="absolute top-2 right-2 bg-black/50 px-2 py-0.5 rounded-full text-xs text-white">
                    {galleryIndex + 1}/{gallery.length}
                  </div>
                )}
              </div>
              {/* 썸네일 스트립 */}
              {gallery.length > 1 && (
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {gallery.map((img, i) => (
                    <button
                      key={img.id}
                      onClick={() => setGalleryIndex(i)}
                      className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all
                        ${i === galleryIndex ? 'border-primary' : 'border-transparent opacity-60'}`}
                    >
                      <img
                        src={img.image_url}
                        alt={`thumb ${i + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.src = '/placeholder.svg'; }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Reviews */}
        <div className="p-4">
          <h3 className="text-base font-bold text-foreground mb-3">
            리뷰 ({reviews.length})
          </h3>
          {reviews.length > 0 ? (
            <div className="space-y-3">
              {reviews.map((review) => (
                <div key={review.review_id} className="bg-card border border-border rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${i < review.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(review.created_at).toLocaleDateString("ko-KR")}
                    </span>
                  </div>
                  {review.content && (
                    <p className="text-sm text-foreground">{review.content}</p>
                  )}
                  {review.ai_summary && (
                    <div className="mt-2 bg-primary/5 rounded-lg px-3 py-2">
                      <p className="text-xs text-primary font-medium">🤖 AI 요약</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{review.ai_summary}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">아직 리뷰가 없습니다</p>
          )}
        </div>

        {/* Contact CTA */}
        <div className="px-4 pb-4">
          <Button className="w-full h-12 rounded-xl font-semibold" onClick={() => vendor.tel && window.open(`tel:${vendor.tel}`)}>
            <Phone className="w-4 h-4 mr-2" />
            전화 문의하기
          </Button>
        </div>
      </main>

      <BottomNav activeTab={location.pathname} onTabChange={(href) => navigate(href)} />
    </div>
  );
};

export default VendorDetailPage;
