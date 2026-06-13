import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Play,
  CheckCircle2,
  Sparkles,
  RotateCcw,
  ArrowRight,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { confirm } from "@/components/ui/confirm-dialog";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import { useTutorialProgress } from "@/hooks/useTutorialProgress";
import {
  chaptersForUser,
  TUTORIAL_CHAPTERS,
  type TutorialLesson,
  type TutorialChapter,
} from "@/data/tutorialChapters";
import { cn } from "@/lib/utils";

const ACCENT_CLASSES: Record<TutorialChapter["accent"], { bg: string; text: string; ring: string }> = {
  rose: { bg: "bg-rose-50", text: "text-rose-600", ring: "ring-rose-200" },
  amber: { bg: "bg-amber-50", text: "text-amber-700", ring: "ring-amber-200" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200" },
  violet: { bg: "bg-violet-50", text: "text-violet-700", ring: "ring-violet-200" },
  sky: { bg: "bg-sky-50", text: "text-sky-700", ring: "ring-sky-200" },
};

const Tutorial = () => {
  const navigate = useNavigate();
  const { weddingSettings } = useWeddingSchedule();
  const style = weddingSettings.wedding_style;
  const progress = useTutorialProgress();

  const userCtx = useMemo(
    () => ({
      style,
      persona: weddingSettings.persona_mode,
      role: weddingSettings.role,
    }),
    [style, weddingSettings.persona_mode, weddingSettings.role],
  );
  const visibleChapters = useMemo(() => chaptersForUser(userCtx), [userCtx]);
  const overall = progress.styleProgress(userCtx);
  const nextUp = progress.nextLesson(userCtx);

  // Lessons that are hidden by the style filter but technically available
  // (e.g. self-wedding user wants to peek at the SDM lesson). Surfaced in a
  // collapsible footer so the page never feels gate-locked.
  const hiddenLessons: { chapter: TutorialChapter; lesson: TutorialLesson }[] = useMemo(() => {
    const visibleIds = new Set(visibleChapters.flatMap(c => c.lessons.map(l => l.id)));
    return TUTORIAL_CHAPTERS.flatMap(ch =>
      ch.lessons
        .filter(l => !visibleIds.has(l.id))
        .map(l => ({ chapter: ch, lesson: l }))
    );
  }, [visibleChapters]);

  const startLesson = (lesson: TutorialLesson) => {
    navigate(`${lesson.route}?tutorial=${lesson.id}`);
  };

  const progressDeg = (overall.percent / 100) * 360;

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      <PageHeader title="가이드 & 튜토리얼" />

      <main className="pb-24">
        {/* Overall progress hero */}
        <section className="px-4 pt-5">
          <div className="rounded-3xl bg-gradient-to-br from-primary/10 via-accent/30 to-background border border-primary/15 p-5 relative overflow-hidden">
            <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-primary/10 blur-3xl" aria-hidden />

            <div className="relative flex items-center gap-4">
              <div
                className="w-[84px] h-[84px] rounded-full flex items-center justify-center shrink-0"
                style={{
                  background: `conic-gradient(hsl(var(--primary)) ${progressDeg}deg, hsl(var(--muted)) ${progressDeg}deg)`,
                }}
              >
                <div className="w-[72px] h-[72px] rounded-full bg-card flex flex-col items-center justify-center">
                  <span className="text-xl font-extrabold text-primary leading-none">
                    {overall.percent}%
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">
                    {overall.done}/{overall.total} 완료
                  </span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 rounded-full px-2 py-0.5">
                  <Sparkles className="w-3 h-3" /> {style ? `${style === "self" ? "셀프웨딩" : style === "small" ? "스몰웨딩" : style === "custom" ? "맞춤" : "일반 결혼식"} 코스` : "기본 코스"}
                </p>
                <h2 className="text-base font-bold text-foreground mt-1.5 leading-tight">
                  {nextUp
                    ? "이어서 시작해볼까요?"
                    : overall.total > 0 && overall.percent === 100
                      ? "모든 가이드 완료!"
                      : "Dewy를 처음이라면 여기부터"}
                </h2>
                <p className="text-[12px] text-muted-foreground mt-0.5">
                  {nextUp
                    ? `다음 레슨: ${nextUp.lesson.title}`
                    : "결혼 스타일에 맞는 가이드만 모았어요"}
                </p>
              </div>
            </div>

            {nextUp && (
              <button
                onClick={() => startLesson(nextUp.lesson)}
                className="relative w-full mt-4 h-11 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              >
                <Play className="w-4 h-4" />
                이어서 시작 · +{nextUp.lesson.reward}P
              </button>
            )}
          </div>
        </section>

        {/* Chapters */}
        <section className="px-4 pt-5 space-y-4">
          {visibleChapters.map(chapter => {
            const a = ACCENT_CLASSES[chapter.accent];
            const chapterDone = chapter.lessons.every(l => progress.isCompleted(l.id));
            return (
              <div
                key={chapter.id}
                className="bg-card rounded-2xl border border-border overflow-hidden"
              >
                <div className="px-4 py-3 flex items-center gap-3 border-b border-border">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-xl", a.bg)}>
                    {chapter.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">{chapter.title}</p>
                    <p className="text-[11px] text-muted-foreground">{chapter.subtitle}</p>
                  </div>
                  {chapterDone && (
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full ring-1", a.text, a.ring, a.bg)}>
                      완료
                    </span>
                  )}
                </div>

                <ul className="divide-y divide-border">
                  {chapter.lessons.map(lesson => {
                    const done = progress.isCompleted(lesson.id);
                    const placeholder = !!lesson.placeholder;
                    return (
                      <li key={lesson.id}>
                        <button
                          onClick={() => {
                            if (placeholder) return;
                            startLesson(lesson);
                          }}
                          disabled={placeholder}
                          aria-disabled={placeholder}
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                            placeholder
                              ? "opacity-60 cursor-not-allowed"
                              : "hover:bg-muted/50 active:bg-muted/80",
                          )}
                        >
                          <span className="w-7 h-7 rounded-full flex items-center justify-center bg-muted shrink-0">
                            {done ? (
                              <CheckCircle2 className="w-4 h-4 text-primary" />
                            ) : (
                              <Play className="w-3.5 h-3.5 text-muted-foreground ml-0.5" />
                            )}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              "text-sm font-semibold leading-tight",
                              done || placeholder ? "text-muted-foreground" : "text-foreground"
                            )}>
                              {lesson.title}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight truncate">
                              {placeholder
                                ? "준비 중인 가이드입니다 — 곧 열려요"
                                : `${lesson.description} · ${lesson.steps.length}단계`}
                            </p>
                          </div>
                          <span className={cn(
                            "text-[10px] font-semibold shrink-0 px-2 py-0.5 rounded-full",
                            placeholder
                              ? "bg-muted text-muted-foreground ring-1 ring-border"
                              : done
                                ? "bg-muted text-muted-foreground"
                                : "bg-primary/10 text-primary",
                          )}>
                            {placeholder
                              ? "준비 중"
                              : done
                                ? "다시 보기"
                                : `+${lesson.reward}P`}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </section>

        {/* Hidden / off-style lessons */}
        {hiddenLessons.length > 0 && (
          <section className="px-4 pt-5">
            <details className="bg-card rounded-2xl border border-dashed border-border overflow-hidden">
              <summary className="px-4 py-3 cursor-pointer flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <ArrowRight className="w-3.5 h-3.5" />
                내 스타일에 안 보이는 가이드 ({hiddenLessons.length})
              </summary>
              <ul className="divide-y divide-border border-t border-border">
                {hiddenLessons.map(({ chapter, lesson }) => {
                  const placeholder = !!lesson.placeholder;
                  return (
                    <li key={lesson.id}>
                      <button
                        onClick={() => {
                          if (placeholder) return;
                          startLesson(lesson);
                        }}
                        disabled={placeholder}
                        aria-disabled={placeholder}
                        className={cn(
                          "w-full px-4 py-3 flex items-center gap-3 text-left",
                          placeholder ? "opacity-60 cursor-not-allowed" : "hover:bg-muted/50",
                        )}
                      >
                        <span className="text-base">{chapter.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground">{lesson.title}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {placeholder ? "준비 중 · " : ""}{chapter.title}
                          </p>
                        </div>
                        {placeholder ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground ring-1 ring-border">
                            준비 중
                          </span>
                        ) : (
                          <Play className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </details>
          </section>
        )}

        {/* Reset link (subtle, for re-running tutorials) */}
        {overall.done > 0 && (
          <section className="px-4 pt-6">
            <button
              onClick={async () => {
                if (await confirm({ title: "튜토리얼 진행률을 초기화할까요?", description: "다음 방문 시 다시 안내가 시작돼요." })) {
                  progress.reset();
                }
              }}
              className="w-full text-[11px] text-muted-foreground flex items-center justify-center gap-1 py-2"
            >
              <RotateCcw className="w-3 h-3" /> 튜토리얼 진행률 초기화
            </button>
          </section>
        )}
      </main>

      <BottomNav activeTab="/" onTabChange={(href) => navigate(href)} />
    </div>
  );
};

export default Tutorial;
