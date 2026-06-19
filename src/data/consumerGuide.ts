// 소비자(예비부부) 앱 사용 가이드 — 단일 소스. /help 페이지(ConsumerGuide)가 렌더한다.
// 업체용 가이드(businessGuides.ts)와 별개. 슬라이드/스크린샷 파이프라인 없이 섹션·스텝으로
// 구성해 유지보수가 쉽다(기능 추가 시 여기만 수정).

import {
  Search, Heart, MessageCircle, Tag, Sparkles, Wallet, Mail, Users,
  type LucideIcon,
} from "lucide-react";

export interface GuideStep {
  title: string;
  desc: string;
}

export interface ConsumerGuideSection {
  id: string;
  icon: LucideIcon;
  title: string;
  summary: string;
  steps: GuideStep[];
  /** 해당 기능으로 이동하는 CTA(있을 때만). target 은 실제 라우트. */
  cta?: { label: string; target: string };
}

export const CONSUMER_GUIDE: ConsumerGuideSection[] = [
  {
    id: "browse",
    icon: Search,
    title: "둘러보기 · 검색",
    summary: "웨딩홀·스튜디오·드레스·메이크업·예물·신혼여행까지 카테고리별로 찾아봐요.",
    steps: [
      { title: "카테고리로 탐색", desc: "홈에서 원하는 카테고리를 골라 업체를 둘러봐요." },
      { title: "지역·예산으로 좁히기", desc: "지역, 가격대 등 필터로 우리에게 맞는 곳만 모아봐요." },
      { title: "상세에서 핵심 한눈에", desc: "업체 상세 첫 화면에서 가격·핵심 스펙·혜택·후기를 바로 확인해요." },
    ],
    cta: { label: "홈에서 둘러보기", target: "/" },
  },
  {
    id: "favorite",
    icon: Heart,
    title: "찜 · 비교",
    summary: "마음에 드는 업체·상품을 찜해두고 모아서 비교해요.",
    steps: [
      { title: "하트로 찜하기", desc: "업체·상품 카드의 하트를 눌러 찜 목록에 담아요." },
      { title: "찜 목록에서 모아보기", desc: "찜한 곳을 한 화면에서 가격·조건으로 비교해요." },
    ],
    cta: { label: "찜 목록 보기", target: "/favorites" },
  },
  {
    id: "inquiry",
    icon: MessageCircle,
    title: "문의 · 견적",
    summary: "업체에 바로 문의하고, 여러 곳에 견적을 요청해 비교해요.",
    steps: [
      { title: "문의하기", desc: "업체·상품 상세의 「문의하기」로 전화 또는 앱 채팅으로 물어봐요." },
      { title: "견적 요청", desc: "조건을 넣어 여러 업체에 한 번에 견적을 요청하고 답변을 비교해요." },
      { title: "내 문의·예약 확인", desc: "받은 답변과 예약 상태는 마이페이지 「내 문의/예약」에서 모아봐요." },
    ],
    cta: { label: "내 문의/예약", target: "/my-inquiries" },
  },
  {
    id: "deals",
    icon: Tag,
    title: "혜택 · 이벤트",
    summary: "쿠폰·이벤트로 더 합리적으로 준비해요.",
    steps: [
      { title: "혜택 모아보기", desc: "이벤트 탭에서 진행 중인 쿠폰·이벤트를 한눈에 봐요." },
      { title: "이벤트 상세 확인", desc: "이벤트 카드를 눌러 내용을 보고 업체 확인·신청으로 이어가요." },
    ],
    cta: { label: "이벤트·혜택 보기", target: "/deals" },
  },
  {
    id: "ai",
    icon: Sparkles,
    title: "AI 웨딩 도구",
    summary: "AI 플래너로 계획을 세우고, 드레스·메이크업·헤어를 미리 체험해요.",
    steps: [
      { title: "AI 플래너", desc: "예산·일정·취향을 바탕으로 준비 흐름을 추천받아요." },
      { title: "AI 스튜디오 체험", desc: "내 사진으로 드레스·메이크업·헤어 스타일을 미리 입어봐요." },
    ],
    cta: { label: "AI 스튜디오 열기", target: "/ai-studio" },
  },
  {
    id: "budget",
    icon: Wallet,
    title: "예산 · 일정",
    summary: "예산을 관리하고 D-Day까지 할 일을 챙겨요.",
    steps: [
      { title: "예산 관리", desc: "항목별 예산·지출을 기록해 전체 비용을 한눈에 관리해요." },
      { title: "일정·체크리스트", desc: "D-Day 기준으로 준비 일정과 할 일을 놓치지 않게 챙겨요." },
    ],
    cta: { label: "예산 관리 시작", target: "/budget" },
  },
  {
    id: "invitation",
    icon: Mail,
    title: "모바일 청첩장",
    summary: "예쁜 모바일 청첩장을 만들고 공유하고 참석 여부를 받아요.",
    steps: [
      { title: "청첩장 제작", desc: "템플릿을 골라 사진·문구를 넣어 우리만의 청첩장을 만들어요." },
      { title: "공유 · 참석 확인(RSVP)", desc: "링크로 공유하고 하객 참석 여부를 한곳에서 확인해요." },
    ],
    cta: { label: "내 청첩장", target: "/invitation/my" },
  },
  {
    id: "community",
    icon: Users,
    title: "커뮤니티",
    summary: "다른 예비·신혼부부의 후기와 정보를 나눠요.",
    steps: [
      { title: "후기·정보 보기", desc: "실제 준비 후기와 꿀팁을 카테고리별로 둘러봐요." },
      { title: "질문·공유", desc: "궁금한 점을 묻고 우리 경험도 나눠요." },
    ],
    cta: { label: "커뮤니티 가기", target: "/community" },
  },
];
