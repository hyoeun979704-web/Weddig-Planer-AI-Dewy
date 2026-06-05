import { useNavigate } from "react-router-dom";
import { Check, ArrowRight, Smartphone, MessageSquare } from "lucide-react";
import Seo from "@/components/Seo";
import BottomNav from "@/components/BottomNav";
import { openExternal } from "@/lib/native/openExternal";

// 베타 신청·설치 랜딩(광고 유입 전환 목적). 광고 트래픽이 도착하는 페이지라
// SSR 없이 CSR + Seo 메타로 충분(검색 색인보다 전환이 목적).
//
// TODO(효은): 아래 두 URL 을 실제 값으로 채우면 해당 CTA 버튼이 자동 노출됩니다.
//   - PLAY_BETA_URL: Google Play 비공개/공개 베타 참여 링크
//   - FEEDBACK_FORM_URL: 베타 피드백 구글폼 링크
// 비워두면 버튼은 숨겨지고, '웹에서 바로 시작' + 이메일 피드백만 노출됩니다.
const PLAY_BETA_URL = "";
const FEEDBACK_FORM_URL = "";

const FEATURES = [
  "결혼식 날짜 기준 D-Day 체크리스트 자동 정리",
  "예산 관리 + 양가 분담 시뮬레이터",
  "웨딩홀·스드메 맞춤 추천과 비교",
  "AI 드레스·메이크업 시뮬레이션",
  "둘이 함께 쓰는 커플 투표·다이어리",
  "무료 모바일 청첩장 제작",
];

const Beta = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      <Seo
        title="Dewy 베타 신청 — AI 웨딩플래너 먼저 써보세요"
        description="Dewy는 결혼 준비 체크리스트, D-Day 일정, 예산 관리, 양가 분담, 웨딩홀·스드메 추천을 한곳에서 정리해주는 AI 웨딩플래너 앱입니다. 베타로 먼저 사용해보세요."
        path="/beta"
      />

      <main className="px-5 py-8 pb-28">
        {/* Hero */}
        <header className="text-center space-y-3">
          <img src="/dewy-logo.png" alt="Dewy" className="w-16 h-16 mx-auto rounded-2xl" />
          <h1 className="text-2xl font-bold leading-snug">
            결혼 준비, AI랑 둘이 같이
            <br />
            <span className="text-primary">Dewy 베타</span>를 먼저 써보세요
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Dewy는 결혼 준비 체크리스트, D-Day 일정, 예산 관리, 양가 분담, 웨딩홀·스드메 추천을 한곳에서
            정리해주는 AI 웨딩플래너 앱입니다.
          </p>
        </header>

        {/* 베타로 지금 할 수 있는 것 */}
        <section className="mt-7">
          <h2 className="text-base font-semibold mb-3">베타로 지금 할 수 있는 것</h2>
          <ul className="space-y-2">
            {FEATURES.map((f) => (
              <li key={f} className="flex gap-2 text-sm leading-relaxed">
                <Check className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* CTA */}
        <section className="mt-8 space-y-2.5">
          <button
            onClick={() => navigate("/")}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            웹에서 바로 시작하기
            <ArrowRight className="w-4 h-4" />
          </button>

          {PLAY_BETA_URL && (
            <button
              onClick={() => openExternal(PLAY_BETA_URL)}
              className="w-full flex items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 py-3.5 text-sm font-semibold hover:bg-muted transition-colors"
            >
              <Smartphone className="w-4 h-4" />
              Android 베타 설치하기
            </button>
          )}

          {FEEDBACK_FORM_URL ? (
            <button
              onClick={() => openExternal(FEEDBACK_FORM_URL)}
              className="w-full flex items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 py-3.5 text-sm font-medium hover:bg-muted transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              베타 피드백 보내기
            </button>
          ) : (
            <p className="pt-1 text-center text-xs text-muted-foreground">
              피드백·문의: <a href="mailto:kheceo@dewy-wedding.com" className="underline">kheceo@dewy-wedding.com</a>
            </p>
          )}
        </section>

        {/* 베타 안내 */}
        <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
          Dewy는 현재 베타 단계입니다. 사용해보고 불편한 점이나 원하는 기능을 알려주시면
          빠르게 반영합니다. 🙏
        </p>
      </main>

      <BottomNav activeTab="/" onTabChange={(href) => navigate(href)} />
    </div>
  );
};

export default Beta;
