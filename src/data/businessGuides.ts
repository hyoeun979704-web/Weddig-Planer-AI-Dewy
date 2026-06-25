// 기업회원 전용 **주제별 상세 가이드** 레지스트리(단일 소스).
// 각 가이드는 BusinessGuideDetail 가 :guideId 로 찾아 공용 GuideView(shared) 로 렌더한다.
// 슬라이드 이미지는 scripts/capture-guide-shots.cjs 로 3:4 라이브 캡처(SUITE 폰트 +
// DOM 하이라이트). 새 슬라이드 추가/교체 절차는 docs/business-guide-capture.md.

import type { GuideSlide } from "@/types/guides";

// 개요 가이드 커버(목록 썸네일용)
import overviewCover from "@/assets/business/guide/business-landing.png";
// 업체정보 수정
import g1Basic from "@/assets/business/guide/g1-basic.png";
import g1Inquiry from "@/assets/business/guide/g1-inquiry.png";
import g1Save from "@/assets/business/guide/g1-save.png";
// 상품등록/수정
import g2Form from "@/assets/business/guide/g2-form.png";
import g2Submit from "@/assets/business/guide/g2-submit.png";
import g2List from "@/assets/business/guide/g2-list.png";
// 포트폴리오 등록/수정
import g3Album from "@/assets/business/guide/g3-album.png";
import g3Add from "@/assets/business/guide/g3-add.png";
import g3List from "@/assets/business/guide/g3-list.png";
// 쿠폰·이벤트
import g4CouponForm from "@/assets/business/guide/g4-coupon-form.png";
import g4CouponList from "@/assets/business/guide/g4-coupon-list.png";
import g4EventForm from "@/assets/business/guide/g4-event-form.png";
import g4EventBanner from "@/assets/business/guide/g4-event-banner.png";
// 견적·문의·채팅
import g5Leads from "@/assets/business/guide/g5-leads.png";
import g5Reply from "@/assets/business/guide/g5-reply.png";
import g5Chat from "@/assets/business/guide/g5-chat.png";
import g5Inquiry from "@/assets/business/guide/g5-inquiry.png";
import g5Delivery from "@/assets/business/guide/g5-delivery.png";

export interface BusinessGuideDef {
  id: string;
  /** 헤더 h1 */
  headerTitle: string;
  /** 데스크톱 eyebrow(대문자) */
  eyebrow: string;
  deskHeading: string;
  deskSub: string;
  slides: GuideSlide[];
  /** 해당 기능 관리 페이지로 가는 CTA */
  cta: { label: string; target: string };
}

export const BUSINESS_GUIDES: BusinessGuideDef[] = [
  {
    id: "vendor-edit",
    headerTitle: "업체 정보 수정 가이드",
    eyebrow: "VENDOR INFO",
    deskHeading: "고객에게 보일 우리 업체 정보",
    deskSub: "이름·소개·지역·대표사진·문의 방법을 채우고 검토 요청하면 상세페이지에 노출됩니다.",
    cta: { label: "업체 정보 수정하러 가기", target: "/business/edit" },
    slides: [
      { phase: "STEP 1", img: g1Basic, alt: "기본 정보 입력", tags: ["업체명", "소개", "지역"],
        title: "기본 정보부터 채워요", subtitle: "업체명·소개·지역을 입력합니다.\n키워드(태그)는 검색·추천에 쓰여요.",
        tip: "「최소가·시작가」는 목록 카드의\n‘최저가~’ 미리보기·검색용이에요." },
      { phase: "STEP 2", img: g1Inquiry, alt: "문의 방법 선택", tags: ["앱채팅", "내링크", "전화"],
        title: "문의 받을 방법 선택", subtitle: "고객이 「문의하기」를 누르면\n연결될 방식을 고릅니다.",
        tip: "「앱 채팅」을 고르면 듀이 안에서\n바로 상담·견적이 이어져요." },
      { phase: "STEP 3", img: g1Save, alt: "저장하고 검토 요청", tags: ["검토요청", "노출"],
        title: "저장하면 검토 후 노출", subtitle: "「기본 정보 저장하고 검토 요청」을 누르면\n운영자 검토 후 상세페이지에 반영돼요.",
        tip: "직접 입력해 검토를 통과하면\n상세페이지에 ✓검수 배지가 붙어요." },
    ],
  },
  {
    id: "products",
    headerTitle: "상품 등록 가이드",
    eyebrow: "PRODUCTS",
    deskHeading: "패키지·상품으로 가격을 노출",
    deskSub: "상품 가격을 넣으면 상세 첫 화면에 ‘최저 OOO만원~’으로 노출돼 고객 결정에 직접 영향을 줍니다.",
    cta: { label: "상품 등록하러 가기", target: "/business/products" },
    slides: [
      { phase: "STEP 1", img: g2Form, alt: "상품 등록 폼", tags: ["상품명", "가격", "상세이미지"],
        title: "상품명·가격을 입력", subtitle: "상품명·가격(원)에 대표 사진을 더하고\n상세 이미지는 여러 장 올릴 수 있어요.",
        tip: "설명은 선택 — 상세 이미지로만 구성해도 돼요.\n가격을 비우면 ‘가격은 문의로 안내’로 보여요." },
      { phase: "STEP 2", img: g2Submit, alt: "상품 등록", tags: ["등록", "검토"],
        title: "등록 = 운영자 검토 후 노출", subtitle: "「상품 등록」을 누르면 검토 대기로 들어가고\n승인되면 상세페이지에 노출돼요.",
        tip: "최소 1개는 꼭 등록하세요 —\n대표 가격이 여기서 나와요." },
      { phase: "STEP 3", img: g2List, alt: "상품 목록·상태", tags: ["노출중", "검토중", "반려"],
        title: "상태를 한눈에 확인", subtitle: "각 상품의 노출중·검토 중·반려됨 상태와\n반려 사유를 카드에서 확인합니다.",
        tip: "반려되면 사유를 보고 수정 후\n다시 등록하면 돼요." },
    ],
  },
  {
    id: "portfolio",
    headerTitle: "포트폴리오 관리 가이드",
    eyebrow: "PORTFOLIO",
    deskHeading: "사진은 검토 없이 즉시 노출",
    deskSub: "앨범으로 묶어 올리면 고객이 식장·스타일별로 둘러보기 좋습니다. 채울수록 신뢰도가 올라가요.",
    cta: { label: "포트폴리오 관리하러 가기", target: "/business/gallery" },
    slides: [
      { phase: "STEP 1", img: g3Album, alt: "앨범 만들기", tags: ["앨범", "식장", "스타일태그"],
        title: "앨범으로 묶어요", subtitle: "새 앨범을 만들고 제목·진행 장소·날짜·\n스타일 태그를 넣습니다.",
        tip: "앨범에 상품을 연결하면 고객이\n사진→상품으로 바로 이어볼 수 있어요." },
      { phase: "STEP 2", img: g3Add, alt: "사진 추가", tags: ["업로드", "즉시노출"],
        title: "업로드 = 즉시 노출", subtitle: "사진을 올리면 검토 없이 바로\n상세페이지에 노출돼요.",
        tip: "외부 이미지 URL 로도 추가할 수 있어요." },
      { phase: "STEP 3", img: g3List, alt: "앨범별 정리", tags: ["앨범정리", "삭제"],
        title: "앨범별로 정리돼요", subtitle: "올린 사진이 앨범 단위로 묶여 보이고\n언제든 삭제·교체할 수 있어요.",
        tip: "대표 사진 외 갤러리를 풍성히 채울수록\n문의 전환이 올라가요." },
    ],
  },
  {
    id: "promotions",
    headerTitle: "쿠폰·이벤트 가이드",
    eyebrow: "PROMOTIONS",
    deskHeading: "쿠폰·이벤트로 고객을 유인",
    deskSub: "상세 첫 화면 혜택군에 노출되는 강력한 유인책입니다. 둘 다 운영자 검토 후 노출돼요.",
    cta: { label: "쿠폰 관리하러 가기", target: "/business/coupons" },
    slides: [
      { phase: "쿠폰", img: g4CouponForm, alt: "쿠폰 발행 폼", tags: ["쿠폰", "할인", "최소주문"],
        title: "쿠폰을 발행", subtitle: "쿠폰명·할인 내용·최소 주문·만료일을 넣고\n「쿠폰 발행」을 누릅니다.",
        tip: "할인 내용은 ‘10%’ 또는 ‘5만원’처럼\n명확하게 적어요." },
      { phase: "쿠폰", img: g4CouponList, alt: "쿠폰 상태", tags: ["노출중", "검토중"],
        title: "검토 후 노출돼요", subtitle: "발행한 쿠폰의 노출중·검토 중 상태를\n목록에서 확인합니다.",
        tip: "보통 1영업일 내 노출돼요." },
      { phase: "이벤트", img: g4EventForm, alt: "이벤트 등록", tags: ["이벤트", "기간"],
        title: "이벤트를 등록", subtitle: "이벤트명과 시작/종료일을 넣어\n기간 한정 프로모션을 알립니다.",
        tip: "내용(설명)은 선택 — 이미지로 대신해도 돼요.\n기간이 지나면 자동으로 내려가요." },
      { phase: "이벤트", img: g4EventBanner, alt: "이벤트 이미지", tags: ["대표이미지", "상세이미지", "선택"],
        title: "이미지로 구성해요", subtitle: "대표 이미지(썸네일)나 상세 이미지를\n한 장 이상 올리면 등록돼요.",
        tip: "대표 이미지가 없으면 상세 첫 장(또는\n업체 대표사진)이 썸네일로 쓰여요." },
    ],
  },
  {
    id: "customers",
    headerTitle: "견적·문의·소통 가이드",
    eyebrow: "CUSTOMERS",
    deskHeading: "견적·문의·채팅으로 예약까지",
    deskSub: "받은 견적에 빠르게 답하고, 수락되면 채팅으로 이어가고, 문의 답변·결과물 전달까지 한곳에서.",
    cta: { label: "받은 견적 보러 가기", target: "/business/leads" },
    slides: [
      { phase: "견적", img: g5Leads, alt: "받은 견적 요청", tags: ["리드", "퍼널", "예약"],
        title: "받은 견적을 한눈에", subtitle: "받은 리드 → 응답 → 수락 → 예약 퍼널과\n요청 목록을 확인합니다.",
        tip: "빠른 응답이 수락률을 크게 올려요." },
      { phase: "견적", img: g5Reply, alt: "견적 답변", tags: ["견적답변", "가격제안"],
        title: "가격·메시지로 답변", subtitle: "「견적 답변하기」로 예상 가격대와\n메시지를 보냅니다.",
        tip: "고객이 수락하면 연락처가 공개되고\n바로 연락할 수 있어요." },
      { phase: "채팅", img: g5Chat, alt: "고객과 채팅", tags: ["실시간채팅", "상담"],
        title: "수락 후 실시간 채팅", subtitle: "「고객과 메시지」로 일정·컨셉을\n실시간으로 조율합니다.",
        tip: "채팅에서 바로 결과물도 보낼 수 있어요." },
      { phase: "문의", img: g5Inquiry, alt: "문의 답변", tags: ["문의", "답변", "예약확정"],
        title: "문의엔 답변 등록", subtitle: "들어온 문의를 펼쳐 답변을 등록하면\n고객이 같은 화면에서 바로 확인해요.",
        tip: "성사되면 「예약 확정으로 표시」로\n관리하세요." },
      { phase: "결과물", img: g5Delivery, alt: "결과물 보내기", tags: ["결과물", "파일전달"],
        title: "결과물 파일 전달", subtitle: "문의 고객을 골라 보정본 등 파일을\n제목과 함께 보냅니다.",
        tip: "고객은 ‘받은 결과물’에서 안전하게\n내려받아요." },
    ],
  },
];

export const findBusinessGuide = (id?: string): BusinessGuideDef | undefined =>
  BUSINESS_GUIDES.find((g) => g.id === id);

// ── 가이드 목록 + 블로그식 이전/다음 네비 ────────────────────────────────────
// 개요(전체 사용법) + 상세 5종을 한 줄의 순서로 묶는다. 목록 페이지와 각 가이드의
// 이전/다음 게시물 네비가 이 순서를 공유한다.
export interface GuideNavItem {
  /** 개요는 "overview", 상세는 BUSINESS_GUIDES.id */
  id: string;
  title: string;
  summary: string;
  route: string;
  cover: string;
}

export const GUIDE_NAV: GuideNavItem[] = [
  {
    id: "overview",
    title: "전체 사용법 가이드",
    summary: "가입부터 고객 노출까지 — 처음이라면 여기서 시작하세요.",
    route: "/business/guide",
    cover: overviewCover,
  },
  ...BUSINESS_GUIDES.map((g) => ({
    id: g.id,
    title: g.headerTitle,
    summary: g.deskSub,
    route: `/business/guide/${g.id}`,
    cover: g.slides[0].img,
  })),
];

export interface GuideAdjacent {
  prev: GuideNavItem | null;
  next: GuideNavItem | null;
}

/** id("overview" | 상세 id)로 이전/다음 가이드를 찾는다. */
export const adjacentGuides = (id?: string): GuideAdjacent => {
  const i = GUIDE_NAV.findIndex((g) => g.id === id);
  if (i === -1) return { prev: null, next: null };
  return { prev: i > 0 ? GUIDE_NAV[i - 1] : null, next: i < GUIDE_NAV.length - 1 ? GUIDE_NAV[i + 1] : null };
};
