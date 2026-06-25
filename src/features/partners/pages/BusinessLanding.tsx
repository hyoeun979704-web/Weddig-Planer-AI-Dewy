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
import { openExternal } from "@/lib/native/openExternal";
import { useAuth } from "@/contexts/AuthContext";

/**
 * 입점 안내 랜딩 (/business) — 비로그인 공개.
 * 제휴 영업 시 보낼 수 있는 단일 URL. 메인 CTA 는 초기 파트너 모집 폼(안내 URL),
 * 보조 CTA 는 앱 내 기업 가입(/auth?type=business).
 */
const PARTNER_FORM_URL = "https://forms.gle/AaLeqcwkjTLwy9986";

// 초기 파트너 모집 혜택 — 모집 안내문과 문구를 일치시킨다 (약속 = 화면).
const BENEFITS = [
  {
    icon: Building2,
    title: "입점·매칭 수수료 평생 0원",
    desc: "초기 파트너사는 등록·노출·매칭 모두 영구 무료예요.",
  },
  {
    icon: Megaphone,
    title: "5대 채널 맞춤 홍보 1회 무상",
    desc: "블로그·인스타·유튜브 등 채널 맞춤형 홍보를 1회 지원해요.",
  },
  {
    icon: BarChart3,
    title: "AIO(AI 검색 최적화) 세팅",
    desc: "우수 업체 한정 — 상세페이지에 AI 검색 최적화 구조를 적용해요.",
  },
  {
    icon: BadgeCheck,
    title: "메인·추천 리스트 최우선 노출",
    desc: "앱 런칭 시 파트너 배지와 함께 추천 영역에 우선 노출돼요.",
  },
  {
    icon: MessageSquare,
    title: "문의를 앱에서 바로",
    desc: "고객 문의를 업체 포털에서 받고 답변해 예약으로 연결해요.",
  },
];

// 기업회원 3등급 — 운영자가 검토·면담 후 지정
const TIERS = [
  {
    name: "이달의 베프",
    badge: "🏆",
    desc: "매달 선정되는 최우수 파트너 — 최상단 노출·스페셜 홍보",
  },
  {
    name: "프렌즈",
    badge: "🤝",
    desc: "제휴 파트너 — 추천 우선 노출·파트너 배지 (검토·개인면담 후 선정)",
  },
  {
    name: "일반",
    badge: "",
    desc: "기업회원 — 업체 관리·문의 응대·쿠폰/이벤트 등록",
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
  const { user } = useAuth();

  return (
    <div
      className="min-h-screen bg-background app-col mx-auto"
      // 고정 CTA 바(버튼+보조링크+safe-area) 높이를 넘어서는 하단 여백 — 마지막 내용이
      // 가려지지 않게 safe-bottom 까지 계산(pb-28 고정값은 노치 기기에서 부족했음).
      style={{ paddingBottom: "calc(var(--safe-bottom) + 9.5rem)" }}
    >
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

        {/* 등급 */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-foreground">파트너 등급</h2>
          <div className="space-y-2">
            {TIERS.map((t) => (
              <div
                key={t.name}
                className="p-4 bg-card rounded-2xl border border-border"
              >
                <p className="text-sm font-bold text-foreground">
                  {t.badge ? `${t.badge} ` : ""}
                  {t.name}
                </p>
                <p className="text-[12px] text-muted-foreground leading-relaxed">
                  {t.desc}
                </p>
              </div>
            ))}
          </div>
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
        className="fixed bottom-0 left-0 right-0 app-col mx-auto bg-background/95 backdrop-blur border-t border-border p-3"
        style={{ paddingBottom: "calc(var(--safe-bottom) + 12px)" }}
      >
        {/* 로그인한 일반회원의 "기업회원 전환"은 앱 내 등록 폼으로 직접 —
            /auth 로 보내면 이미 로그인된 사용자는 홈으로 리다이렉트되어
            전환이 불가능했다(버그 260613). 비로그인만 가입 페이지로. */}
        <Button
          className="w-full h-12 text-[15px] font-bold"
          onClick={() => navigate(user ? "/business/onboard" : "/auth?type=business")}
        >
          {user ? "기업회원 전환 신청하기" : "기업회원 가입하고 입점하기"}
        </Button>
        <button
          type="button"
          onClick={() => void openExternal(PARTNER_FORM_URL)}
          className="block w-full text-center text-[12px] text-muted-foreground underline underline-offset-2 mt-2"
        >
          초기 파트너 안내 폼으로 문의하기 →
        </button>
      </div>
    </div>
  );
};

export default BusinessLanding;
