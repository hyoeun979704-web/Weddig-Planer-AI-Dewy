import { useNavigate } from "react-router-dom";
import { CategoryTab } from "./CategoryTabBar";
import PostListCard, { PostListItem } from "./PostListCard";

interface ReviewData {
  title: string;
  reviews: PostListItem[];
}

const reviewDataMap: Record<CategoryTab, ReviewData> = {
  "ai-planner": {
    title: "리얼 후기",
    reviews: [
      {
        id: "rv-ai-1",
        title: "제목",
        content: "처음부터 끝까지 정말 만족스러웠어요. 담당 플래너분이 꼼꼼하게 챙겨주셔서 감사했습니다!",
        views: 1246,
        like_count: 165,
        category_tag: "스드메",
        keyword_tags: ["플래너", "만족"],
      },
      {
        id: "rv-ai-2",
        title: "제목",
        content: "촬영 컷이 정말 예뻐요. 자연스러운 분위기를 잘 잡아주셔서 대만족입니다.",
        views: 1246,
        like_count: 165,
        category_tag: "스튜디오",
        keyword_tags: ["촬영", "자연스러운"],
      },
    ],
  },
  "ai-studio": {
    title: "AI 스튜디오 후기",
    reviews: [
      {
        id: "rv-ais-1",
        title: "제목",
        content: "드레스 시뮬레이션이 너무 정확해요! 실제로 입어보니 AI 추천이 딱 맞았어요.",
        views: 982,
        like_count: 121,
        category_tag: "드레스",
        keyword_tags: ["AI", "시뮬레이션"],
      },
      {
        id: "rv-ais-2",
        title: "제목",
        content: "헤어 스타일 미리보기로 고민을 덜었어요. 진짜 편리합니다.",
        views: 731,
        like_count: 88,
        category_tag: "메이크업",
        keyword_tags: ["헤어", "AI"],
      },
    ],
  },
  events: {
    title: "이벤트 참여 후기",
    reviews: [
      {
        id: "rv-ev-1",
        title: "제목",
        content: "파트너 혜택으로 웨딩홀 할인 받았어요! 예상보다 많이 절약했습니다.",
        views: 1108,
        like_count: 154,
        category_tag: "이벤트",
        keyword_tags: ["할인", "파트너"],
      },
      {
        id: "rv-ev-2",
        title: "제목",
        content: "시즌 이벤트로 스드메 패키지 할인받았는데 정말 좋았어요.",
        views: 894,
        like_count: 102,
        category_tag: "이벤트",
        keyword_tags: ["시즌", "패키지"],
      },
    ],
  },
  shopping: {
    title: "쇼핑 리얼 후기",
    reviews: [
      {
        id: "rv-sh-1",
        title: "제목",
        content: "삼성 비스포크 세트로 구매했는데 인테리어와 너무 잘 어울려요!",
        views: 1320,
        like_count: 175,
        category_tag: "가전",
        keyword_tags: ["비스포크", "인테리어"],
      },
      {
        id: "rv-sh-2",
        title: "제목",
        content: "시몬스 침대 정말 편해요. 배송 설치까지 깔끔하게 해주셨습니다.",
        views: 884,
        like_count: 98,
        category_tag: "가구",
        keyword_tags: ["침대", "시몬스"],
      },
    ],
  },
  tips: {
    title: "웨딩 정보 후기",
    reviews: [
      {
        id: "rv-tp-1",
        title: "제목",
        content: "전문가 추천으로 스튜디오 선택했는데 대만족이에요!",
        views: 766,
        like_count: 90,
        category_tag: "꿀팁",
        keyword_tags: ["전문가", "추천"],
      },
      {
        id: "rv-tp-2",
        title: "제목",
        content: "정보 콘텐츠 보고 결정했는데 실제로도 너무 좋았어요.",
        views: 612,
        like_count: 73,
        category_tag: "꿀팁",
        keyword_tags: ["정보", "콘텐츠"],
      },
    ],
  },
};

interface ReviewSectionProps {
  activeTab?: CategoryTab;
}

const ReviewSection = ({ activeTab = "ai-planner" }: ReviewSectionProps) => {
  const navigate = useNavigate();
  const data = reviewDataMap[activeTab];

  return (
    <section className="pt-[10px] pb-[20px] px-[20px] bg-[hsl(var(--pink-50))]">
      <h2 className="text-[16px] font-bold text-black mb-[10px]">{data.title}</h2>
      <div className="flex gap-[8px]">
        {data.reviews.map((review) => (
          <PostListCard
            key={review.id}
            post={review}
            onClick={() => navigate("/community")}
          />
        ))}
      </div>
    </section>
  );
};

export default ReviewSection;
