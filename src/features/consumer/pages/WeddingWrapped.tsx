import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, Share2, Sparkles } from "lucide-react";
import { useWeddingRecap } from "@/hooks/useWeddingRecap";
import { shareResultImage } from "@/lib/shareResultImage";
import { toast } from "sonner";
import Seo from "@/components/Seo";

// "결혼준비 Wrapped" — 여정 회고 + 카카오/인스타 공유 카드(차별화 베팅 ①, Spotify Wrapped 패턴).
// 규칙: 실데이터 지표만, 0건 슬라이드는 숨김(useWeddingRecap.available), 만원 단위, iOS-safe.
// 공유 카드는 CORS-tainted 이미지를 넣지 않는다(html2canvas 캡처 실패 방지) — 텍스트/그라디언트만.

const APP_URL = "https://dewy.im"; // 공유 카드 워터마크·설치 유도 링크.

const WeddingWrapped = () => {
  const navigate = useNavigate();
  const recap = useWeddingRecap();
  const shareCardRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    if (!shareCardRef.current || sharing) return;
    setSharing(true);
    try {
      // html2canvas 는 무겁고 이 라우트에서만 필요 → 동적 import(번들 분리).
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(shareCardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const dataUrl = canvas.toDataURL("image/png");
      const r = await shareResultImage({ url: dataUrl, title: "내 결혼 준비 돌아보기 — Dewy", fileName: "dewy-wrapped.png" });
      if (r === "copied") toast("이미지를 복사했어요");
      else if (r === "error" || r === "skipped") toast("공유 이미지를 저장했어요. 길게 눌러 저장/공유하세요");
    } catch {
      toast("공유 카드 생성에 실패했어요");
    } finally {
      setSharing(false);
    }
  };

  // 진입 가드 — 보여줄 실데이터가 없으면 회고 자체를 막는다(빈 Wrapped 방지).
  if (recap.isLoaded && !recap.hasAny) {
    return (
      <div className="min-h-screen bg-[#1a1230] text-white flex flex-col items-center justify-center px-8 text-center font-sans break-keep">
        <Sparkles className="w-10 h-10 text-pink-300 mb-4" />
        <p className="text-lg font-bold mb-2">아직 돌아볼 준비 기록이 적어요</p>
        <p className="text-sm text-white/70 mb-6">체크리스트를 완료하거나 마음에 드는 업체를 담으면 나만의 결혼 준비 돌아보기가 만들어져요.</p>
        <button onClick={() => navigate("/")} className="px-6 py-3 rounded-full bg-white/15 font-bold active:scale-95 transition">홈으로</button>
      </div>
    );
  }

  // 슬라이드: available 인 지표만. (인트로·아웃트로는 항상.)
  const slides: { id: string; node: React.ReactNode }[] = [];
  slides.push({
    id: "intro",
    node: (
      <>
        <Sparkles className="w-12 h-12 text-pink-300 mb-5" />
        <h1 className="text-[28px] font-extrabold leading-tight">우리의 결혼 준비,{"\n"}지금까지</h1>
        <p className="mt-3 text-white/70">Dewy와 함께한 여정을 돌아봐요</p>
      </>
    ),
  });
  if (recap.dDay.available && recap.dDay.days > 0) {
    slides.push({
      id: "dday",
      node: (
        <>
          <p className="text-white/70 mb-2">결혼식까지</p>
          <p className="text-[64px] font-extrabold text-pink-300 leading-none">D-{recap.dDay.days}</p>
          <p className="mt-4 text-white/80">한 걸음씩, 잘 오고 있어요</p>
        </>
      ),
    });
  }
  if (recap.checklist.available) {
    slides.push({
      id: "checklist",
      node: (
        <>
          <p className="text-white/70 mb-2">완료한 준비</p>
          <p className="text-[56px] font-extrabold text-emerald-300 leading-none">{recap.checklist.done}<span className="text-[28px] text-white/50">/{recap.checklist.total}</span></p>
          <p className="mt-4 text-white/80">체크리스트 {recap.checklist.percent}% 달성</p>
        </>
      ),
    });
  }
  if (recap.vendors.available) {
    slides.push({
      id: "vendors",
      node: (
        <>
          <Heart className="w-10 h-10 text-pink-300 mb-3 fill-pink-300" />
          <p className="text-white/70 mb-2">마음에 담은 업체</p>
          <p className="text-[56px] font-extrabold text-pink-200 leading-none">{recap.vendors.count}곳</p>
          <p className="mt-4 text-white/80">우리 결혼식을 채워줄 후보들</p>
        </>
      ),
    });
  }
  if (recap.budget.available) {
    slides.push({
      id: "budget",
      node: (
        <>
          <p className="text-white/70 mb-2">지금까지 관리한 예산</p>
          <p className="text-[48px] font-extrabold text-amber-200 leading-none">{recap.budget.spentManwon.toLocaleString()}만원</p>
          <p className="mt-4 text-white/80">계획적으로 잘 쓰고 있어요</p>
        </>
      ),
    });
  }
  if (recap.persona.available) {
    slides.push({
      id: "persona",
      node: (
        <>
          <p className="text-white/70 mb-2">당신의 결혼 유형</p>
          <p className="text-[30px] font-extrabold text-violet-200 leading-tight">{recap.persona.label}</p>
          <p className="mt-3 text-white/80">{recap.persona.styleLabel} 스타일</p>
        </>
      ),
    });
  }
  slides.push({
    id: "outro",
    node: (
      <>
        <Heart className="w-12 h-12 text-pink-300 mb-5 fill-pink-300" />
        <h2 className="text-[24px] font-extrabold leading-tight">우리의 결혼,{"\n"}Dewy와 완성해요</h2>
        <button
          onClick={handleShare}
          disabled={sharing}
          className="mt-7 inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-white text-[#1a1230] font-bold active:scale-95 transition disabled:opacity-60"
        >
          <Share2 className="w-5 h-5" /> {sharing ? "만드는 중…" : "공유하기"}
        </button>
      </>
    ),
  });

  return (
    <div className="min-h-screen bg-[#1a1230] text-white font-sans break-keep">
      <Seo title="결혼 준비 돌아보기 | Dewy" description="Dewy와 함께한 내 결혼 준비 여정을 돌아보고 공유해요." path="/wrapped" />
      <button
        onClick={() => navigate(-1)}
        aria-label="닫기"
        className="fixed top-0 left-0 z-10 m-2 p-2 rounded-full bg-black/20 safe-sticky-header"
      >
        <ArrowLeft className="w-5 h-5 text-white" />
      </button>

      {/* 세로 스냅 슬라이드 — 각 슬라이드는 한 화면(9:16 느낌). */}
      <div className="h-screen overflow-y-auto snap-y snap-mandatory scrollbar-hide">
        {slides.map((s) => (
          <section
            key={s.id}
            className="h-screen snap-start flex flex-col items-center justify-center text-center px-8 whitespace-pre-line"
          >
            {s.node}
          </section>
        ))}
      </div>

      {/* 공유용 합성 카드 — 화면 밖에 렌더(캡처 전용). 텍스트/그라디언트만(CORS 안전). */}
      <div className="fixed -left-[9999px] top-0" aria-hidden>
        <div
          ref={shareCardRef}
          className="w-[360px] h-[640px] flex flex-col justify-between p-8 text-white"
          style={{ background: "linear-gradient(160deg,#2a1b4d 0%,#1a1230 60%,#3a1f3a 100%)" }}
        >
          <div className="flex items-center gap-2 text-pink-200 font-bold">
            <span style={{ fontSize: 22 }}>♥</span> Dewy 결혼 준비 돌아보기
          </div>
          <div className="space-y-5">
            {recap.dDay.available && recap.dDay.days > 0 && (
              <div><div className="text-white/60 text-sm">결혼식까지</div><div className="text-pink-300 font-extrabold" style={{ fontSize: 40 }}>D-{recap.dDay.days}</div></div>
            )}
            {recap.checklist.available && (
              <div><div className="text-white/60 text-sm">완료한 준비</div><div className="text-emerald-300 font-extrabold" style={{ fontSize: 32 }}>{recap.checklist.done}/{recap.checklist.total} · {recap.checklist.percent}%</div></div>
            )}
            {recap.vendors.available && (
              <div><div className="text-white/60 text-sm">담은 업체</div><div className="text-pink-200 font-extrabold" style={{ fontSize: 32 }}>{recap.vendors.count}곳</div></div>
            )}
            {recap.budget.available && (
              <div><div className="text-white/60 text-sm">관리한 예산</div><div className="text-amber-200 font-extrabold" style={{ fontSize: 28 }}>{recap.budget.spentManwon.toLocaleString()}만원</div></div>
            )}
            {recap.persona.available && (
              <div><div className="text-white/60 text-sm">결혼 유형</div><div className="text-violet-200 font-extrabold" style={{ fontSize: 22 }}>{recap.persona.label}</div></div>
            )}
          </div>
          <div className="text-white/70 text-sm">{APP_URL.replace("https://", "")} · AI 웨딩 플래너 Dewy</div>
        </div>
      </div>
    </div>
  );
};

export default WeddingWrapped;
