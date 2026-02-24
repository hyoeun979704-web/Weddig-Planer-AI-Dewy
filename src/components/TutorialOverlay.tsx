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
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Measure tooltip after render
  useEffect(() => {
    if (!tooltipRef.current) return;
    const measure = () => {
      const r = tooltipRef.current?.getBoundingClientRect();
      if (r) setTooltipRect({ width: r.width, height: r.height });
    };
    // Measure after animation settles
    const t = setTimeout(measure, 50);
    return () => clearTimeout(t);
  }, [currentStepIndex, isActive]);

  const findAndSetTarget = useCallback(() => {
    if (!currentStep) return;
    const el = document.querySelector(currentStep.targetSelector);
    if (el) {
      // First scroll into view
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      // Then re-measure after scroll completes
      const measure = () => {
        const rect = el.getBoundingClientRect();
        setTargetRect(rect);
      };
      // Measure immediately and again after scroll settles
      measure();
      setTimeout(measure, 400);
    } else {
      setTargetRect(null);
    }
  }, [currentStep]);

  useEffect(() => {
    if (!isActive || !currentStep) return;
    const timer = setTimeout(findAndSetTarget, 150);
    return () => clearTimeout(timer);
  }, [isActive, currentStep, findAndSetTarget]);

  if (!isActive || !currentStep) return null;

  const isLastStep = currentStepIndex === totalSteps - 1;
  const isFirstStep = currentStepIndex === 0;
  const padding = 8;

  // Calculate tooltip position
  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetRect) {
      return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
    }

    const pos = currentStep.position;
    const tW = tooltipRect.width;
    const tH = tooltipRect.height;
    const gap = 12;
    const margin = 16;

    let top = 0;
    let left = 0;

    // Horizontal centering relative to target
    left = targetRect.left + targetRect.width / 2 - tW / 2;

    if (pos === "bottom") {
      top = targetRect.bottom + gap;
      // If tooltip goes below viewport, flip to top
      if (top + tH > window.innerHeight - margin) {
        top = targetRect.top - gap - tH;
      }
    } else if (pos === "top") {
      top = targetRect.top - gap - tH;
      // If tooltip goes above viewport, flip to bottom
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

    // Final clamp to viewport
    top = Math.max(margin, Math.min(top, window.innerHeight - tH - margin));
    left = Math.max(margin, Math.min(left, window.innerWidth - tW - margin));

    return { position: "fixed", top, left };
  };

  return (
    <div className="fixed inset-0 z-[9999]">
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

      {/* Click catcher */}
      <div className="absolute inset-0" onClick={onNext} />

      {/* Tooltip card + skip */}
      <div
        ref={tooltipRef}
        onClick={(e) => e.stopPropagation()}
        style={getTooltipStyle()}
        className="fixed z-[10000] w-[300px] animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
      >
        <div className="bg-card rounded-2xl shadow-xl border border-border p-5">
          {/* Step indicator */}
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

          <h3 className="text-base font-bold text-foreground mb-1.5">{currentStep.title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            {currentStep.description}
          </p>

          <div className="flex items-center justify-between">
            <button
              onClick={onPrev}
              disabled={isFirstStep}
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
              className="flex items-center gap-1 text-sm px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              {isLastStep ? "완료" : "다음"} {!isLastStep && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Skip button below tooltip */}
        <div className="flex justify-center mt-2">
          <button
            onClick={(e) => { e.stopPropagation(); onSkip(); }}
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
