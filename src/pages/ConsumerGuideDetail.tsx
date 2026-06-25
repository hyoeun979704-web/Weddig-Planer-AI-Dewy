import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import GuideView from "@/components/guides/GuideView";
import { findConsumerGuide, adjacentConsumerGuides } from "@/data/consumerGuides";

// 소비자 앱 사용 가이드 — 주제별 상세. /help/:guideId.
// 정의는 src/data/consumerGuides.ts, 프레젠테이션은 기업과 공용인 GuideView(shared) 공유.
const ConsumerGuideDetail = () => {
  const { guideId } = useParams<{ guideId: string }>();
  const navigate = useNavigate();
  const guide = findConsumerGuide(guideId);

  if (!guide) {
    return (
      <div className="min-h-screen bg-background app-col mx-auto flex flex-col items-center justify-center text-center px-6 font-sans break-keep">
        <p className="text-lg font-bold text-foreground mb-2">가이드를 찾을 수 없어요</p>
        <p className="text-sm text-muted-foreground mb-6">주소가 바뀌었거나 준비 중인 가이드예요.</p>
        <button
          onClick={() => navigate("/help")}
          className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> 사용 가이드 목록
        </button>
      </div>
    );
  }

  return (
    <GuideView
      headerTitle={guide.headerTitle}
      eyebrow={guide.eyebrow}
      deskHeading={guide.deskHeading}
      deskSub={guide.deskSub}
      slides={guide.slides}
      cta={guide.cta}
      prevNext={adjacentConsumerGuides(guide.id)}
    />
  );
};

export default ConsumerGuideDetail;
