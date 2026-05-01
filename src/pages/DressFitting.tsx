import type { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Heart, Sparkles, Camera } from "lucide-react";
import BottomNav from "@/components/BottomNav";

/**
 * 방구석 드레스 투어 - AI 드레스 피팅 메인 페이지.
 *
 * Phase b-1: 페이지 골격만 (실제 업로드·생성·결과 흐름은 b-2~b-5에서 추가)
 *
 * 기획 흐름:
 *   1. 안내 → 사진 업로드 (PhotoUploadConsent 모달)
 *   2. 옵션 선택 (스타일·실루엣·컬러)
 *   3. 5 하트 차감 + Edge Function 호출 → AI 생성 대기
 *   4. 결과 페이지 (다운로드·공유·재생성·갤러리 저장)
 */
const DressFitting = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3 px-4 h-14">
          <button onClick={() => navigate(-1)} className="p-1" aria-label="뒤로">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-base font-bold text-foreground">방구석 드레스 투어</h1>
        </div>
      </header>

      <main className="px-5 py-6 pb-24">
        {/* 인트로 */}
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">
              내 사진으로 드레스 핏 미리보기
            </h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            얼굴이 잘 보이는 사진 한 장이면 충분해요. 다양한 드레스를 입어본 모습을
            AI가 자연스럽게 생성해드립니다.
          </p>
        </section>

        {/* 가격 안내 */}
        <section className="mb-6 p-4 bg-pink-50 rounded-xl border border-pink-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] text-muted-foreground mb-1">한 장 생성 비용</p>
              <div className="flex items-center gap-1">
                <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                <span className="text-lg font-bold text-foreground">5</span>
                <span className="text-sm text-muted-foreground">하트</span>
              </div>
            </div>
            <button
              onClick={() => navigate("/points")}
              className="text-[12px] text-primary font-medium underline"
            >
              하트 충전
            </button>
          </div>
        </section>

        {/* 사용법 */}
        <section className="mb-6">
          <h3 className="text-sm font-bold text-foreground mb-3">사용법</h3>
          <ol className="space-y-2 text-sm text-foreground/85">
            <Step n={1}>본인 사진 업로드 (얼굴 또는 상반신, 최대 5MB)</Step>
            <Step n={2}>원하는 드레스 스타일·실루엣·컬러 선택</Step>
            <Step n={3}>AI 생성 대기 (약 30초)</Step>
            <Step n={4}>결과 확인 후 다운로드 또는 갤러리 저장</Step>
          </ol>
        </section>

        {/* 시작 버튼 */}
        <section className="mb-6">
          <button
            type="button"
            disabled
            className="w-full bg-primary text-primary-foreground rounded-xl py-4 font-bold text-[15px] disabled:opacity-50 flex items-center justify-center gap-2"
            title="Phase b-2에서 활성화 예정"
          >
            <Camera className="w-5 h-5" />
            사진 업로드하고 시작하기
          </button>
          <p className="mt-2 text-[11px] text-center text-muted-foreground">
            진행 시{" "}
            <a href="/terms" className="underline">이용약관</a>
            과{" "}
            <a href="/privacy" className="underline">개인정보처리방침</a>
            에 동의한 것으로 간주됩니다.
          </p>
        </section>

        {/* 내 갤러리 진입 */}
        <section className="border-t border-border pt-6">
          <button
            type="button"
            onClick={() => navigate("/ai-studio/dress-tour/gallery")}
            className="w-full flex items-center justify-between text-left"
          >
            <span className="text-sm font-medium text-foreground">내 드레스 갤러리</span>
            <span className="text-[13px] text-muted-foreground">→</span>
          </button>
        </section>
      </main>

      <BottomNav
        activeTab={location.pathname}
        onTabChange={(href) => navigate(href)}
      />
    </div>
  );
};

const Step = ({ n, children }: { n: number; children: ReactNode }) => (
  <li className="flex gap-3">
    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center mt-0.5">
      {n}
    </span>
    <span className="leading-relaxed">{children}</span>
  </li>
);

export default DressFitting;
