import type { ComponentType } from "react";
import TropicalGreenScroll, {
  type TropicalGreenScrollProps,
} from "@/components/invitation/scroll/TropicalGreenScroll";

/**
 * html_component 청첩장 렌더러 레지스트리.
 * InvitationLayout.component 키 → React 컴포넌트.
 * 새 인터랙티브 템플릿을 추가하면 여기에 등록한다.
 */
const REGISTRY: Record<string, ComponentType<TropicalGreenScrollProps>> = {
  "tropical-green-scroll": TropicalGreenScroll,
};

export function getScrollComponent(
  component: string | undefined | null,
): ComponentType<TropicalGreenScrollProps> | null {
  if (!component) return null;
  return REGISTRY[component] ?? null;
}

export { TropicalGreenScroll };
export type { TropicalGreenScrollProps };
