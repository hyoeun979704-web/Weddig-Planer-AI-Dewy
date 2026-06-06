import { useEffect, useState, useRef, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TutorialStep } from "@/hooks/useTutorial";

interface TutorialOverlayProps {
  isActive: boolean;
  currentStep: TutorialStep;
  currentStepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

// Round 17 P0 — viewport margin 계산에 sticky bottom-nav 높이 (64px) + safe-area 반영.
// tooltip 이 BottomNav 뒤에 안 가도록.
const BOTTOM_NAV_HEIGHT = 64;

// Round 17 P0 — targetSelector miss 시 retry. lazy mount / skeleton 동안 발화될 수 있음.
// 5회 × 200ms = 최대 1초 안에 element 안 나타나면 onSkip (회색 풀스크린 어둠 회피).
const TARGET_RETRY_MAX = 5;
const TARGET_RETRY_INTERVAL_MS = 200;

const TutorialOverlay = ({
  isActive,
  currentStep,
  currentStepIndex,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
}: TutorialOverlayProps) => {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipRect, setTooltipRect] = useState<{ width: number; height: number }>({ width: 300, height: 200 });
  const [targetMissing, setTargetMissing] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const retryRef = useRef(0);
  // 찾은 타깃 element 참조 — 비동기 콘텐츠 로딩/스크롤로 위치가 바뀌어도
  // 하이라이트가 따라가도록 재측정에 사용.
  const targetElRef = useRef<Element | null>(null);

  // Measure tooltip after render
  useEffect(() => {
    if (!tooltipRef.current) return;
    const measure = () => {
      const r = tooltipRef.current?.getBoundingClientRect();
      if (r) setTooltipRect({ width: r.width, height: r.height });
    };
    const t = setTimeout(measure, 50);
    return () => clearTimeout(t);
  }, [currentStepIndex, isActive]);

  const findAndSetTarget = useCallback(() => {
    if (!currentStep) return;
    const el = document.querySelector(currentStep.targetSelector);
    if (el) {
      setTargetMissing(false);
      retryRef.current = 0;
      targetElRef.current = el;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      const measure = () => {
        const rect = el.getBoundingClientRect();
        setTargetRect(rect);
      };
      measure();
      setTimeout(measure, 400);
      return true;
    }
    return false;
  }, [currentStep]);

  // Round 17 P0 fix — target retry. lazy mount / async skeleton 동안 element 없을 수 있음.
  useEffect(() => {
    if (!isActive || !currentStep) return;
    retryRef.current = 0;
    setTargetMissing(false);
    setTargetRect(null);
    // 단계 전환 시 이전 타깃 참조를 비워, 재측정 폴링이 옛 요소를 잠깐 다시
    // 강조(하이라이트 깜빡임)하지 않도록 한다.
    targetElRef.current = null;

    let cancelled = false;
    const attempt = () => {
      if (cancelled) return;
      const found = findAndSetTarget();
      if (found) return;
      retryRef.current += 1;
      if (retryRef.current >= TARGET_RETRY_MAX) {
        setTargetMissing(true);
        return;
      }
      setTimeout(attempt, TARGET_RETRY_INTERVAL_MS);
    };
    const initial = setTimeout(attempt, 150);
    return () => {
      cancelled = true;
      clearTimeout(initial);
    };
  }, [isActive, currentStep, findAndSetTarget]);

  // 타깃 위치 추적 — 비동기 콘텐츠(관리자 카드·커플 연동 카드 등)가 타깃 위에서
  // 뒤늦게 로드되면 타깃이 아래로 밀리는데, 시작 시점에 한 번 잰 rect 만 쓰면
  // 하이라이트가 옛 위치(예: 프로필 카드)에 남는다. scroll·resize·ResizeObserver +
  // 초기 폴링으로 계속 재측정해 하이라이트가 실제 요소를 따라가게 한다.
  useEffect(() => {
    if (!isActive) return;
    const remeasure = () => {
      const el = targetElRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setTargetRect((prev) =>
        prev &&
        prev.top === r.top &&
        prev.left === r.left &&
        prev.width === r.width &&
        prev.height === r.height
          ? prev
          : r,
      );
    };
    window.addEventListener("scroll", remeasure, true);
    window.addEventListener("resize", remeasure);
    const ro = new ResizeObserver(remeasure);
    ro.observe(document.body);
    // 초기 ~1.2s rAF 폴링: 부드러운 스크롤 정착 + lazy mount 레이아웃 시프트 대응.
    let raf = 0;
    let polls = 0;
    const poll = () => {
      remeasure();
      polls += 1;
      if (polls < 72) raf = requestAnimationFrame(poll);
    };
    raf = requestAnimationFrame(poll);
    return () => {
      window.removeEventListener("scroll", remeasure, true);
      window.removeEventListener("resize", remeasure);
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [isActive, currentStepIndex]);

  // Round 17 P0 a11y — ESC=skip / ArrowRight=next / ArrowLeft=prev 키보드 네비게이션.
  useEffect(() => {
    if (!isActive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onSkip();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        onNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        onPrev();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isActive, onNext, onPrev, onSkip]);

  if (!isActive || !currentStep) return null;

  const isLastStep = currentStepIndex === totalSteps - 1;
  const isFirstStep = currentStepIndex === 0;
  const padding = 8;

  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetRect) {
      return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
    }

    const pos = currentStep.position;
    const tW = tooltipRect.width;
    const tH = tooltipRect.height;
    const gap = 12;
    const margin = 16;
    // Round 17 — BottomNav 가 화면 하단 64px 고정. tooltip 하단 clamp 시 그만큼 빼야
    // BottomNav 뒤로 안 숨음. SafeArea-inset-bottom 도 함께.
    const bottomReserved = BOTTOM_NAV_HEIGHT + margin;

    let top = 0;
    let left = 0;

    left = targetRect.left + targetRect.width / 2 - tW / 2;

    if (pos === "bottom") {
      top = targetRect.bottom + gap;
      if (top + tH > window.innerHeight - bottomReserved) {
        top = targetRect.top - gap - tH;
      }
    } else if (pos === "top") {
      top = targetRect.top - gap - tH;
      if (top < margin) {
        top = targetRect.bottom + gap;
      }
    } else if (pos === "right") {
      top = targetRect.top + targetRect.height / 2 - tH / 2;
      left = targetRect.right + gap;
    } else {
      top = targetRect.top + targetRect.height / 2 - tH / 2;
      left = targetRect.left - gap - tW;
    }

    top = Math.max(margin, Math.min(top, window.innerHeight - tH - bottomReserved));
    left = Math.max(margin, Math.min(left, window.innerWidth - tW - margin));

    return { position: "fixed", top, left };
  };

  // Round 17 P0 — target 못 찾고 retry 다 소진 시 자동 skip + 안내.
  if (targetMissing) {
    return (
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tut-missing-title"
      >
        <div className="bg-card rounded-2xl shadow-xl border border-border p-5 max-w-[300px] mx-4">
          <h3 id="tut-missing-title" className="text-base font-bold text-foreground mb-1.5">
            안내를 표시할 수 없어요
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            화면이 아직 준비 중이거나 해당 영역이 보이지 않아요. 잠시 후 다시 시도하거나
            마이페이지의 가이드 메뉴에서 다시 시작할 수 있어요.
          </p>
          <button
            onClick={onSkip}
            className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
          >
            닫기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[9999]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tut-step-title"
      aria-describedby="tut-step-desc"
    >
      {/* Overlay with cutout */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }}>
        <defs>
          <mask id="tutorial-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - padding}
                y={targetRect.top - padding}
                width={targetRect.width + padding * 2}
                height={targetRect.height + padding * 2}
                rx="12"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0" y="0" width="100%" height="100%"
          fill="hsl(0 0% 0% / 0.6)"
          mask="url(#tutorial-mask)"
        />
      </svg>

      {/* Highlight border */}
      {targetRect && (
        <div
          className="absolute border-2 border-primary rounded-xl pointer-events-none animate-pulse"
          style={{
            left: targetRect.left - padding,
            top: targetRect.top - padding,
            width: targetRect.width + padding * 2,
            height: targetRect.height + padding * 2,
          }}
        />
      )}

      {/* Round 17 P0 — Click catcher 변경: cutout 외부(dim 영역) 만 click-to-next.
          cutout 안쪽은 pointer-events 통과 안 함 → 사용자가 강조된 요소 직접 클릭 가능.
          SVG 4분할 dim 영역(target 위/아래/좌/우)에만 onClick. interactive step 학습 지원. */}
      {targetRect ? (
        <>
          <div
            className="absolute"
            style={{ left: 0, top: 0, right: 0, height: Math.max(0, targetRect.top - padding) }}
            onClick={onNext}
          />
          <div
            className="absolute"
            style={{ left: 0, top: targetRect.bottom + padding, right: 0, bottom: 0 }}
            onClick={onNext}
          />
          <div
            className="absolute"
            style={{
              left: 0,
              top: Math.max(0, targetRect.top - padding),
              width: Math.max(0, targetRect.left - padding),
              height: targetRect.height + padding * 2,
            }}
            onClick={onNext}
          />
          <div
            className="absolute"
            style={{
              left: targetRect.right + padding,
              top: Math.max(0, targetRect.top - padding),
              right: 0,
              height: targetRect.height + padding * 2,
            }}
            onClick={onNext}
          />
        </>
      ) : (
        <div className="absolute inset-0" onClick={onNext} />
      )}

      {/* Tooltip card + skip */}
      <div
        ref={tooltipRef}
        onClick={(e) => e.stopPropagation()}
        style={getTooltipStyle()}
        className="fixed z-[10000] w-[300px] animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
      >
        <div className="bg-card rounded-2xl shadow-xl border border-border p-5">
          <div className="flex items-center gap-1.5 mb-3">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === currentStepIndex
                    ? "w-6 bg-primary"
                    : i < currentStepIndex
                    ? "w-1.5 bg-primary/50"
                    : "w-1.5 bg-muted"
                )}
              />
            ))}
            <span className="ml-auto text-xs text-muted-foreground">
              {currentStepIndex + 1}/{totalSteps}
            </span>
          </div>

          <h3 id="tut-step-title" className="text-base font-bold text-foreground mb-1.5">
            {currentStep.title}
          </h3>
          <p id="tut-step-desc" className="text-sm text-muted-foreground leading-relaxed mb-4">
            {currentStep.description}
          </p>

          <div className="flex items-center justify-between">
            <button
              onClick={onPrev}
              disabled={isFirstStep}
              aria-label="이전 단계"
              className={cn(
                "flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg transition-colors",
                isFirstStep
                  ? "text-muted-foreground/40 cursor-not-allowed"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <ChevronLeft className="w-4 h-4" /> 이전
            </button>
            <button
              onClick={onNext}
              aria-label={isLastStep ? "튜토리얼 완료" : "다음 단계"}
              autoFocus
              className="flex items-center gap-1 text-sm px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              {isLastStep ? "완료" : "다음"} {!isLastStep && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex justify-center mt-2">
          <button
            onClick={(e) => { e.stopPropagation(); onSkip(); }}
            aria-label="튜토리얼 건너뛰기"
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-card/90 backdrop-blur-sm text-muted-foreground text-xs border border-border hover:bg-card transition-colors"
          >
            건너뛰기 <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TutorialOverlay;
