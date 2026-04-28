import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import HomeHeader from "@/components/home/HomeHeader";
import CategoryTabBar, { CategoryTab } from "@/components/home/CategoryTabBar";
import BottomNav from "@/components/BottomNav";

const tabRoutes: Record<CategoryTab, string> = {
  "ai-planner": "/",
  "ai-studio": "/ai-studio",
  tips: "/magazine",
  events: "/deals",
  shopping: "/store",
};

const inferCategoryTab = (pathname: string): CategoryTab => {
  if (pathname === "/" || pathname.startsWith("/ai-planner")) return "ai-planner";
  if (pathname.startsWith("/ai-studio")) return "ai-studio";
  if (pathname.startsWith("/magazine")) return "tips";
  if (pathname.startsWith("/deals")) return "events";
  if (pathname.startsWith("/store")) return "shopping";
  return "ai-planner";
};

interface AppLayoutProps {
  children: ReactNode;
  /** Hide the CategoryTabBar — use for Schedule / Budget / Community / MyPage. */
  hideCategoryTabBar?: boolean;
  /** Override which CategoryTab pill is highlighted; falls back to route-based inference. */
  activeCategoryTab?: CategoryTab;
  /** Extra classes on the outer page container. */
  className?: string;
  /** Extra classes on the <main> element. */
  mainClassName?: string;
}

const AppLayout = ({
  children,
  hideCategoryTabBar = false,
  activeCategoryTab,
  className,
  mainClassName,
}: AppLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const resolvedTab = activeCategoryTab ?? inferCategoryTab(location.pathname);

  return (
    <div
      className={cn(
        "min-h-screen bg-background max-w-[430px] mx-auto relative",
        className
      )}
    >
      <HomeHeader />
      {!hideCategoryTabBar && (
        <CategoryTabBar
          activeTab={resolvedTab}
          onTabChange={(tab) => navigate(tabRoutes[tab])}
        />
      )}
      {/* Page-body fade — subtle 180ms upward slide on each route change so
          navigation feels intentional rather than cut. Keyed on pathname so
          Framer Motion treats route changes as remounts; HomeHeader /
          CategoryTabBar / BottomNav stay outside the motion container so
          they don't re-animate on every hop. */}
      <motion.main
        key={location.pathname}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className={cn("pb-20", mainClassName)}
      >
        {children}
      </motion.main>
      <BottomNav
        activeTab={location.pathname}
        onTabChange={(href) => navigate(href)}
      />
    </div>
  );
};

export default AppLayout;
