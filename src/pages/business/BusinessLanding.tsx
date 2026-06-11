import { useNavigate } from "react-router-dom";
import {
  Building2,
  BadgeCheck,
  Megaphone,
  BarChart3,
  MessageSquare,
  ChevronRight,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";

/**
 * 입점 안내 랜딩 (/business) — 비로그인 공개.
 * 제휴 영업 시 보낼 수 있는 단일 URL. CTA 는 기업 가입(/auth?type=business)으로.
 */
const BENEFITS = [
  {
    icon: Building2,
    title: "무료 입점",
    desc: "등록·노출·관리 모두 무료예요. 입점비, 거래 수수료가 없어요.",
  },
  {
    icon: BadgeCheck,
    title: "국세청 사업자 인증",
    desc: "사업자번호 진위 확인을 거친 업체만 노출돼 신뢰를 보장해요.",
  },
  {
    icon: Megaphone,
    title: "예비부부에게 직접 노출",
    desc: "업체 탐색·이벤트·쿠폰 탭에서 결혼 준비 중인 고객을 만나요.",
  },
  {
    icon: MessageSquare,
    title: "문의를 앱에서 바로",
    desc: "고객 문의를 업체 포털에서 받고 답변해 예약으로 연결해요.",
  },
  {
    icon: BarChart3,
    title: "성과 대시보드",
    desc: "조회수·찜·쿠폰 다운로드를 한눈에 확인해요.",
  },
];

const STEPS = [
  { no: 1, title: "기업회원 가입", desc: "이메일로 1분이면 끝나요" },
  { no: 2, title: "사업자번호 인증", desc: "국세청 진위 확인 (자동)" },
  { no: 3, title: "운영자 승인", desc: "영업일 기준 1~2일 내 검토" },
  { no: 4, title: "업체 포털 오픈", desc: "정보·갤러리·이벤트·쿠폰·문의 관리" },
];

const FAQS = [
  {
    q: "정말 비용이 없나요?",
    a: "네. 입점·노출·문의 관리 모두 무료예요. 추후 선택형 프로모션 상품이 생겨도 기본 기능은 무료로 유지돼요.",
  },
  {
    q: "어떤 업종이 입점할 수 있나요?",
    a: "웨딩홀, 스튜디오, 드레스, 메이크업, 예물, 한복, 신혼여행 등 웨딩 관련 사업자라면 모두 가능해요.",
  },
  {
    q: "이미 Dewy에 우리 업체가 검색되는데요?",
    a: "기업회원으로 가입해 사업자 인증을 마치면 그 업체 정보를 직접 관리(클레임)할 수 있어요.",
  },
];

const BusinessLanding = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto pb-28">
      <PageHeader title="입점 안내" />

      <main className="px-4 py-6 space-y-8">
        {/* 히어로 */}
        <section className="text-center space-y-2">
          <p className="text-[12px] font-bold text-primary">Dewy 파트너</p>
          <h1 className="text-xl font-bold text-foreground leading-snug">
            결혼 준비 중인 고객을
            <br />
            무료로 만나는 가장 쉬운 방법
          </h1>
          <p className="text-[13px] text-muted-foreground">
            입점비 0원 · 거래 수수료 0원 · 국세청 인증 신뢰 배지
          </p>
        </section>

        {/* 혜택 */}
        <section className="space-y-2">
          {BENEFITS.map((b) => (
            <div
              key={b.title}
              className="flex items-start gap-3 p-4 bg-card rounded-2xl border border-border"
            >
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <b.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground">{b.title}</p>
                <p className="text-[12px] text-muted-foreground leading-relaxed">
                  {b.desc}
                </p>
              </div>
            </div>
          ))}
        </section>

        {/* 절차 */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-foreground">입점 절차</h2>
          <div className="space-y-2">
            {STEPS.map((s) => (
              <div key={s.no} className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-[12px] font-bold flex items-center justify-center shrink-0">
                  {s.no}
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-foreground">
                    {s.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-foreground">자주 묻는 질문</h2>
          <div className="space-y-2">
            {FAQS.map((f) => (
              <details
                key={f.q}
                className="p-4 bg-card rounded-2xl border border-border"
              >
                <summary className="text-[13px] font-semibold text-foreground cursor-pointer list-none flex items-center justify-between">
                  {f.q}
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </summary>
                <p className="text-[12px] text-muted-foreground leading-relaxed mt-2">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </section>
      </main>

      {/* 고정 CTA */}
      <div
        className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-background/95 backdrop-blur border-t border-border p-3"
        style={{ paddingBottom: "calc(var(--safe-bottom) + 12px)" }}
      >
        <Button
          className="w-full h-12 text-[15px] font-bold"
          onClick={() => navigate("/auth?type=business")}
        >
          무료로 입점 시작하기
        </Button>
      </div>
    </div>
  );
};

export default BusinessLanding;
