import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Star, MapPin, Phone, Share2, ChevronRight, Plane, Hotel, Calendar, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { FavoriteButton } from "@/components/FavoriteButton";

type Honeymoon = Tables<"honeymoon">;

const HoneymoonDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: honeymoon, isLoading, error } = useQuery({
    queryKey: ["honeymoon", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("honeymoon")
        .select("*")
        .eq("id", id!)
        .maybeSingle();

      if (error) throw error;
      return data as Honeymoon;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (error || !honeymoon) {
    return (
      <div className="min-h-screen bg-background max-w-[430px] mx-auto flex flex-col items-center justify-center p-4">
        <span className="text-4xl mb-4">😢</span>
        <p className="text-muted-foreground text-center mb-4">
          허니문 정보를 찾을 수 없습니다.
        </p>
        <Button onClick={() => navigate("/honeymoon")}>목록으로 돌아가기</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto animate-fade-in">
      {/* Header Image */}
      <div className="relative">
        <div className="aspect-[4/3] bg-muted">
          {honeymoon.thumbnail_url ? (
            <img
              src={honeymoon.thumbnail_url}
              alt={honeymoon.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-cyan-300 to-blue-400 flex items-center justify-center">
              <span className="text-8xl">🏝️</span>
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
              itemId={honeymoon.id}
              itemType="honeymoon"
              variant="overlay"
            />
          </div>
        </div>

        {honeymoon.is_partner && (
          <span className="absolute bottom-4 left-4 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-full shadow-lg">
            파트너 여행사
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Title & Rating */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-foreground mb-2">{honeymoon.name}</h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              <span className="font-bold text-lg">{honeymoon.rating.toFixed(1)}</span>
            </div>
            <span className="text-muted-foreground text-sm">
              리뷰 {honeymoon.review_count.toLocaleString()}개
            </span>
          </div>
        </div>

        {/* Destination & Duration */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1 flex items-start gap-3 p-4 bg-secondary rounded-xl">
            <MapPin className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-muted-foreground">목적지</p>
              <p className="font-medium text-foreground">{honeymoon.destination}</p>
            </div>
          </div>
          <div className="flex-1 flex items-start gap-3 p-4 bg-secondary rounded-xl">
            <Calendar className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-muted-foreground">일정</p>
              <p className="font-medium text-foreground">{honeymoon.duration}</p>
            </div>
          </div>
        </div>

        {/* Pricing Card */}
        <div className="bg-card border border-border rounded-xl p-5 mb-4 shadow-sm">
          <h2 className="font-bold text-lg mb-4">가격 정보</h2>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">패키지 가격</span>
            <span className="text-xl font-bold text-primary">{honeymoon.price_range}</span>
          </div>
        </div>

        {/* Trip Types */}
        {honeymoon.trip_types && honeymoon.trip_types.length > 0 && (
          <div className="mb-4">
            <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
              <Plane className="w-5 h-5 text-primary" />
              여행 유형
            </h2>
            <div className="flex flex-wrap gap-2">
              {honeymoon.trip_types.map((type, idx) => (
                <span key={idx} className="px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium">
                  {type}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Accommodation Types */}
        {honeymoon.accommodation_types && honeymoon.accommodation_types.length > 0 && (
          <div className="mb-4">
            <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
              <Hotel className="w-5 h-5 text-primary" />
              숙박 유형
            </h2>
            <div className="flex flex-wrap gap-2">
              {honeymoon.accommodation_types.map((type, idx) => (
                <span key={idx} className="px-3 py-1.5 bg-muted text-muted-foreground rounded-full text-sm">
                  {type}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Included Services */}
        {honeymoon.included_services && honeymoon.included_services.length > 0 && (
          <div className="mb-4">
            <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              포함 사항
            </h2>
            <div className="bg-muted/50 rounded-xl p-4">
              <ul className="space-y-2">
                {honeymoon.included_services.map((service, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    {service}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Gallery */}
        <div className="mb-4">
          <h2 className="font-bold text-lg mb-3">여행지 사진</h2>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                <span className="text-2xl opacity-50">🏝️</span>
              </div>
            ))}
          </div>
        </div>

        {/* Reviews */}
        <div className="mb-24">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-lg">후기</h2>
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
                    <p className="font-medium text-sm">신혼부부{i}</p>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  정말 환상적인 신혼여행이었어요! 숙소도 깨끗하고 일정도 알차게 구성되어 있었습니다.
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
          <Button className="flex-1 h-12" onClick={() => toast.success("예약 상담 신청이 완료되었습니다. 곧 연락드리겠습니다.")}>예약 상담</Button>
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

export default HoneymoonDetail;
