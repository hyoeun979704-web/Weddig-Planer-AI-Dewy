import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Star, MapPin, Users, Phone, Share2, Clock, Utensils, Car } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Button } from "@/components/ui/button";

interface InvitationVenue {
  id: string;
  name: string;
  address: string;
  price_range: string;
  capacity_range: string;
  rating: number;
  review_count: number;
  is_partner: boolean;
  thumbnail_url: string | null;
  venue_types: string[] | null;
  amenity_options: string[] | null;
  cuisine_options: string[] | null;
}

const InvitationVenueDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const { data: venue, isLoading } = useQuery({
    queryKey: ['invitation-venue', id],
    queryFn: async () => {
      if (!id) throw new Error('No ID provided');
      const { data, error } = await (supabase as any)
        .from('invitation_venues')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as InvitationVenue;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background max-w-[430px] mx-auto flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="min-h-screen bg-background max-w-[430px] mx-auto flex flex-col items-center justify-center">
        <span className="text-4xl mb-4">😢</span>
        <p className="text-muted-foreground mb-4">장소를 찾을 수 없습니다</p>
        <Button onClick={() => navigate('/invitation-venues')}>목록으로</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between h-14 px-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-lg line-clamp-1 flex-1 text-center px-2">{venue.name}</h1>
          <div className="flex items-center gap-1">
            <FavoriteButton itemId={venue.id} itemType="invitation_venues" />
            <button className="w-10 h-10 flex items-center justify-center" onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("링크가 복사되었습니다."); }}>
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-24">
        {/* Image */}
        <div className="aspect-video bg-muted relative">
          {venue.thumbnail_url ? (
            <img src={venue.thumbnail_url} alt={venue.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl">🍽️</div>
          )}
          {venue.is_partner && (
            <span className="absolute top-4 left-4 px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full">
              파트너
            </span>
          )}
        </div>

        {/* Info Section */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-2">
            {venue.venue_types?.map((type) => (
              <span key={type} className="px-2 py-0.5 bg-pink-100 text-pink-600 text-xs rounded-full">
                {type}
              </span>
            ))}
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">{venue.name}</h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <MapPin className="w-4 h-4" />
            <span>{venue.address}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span className="font-medium">{venue.rating}</span>
              <span className="text-muted-foreground">({venue.review_count}개 리뷰)</span>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="p-4 space-y-4">
          {/* Capacity & Price */}
          <div className="bg-card rounded-2xl border border-border p-4">
            <h3 className="font-bold text-foreground mb-3">예약 정보</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">수용 인원</span>
                </div>
                <span className="font-medium text-foreground">{venue.capacity_range}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Utensils className="w-4 h-4" />
                  <span className="text-sm">1인당 가격</span>
                </div>
                <span className="font-bold text-primary">{venue.price_range}</span>
              </div>
            </div>
          </div>

          {/* Cuisine */}
          {venue.cuisine_options && venue.cuisine_options.length > 0 && (
            <div className="bg-card rounded-2xl border border-border p-4">
              <h3 className="font-bold text-foreground mb-3">음식 종류</h3>
              <div className="flex flex-wrap gap-2">
                {venue.cuisine_options.map((cuisine) => (
                  <span key={cuisine} className="px-3 py-1.5 bg-muted text-muted-foreground text-sm rounded-full">
                    {cuisine}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Amenities */}
          {venue.amenity_options && venue.amenity_options.length > 0 && (
            <div className="bg-card rounded-2xl border border-border p-4">
              <h3 className="font-bold text-foreground mb-3">편의시설</h3>
              <div className="flex flex-wrap gap-2">
                {venue.amenity_options.map((amenity) => (
                  <span key={amenity} className="px-3 py-1.5 bg-muted text-muted-foreground text-sm rounded-full flex items-center gap-1">
                    {amenity === '주차' && <Car className="w-3 h-3" />}
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Fixed Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-background border-t border-border p-4">
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 gap-2" onClick={() => { toast.info("전화 연결 준비 중입니다."); window.location.href = "tel:02-1234-5678"; }}>
            <Phone className="w-4 h-4" />
            전화 문의
          </Button>
          <Button className="flex-1" onClick={() => toast.success("예약 문의가 접수되었습니다. 곧 연락드리겠습니다.")}>예약 문의</Button>
        </div>
      </div>
    </div>
  );
};

export default InvitationVenueDetail;
