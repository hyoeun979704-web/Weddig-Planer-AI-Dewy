import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Lightbulb } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

// 기업회원용 인앱 사용법 가이드의 **공용 프레젠테이션**.
//  - 모바일: 한 단계=한 슬라이드(스와이프 캐러셀, 온보딩 코치마크 스타일).
//  - 데스크톱(lg≥1024): 스크롤형 섹션 — 큰 캡처 + 제목 + 해시태그 + 설명을 좌우 교차 배치.
// 개요 가이드(BusinessGuide)와 주제별 상세 가이드(BusinessGuideDetail)가 이 뷰를 공유한다.
// 캡처는 scripts/capture-guide-shots.cjs (3:4 라이브 + SUITE 폰트 + DOM 하이라이트) — 상세
// 절차는 docs/business-guide-capture.md.

export interface GuideSlide {
  phase: string;
  img: string;
  alt: string;
  title: string;
  subtitle: string;
  tip: string;
  tags: string[];
}

export interface GuideViewProps {
  /** 헤더 h1 (예: "사용법 가이드", "업체 정보 수정 가이드") */
  headerTitle: string;
  /** 데스크톱 상단 eyebrow (대문자 라벨) */
  eyebrow: string;
  /** 데스크톱 상단 큰 제목 */
  deskHeading: string;
  /** 데스크톱 상단 보조 설명 */
  deskSub: string;
  slides: GuideSlide[];
  /** 마지막 슬라이드/하단 CTA */
  cta: { label: string; target: string };
}

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

const BusinessGuideView = ({ headerTitle, eyebrow, deskHeading, deskSub, slides, cta }: GuideViewProps) => {
  const navigate = useNavigate();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const total = slides.length;
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
          <button onClick={() => navigate(-1)} aria-label="뒤로" className="p-1 -ml-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold lg:text-lg">{headerTitle}</h1>
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
            {slides.map((s, i) => (
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
          {slides.map((_, i) => (
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
            <button onClick={() => navigate(cta.target)} className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold">
              {cta.label}
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
          <p className="text-sm font-bold text-primary tracking-wide">{eyebrow}</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground text-balance">{deskHeading}</h2>
          <p className="mt-2 text-muted-foreground text-pretty">{deskSub}</p>
        </div>

        <div className="space-y-7">
          {slides.map((s, i) => (
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
            onClick={() => navigate(cta.target)}
            className="px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold inline-flex items-center gap-2"
          >
            {cta.label} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default BusinessGuideView;
