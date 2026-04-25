import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Share2, Star, Phone, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FavoriteButton } from "@/components/FavoriteButton";
import VenueImageGallery from "@/components/venue/VenueImageGallery";
import HanbokInfoTab from "@/components/hanbok/HanbokInfoTab";
import HanbokPhotoTab from "@/components/hanbok/HanbokPhotoTab";
import HanbokReviewTab from "@/components/hanbok/HanbokReviewTab";
import { usePlaceDetail, LegacyDetail } from "@/hooks/usePlaceDetail";

type Hanbok = LegacyDetail;
type TabType = "info" | "photo" | "review";

const HanbokDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("info");

  const { data: hanbok, isLoading, error } = usePlaceDetail(id);

  if (isLoading) return <DetailSkeleton />;

  if (error || !hanbok) {
    return (
      <div className="min-h-screen bg-background max-w-[430px] mx-auto flex flex-col items-center justify-center p-4">
        <span className="text-4xl mb-4">😢</span>
        <p className="text-muted-foreground text-center mb-4">한복 정보를 찾을 수 없습니다.</p>
        <Button onClick={() => navigate("/hanbok")}>목록으로 돌아가기</Button>
      </div>
    );
  }

  const tabs: { key: TabType; label: string }[] = [
    { key: "info", label: "상세정보" },
    { key: "photo", label: "사진" },
    { key: "review", label: "리뷰" },
  ];

  const detailImages = [
    hanbok.details?.image_url_1,
    hanbok.details?.image_url_2,
    hanbok.details?.image_url_3,
  ].filter((u): u is string => typeof u === "string" && u.length > 0);
  const galleryImages = detailImages.length > 0
    ? detailImages
    : hanbok.thumbnail_url
    ? [hanbok.thumbnail_url]
    : [];

  const tel = hanbok.details?.tel ?? null;

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto animate-fade-in">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border max-w-[430px] mx-auto">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center -ml-2">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-1">
            <button className="w-10 h-10 flex items-center justify-center" onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("링크가 복사되었습니다."); }}>
              <Share2 className="w-5 h-5" />
            </button>
            <FavoriteButton itemId={hanbok.id} itemType="hanbok" variant="default" />
          </div>
        </div>
      </div>

      <div className="pt-14">
        <VenueImageGallery images={galleryImages} venueName={hanbok.name} />

        {/* Name & Rating */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-bold text-foreground">{hanbok.name}</h1>
            {hanbok.is_partner && (
              <span className="px-2.5 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full">파트너</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="font-bold">{hanbok.rating.toFixed(1)}</span>
            </div>
            <span className="text-muted-foreground text-sm">리뷰 {hanbok.review_count.toLocaleString()}개</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border sticky top-14 bg-background z-40">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-3.5 text-sm font-medium transition-colors relative ${activeTab === tab.key ? "text-primary" : "text-muted-foreground"}`}
            >
              {tab.label}
              {activeTab === tab.key && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="pb-24">
          {activeTab === "info" && <HanbokInfoTab hanbok={hanbok} />}
          {activeTab === "photo" && <HanbokPhotoTab images={detailImages} />}
          {activeTab === "review" && <HanbokReviewTab rating={hanbok.rating} reviewCount={hanbok.review_count} />}
        </div>
      </div>

      {/* Fixed Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 max-w-[430px] mx-auto">
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 h-12 gap-2"
            disabled={!tel}
            onClick={() => { if (tel) window.location.href = `tel:${tel}`; }}
          >
            <Phone className="w-4 h-4" />
            {tel ? "전화 문의" : "번호 미등록"}
          </Button>
          <Button className="flex-1 h-12 gap-2" onClick={() => toast.success("예약 상담 신청이 완료되었습니다. 곧 연락드리겠습니다.")}>
            <Calendar className="w-4 h-4" />
            예약하기
          </Button>
        </div>
      </div>
    </div>
  );
};

const DetailSkeleton = () => (
  <div className="min-h-screen bg-background max-w-[430px] mx-auto">
    <div className="h-14 border-b border-border flex items-center px-4"><Skeleton className="w-6 h-6 rounded" /></div>
    <Skeleton className="aspect-[4/3] w-full" />
    <div className="p-4 space-y-3 border-b border-border">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-32" />
    </div>
    <div className="flex border-b border-border">
      <Skeleton className="flex-1 h-12 rounded-none" />
      <Skeleton className="flex-1 h-12 rounded-none" />
      <Skeleton className="flex-1 h-12 rounded-none" />
    </div>
    <div className="p-4 space-y-4">
      <Skeleton className="h-16 w-full rounded-xl" />
      <Skeleton className="h-16 w-full rounded-xl" />
    </div>
  </div>
);

export default HanbokDetail;
