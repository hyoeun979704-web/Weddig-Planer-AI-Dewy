import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Lightbulb } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

// 캡처는 scripts/build-guide-shots.cjs 로 타깃 영역을 줌-크롭(3:4) + 하이라이트 박스 +
// 안내 라벨까지 구워낸 결과물(src/assets/business/guide/). 원본은 src/assets/business/*.png.
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

// 기업회원용 인앱 사용법 가이드 — 한 단계=한 슬라이드(레퍼런스 온보딩 스타일).
// 큰 제목 + 한 줄 설명 + 실제 화면 캡처 + 핵심 꿀팁 1줄. 좌우 스와이프/버튼/점 인디케이터.
// 진입: 기업 대시보드 "사용법 가이드" 메뉴. 캡처는 src/assets/business/* (실제 앱 화면).

interface Slide {
  phase: string;
  img: string;
  alt: string;
  title: string;
  subtitle: string;
  tip: string;
}

const SLIDES: Slide[] = [
  { phase: "1단계 · 가입", img: imgLanding, alt: "입점 안내 페이지",
    title: "입점 안내에서 시작해요", subtitle: "혜택을 확인하고 「기업회원 가입하고 입점하기」를 누릅니다.",
    tip: "이미 개인회원이면 마이페이지 → 기업회원 전환으로도 들어올 수 있어요." },
  { phase: "1단계 · 가입", img: imgAuth, alt: "기업회원 가입 화면",
    title: "기업회원으로 가입", subtitle: "회원가입에서 「기업회원(웨딩 업체)」 카드를 꼭 선택하세요.",
    tip: "개인회원으로 가입하면 업체 관리 기능이 안 보여요." },
  { phase: "1단계 · 가입", img: imgOnboard, alt: "사업자 정보 입력",
    title: "사업자 정보 입력", subtitle: "사업자번호·상호·대표자·개업일자를 넣으면 국세청 자동 인증.",
    tip: "사업자등록증과 글자 하나까지 똑같이 — 다르면 인증이 실패해요." },
  { phase: "1단계 · 가입", img: imgOnboard2, alt: "카테고리 선택",
    title: "카테고리 선택 + 제휴 신청", subtitle: "우리 업종을 고르고 「등록 신청」으로 접수합니다.",
    tip: "제휴(프렌즈)는 선택 — 나중에 대시보드에서도 신청할 수 있어요." },
  { phase: "1단계 · 가입", img: imgPending, alt: "승인 대기 화면",
    title: "승인을 기다려요", subtitle: "「등록을 검토하고 있어요」 화면이 나오면 정상이에요.",
    tip: "보통 1~2영업일 내 승인되고, 승인되면 알림으로 안내드려요." },
  { phase: "2단계 · 대시보드", img: imgDashboard, alt: "기업 대시보드",
    title: "대시보드 — 관리의 중심", subtitle: "통계·제휴 신청·관리 메뉴가 한곳에. 이 가이드도 여기서 다시 열 수 있어요.",
    tip: "필수 6개 항목을 모두 채우면 프렌즈 신청 버튼이 활성화돼요." },
  { phase: "3단계 · 정보 등록", img: imgEdit, alt: "업체 정보 수정",
    title: "업체 정보 등록·수정", subtitle: "이름·소개·지역·대표 사진·문의 방법을 입력합니다.",
    tip: "「최소가·시작가」는 목록 카드의 ‘최저가~’ 미리보기·검색용이에요." },
  { phase: "3단계 · 정보 등록", img: imgDetail, alt: "고객이 보는 상세페이지",
    title: "고객에겐 이렇게 보여요", subtitle: "첫 화면에 이름·평점·최저가·사진·쿠폰이 한눈에. 직접 채우면 ✓검수 배지.",
    tip: "첫 화면 대표 가격은 [상품 관리]의 패키지 가격에서 나와요(최소가 칸 아님)." },
  { phase: "4단계 · 세부 기능", img: imgGallery, alt: "사진 관리",
    title: "사진 / 메뉴 관리", subtitle: "업로드하면 검토 없이 즉시 노출. 사진은 탭하면 풀스크린으로 크게.",
    tip: "대표 사진 외 갤러리를 채울수록 고객 신뢰도가 올라가요." },
  { phase: "4단계 · 세부 기능", img: imgProducts, alt: "상품 관리",
    title: "상품 / 패키지 관리", subtitle: "가격을 넣으면 상세 첫 화면에 ‘최저 OOO만원~’으로 노출돼요.",
    tip: "하나도 없으면 ‘가격은 문의로 안내’ — 꼭 1개 이상 등록하세요." },
  { phase: "4단계 · 세부 기능", img: imgCoupons, alt: "쿠폰 관리",
    title: "쿠폰 발행", subtitle: "발행하면 검토 후 상세 첫 화면 혜택군에 노출되는 강력한 유인책.",
    tip: "보통 1영업일 내 노출돼요." },
];

const BusinessGuide = () => {
  const navigate = useNavigate();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const total = SLIDES.length;
  const isLast = current === total - 1;

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    return () => { api.off("select", onSelect); };
  }, [api]);

  const progress = useMemo(() => ((current + 1) / total) * 100, [current, total]);

  return (
    <div className="min-h-screen bg-background app-col mx-auto flex flex-col">
      <header className="sticky safe-sticky-header z-50 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-2 px-4 py-3">
          <button onClick={() => navigate("/business/dashboard")} aria-label="뒤로" className="p-1 -ml-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold">사용법 가이드</h1>
          <span className="ml-auto text-sm font-semibold text-muted-foreground tabular-nums">
            {current + 1} <span className="text-muted-foreground/50">/ {total}</span>
          </span>
        </div>
        {/* 진행 바 */}
        <div className="h-1 bg-muted">
          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </header>

      {/* 슬라이드 */}
      <Carousel setApi={setApi} opts={{ align: "start", containScroll: "trimSnaps" }} className="flex-1">
        <CarouselContent className="ml-0">
          {SLIDES.map((s, i) => (
            <CarouselItem key={i} className="pl-0 basis-full">
              {/* 모바일: 세로 스택(제목→이미지→꿀팁). 데스크톱(lg≥1024, 사이드바 셸):
                  좌-이미지 / 우-텍스트 2단. grid 의 col/row 배치라 DOM 순서는 모바일용 그대로 유지. */}
              <div className="flex flex-col items-center text-center px-6 pt-5 pb-4
                lg:grid lg:grid-cols-[20rem_minmax(0,28rem)] lg:gap-x-12 lg:justify-center lg:items-center
                lg:text-left lg:px-10 lg:py-10 lg:min-h-[62vh]">
                <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-3
                  lg:col-start-2 lg:row-start-1 lg:justify-self-start lg:text-sm lg:mb-4">
                  {s.phase}
                </span>
                <h2 className="text-2xl font-extrabold leading-tight tracking-tight text-foreground
                  lg:col-start-2 lg:row-start-2 lg:text-[2rem]">{s.title}</h2>
                <p className="mt-2 text-[15px] text-muted-foreground leading-relaxed max-w-[20rem]
                  lg:col-start-2 lg:row-start-3 lg:text-lg lg:max-w-none lg:mt-3">{s.subtitle}</p>
                {/* 이미지는 3:4 로 사전 가공됨. 컨테이너에 aspect 로 공간을 미리 예약해
                    로드 전후 레이아웃 시프트(→ 캐러셀 위치 어긋남)를 차단. 전부 즉시 로드. */}
                <div className="mt-5 mx-auto w-full max-w-[14rem] aspect-[3/4] rounded-2xl border border-border shadow-[0_8px_28px_rgba(190,24,93,0.12)] overflow-hidden bg-card
                  lg:col-start-1 lg:row-start-1 lg:row-span-4 lg:self-center lg:mt-0 lg:max-w-[20rem]">
                  <img
                    src={s.img}
                    alt={s.alt}
                    className="w-full h-full object-cover block"
                  />
                </div>
                <div className="mt-4 flex items-start gap-2 text-left max-w-[20rem] rounded-xl bg-amber-50 border border-amber-100 px-3 py-2
                  lg:col-start-2 lg:row-start-4 lg:max-w-none lg:mt-5 lg:px-4 lg:py-3">
                  <Lightbulb className="w-4 h-4 lg:w-5 lg:h-5 text-amber-500 shrink-0 mt-0.5" />
                  <span className="text-[13px] lg:text-sm text-amber-900 leading-relaxed">{s.tip}</span>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* 점 인디케이터 + 하단 내비 */}
      <div className="sticky bottom-0 bg-card/95 backdrop-blur-sm border-t border-border px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex justify-center gap-1.5 mb-3">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              aria-label={`${i + 1}번째 단계로`}
              onClick={() => api?.scrollTo(i)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === current ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30"
              )}
            />
          ))}
        </div>
        <div className="flex items-center gap-3 lg:max-w-xl lg:mx-auto">
          <button
            onClick={() => api?.scrollPrev()}
            disabled={current === 0}
            className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground disabled:opacity-40"
          >
            <ArrowLeft className="w-4 h-4" /> 이전
          </button>
          {isLast ? (
            <button
              onClick={() => navigate("/business/dashboard")}
              className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold"
            >
              대시보드로 가기
            </button>
          ) : (
            <button
              onClick={() => api?.scrollNext()}
              className="flex-1 flex items-center justify-center gap-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold"
            >
              다음 <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BusinessGuide;
