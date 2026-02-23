import { useEffect, useState, useRef } from "react";
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
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !currentStep) return;

    const findTarget = () => {
      const el = document.querySelector(currentStep.targetSelector);
      if (el) {
        const rect = el.getBoundingClientRect();
        setTargetRect(rect);
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        setTargetRect(null);
      }
    };

    // Small delay to let DOM settle
    const timer = setTimeout(findTarget, 150);
    return () => clearTimeout(timer);
  }, [isActive, currentStep]);

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
    const style: React.CSSProperties = { position: "fixed" };

    if (pos === "bottom") {
      style.top = targetRect.bottom + padding + 8;
      style.left = Math.max(16, Math.min(targetRect.left + targetRect.width / 2 - 150, window.innerWidth - 316));
    } else if (pos === "top") {
      style.bottom = window.innerHeight - targetRect.top + padding + 8;
      style.left = Math.max(16, Math.min(targetRect.left + targetRect.width / 2 - 150, window.innerWidth - 316));
    } else if (pos === "right") {
      style.top = targetRect.top + targetRect.height / 2 - 60;
      style.left = targetRect.right + padding + 8;
    } else {
      style.top = targetRect.top + targetRect.height / 2 - 60;
      style.right = window.innerWidth - targetRect.left + padding + 8;
    }

    return style;
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

      {/* Skip button */}
      <button
        onClick={(e) => { e.stopPropagation(); onSkip(); }}
        className="fixed top-4 right-4 z-[10000] flex items-center gap-1 px-3 py-1.5 rounded-full bg-card/90 backdrop-blur-sm text-muted-foreground text-sm border border-border hover:bg-card transition-colors"
      >
        건너뛰기 <X className="w-3.5 h-3.5" />
      </button>

      {/* Tooltip card */}
      <div
        ref={tooltipRef}
        onClick={(e) => e.stopPropagation()}
        style={getTooltipStyle()}
        className="fixed z-[10000] w-[300px] bg-card rounded-2xl shadow-xl border border-border p-5 animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
      >
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
    </div>
  );
};

export default TutorialOverlay;
