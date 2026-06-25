import { useUserRole } from "@/hooks/useUserRole";
import GuideView from "@/components/guides/GuideView";
import type { GuideSlide } from "@/types/guides";
import { adjacentGuides } from "@/features/partners/data/businessGuides";

// 캡처는 scripts/capture-guide-shots.cjs 로 실제 앱을 3:4 모바일 뷰포트로 라이브 렌더해
// (표시 프레임과 동일) 한 화면씩 찍고, 타깃에 하이라이트 박스 + 안내 라벨을 얹은 결과물
// (src/assets/business/guide/). 앱 본폰트(SUITE)를 주입해 실제 화면과 동일한 폰트로 찍는다.
// 상세 절차: docs/business-guide-capture.md.
import imgLanding from "@/assets/business/guide/business-landing.png";
import imgAuth from "@/assets/business/guide/auth-business.png";
import imgOnboard from "@/assets/business/guide/business-onboard.png";
import imgOnboard2 from "@/assets/business/guide/business-onboard-step2.png";
import imgPending from "@/assets/business/guide/business-pending.png";
import imgDashboard from "@/assets/business/guide/business-dashboard.png";
import imgEdit from "@/assets/business/guide/business-edit.png";
import imgDetail from "@/assets/business/guide/business-detail-redesign.png";
import imgGallery from "@/assets/business/guide/business-gallery.png";
import imgProducts from "@/assets/business/guide/business-products.png";
import imgCoupons from "@/assets/business/guide/business-coupons.png";

// 기업회원용 인앱 사용법 **개요** 가이드(가입→노출 전체 흐름).
// 주제별 상세 가이드는 BusinessGuideDetail + src/data/businessGuides.ts.
// 진입: 기업 대시보드 "사용법 가이드" 메뉴 + 로그인/마이페이지 링크.

// subtitle·tip 의 \n 은 의도한 줄바꿈(절 경계) — whitespace-pre-line 으로 렌더한다.
const SLIDES: GuideSlide[] = [
  { phase: "1단계 · 가입", img: imgLanding, alt: "입점 안내 페이지", tags: ["입점", "수수료0원", "무료노출"],
    title: "입점 안내에서 시작해요", subtitle: "혜택을 확인하고\n「기업회원 가입하고 입점하기」를 누릅니다.",
    tip: "이미 개인회원이면 마이페이지 →\n기업회원 전환으로도 들어올 수 있어요." },
  { phase: "1단계 · 가입", img: imgAuth, alt: "기업회원 가입 화면", tags: ["기업회원", "웨딩업체", "1분가입"],
    title: "기업회원으로 가입", subtitle: "회원가입에서\n「기업회원(웨딩 업체)」 카드를 꼭 선택하세요.",
    tip: "개인회원으로 가입하면\n업체 관리 기능이 안 보여요." },
  { phase: "1단계 · 가입", img: imgOnboard, alt: "사업자 정보 입력", tags: ["사업자인증", "국세청자동"],
    title: "사업자 정보 입력", subtitle: "사업자번호·상호·대표자·개업일자를 넣으면\n국세청에서 자동 인증돼요.",
    tip: "사업자등록증과 글자 하나까지 똑같이 —\n다르면 인증이 실패해요." },
  { phase: "1단계 · 가입", img: imgOnboard2, alt: "카테고리 선택", tags: ["카테고리", "제휴_프렌즈"],
    title: "카테고리 선택 + 제휴 신청", subtitle: "우리 업종을 고르고\n「등록 신청」으로 접수합니다.",
    tip: "제휴(프렌즈)는 선택 —\n나중에 대시보드에서도 신청할 수 있어요." },
  { phase: "1단계 · 가입", img: imgPending, alt: "승인 대기 화면", tags: ["승인대기", "1~2영업일"],
    title: "승인을 기다려요", subtitle: "「등록을 검토하고 있어요」 화면이\n나오면 정상이에요.",
    tip: "보통 1~2영업일 내 승인되고,\n승인되면 알림으로 안내드려요." },
  { phase: "2단계 · 대시보드", img: imgDashboard, alt: "기업 대시보드", tags: ["대시보드", "통계", "관리메뉴"],
    title: "대시보드 — 관리의 중심", subtitle: "통계·제휴 신청·관리 메뉴가 한곳에.\n이 가이드도 여기서 다시 열 수 있어요.",
    tip: "필수 6개 항목을 모두 채우면\n프렌즈 신청 버튼이 활성화돼요." },
  { phase: "3단계 · 정보 등록", img: imgEdit, alt: "업체 정보 수정", tags: ["업체정보", "대표사진", "문의방법"],
    title: "업체 정보 등록·수정", subtitle: "이름·소개·지역·대표 사진·문의 방법을\n입력합니다.",
    tip: "「최소가·시작가」는 목록 카드의\n‘최저가~’ 미리보기·검색용이에요." },
  { phase: "3단계 · 정보 등록", img: imgDetail, alt: "고객이 보는 상세페이지", tags: ["상세페이지", "최저가노출", "검수배지"],
    title: "고객에겐 이렇게 보여요", subtitle: "첫 화면에 이름·평점·최저가·사진·쿠폰이 한눈에.\n직접 채우면 ✓검수 배지가 붙어요.",
    tip: "첫 화면 대표 가격은 [상품 관리]의\n패키지 가격에서 나와요(최소가 칸 아님)." },
  { phase: "4단계 · 세부 기능", img: imgGallery, alt: "사진 관리", tags: ["사진관리", "즉시노출"],
    title: "사진 / 메뉴 관리", subtitle: "업로드하면 검토 없이 즉시 노출.\n사진은 탭하면 풀스크린으로 크게 보여요.",
    tip: "대표 사진 외 갤러리를 채울수록\n고객 신뢰도가 올라가요." },
  { phase: "4단계 · 세부 기능", img: imgProducts, alt: "상품 관리", tags: ["상품패키지", "가격노출"],
    title: "상품 / 패키지 관리", subtitle: "가격을 넣으면 상세 첫 화면에\n‘최저 OOO만원~’으로 노출돼요.",
    tip: "하나도 없으면 ‘가격은 문의로 안내’ —\n꼭 1개 이상 등록하세요." },
  { phase: "4단계 · 세부 기능", img: imgCoupons, alt: "쿠폰 관리", tags: ["쿠폰", "검토후노출", "고객유인"],
    title: "쿠폰 발행", subtitle: "발행하면 검토 후 상세 첫 화면 혜택군에\n노출되는 강력한 고객 유인책이에요.",
    tip: "보통 1영업일 내 노출돼요." },
];

const BusinessGuide = () => {
  // 가이드는 비로그인 예비 사장님도 보므로(로그인 페이지에서 진입) CTA·뒤로 동작을
  // 역할에 따라 분기한다. 이미 기업회원이면 대시보드로, 아직 아니면 가입 깔때기로.
  const { isBusiness } = useUserRole();
  return (
    <GuideView
      headerTitle="사용법 가이드"
      eyebrow="APPLICATION GUIDE"
      deskHeading="가입부터 고객 노출까지, 한눈에"
      deskSub="웨딩 업체 사장님을 위한 단계별 사용법 — 순서대로 따라 하세요."
      slides={SLIDES}
      cta={isBusiness
        ? { label: "대시보드로 가기", target: "/business/dashboard" }
        : { label: "기업회원 가입하러 가기", target: "/business" }}
      prevNext={adjacentGuides("overview")}
    />
  );
};

export default BusinessGuide;
