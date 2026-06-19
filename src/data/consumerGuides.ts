// 소비자(예비부부) 인앱 사용 가이드 레지스트리(단일 소스).
// 기업 가이드(businessGuides.ts)와 **동일 구조**: BusinessGuideView 슬라이드로 렌더.
// 슬라이드 이미지는 scripts/capture-consumer-shots.cjs 로 3:4 라이브 캡처(SUITE 폰트 +
// 타깃 하이라이트). 운영/CS용 산문 문서는 docs/consumer-onboarding-guide.md.

import type { GuideSlide } from "@/pages/business/BusinessGuideView";

import cAuth from "@/assets/consumer/guide/c-auth.png";
import cHomeTabs from "@/assets/consumer/guide/c-home-tabs.png";
import cHomeTools from "@/assets/consumer/guide/c-home-tools.png";
import cHomeNav from "@/assets/consumer/guide/c-home-nav.png";
import cCategory from "@/assets/consumer/guide/c-category.png";
import cVendor from "@/assets/consumer/guide/c-vendor.png";
import cBoard from "@/assets/consumer/guide/c-board.png";
import cCompare from "@/assets/consumer/guide/c-compare.png";
import cQuote from "@/assets/consumer/guide/c-quote.png";
import cInquiry from "@/assets/consumer/guide/c-inquiry.png";
import cContact from "@/assets/consumer/guide/c-contact.png";
import cSchedule from "@/assets/consumer/guide/c-schedule.png";
import cBudget from "@/assets/consumer/guide/c-budget.png";
import cAiPlanner from "@/assets/consumer/guide/c-ai-planner.png";
import cAiStudio from "@/assets/consumer/guide/c-ai-studio.png";
import cDeals from "@/assets/consumer/guide/c-deals.png";
import cStore from "@/assets/consumer/guide/c-store.png";
import cTips from "@/assets/consumer/guide/c-tips.png";
import cCommunity from "@/assets/consumer/guide/c-community.png";
import cMypage from "@/assets/consumer/guide/c-mypage.png";

export interface ConsumerGuideDef {
  id: string;
  headerTitle: string;
  eyebrow: string;
  deskHeading: string;
  deskSub: string;
  slides: GuideSlide[];
  cta: { label: string; target: string };
}

export const CONSUMER_GUIDES: ConsumerGuideDef[] = [
  {
    id: "start",
    headerTitle: "시작하기 가이드",
    eyebrow: "START",
    deskHeading: "듀이 시작하기",
    deskSub: "가입하고 홈에서 무엇을 할 수 있는지 둘러봐요.",
    cta: { label: "홈으로 가기", target: "/" },
    slides: [
      { phase: "STEP 1 · 가입", img: cAuth, alt: "로그인·회원가입", tags: ["카카오", "구글", "애플"],
        title: "1초 만에 시작", subtitle: "카카오·구글·애플 계정으로\n바로 시작할 수 있어요.",
        tip: "찜·문의·견적·예산처럼 내 기록이 남는 기능은\n로그인이 필요해요." },
      { phase: "STEP 2 · 홈", img: cHomeTabs, alt: "홈 상단 탭", tags: ["홈", "탭", "AI"],
        title: "분야별 상단 탭", subtitle: "AI 플래너·AI 스튜디오·꿀팁·이벤트·쇼핑을\n상단 탭으로 오가요.",
        tip: "맨 위 ‘AI 플래너에게 물어보기’로 궁금한 걸 바로 물어봐요." },
      { phase: "STEP 3 · 빠른 도구", img: cHomeTools, alt: "홈 빠른 도구", tags: ["업체보드", "견적", "비교"],
        title: "자주 쓰는 도구", subtitle: "업체보드·내 견적·업체비교에\n홈에서 바로 들어가요.",
        tip: "‘이달의 혜택’ 배너로 쿠폰·이벤트도 바로 확인해요." },
      { phase: "STEP 4 · 메뉴", img: cHomeNav, alt: "하단 메뉴", tags: ["스케줄", "예산", "커뮤니티"],
        title: "하단 메뉴로 이동", subtitle: "스케줄·예산·홈·커뮤니티·마이페이지를\n하단 메뉴로 오가요.",
        tip: "준비에 자주 쓰는 5개를 아래에 모아뒀어요." },
    ],
  },
  {
    id: "find",
    headerTitle: "업체 찾기·비교 가이드",
    eyebrow: "FIND",
    deskHeading: "마음에 드는 업체 찾기",
    deskSub: "카테고리로 찾고, 상세에서 비교하고, 보드로 정리해요.",
    cta: { label: "웨딩홀 둘러보기", target: "/venues" },
    slides: [
      { phase: "STEP 1 · 탐색", img: cCategory, alt: "카테고리·필터", tags: ["카테고리", "지역", "가격"],
        title: "카테고리·필터로 좁히기", subtitle: "웨딩홀·스드메·예물·신혼여행 등에서\n지역·가격대·평점으로 좁혀요.",
        tip: "필터를 쓰면 우리 조건에 맞는 곳만 모여요." },
      { phase: "STEP 2 · 상세", img: cVendor, alt: "업체 상세페이지", tags: ["가격", "핵심스펙", "후기"],
        title: "상세에서 핵심 한눈에", subtitle: "기본정보에서 가격·핵심 스펙·혜택·후기를\n첫 화면에서 바로 확인해요.",
        tip: "‘상세정보’ 탭엔 카테고리별 자세한 정보가 더 있어요." },
      { phase: "STEP 3 · 보드", img: cBoard, alt: "내 업체 보드", tags: ["보드", "진행현황"],
        title: "보드로 진행 현황 정리", subtitle: "카테고리별 미정·견적중·예약완료 상태와\n고른 업체를 한 보드에 모아요.",
        tip: "받은 견적은 보드에 자동으로 반영돼요." },
      { phase: "STEP 4 · 비교", img: cCompare, alt: "업체 비교", tags: ["찜", "비교"],
        title: "찜한 업체 비교", subtitle: "하트로 찜한 업체를\n한 화면에서 나란히 비교해요.",
        tip: "후보를 3~5곳으로 좁히면 결정이 훨씬 쉬워요." },
    ],
  },
  {
    id: "inquiry",
    headerTitle: "상담·견적·문의 가이드",
    eyebrow: "INQUIRY",
    deskHeading: "묻고, 견적받고, 결정하기",
    deskSub: "업체에 직접 문의하거나 여러 곳에 견적을 받아 비교해요.",
    cta: { label: "견적 요청하기", target: "/quote/new" },
    slides: [
      { phase: "STEP 1 · 견적", img: cQuote, alt: "견적 요청", tags: ["견적", "비교"],
        title: "한 번에 견적 요청", subtitle: "원하는 업체 종류·조건을 남기면\n맞는 업체들에 한 번에 요청해요.",
        tip: "업체가 답하면 알림으로 알려드려요." },
      { phase: "STEP 2 · 문의", img: cInquiry, alt: "업체 문의", tags: ["문의", "전화", "채팅"],
        title: "전화·앱 채팅 문의", subtitle: "업체 상세의 「예약 문의」로\n전화 또는 앱 채팅으로 물어봐요.",
        tip: "앱 채팅으로 하면 대화·약속이 한곳에 남아요." },
      { phase: "STEP 3 · 고객센터", img: cContact, alt: "고객센터 문의", tags: ["고객센터", "1:1문의"],
        title: "고객센터에 문의", subtitle: "앱 사용 중 불편은 챗봇으로 바로 해결하고\n안 풀리면 1:1 문의로 접수해요.",
        tip: "마이페이지 → 고객 지원에서 들어가요." },
    ],
  },
  {
    id: "manage",
    headerTitle: "준비 관리 가이드",
    eyebrow: "MANAGE",
    deskHeading: "일정과 예산 관리",
    deskSub: "D-Day 일정과 항목별 예산을 한곳에서 챙겨요.",
    cta: { label: "일정 관리 열기", target: "/schedule" },
    slides: [
      { phase: "STEP 1 · 일정", img: cSchedule, alt: "일정 관리", tags: ["일정", "D-Day"],
        title: "일정·D-Day 관리", subtitle: "달력에서 준비 일정을 등록하고\nD-Day까지 할 일을 챙겨요.",
        tip: "일정을 내보내 다른 캘린더와도 맞출 수 있어요." },
      { phase: "STEP 2 · 예산", img: cBudget, alt: "예산 관리", tags: ["예산", "양가분담"],
        title: "항목별 예산·지출", subtitle: "예산을 설정하고 지출을 기록해\n지역 평균과 비교하며 관리해요.",
        tip: "초대 코드로 양가·파트너와 함께 관리할 수 있어요." },
    ],
  },
  {
    id: "ai",
    headerTitle: "AI 웨딩 도구 가이드",
    eyebrow: "AI",
    deskHeading: "AI로 준비·체험",
    deskSub: "AI 플래너로 계획하고, AI 스튜디오로 미리 체험해요.",
    cta: { label: "AI 스튜디오 열기", target: "/ai-studio" },
    slides: [
      { phase: "STEP 1 · 플래너", img: cAiPlanner, alt: "AI 플래너", tags: ["AI플래너", "맞춤추천"],
        title: "맞춤 준비 추천", subtitle: "날짜·지역만 알려주면\n우리에게 맞는 준비 흐름을 추천해요.",
        tip: "재혼·자녀 동반 등 상황에 맞춰 안내해요." },
      { phase: "STEP 2 · 스튜디오", img: cAiStudio, alt: "AI 스튜디오", tags: ["드레스", "메이크업", "컨설팅"],
        title: "드레스·메이크업·헤어 체험", subtitle: "내 사진으로 드레스·메이크업·헤어·\n퍼스널컬러 컨설팅을 미리 체험해요.",
        tip: "결과물은 마이페이지 ‘내가 만든 것’에 모여요." },
    ],
  },
  {
    id: "benefits",
    headerTitle: "혜택·쇼핑·꿀팁 가이드",
    eyebrow: "BENEFITS",
    deskHeading: "혜택과 쇼핑, 준비 꿀팁",
    deskSub: "쿠폰·이벤트로 알뜰하게, 소품 쇼핑과 준비 팁까지.",
    cta: { label: "이벤트·혜택 보기", target: "/deals" },
    slides: [
      { phase: "STEP 1 · 혜택", img: cDeals, alt: "이벤트·혜택", tags: ["쿠폰", "이벤트", "포인트"],
        title: "쿠폰·이벤트·포인트", subtitle: "진행 중인 쿠폰·이벤트를 모아보고\n출석·미션으로 포인트·하트도 받아요.",
        tip: "이벤트 카드를 눌러 자세히 보고 신청까지 이어가요." },
      { phase: "STEP 2 · 쇼핑", img: cStore, alt: "쇼핑", tags: ["쇼핑", "소품"],
        title: "웨딩 소품·셀프웨딩", subtitle: "촬영소품·부케·셀프웨딩 드레스 등\n웨딩 준비물을 둘러봐요.",
        tip: "필요한 카테고리로 바로 찾아봐요." },
      { phase: "STEP 3 · 꿀팁", img: cTips, alt: "꿀팁", tags: ["꿀팁", "준비"],
        title: "카테고리별 준비 꿀팁", subtitle: "상견례·웨딩홀·스드메 등\n단계별 준비 꿀팁을 읽어요.",
        tip: "처음이라면 ‘일반’부터 가볍게 시작해요." },
    ],
  },
  {
    id: "more",
    headerTitle: "커뮤니티·마이페이지 가이드",
    eyebrow: "MORE",
    deskHeading: "후기 보고, 내 활동 관리",
    deskSub: "다른 부부의 후기를 보고, 내 찜·포인트·내역을 관리해요.",
    cta: { label: "커뮤니티 가기", target: "/community" },
    slides: [
      { phase: "STEP 1 · 커뮤니티", img: cCommunity, alt: "커뮤니티", tags: ["후기", "Q&A"],
        title: "후기·꿀팁·업체추천", subtitle: "다른 예비·신혼부부의 실시간 후기와\n꿀팁·업체 추천을 봐요.",
        tip: "궁금한 점을 올리고 우리 경험도 나눠요." },
      { phase: "STEP 2 · 마이페이지", img: cMypage, alt: "마이페이지", tags: ["찜", "포인트", "주문"],
        title: "내 활동 한곳에", subtitle: "찜·하트·포인트·쿠폰·주문내역·내 견적·\n업체보드·받은 결과물을 모아봐요.",
        tip: "이 ‘앱 사용 가이드’도 마이페이지 → 고객 지원에서 다시 볼 수 있어요." },
    ],
  },
];

export const findConsumerGuide = (id?: string): ConsumerGuideDef | undefined =>
  CONSUMER_GUIDES.find((g) => g.id === id);

export interface ConsumerNavItem { id: string; title: string; summary: string; route: string; cover: string }

export const CONSUMER_NAV: ConsumerNavItem[] = CONSUMER_GUIDES.map((g) => ({
  id: g.id,
  title: g.headerTitle,
  summary: g.deskSub,
  route: `/help/${g.id}`,
  cover: g.slides[0].img,
}));

export interface ConsumerGuideAdjacent {
  prev: { title: string; route: string } | null;
  next: { title: string; route: string } | null;
}

export const adjacentConsumerGuides = (id?: string): ConsumerGuideAdjacent => {
  const i = CONSUMER_NAV.findIndex((g) => g.id === id);
  if (i === -1) return { prev: null, next: null };
  return {
    prev: i > 0 ? { title: CONSUMER_NAV[i - 1].title, route: CONSUMER_NAV[i - 1].route } : null,
    next: i < CONSUMER_NAV.length - 1 ? { title: CONSUMER_NAV[i + 1].title, route: CONSUMER_NAV[i + 1].route } : null,
  };
};
