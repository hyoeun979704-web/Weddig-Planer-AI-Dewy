import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Star, MapPin, Users, Phone, Heart, Share2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Venue } from "@/hooks/useVenues";

const formatKoreanWon = (price: number): string => {
  if (price >= 10000) {
    return `${(price / 10000).toFixed(0)}만원`;
  }
  return `${price.toLocaleString()}원`;
};

const VenueDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: venue, isLoading, error } = useQuery({
    queryKey: ["venue", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("venues")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data as Venue;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return <VenueDetailSkeleton />;
  }

  if (error || !venue) {
    return (
      <div className="min-h-screen bg-background max-w-[430px] mx-auto flex flex-col items-center justify-center p-4">
        <span className="text-4xl mb-4">😢</span>
        <p className="text-muted-foreground text-center mb-4">
          웨딩홀 정보를 찾을 수 없습니다.
        </p>
        <Button onClick={() => navigate("/")}>홈으로 돌아가기</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto animate-fade-in">
      {/* Header Image */}
      <div className="relative">
        <div className="aspect-[4/3] bg-muted">
          {venue.thumbnail_url ? (
            <img
              src={venue.thumbnail_url}
              alt={venue.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
              <span className="text-8xl">💒</span>
            </div>
          )}
        </div>

        {/* Fixed Header */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm transition-transform active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex gap-2">
            <button className="w-10 h-10 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm transition-transform active:scale-95">
              <Share2 className="w-5 h-5" />
            </button>
            <button className="w-10 h-10 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm transition-transform active:scale-95">
              <Heart className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Partner Badge */}
        {venue.is_partner && (
          <span className="absolute bottom-4 left-4 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-full shadow-lg">
            파트너 웨딩홀
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Title & Rating */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-foreground mb-2">{venue.name}</h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              <span className="font-bold text-lg">{venue.rating.toFixed(1)}</span>
            </div>
            <span className="text-muted-foreground text-sm">
              리뷰 {venue.review_count.toLocaleString()}개
            </span>
          </div>
        </div>

        {/* Location */}
        <div className="flex items-start gap-3 p-4 bg-secondary rounded-xl mb-4">
          <MapPin className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-foreground">{venue.address}</p>
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
              <span className="text-muted-foreground">식대 (1인)</span>
              <span className="text-xl font-bold text-primary">
                {formatKoreanWon(venue.price_per_person)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>최소 보증인원</span>
              </div>
              <span className="font-semibold">{venue.min_guarantee}명</span>
            </div>

            <div className="border-t border-border pt-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">예상 최소 비용</span>
                <div className="text-right">
                  <span className="text-2xl font-bold text-foreground">
                    {formatKoreanWon(venue.price_per_person * venue.min_guarantee)}
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">
                    ({venue.min_guarantee}명 기준)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Image Gallery Placeholder */}
        <div className="mb-4">
          <h2 className="font-bold text-lg mb-3">갤러리</h2>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="aspect-square bg-muted rounded-lg flex items-center justify-center"
              >
                <span className="text-2xl opacity-50">📷</span>
              </div>
            ))}
          </div>
          <button className="w-full mt-3 text-primary text-sm font-medium py-2">
            사진 더보기 ({venue.review_count}장)
          </button>
        </div>

        {/* Reviews Section */}
        <div className="mb-24">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-lg">리뷰</h2>
            <button className="text-primary text-sm flex items-center gap-1">
              전체보기
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          
          {/* Sample Reviews */}
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="bg-secondary rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-muted rounded-full" />
                  <div>
                    <p className="font-medium text-sm">익명{i}</p>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className="w-3 h-3 fill-yellow-400 text-yellow-400"
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  정말 아름다운 웨딩홀이었습니다. 직원분들도 친절하시고 음식도 맛있었어요. 강력 추천합니다!
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fixed Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 max-w-[430px] mx-auto">
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 h-12 gap-2">
            <Phone className="w-4 h-4" />
            전화 문의
          </Button>
          <Button className="flex-1 h-12">견적 요청</Button>
        </div>
      </div>
    </div>
  );
};

const VenueDetailSkeleton = () => (
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

export default VenueDetail;
