import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Share2, Star, MessageCircle, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Venue } from "@/hooks/useVenues";
import { FavoriteButton } from "@/components/FavoriteButton";
import VenueImageGallery from "@/components/venue/VenueImageGallery";
import VenueInfoTab from "@/components/venue/VenueInfoTab";
import VenueHallTab from "@/components/venue/VenueHallTab";
import VenueReviewTab from "@/components/venue/VenueReviewTab";

type TabType = "info" | "hall" | "review";

const VenueDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("info");

  const { data: venue, isLoading, error } = useQuery({
    queryKey: ["venue", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("venues")
        .select("*")
        .eq("number", parseInt(id!))
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

  const tabs: { key: TabType; label: string }[] = [
    { key: "info", label: "정보" },
    { key: "hall", label: "홀/가격" },
    { key: "review", label: "후기" },
  ];

  // Mock images for gallery
  const galleryImages = venue.thumbnail_url 
    ? [venue.thumbnail_url, "/placeholder.svg", "/placeholder.svg", "/placeholder.svg"]
    : [];

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto animate-fade-in">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border max-w-[430px] mx-auto">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center -ml-2"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-1">
            <button className="w-10 h-10 flex items-center justify-center">
              <Share2 className="w-5 h-5" />
            </button>
            <FavoriteButton
              itemId={String(venue.number)}
              itemType="venue"
              variant="default"
            />
          </div>
        </div>
      </div>

      {/* Content with top padding for fixed header */}
      <div className="pt-14">
        {/* Image Gallery */}
        <VenueImageGallery 
          images={galleryImages}
          venueName={venue.name}
        />

        {/* Venue Title Section */}
        <div className="p-4 border-b border-border">
          <h1 className="text-xl font-bold text-foreground mb-2">
            {venue.name}
          </h1>
          
          {/* Rating */}
          <div className="flex items-center gap-2">
            {venue.rating && (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="font-bold">{venue.rating}</span>
              </div>
            )}
            {venue.region && (
              <span className="text-muted-foreground text-sm">
                {venue.region}
              </span>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border sticky top-14 bg-background z-40">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-3.5 text-sm font-medium transition-colors relative ${
                activeTab === tab.key
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="pb-24">
          {activeTab === "info" && (
            <VenueInfoTab
              venueId={venue.venue_id ?? venue.number}
              address={venue.address}
              phone={venue.phone ?? undefined}
              operatingHours={venue.opening_hour ?? undefined}
              parking={venue.parking_info ?? undefined}
              publicTransit={venue.public_transit ?? undefined}
            />
          )}
          {activeTab === "hall" && (
            <VenueHallTab
              venueId={venue.venue_id ?? venue.number}
              priceMin={venue.price_min ?? 0}
              priceMax={venue.price_max ?? 0}
            />
          )}
          {activeTab === "review" && (
            <VenueReviewTab
              rating={venue.rating ? parseFloat(venue.rating) : 0}
              reviewCount={0}
            />
          )}
        </div>
      </div>

      {/* Fixed Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 max-w-[430px] mx-auto">
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 h-12 gap-2">
            <MessageCircle className="w-4 h-4" />
            채팅 상담
          </Button>
          <Button className="flex-1 h-12 gap-2">
            <Calendar className="w-4 h-4" />
            방문 예약
          </Button>
        </div>
      </div>
    </div>
  );
};

const VenueDetailSkeleton = () => (
  <div className="min-h-screen bg-background max-w-[430px] mx-auto">
    {/* Header */}
    <div className="h-14 border-b border-border flex items-center px-4">
      <Skeleton className="w-6 h-6 rounded" />
    </div>
    
    {/* Image */}
    <Skeleton className="aspect-[4/3] w-full" />
    
    {/* Title */}
    <div className="p-4 space-y-3 border-b border-border">
      <Skeleton className="h-5 w-16 rounded-full" />
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-32" />
    </div>
    
    {/* Tabs */}
    <div className="flex border-b border-border">
      <Skeleton className="flex-1 h-12 rounded-none" />
      <Skeleton className="flex-1 h-12 rounded-none" />
      <Skeleton className="flex-1 h-12 rounded-none" />
    </div>
    
    {/* Content */}
    <div className="p-4 space-y-4">
      <Skeleton className="h-16 w-full rounded-xl" />
      <Skeleton className="h-16 w-full rounded-xl" />
      <Skeleton className="h-16 w-full rounded-xl" />
    </div>
  </div>
);

export default VenueDetail;
