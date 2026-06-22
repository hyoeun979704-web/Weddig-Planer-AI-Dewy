// 네이티브 모바일 청첩장 모션 프리미티브(I-MOBILE Phase 1).
// 전부 CSS transform/opacity 기반 — 캔버스 트윈과 달리 부드럽고 가볍다.
// prefers-reduced-motion 을 존중(접근성).

import { useEffect, useRef, useState } from "react";

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return reduced;
}

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  /** 등장 지연(ms). 같은 섹션 내 요소를 계단식으로 등장시킬 때. */
  delay?: number;
  /** 진입 전 아래로 밀어둘 거리(px). 기본 28. */
  offset?: number;
}

/** 뷰포트 진입 시 fade-in + slide-up. 한 번만 등장(재진입 시 유지). */
export function Reveal({ children, className, delay = 0, offset = 28 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (reduced) {
      setShown(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.14, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "translateY(0)" : `translateY(${offset}px)`,
        transition: reduced
          ? undefined
          : `opacity 0.8s cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 0.8s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
        willChange: "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}

/**
 * 가벼운 패럴랙스 — 요소가 스크롤될 때 자식을 느리게 이동(translateY).
 * 히어로 사진에 깊이감을 준다. reduced-motion 이면 0.
 */
export function useParallax(speed = 0.18): { ref: React.RefObject<HTMLDivElement>; offsetY: number } {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [offsetY, setOffsetY] = useState(0);

  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        // 요소 중심과 뷰포트 중심의 거리로 이동량 계산.
        const viewportCenter = window.innerHeight / 2;
        const elCenter = rect.top + rect.height / 2;
        setOffsetY((elCenter - viewportCenter) * -speed);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [reduced, speed]);

  return { ref, offsetY };
}
