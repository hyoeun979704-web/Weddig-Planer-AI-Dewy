import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import SearchOverlay from "./SearchOverlay";
import DewyLogo from "./DewyLogo";
import {
  SearchIcon,
  BellIcon,
  HeartIcon,
  CartIcon,
  HelpIcon,
} from "@/components/icons/header-icons";

const HomeHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const isActive = (route: string) => location.pathname.startsWith(route);

  // Each icon is gray by default and turns brand-pink only when on the
  // route it owns (or, for search, when the overlay is open). currentColor
  // on the inline SVG paths picks this up automatically.
  const colorClass = (active: boolean) =>
    active ? "text-primary" : "text-[hsl(var(--inactive))]";

  return (
    <>
      {/* Note: top-0 and z-50 ensure header stays above CategoryTabBar */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          {/* Logo + Guide */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-1.5"
            >
              <DewyLogo size={28} />
              <span className="font-logo text-[20px] leading-[25px] text-black">
                Dewy
              </span>
            </button>
            <button
              onClick={() => navigate("/tutorial")}
              className={cn(
                "w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors",
                colorClass(isActive("/tutorial"))
              )}
              aria-label="튜토리얼"
            >
              <HelpIcon className="w-[14px] h-[15px]" />
            </button>
          </div>

          {/* Right Icons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsSearchOpen(true)}
              className={cn(
                "w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors",
                colorClass(isSearchOpen)
              )}
              aria-label="검색"
            >
              <SearchIcon className="w-[18px] h-[18px]" />
            </button>
            <button
              onClick={() => navigate("/notifications")}
              className={cn(
                "w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors",
                colorClass(isActive("/notifications"))
              )}
              aria-label="알림"
            >
              <BellIcon className="w-[19px] h-5" />
            </button>
            <button
              onClick={() => navigate("/favorites")}
              className={cn(
                "w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors",
                colorClass(isActive("/favorites"))
              )}
              aria-label="찜한 목록"
            >
              <HeartIcon className="w-5 h-[18px]" />
            </button>
            <button
              onClick={() => navigate("/cart")}
              className={cn(
                "w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors",
                colorClass(isActive("/cart"))
              )}
              aria-label="장바구니"
            >
              <CartIcon className="w-[22px] h-[22px]" />
            </button>
          </div>
        </div>
      </header>

      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
};

export default HomeHeader;
