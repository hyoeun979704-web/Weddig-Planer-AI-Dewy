// 비어있는 자리 카피. 짧고 직설적, 가능하면 한 줄로.

export interface EmptyCopy {
  emoji: string;
  title: string;
  description?: string;
}

export const emptyCopy = {
  vendors: {
    emoji: "",
    title: "추천할 업체가 곧 생길 거예요",
  },
  vendorsSelf: {
    emoji: "",
    title: "셀프웨딩 업체 추가 중",
  },
  vendorsSmall: {
    emoji: "",
    title: "스몰웨딩 공간 추가 중",
  },
  posts: {
    emoji: "",
    title: "아직 글이 없어요",
    description: "첫 글을 남겨보세요",
  },
  tipsVideos: {
    emoji: "",
    title: "영상이 곧 올라와요",
  },
  studio: {
    emoji: "",
    title: "스튜디오를 더 모으고 있어요",
  },
  reviews: {
    emoji: "",
    title: "아직 후기가 없어요",
    description: "다녀오면 한 줄 남겨주세요",
  },
  eventsTab: {
    emoji: "",
    title: "이벤트는 준비 중이에요",
    description: "이달의 혜택부터 보실래요?",
  },
  shoppingTab: {
    emoji: "",
    title: "쇼핑은 곧 열어요",
  },
  aiStudioTab: {
    emoji: "",
    title: "AI 스튜디오는 준비 중",
  },
  general: {
    emoji: "",
    title: "준비 중이에요",
  },
} satisfies Record<string, EmptyCopy>;

export type EmptyCopyKey = keyof typeof emptyCopy;
