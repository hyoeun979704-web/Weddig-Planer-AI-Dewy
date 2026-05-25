import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, X, ArrowRight, Play } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import { useTutorialProgress } from "@/hooks/useTutorialProgress";
import { chaptersForUser, firstStartableLessonForUser } from "@/data/tutorialChapters";

// Round 18 — subline 톤 정정:
// '30초만에 둘러보기' 는 home-tour 1개 만 약속. 나머지 챕터는 천천히 진행할 수
// 있다는 점을 분명히 해 '30초 = 전체' 오해를 막는다.
const STYLE_BLURB: Record<string, { headline: string; subline: string; emoji: string }> = {
  general: {
    headline: "준비, 어디서부터 시작할까요?",
    subline: "먼저 홈 화면을 30초 안에 함께 둘러볼게요.",
    emoji: "",
  },
  small: {
    headline: "스몰웨딩이 처음이라면",
    subline: "먼저 홈 화면을 30초 안에 함께 둘러볼게요.",
    emoji: "",
  },
  self: {
    headline: "셀프웨딩 DIY 가이드",
    subline: "먼저 홈 화면을 30초 안에 함께 둘러볼게요.",
    emoji: "",
  },
  custom: {
    headline: "내 스타일에 맞춰 안내드릴게요",
    subline: "먼저 홈 화면을 30초 안에 함께 둘러볼게요.",
    emoji: "",
  },
};

/**
 * First-time welcome bottom sheet that appears once after the user finishes
 * the WeddingInfoSetupModal. Encourages them to start the tutorial chapter
 * tailored to their style rather than wandering into Korean wedding-app
 * complexity blind. Dismissed forever once the user taps either CTA.
 *
 * Self-contained: mount it once at App root (or any route that all signed-in
 * users hit) — gate logic handles when to show.
 */
const TutorialWelcomeSheet = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { weddingSettings, isLoading } = useWeddingSchedule();
  const progress = useTutorialProgress();
  const [open, setOpen] = useState(false);

  const style = weddingSettings.wedding_style;
  const blurb = STYLE_BLURB[style ?? "general"] ?? STYLE_BLURB.general;

  useEffect(() => {
    // Round 17 — 로그인 후만 튜토리얼 진행 (사용자 요구). 비로그인 사용자에겐
    // 튜토리얼 시스템 자체가 의미 없음 (포인트 적립 / 진행 저장 모두 user 의존).
    if (!user || isLoading) return;
    // progress.welcomeShown 가 DB completed 1개 이상 자동 TRUE — 캐시 wipe 후 재접속
    // 이라도 returning user 에게 다시 안 띄움.
    if (progress.welcomeShown) return;
    // Wait until onboarding is finished — otherwise we'd race the wedding-info
    // modal and stack two sheets.
    const hasDateInfo = !!weddingSettings.wedding_date || weddingSettings.wedding_date_tbd;
    const hasRegionInfo = !!weddingSettings.wedding_region || weddingSettings.wedding_region_tbd;
    const onboarded = (hasDateInfo && hasRegionInfo) || !!weddingSettings.planning_stage;
    if (!onboarded) return;
    // Small delay so the user sees the home screen first; otherwise the
    // welcome feels like another mandatory modal.
    const t = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(t);
  }, [
    user,
    isLoading,
    progress.welcomeShown,
    weddingSettings.wedding_date,
    weddingSettings.wedding_date_tbd,
    weddingSettings.wedding_region,
    weddingSettings.wedding_region_tbd,
    weddingSettings.planning_stage,
  ]);

  if (!open) return null;

  const userCtx = {
    style,
    persona: weddingSettings.persona_mode,
    role: weddingSettings.role,
  };
  const visibleChapters = chaptersForUser(userCtx);
  const totalLessons = visibleChapters.reduce((sum, c) => sum + c.lessons.length, 0);
  // 이미 끝낸 레슨(예: 자동 실행된 홈 투어)은 건너뛰고 다음 미완료 레슨을 제안 —
  // 같은 투어를 다시 권하지 않기 위함.
  const next = progress.nextLesson(style);
  // Round 18 — '30초' CTA 가 약속하는 lesson 은 placeholder 가 아닌 첫 startable.
  // home-tour 가 미완료면 그게 우선. nextLesson 은 placeholder 도 반환할 수 있어
  // CTA 약속이 깨질 수 있어 분리.
  const firstStartable = firstStartableLessonForUser(userCtx);
  const startTarget = next?.lesson && !next.lesson.placeholder
    ? next.lesson
    : firstStartable?.lesson;

  const handleStart = () => {
    progress.markWelcomeShown();
    setOpen(false);
    if (startTarget) {
      navigate(`${startTarget.route}?tutorial=${startTarget.id}`);
    } else {
      navigate("/tutorial");
    }
  };

  const handleLater = () => {
    progress.markWelcomeShown();
    setOpen(false);
  };

  const handleGoToHub = () => {
    progress.markWelcomeShown();
    setOpen(false);
    navigate("/tutorial");
  };

  return (
    <div className="fixed inset-0 z-[9998] flex items-end justify-center max-w-[430px] mx-auto pointer-events-none">
      {/* Backdrop */}
      <button
        onClick={handleLater}
        aria-label="닫기"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto animate-in fade-in duration-200"
      />

      {/* Sheet */}
      <div className="relative w-full bg-card rounded-t-3xl shadow-2xl p-5 pb-7 pointer-events-auto animate-in slide-in-from-bottom duration-300">
        {/* Drag handle */}
        <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-4" aria-hidden />

        <button
          onClick={handleLater}
          className="absolute top-3 right-3 w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center"
          aria-label="닫기"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-accent mx-auto flex items-center justify-center text-3xl mb-3">
            {blurb.emoji}
          </div>
          <h2 className="text-lg font-bold text-foreground">{blurb.headline}</h2>
          <p className="text-[13px] text-muted-foreground mt-1 px-2 leading-relaxed">
            {blurb.subline}
          </p>
        </div>

        <div className="mt-4 bg-muted/40 rounded-2xl p-3.5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <p className="text-xs font-bold text-foreground">
              전체 안내 자료 {totalLessons}개
            </p>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            나머지 가이드는 챕터별로 천천히, 원할 때 시작하세요. 완료할 때마다
            포인트가 적립되고 마이페이지에서 다시 볼 수 있어요.
          </p>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={handleLater}
            className="flex-1 h-11 rounded-xl text-foreground font-semibold text-sm border border-border bg-card"
          >
            나중에
          </button>
          <button
            onClick={handleStart}
            className="flex-[2] h-11 rounded-xl text-primary-foreground font-bold text-sm bg-primary flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
          >
            <Play className="w-4 h-4" />
            홈 화면 30초 둘러보기
          </button>
        </div>

        <button
          onClick={handleGoToHub}
          className="w-full mt-2 text-[11px] text-muted-foreground flex items-center justify-center gap-1"
        >
          전체 가이드 목록 보기 <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

export default TutorialWelcomeSheet;
