import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Star, MapPin, Phone, Share2, ChevronRight, Camera, Palette, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { FavoriteButton } from "@/components/FavoriteButton";

type Studio = Tables<"studios">;

const StudioDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: studio, isLoading, error } = useQuery({
    queryKey: ["studio", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("studios")
        .select("*")
        .eq("id", id!)
        .maybeSingle();

      if (error) throw error;
      return data as Studio;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (error || !studio) {
    return (
      <div className="min-h-screen bg-background max-w-[430px] mx-auto flex flex-col items-center justify-center p-4">
        <span className="text-4xl mb-4">😢</span>
        <p className="text-muted-foreground text-center mb-4">
          스드메 정보를 찾을 수 없습니다.
        </p>
        <Button onClick={() => navigate("/studios")}>목록으로 돌아가기</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto animate-fade-in">
      {/* Header Image */}
      <div className="relative">
        <div className="aspect-[4/3] bg-muted">
          {studio.thumbnail_url ? (
            <img
              src={studio.thumbnail_url}
              alt={studio.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-pink-300 to-purple-300 flex items-center justify-center">
              <span className="text-8xl">📸</span>
            </div>
          )}
        </div>

        {/* Fixed Header */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex gap-2">
            <button className="w-10 h-10 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm" onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("링크가 복사되었습니다."); }}>
              <Share2 className="w-5 h-5" />
            </button>
            <FavoriteButton
              itemId={studio.id}
              itemType="studio"
              variant="overlay"
            />
          </div>
        </div>

        {studio.is_partner && (
          <span className="absolute bottom-4 left-4 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-full shadow-lg">
            파트너 스튜디오
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Title & Rating */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-foreground mb-2">{studio.name}</h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              <span className="font-bold text-lg">{studio.rating.toFixed(1)}</span>
            </div>
            <span className="text-muted-foreground text-sm">
              리뷰 {studio.review_count.toLocaleString()}개
            </span>
          </div>
        </div>

        {/* Location */}
        <div className="flex items-start gap-3 p-4 bg-secondary rounded-xl mb-4">
          <MapPin className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-foreground">{studio.address}</p>
            <button className="text-primary text-sm mt-1 flex items-center gap-1">
              지도에서 보기
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Pricing Card */}
        <div className="bg-card border border-border rounded-xl p-5 mb-4 shadow-sm">
          <h2 className="font-bold text-lg mb-4">가격 정보</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">패키지 가격</span>
              <span className="text-xl font-bold text-primary">
                {(studio.price_per_person / 10000).toFixed(0)}만원~
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">최소 보증 컷수</span>
              <span className="font-semibold">{studio.min_guarantee}컷</span>
            </div>
          </div>
        </div>

        {/* Package Types */}
        {studio.package_types && studio.package_types.length > 0 && (
          <div className="mb-4">
            <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" />
              패키지 종류
            </h2>
            <div className="flex flex-wrap gap-2">
              {studio.package_types.map((type, idx) => (
                <span key={idx} className="px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium">
                  {type}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Style Options */}
        {studio.style_options && studio.style_options.length > 0 && (
          <div className="mb-4">
            <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              촬영 스타일
            </h2>
            <div className="flex flex-wrap gap-2">
              {studio.style_options.map((style, idx) => (
                <span key={idx} className="px-3 py-1.5 bg-muted text-muted-foreground rounded-full text-sm">
                  {style}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Service Options */}
        {studio.service_options && studio.service_options.length > 0 && (
          <div className="mb-4">
            <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              포함 서비스
            </h2>
            <div className="flex flex-wrap gap-2">
              {studio.service_options.map((service, idx) => (
                <span key={idx} className="px-3 py-1.5 bg-muted text-muted-foreground rounded-full text-sm">
                  {service}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Gallery */}
        <div className="mb-4">
          <h2 className="font-bold text-lg mb-3">포트폴리오</h2>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                <span className="text-2xl opacity-50">📷</span>
              </div>
            ))}
          </div>
        </div>

        {/* Reviews */}
        <div className="mb-24">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-lg">리뷰</h2>
            <button className="text-primary text-sm flex items-center gap-1">
              전체보기
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="bg-secondary rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-muted rounded-full" />
                  <div>
                    <p className="font-medium text-sm">익명{i}</p>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  사진이 정말 예쁘게 나왔어요! 작가님이 친절하시고 분위기도 좋았습니다.
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fixed Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 max-w-[430px] mx-auto">
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 h-12 gap-2" onClick={() => { toast.info("전화 연결 준비 중입니다."); window.location.href = "tel:02-1234-5678"; }}>
            <Phone className="w-4 h-4" />
            전화 문의
          </Button>
          <Button className="flex-1 h-12" onClick={() => toast.success("상담 예약 신청이 완료되었습니다. 곧 연락드리겠습니다.")}>상담 예약</Button>
        </div>
      </div>
    </div>
  );
};

const DetailSkeleton = () => (
  <div className="min-h-screen bg-background max-w-[430px] mx-auto">
    <Skeleton className="aspect-[4/3] w-full" />
    <div className="p-5 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  </div>
);

export default StudioDetail;
