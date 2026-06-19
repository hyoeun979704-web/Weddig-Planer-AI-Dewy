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

// 기업회원용 인앱 사용법 가이드.
//  - 모바일: 한 단계=한 슬라이드(스와이프 캐러셀, 온보딩 코치마크 스타일).
//  - 데스크톱(lg≥1024, 웹/Mac): 스크롤형 섹션 — 큰 캡처 + 제목 + 해시태그 + 설명을
//    좌우 교차 배치(포트폴리오 레퍼런스 스타일).
// 진입: 기업 대시보드 "사용법 가이드" 메뉴.

interface Slide {
  phase: string;
  img: string;
  alt: string;
  title: string;
  subtitle: string;
  tip: string;
  tags: string[];
}

// subtitle·tip 의 \n 은 의도한 줄바꿈(절 경계) — whitespace-pre-line 으로 렌더한다.
const SLIDES: Slide[] = [
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

const Tip = ({ text, lg }: { text: string; lg?: boolean }) => (
  <div className={cn("flex items-start gap-2 text-left rounded-xl bg-amber-50 border border-amber-100",
    lg ? "px-4 py-3 max-w-xl" : "mt-4 max-w-[20rem] px-3 py-2")}>
    <Lightbulb className={cn("text-amber-500 shrink-0 mt-0.5", lg ? "w-5 h-5" : "w-4 h-4")} />
    <span className={cn("text-amber-900 leading-relaxed whitespace-pre-line", lg ? "text-sm" : "text-[13px]")}>{text}</span>
  </div>
);

const Tags = ({ tags, className }: { tags: string[]; className?: string }) => (
  <div className={cn("flex flex-wrap gap-x-3 gap-y-1", className)}>
    {tags.map((t) => (
      <span key={t} className="text-sm font-bold text-primary/80">#{t}</span>
    ))}
  </div>
);

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
    // font-sans=SUITE(브랜딩 일관성). break-keep(word-break:keep-all)은 상속 속성이라
    // 여기 한 번으로 전체 한글이 단어 중간이 아닌 어절 단위로 줄바꿈된다(가독성).
    <div className="min-h-screen bg-background app-col mx-auto flex flex-col font-sans break-keep">
      <header className="sticky safe-sticky-header z-50 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-2 px-4 py-3 lg:px-8">
          <button onClick={() => navigate("/business/dashboard")} aria-label="뒤로" className="p-1 -ml-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold lg:text-lg">사용법 가이드</h1>
          {/* 페이지 카운터·진행바는 캐러셀(모바일) 전용 */}
          <span className="ml-auto text-sm font-semibold text-muted-foreground tabular-nums lg:hidden">
            {current + 1} <span className="text-muted-foreground/50">/ {total}</span>
          </span>
        </div>
        <div className="h-1 bg-muted lg:hidden">
          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </header>

      {/* ── 모바일: 스와이프 캐러셀 ───────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 lg:hidden">
        <Carousel setApi={setApi} opts={{ align: "start", containScroll: "trimSnaps" }} className="w-full">
          <CarouselContent className="ml-0">
            {SLIDES.map((s, i) => (
              <CarouselItem key={i} className="pl-0 basis-full">
                <div className="flex flex-col items-center text-center px-6 pt-5 pb-4">
                  <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-3">
                    {s.phase}
                  </span>
                  <h2 className="text-2xl font-extrabold leading-tight tracking-tight text-foreground text-balance">{s.title}</h2>
                  <p className="mt-2 text-[15px] text-muted-foreground leading-relaxed max-w-[22rem] whitespace-pre-line">{s.subtitle}</p>
                  <div className="mt-5 mx-auto w-full max-w-[14rem] aspect-[3/4] rounded-2xl border border-border shadow-[0_8px_28px_rgba(190,24,93,0.12)] overflow-hidden bg-card">
                    <img src={s.img} alt={s.alt} className="w-full h-full object-cover block" />
                  </div>
                  <Tip text={s.tip} />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>

      {/* 모바일 점 인디케이터 + 하단 내비 */}
      <div className="sticky bottom-0 bg-card/95 backdrop-blur-sm border-t border-border px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] lg:hidden">
        <div className="flex justify-center gap-1.5 mb-3">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              aria-label={`${i + 1}번째 단계로`}
              onClick={() => api?.scrollTo(i)}
              className={cn("h-1.5 rounded-full transition-all", i === current ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30")}
            />
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => api?.scrollPrev()}
            disabled={current === 0}
            className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground disabled:opacity-40"
          >
            <ArrowLeft className="w-4 h-4" /> 이전
          </button>
          {isLast ? (
            <button onClick={() => navigate("/business/dashboard")} className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold">
              대시보드로 가기
            </button>
          ) : (
            <button onClick={() => api?.scrollNext()} className="flex-1 flex items-center justify-center gap-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold">
              다음 <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── 데스크톱(웹/Mac): 스크롤형 섹션, 좌우 교차 ─────────────────────── */}
      <div className="hidden lg:block px-8 py-10">
        <div className="mb-10">
          <p className="text-sm font-bold text-primary tracking-wide">APPLICATION GUIDE</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground text-balance">가입부터 고객 노출까지, 한눈에</h2>
          <p className="mt-2 text-muted-foreground text-pretty">웨딩 업체 사장님을 위한 단계별 사용법 — 순서대로 따라 하세요.</p>
        </div>

        <div className="space-y-7">
          {SLIDES.map((s, i) => (
            <section
              key={i}
              className={cn(
                "flex items-center gap-12 rounded-3xl border border-border/60 p-10",
                i % 2 === 1 ? "flex-row-reverse bg-primary/[0.04]" : "bg-card",
              )}
            >
              <div className="shrink-0 w-[17rem]">
                <div className="aspect-[3/4] rounded-2xl border border-border overflow-hidden bg-card shadow-[0_10px_34px_rgba(190,24,93,0.14)]">
                  <img src={s.img} alt={s.alt} className="w-full h-full object-cover block" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground font-extrabold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span className="text-sm font-bold text-primary/90">{s.phase}</span>
                </div>
                <h3 className="mt-4 text-[1.7rem] font-extrabold leading-tight tracking-tight text-foreground text-balance">{s.title}</h3>
                <Tags tags={s.tags} className="mt-3" />
                <p className="mt-4 text-lg text-muted-foreground leading-relaxed whitespace-pre-line">{s.subtitle}</p>
                <div className="mt-5">
                  <Tip text={s.tip} lg />
                </div>
              </div>
            </section>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <button
            onClick={() => navigate("/business/dashboard")}
            className="px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold inline-flex items-center gap-2"
          >
            대시보드로 가기 <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default BusinessGuide;
