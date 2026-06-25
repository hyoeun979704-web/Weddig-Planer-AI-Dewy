// 소비자(예비부부) 인앱 사용 가이드 레지스트리(단일 소스).
// 기업 가이드(businessGuides.ts)와 동일 구조: 공용 GuideView(shared) 슬라이드로 렌더.
// 슬라이드 이미지는 scripts/capture-consumer-shots.cjs 로 3:4 라이브 캡처(SUITE 폰트 +
// 타깃 하이라이트, 목 데이터로 채운 화면). 산문 문서는 docs/consumer-onboarding-guide.md.
//
// 주제는 사용자가 요청한 16개를 **축약 없이** 각각의 가이드로 구성한다(회원가입은 비회원
// 기준, 나머지는 로그인 회원 기준).

import type { GuideSlide } from "@/types/guides";

import cAuth from "@/assets/consumer/guide/c-auth.png";
import cHomeTabs from "@/assets/consumer/guide/c-home-tabs.png";
import cHomeTools from "@/assets/consumer/guide/c-home-tools.png";
import cHomeNav from "@/assets/consumer/guide/c-home-nav.png";
import cCategory from "@/assets/consumer/guide/c-category.png";
import cVendor from "@/assets/consumer/guide/c-vendor.png";
import cInquiry from "@/assets/consumer/guide/c-inquiry.png";
import cBoard from "@/assets/consumer/guide/c-board.png";
import cCompare from "@/assets/consumer/guide/c-compare.png";
import cQuote from "@/assets/consumer/guide/c-quote.png";
import cQuoteList from "@/assets/consumer/guide/c-quote-list.png";
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
  // 1) 회원가입 (비회원 기준)
  {
    id: "signup", headerTitle: "회원가입 가이드", eyebrow: "SIGN UP",
    deskHeading: "1초 만에 가입하기", deskSub: "카카오·구글·애플로 바로 시작해요. (이 가이드만 비회원 기준이에요.)",
    cta: { label: "가입하러 가기", target: "/auth" },
    slides: [
      { phase: "회원가입", img: cAuth, alt: "로그인·회원가입 화면", tags: ["카카오", "구글", "애플"],
        title: "간편 가입으로 시작", subtitle: "카카오·구글·애플 계정으로 1초 만에 시작하거나\n‘회원가입’으로 이메일 가입할 수 있어요.",
        tip: "찜·문의·견적·예산처럼 내 기록이 남는 기능은 로그인이 필요해요." },
    ],
  },
  // 2) 홈피드 표시 내용 / 메뉴
  {
    id: "home", headerTitle: "홈 화면·메뉴 가이드", eyebrow: "HOME",
    deskHeading: "홈에서 무엇을 볼까요", deskSub: "상단 탭·빠른 도구·하단 메뉴로 필요한 곳에 바로 가요.",
    cta: { label: "홈으로 가기", target: "/" },
    slides: [
      { phase: "상단", img: cHomeTabs, alt: "홈 상단 탭·검색", tags: ["AI", "꿀팁", "이벤트", "쇼핑"],
        title: "분야별 상단 탭", subtitle: "AI 플래너·AI 스튜디오·꿀팁·이벤트·쇼핑을 상단 탭으로 오가고,\n맨 위 검색창으로 AI 플래너에게 바로 물어봐요.",
        tip: "‘이번 주 할 일·예산 점검·업체 추천’ 추천 칩으로 빠르게 시작해요." },
      { phase: "빠른 도구", img: cHomeTools, alt: "홈 빠른 도구·이달의 혜택", tags: ["업체보드", "내 견적", "업체비교"],
        title: "자주 쓰는 도구", subtitle: "업체보드·내 견적·업체비교에 홈에서 바로 들어가고,\n‘이달의 혜택’ 배너로 쿠폰·이벤트를 확인해요.",
        tip: "아래로 내리면 카테고리(웨딩홀·스드메·예물·허니문 등)가 한눈에 보여요." },
      { phase: "하단 메뉴", img: cHomeNav, alt: "하단 메뉴·카테고리", tags: ["스케줄", "예산", "커뮤니티"],
        title: "하단 메뉴로 이동", subtitle: "스케줄·예산·홈·커뮤니티·마이페이지를\n화면 맨 아래 메뉴로 오가요.",
        tip: "카테고리 그리드에서 분야별 업체를 바로 둘러볼 수 있어요." },
    ],
  },
  // 3) 카테고리 / 업체 상세페이지
  {
    id: "vendor", headerTitle: "업체 찾기·상세 가이드", eyebrow: "VENDOR",
    deskHeading: "카테고리로 찾고 상세에서 확인", deskSub: "필터로 좁히고, 상세에서 가격·스펙·혜택·후기를 확인해요.",
    cta: { label: "웨딩홀 둘러보기", target: "/venues" },
    slides: [
      { phase: "카테고리", img: cCategory, alt: "카테고리·필터", tags: ["지역", "가격대", "평점"],
        title: "카테고리·필터로 좁히기", subtitle: "웨딩홀·스드메·예물·신혼여행 등 카테고리에서\n지역·가격대·평점으로 우리 조건에 맞게 좁혀요.",
        tip: "필터를 쓰면 비교가 훨씬 쉬워져요." },
      { phase: "상세", img: cVendor, alt: "업체 상세페이지", tags: ["가격", "핵심스펙", "후기"],
        title: "상세에서 핵심 한눈에", subtitle: "기본정보에서 가격·핵심 스펙·혜택·후기를 바로 보고\n‘상세정보’ 탭에서 카테고리별 정보를 더 확인해요.",
        tip: "마음에 들면 하트로 찜하거나 ‘내 보드에 추가’로 정리해요." },
      { phase: "문의", img: cInquiry, alt: "업체 문의 CTA", tags: ["전화", "앱 채팅"],
        title: "바로 문의하기", subtitle: "상세 아래 ‘예약 문의’로 전화 또는 앱 채팅으로 물어봐요.",
        tip: "앱 채팅으로 하면 대화·약속이 한곳에 남아 편해요." },
    ],
  },
  // 4) 업체 보드
  {
    id: "board", headerTitle: "업체 보드 가이드", eyebrow: "BOARD",
    deskHeading: "준비 업체를 한 보드에", deskSub: "카테고리별 진행 상태와 고른 업체를 한눈에 관리해요.",
    cta: { label: "내 보드 열기", target: "/board" },
    slides: [
      { phase: "보드", img: cBoard, alt: "내 업체 보드", tags: ["미정", "견적중", "예약완료"],
        title: "진행 현황 한눈에", subtitle: "베뉴·스튜디오·드레스 등 슬롯마다\n미정·견적중·예약완료 상태와 고른 업체를 정리해요.",
        tip: "받은 견적·예약은 보드에 자동으로 반영돼 진행률로 보여요." },
    ],
  },
  // 5) 견적 기능
  {
    id: "quote", headerTitle: "견적 요청 가이드", eyebrow: "QUOTE",
    deskHeading: "한 번에 견적받기", deskSub: "조건을 남기면 여러 업체에서 견적을 받아 비교해요.",
    cta: { label: "견적 요청하기", target: "/quote/new" },
    slides: [
      { phase: "요청", img: cQuote, alt: "견적 요청 폼", tags: ["조건", "한 번에"],
        title: "조건 넣고 한 번에 요청", subtitle: "업체 종류·지역·예산·날짜 등 조건을 남기면\n맞는 업체들에게 한 번에 견적을 요청해요.",
        tip: "업체가 답하면 알림으로 알려드려요." },
      { phase: "받은 견적", img: cQuoteList, alt: "내 견적 요청 목록", tags: ["비교", "응답"],
        title: "받은 견적 모아보기", subtitle: "내가 보낸 요청과 받은 견적 수를\n‘내 견적 요청’에서 모아보고 비교해요.",
        tip: "수락하면 업체와 인앱 채팅으로 이어져요." },
    ],
  },
  // 6) 업체 비교
  {
    id: "compare", headerTitle: "업체 비교 가이드", eyebrow: "COMPARE",
    deskHeading: "찜한 업체 비교", deskSub: "같은 분야 업체를 나란히 비교해 결정해요.",
    cta: { label: "업체 비교 열기", target: "/compare" },
    slides: [
      { phase: "비교", img: cCompare, alt: "업체 비교", tags: ["찜", "선택", "비교표"],
        title: "2~4곳 골라 비교", subtitle: "하트로 찜한 업체 중 같은 분야 2~4곳을 고르면\n가격·조건을 비교표로 나란히 봐요.",
        tip: "후보를 3~5곳으로 좁힌 뒤 비교하면 결정이 쉬워요." },
    ],
  },
  // 7) 스케줄
  {
    id: "schedule", headerTitle: "스케줄 가이드", eyebrow: "SCHEDULE",
    deskHeading: "일정·D-Day 관리", deskSub: "달력으로 준비 일정을 챙기고 내보내요.",
    cta: { label: "스케줄 열기", target: "/schedule" },
    slides: [
      { phase: "일정", img: cSchedule, alt: "스케줄 달력", tags: ["일정", "D-Day", "내보내기"],
        title: "달력으로 일정 관리", subtitle: "준비 일정을 달력에 등록하고\nD-Day까지 할 일을 챙겨요.",
        tip: "‘내보내기’로 다른 캘린더와도 맞출 수 있어요." },
    ],
  },
  // 8) 예산
  {
    id: "budget", headerTitle: "예산 가이드", eyebrow: "BUDGET",
    deskHeading: "예산·지출 관리", deskSub: "총예산을 잡고 항목별 지출을 기록해요.",
    cta: { label: "예산 열기", target: "/budget" },
    slides: [
      { phase: "예산", img: cBudget, alt: "예산 관리", tags: ["총예산", "지출", "양가분담"],
        title: "항목별 예산·지출", subtitle: "총예산을 설정하고 지출을 기록하면\n사용·남은 금액과 진행률을 한눈에 봐요.",
        tip: "초대 코드로 양가·파트너와 함께 관리할 수 있어요." },
    ],
  },
  // 9) 커뮤니티
  {
    id: "community", headerTitle: "커뮤니티 가이드", eyebrow: "COMMUNITY",
    deskHeading: "후기·꿀팁 나누기", deskSub: "다른 부부의 후기를 보고 궁금한 걸 물어봐요.",
    cta: { label: "커뮤니티 가기", target: "/community" },
    slides: [
      { phase: "커뮤니티", img: cCommunity, alt: "커뮤니티 피드", tags: ["후기", "꿀팁", "Q&A"],
        title: "후기·꿀팁·업체추천", subtitle: "실시간 후기·웨딩 꿀팁·업체 추천을 둘러보고\n카테고리별로 골라봐요.",
        tip: "궁금한 점을 올리고 우리 경험도 나눠요." },
    ],
  },
  // 10) 마이페이지
  {
    id: "mypage", headerTitle: "마이페이지 가이드", eyebrow: "MY",
    deskHeading: "내 활동 한곳에", deskSub: "찜·포인트·주문·견적·보드를 모아봐요.",
    cta: { label: "마이페이지 가기", target: "/mypage" },
    slides: [
      { phase: "마이페이지", img: cMypage, alt: "마이페이지", tags: ["찜", "포인트", "주문"],
        title: "내 활동 모아보기", subtitle: "찜·하트·포인트·쿠폰·주문내역·내 견적·업체보드와\n‘내가 만든 것’(청첩장·드레스/메이크업/헤어 시뮬레이션·컨설팅 결과)을 한곳에서 봐요.",
        tip: "‘고객 지원’에서 이 사용 가이드도 다시 볼 수 있어요." },
    ],
  },
  // 11) AI 플래너
  {
    id: "ai-planner", headerTitle: "AI 플래너 가이드", eyebrow: "AI PLANNER",
    deskHeading: "맞춤 준비 추천", deskSub: "날짜·지역만 알려주면 준비 흐름을 추천해요.",
    cta: { label: "AI 플래너 열기", target: "/ai-planner" },
    slides: [
      { phase: "AI 플래너", img: cAiPlanner, alt: "AI 플래너", tags: ["맞춤추천", "할 일"],
        title: "우리 상황에 맞는 추천", subtitle: "날짜·지역 등 정보를 알려주면\n우리에게 맞는 준비 흐름과 할 일을 추천해요.",
        tip: "재혼·자녀 동반 등 상황에 맞춰 안내해요." },
    ],
  },
  // 12) AI 스튜디오
  {
    id: "ai-studio", headerTitle: "AI 스튜디오 가이드", eyebrow: "AI STUDIO",
    deskHeading: "드레스·메이크업 체험", deskSub: "내 사진으로 드레스·메이크업·헤어·스드메·컨설팅을 미리 받아봐요.",
    cta: { label: "AI 스튜디오 열기", target: "/ai-studio" },
    slides: [
      { phase: "AI 스튜디오", img: cAiStudio, alt: "AI 스튜디오", tags: ["드레스", "메이크업", "헤어", "스드메", "컨설팅"],
        title: "미리 체험해보기", subtitle: "내 사진으로 드레스·메이크업·헤어·스드메 완성본·\n퍼스널컬러 컨설팅을 미리 체험해요.",
        tip: "결과는 탭하면 크게 보고 공유 버튼으로 바로 보낼 수 있어요. 모든 결과는 AI가 만든 이미지라, 부적절하면 결과 화면에서 신고할 수 있어요. (결과물은 마이페이지 ‘내가 만든 것’에 모여요.)" },
    ],
  },
  // 13) 꿀팁
  {
    id: "tips", headerTitle: "꿀팁 가이드", eyebrow: "TIPS",
    deskHeading: "단계별 준비 꿀팁", deskSub: "상견례·웨딩홀·스드메 등 단계별 팁을 읽어요.",
    cta: { label: "꿀팁 보기", target: "/tips" },
    slides: [
      { phase: "꿀팁", img: cTips, alt: "꿀팁", tags: ["상견례", "웨딩홀", "스드메"],
        title: "카테고리별 준비 꿀팁", subtitle: "상견례·웨딩홀·스튜디오·드레스 등\n단계별 준비 꿀팁을 골라 읽어요.",
        tip: "처음이라면 ‘일반’부터 가볍게 시작해요." },
    ],
  },
  // 14) 이벤트
  {
    id: "deals", headerTitle: "이벤트·혜택 가이드", eyebrow: "EVENTS",
    deskHeading: "쿠폰·이벤트·포인트", deskSub: "진행 중인 혜택을 모아보고 포인트도 받아요.",
    cta: { label: "이벤트·혜택 보기", target: "/deals" },
    slides: [
      { phase: "이벤트", img: cDeals, alt: "이벤트·혜택", tags: ["쿠폰", "이벤트", "포인트"],
        title: "혜택 모아보기", subtitle: "진행 중인 쿠폰·이벤트를 모아보고\n출석·미션·게임으로 포인트·하트도 받아요.",
        tip: "이벤트 카드를 누르면 내용을 보고 바로 신청까지 이어가요." },
    ],
  },
  // 15) 쇼핑
  {
    id: "store", headerTitle: "쇼핑 가이드", eyebrow: "SHOP",
    deskHeading: "웨딩 준비물 쇼핑", deskSub: "촬영소품·셀프웨딩 등 준비물을 둘러봐요.",
    cta: { label: "쇼핑 보기", target: "/store" },
    slides: [
      { phase: "쇼핑", img: cStore, alt: "쇼핑", tags: ["촬영소품", "셀프웨딩"],
        title: "웨딩 소품·셀프웨딩", subtitle: "촬영소품·부케·셀프웨딩 드레스·액세서리 등\n웨딩 준비물을 카테고리별로 둘러봐요.",
        tip: "필요한 카테고리로 바로 찾아봐요." },
    ],
  },
  // 16) 문의사항 접수
  {
    id: "contact", headerTitle: "문의 접수 가이드", eyebrow: "SUPPORT",
    deskHeading: "고객센터에 문의", deskSub: "챗봇으로 바로 해결하거나 1:1로 접수해요.",
    cta: { label: "1:1 문의하기", target: "/contact" },
    slides: [
      { phase: "고객센터", img: cContact, alt: "1:1 문의", tags: ["챗봇", "1:1문의"],
        title: "문의사항 접수", subtitle: "앱 사용 중 불편은 챗봇으로 바로 해결하고,\n안 풀리면 1:1 문의(이메일)로 접수해요.",
        tip: "마이페이지 → 고객 지원에서 들어갈 수 있어요." },
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
