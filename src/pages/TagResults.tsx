import { useEffect, useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { Loader2, Tag } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import EmptyState from "@/components/ui/empty-state";
import VendorMediaCard, { type VendorMediaCardData } from "@/components/home/VendorMediaCard";
import { PLACE_CATEGORY_TO_ITEM_TYPE, joinRegion } from "@/lib/placeMappers";
import { supabase } from "@/integrations/supabase/client";

// 같은 태그가 달린 업체를 카테고리 구분 없이 모아 보여준다(상세 #태그 칩에서 진입).
// places.tags(text[]) 를 contains 로 필터. 파트너 우선 → 조회수 순.
const CATEGORY_LABEL: Record<string, string> = {
  wedding_hall: "웨딩홀",
  studio: "스튜디오",
  dress_shop: "드레스",
  makeup_shop: "메이크업",
  hanbok: "한복",
  tailor_shop: "예복",
  honeymoon: "허니문",
  appliance: "혼수가전",
  jewelry: "주얼리",
  invitation_venue: "청첩장",
};

interface PlaceRow {
  place_id: string;
  name: string;
  main_image_url: string | null;
  city: string | null;
  district: string | null;
  category: string;
  is_partner: boolean | null;
}

const toCard = (r: PlaceRow): VendorMediaCardData => ({
  id: r.place_id,
  thumbnail_url: r.main_image_url,
  region: joinRegion(r.city, r.district),
  name: r.name,
  category: CATEGORY_LABEL[r.category] ?? null,
  distanceLabel: null,
  is_partner: r.is_partner ?? false,
  info_lines: [],
  item_type: PLACE_CATEGORY_TO_ITEM_TYPE[r.category],
});

const TagResults = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { tag = "" } = useParams<{ tag: string }>();
  const decodedTag = decodeURIComponent(tag);
  const [items, setItems] = useState<PlaceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("places")
        .select("place_id, name, main_image_url, city, district, category, is_partner")
        .eq("is_active", true)
        .is("deleted_at", null)
        .contains("tags", [decodedTag])
        .order("partner_rank", { ascending: false, nullsFirst: false })
        .order("view_count", { ascending: false })
        .limit(60);
      if (!mounted) return;
      setItems(error || !data ? [] : (data as PlaceRow[]));
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [decodedTag]);

  return (
    <div className="min-h-screen bg-background app-col mx-auto pb-24">
      <PageHeader title={`#${decodedTag}`} />
      <main className="px-4 py-5">
        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Tag}
            title="이 태그의 업체가 아직 없어요"
            description={`'${decodedTag}' 태그가 달린 다른 업체를 찾지 못했어요.`}
          />
        ) : (
          <>
            <p className="text-[12px] text-muted-foreground mb-3">
              ‘{decodedTag}’ 태그 업체 {items.length}곳
            </p>
            <div className="grid grid-cols-2 gap-3">
              {items.map((r) => (
                <VendorMediaCard
                  key={r.place_id}
                  data={toCard(r)}
                  fluid
                  onClick={() => navigate(`/vendor/${r.place_id}`)}
                />
              ))}
            </div>
          </>
        )}
      </main>
      <BottomNav activeTab={location.pathname} onTabChange={(href) => navigate(href)} />
    </div>
  );
};

export default TagResults;
