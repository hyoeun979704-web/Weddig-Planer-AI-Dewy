import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import BusinessGuideView from "./BusinessGuideView";
import { findBusinessGuide, adjacentGuides } from "@/data/businessGuides";

// 기업회원 전용 주제별 상세 가이드. /business/guide/:guideId 로 진입.
// 정의는 src/data/businessGuides.ts, 프레젠테이션은 BusinessGuideView 공유.
const BusinessGuideDetail = () => {
  const { guideId } = useParams<{ guideId: string }>();
  const navigate = useNavigate();
  const guide = findBusinessGuide(guideId);

  if (!guide) {
    return (
      <div className="min-h-screen bg-background app-col mx-auto flex flex-col items-center justify-center text-center px-6 font-sans break-keep">
        <p className="text-lg font-bold text-foreground mb-2">가이드를 찾을 수 없어요</p>
        <p className="text-sm text-muted-foreground mb-6">주소가 바뀌었거나 준비 중인 가이드예요.</p>
        <button
          onClick={() => navigate("/business/guide")}
          className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> 전체 사용법 가이드
        </button>
      </div>
    );
  }

  return (
    <BusinessGuideView
      headerTitle={guide.headerTitle}
      eyebrow={guide.eyebrow}
      deskHeading={guide.deskHeading}
      deskSub={guide.deskSub}
      slides={guide.slides}
      cta={guide.cta}
      prevNext={adjacentGuides(guide.id)}
    />
  );
};

export default BusinessGuideDetail;
