// Brand-aligned empty / coming-soon copy. Dewy의 목소리는 "두 사람",
// 부드러운 자연 이미지(🌿🌷🌸), 약간 시적이지만 과하지 않은 톤이에요.
// 정적인 "데이터 없음" 대신 "Dewy가 무엇을 하고 있는지" 보여주려고 합니다.

export interface EmptyCopy {
  emoji: string;
  title: string;
  description?: string;
}

export const emptyCopy = {
  // 추천 업체 (general)
  vendors: {
    emoji: "🌷",
    title: "두 사람 결혼식에 어울리는 곳을\n신중하게 고르는 중이에요",
    description: "조용히, 그러나 부지런히 둘러보고 있어요",
  },
  // 셀프웨딩 페르소나
  vendorsSelf: {
    emoji: "🌿",
    title: "셀프웨딩에 어울리는 손길을\nDewy가 찾고 있어요",
    description: "두 사람의 결만 보여드릴게요",
  },
  // 스몰웨딩 페르소나
  vendorsSmall: {
    emoji: "🌸",
    title: "스몰웨딩에 어울리는 공간을\n곧 보여드릴게요",
    description: "작아도 따뜻한 곳만 추려두는 중",
  },
  // 인기 커뮤니티 글
  posts: {
    emoji: "✍️",
    title: "오늘의 이야기가 아직 비어있어요",
    description: "두 사람의 첫 글이 누군가의 길잡이가 될지도 몰라요",
  },
  // 매거진 / 영상
  magazine: {
    emoji: "🎬",
    title: "오늘의 꿀팁 영상을 정리하는 중이에요",
    description: "곧 신선한 이야기로 돌아올게요",
  },
  // 스튜디오 갤러리
  studio: {
    emoji: "📸",
    title: "오늘의 스튜디오를 고르는 중이에요",
    description: "두 사람의 시선에 맞는 곳만 골라 보여드려요",
  },
  // 리뷰 섹션
  reviews: {
    emoji: "💌",
    title: "먼저 다녀온 분들의 후기를 기다리고 있어요",
    description: "한 줄의 후기가 누군가에겐 큰 도움이 돼요",
  },
  // 이벤트 탭 (탭 자체 콘텐츠 미준비)
  eventsTab: {
    emoji: "🎁",
    title: "다음 이벤트, Dewy가 다듬는 중이에요",
    description: "지금은 [이달의 혜택]에서 먼저 만나볼 수 있어요",
  },
  // 쇼핑 탭
  shoppingTab: {
    emoji: "🛍️",
    title: "두 사람을 위한 셀렉션을\n천천히 모으는 중이에요",
    description: "꼭 필요한 것만, 결혼을 두 번 하지 않으니까요",
  },
  // AI 스튜디오 탭
  aiStudioTab: {
    emoji: "✨",
    title: "AI가 두 사람의 스타일을\n그리는 연습 중이에요",
    description: "곧 더 또렷한 모습으로 만나요",
  },
  // 꿀팁 탭
  tipsTab: {
    emoji: "🌱",
    title: "오늘의 꿀팁이 곧 올라와요",
    description: "Dewy가 가장 쓸모 있는 이야기만 추리고 있어요",
  },
  // 폴백 (일반)
  general: {
    emoji: "🌿",
    title: "Dewy가 조용히 준비하고 있어요",
    description: "두 사람을 위한 콘텐츠가 곧 도착해요",
  },
} satisfies Record<string, EmptyCopy>;

export type EmptyCopyKey = keyof typeof emptyCopy;
