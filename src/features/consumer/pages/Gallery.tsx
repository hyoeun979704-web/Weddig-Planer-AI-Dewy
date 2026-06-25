import { useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Seo from "@/components/Seo";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchGalleryPlaces, galleryKeys } from "@/features/consumer/data/gallery";
import { PLACE_CATEGORY_LABEL } from "@/lib/categoryLabels";

// 웨딩 갤러리(AEO/SEO 랜딩) — 실제 활성 업체의 대표 이미지를 보여주고 탭하면 상세로 이동.
// (이전: 하드코딩 unsplash 더미 → 실데이터 연동)
const Gallery = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { data: items = [], isLoading } = useQuery({
    queryKey: galleryKeys.places(),
    staleTime: 5 * 60 * 1000,
    queryFn: fetchGalleryPlaces,
  });

  const handleTabChange = (href: string) => navigate(href);

  return (
    <div className="min-h-screen bg-background app-col mx-auto relative">
      <Seo title="웨딩 갤러리·시안 모음 | Dewy" description="실제 결혼식·웨딩 촬영 갤러리와 스타일별 시안. 본식·촬영·청첩장 영감을 한 곳에서." path="/gallery" />
      <PageHeader title="갤러리" />

      <main className="pb-20 px-4 py-4">
        <p className="text-sm text-muted-foreground mb-6">실제 예식장·스튜디오 등 업체 사진</p>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-muted-foreground">아직 등록된 업체 사진이 없어요.</p>
            <button onClick={() => navigate("/")} className="mt-4 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold">
              업체 둘러보기
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {items.map((item) => (
              <button
                key={item.place_id}
                type="button"
                onClick={() => navigate(`/vendor/${item.place_id}`)}
                className="relative aspect-[3/4] rounded-xl overflow-hidden group text-left"
              >
                <img
                  src={item.main_image_url as string}
                  alt={item.name}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => { e.currentTarget.src = "/placeholder.svg"; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-2 left-2 right-2">
                  <span className="text-xs font-medium text-white block truncate">{item.name}</span>
                  <span className="text-xs text-white/70">{PLACE_CATEGORY_LABEL[item.category] ?? item.category}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      <BottomNav activeTab={location.pathname} onTabChange={handleTabChange} />
    </div>
  );
};

export default Gallery;
