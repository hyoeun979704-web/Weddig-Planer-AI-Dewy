import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import HairPreviewGallery from "./HairPreviewGallery";
import DressFittingGallery from "./DressFittingGallery";
import MakeupFittingGallery from "./MakeupFittingGallery";
import PhotoFixGallery from "./PhotoFixGallery";
import ConsultingGallery from "./ConsultingGallery";

// AI 결과물(헤어·드레스·메이크업·사진보정·컨설팅)을 한 곳에서 탭으로 본다.
// 기존엔 카테고리마다 별도 갤러리라 다른 결과를 보려면 뒤로가기→메뉴 재진입이 필요했다.
// 각 갤러리는 embedded 모드로 콘텐츠만 렌더(자체 헤더/바텀네비 숨김).
const TABS = [
  { id: "hair", label: "헤어", Comp: HairPreviewGallery },
  { id: "dress", label: "드레스", Comp: DressFittingGallery },
  { id: "makeup", label: "메이크업", Comp: MakeupFittingGallery },
  { id: "photo", label: "사진보정", Comp: PhotoFixGallery },
  { id: "consulting", label: "컨설팅", Comp: ConsultingGallery },
] as const;

type TabId = (typeof TABS)[number]["id"];

const MyResults = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const raw = params.get("tab");
  const active: TabId = TABS.some((t) => t.id === raw) ? (raw as TabId) : "hair";
  const ActiveComp = TABS.find((t) => t.id === active)!.Comp;

  const selectTab = (id: TabId) => {
    setParams({ tab: id }, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background app-col mx-auto pb-24">
      <PageHeader title="내 결과물" />

      {/* 결과물 카테고리 탭 — 가로 스크롤 */}
      <div className="sticky top-0 z-20 bg-background border-b border-border">
        <div className="flex gap-1 px-3 overflow-x-auto no-scrollbar">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => selectTab(t.id)}
              className={`shrink-0 px-3.5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                active === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 활성 탭의 갤러리 콘텐츠 (embedded) — key 로 탭 전환 시 재마운트(데이터 재조회) */}
      <ActiveComp key={active} embedded />

      <BottomNav activeTab={location.pathname} onTabChange={(href) => navigate(href)} />
    </div>
  );
};

export default MyResults;
