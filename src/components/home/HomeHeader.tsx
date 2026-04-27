import { useState } from "react";
import type { CSSProperties } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import SearchOverlay from "./SearchOverlay";
import DewyLogo from "./DewyLogo";
import searchIcon from "@/assets/icons/search.svg";
import bellIcon from "@/assets/icons/bell.svg";
import heartIcon from "@/assets/icons/heart.svg";
import cartIcon from "@/assets/icons/cart.svg";
import helpIcon from "@/assets/icons/help.svg";

const maskStyle = (url: string): CSSProperties => ({
  WebkitMaskImage: `url(${url})`,
  maskImage: `url(${url})`,
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
  WebkitMaskPosition: "center",
  maskPosition: "center",
  WebkitMaskSize: "contain",
  maskSize: "contain",
});

const HomeHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const isActive = (route: string) => location.pathname.startsWith(route);

  const iconClass = (active: boolean) =>
    cn(
      "block transition-colors",
      active ? "bg-primary" : "bg-[hsl(var(--inactive))]"
    );

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
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
              aria-label="튜토리얼"
            >
              <span
                aria-hidden
                className={cn(iconClass(isActive("/tutorial")), "w-[14px] h-[15px]")}
                style={maskStyle(helpIcon)}
              />
            </button>
          </div>

          {/* Right Icons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
              aria-label="검색"
            >
              <span
                aria-hidden
                className={cn(iconClass(isSearchOpen), "w-[18px] h-[18px]")}
                style={maskStyle(searchIcon)}
              />
            </button>
            <button
              onClick={() => navigate("/notifications")}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
              aria-label="알림"
            >
              <span
                aria-hidden
                className={cn(iconClass(isActive("/notifications")), "w-[19px] h-5")}
                style={maskStyle(bellIcon)}
              />
            </button>
            <button
              onClick={() => navigate("/favorites")}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
              aria-label="찜한 목록"
            >
              <span
                aria-hidden
                className={cn(iconClass(isActive("/favorites")), "w-5 h-[18px]")}
                style={maskStyle(heartIcon)}
              />
            </button>
            <button
              onClick={() => navigate("/cart")}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
              aria-label="장바구니"
            >
              <span
                aria-hidden
                className={cn(iconClass(isActive("/cart")), "w-[22px] h-[22px]")}
                style={maskStyle(cartIcon)}
              />
            </button>
          </div>
        </div>
      </header>

      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
};

export default HomeHeader;
