import { useState } from "react";
import { useNavigate } from "react-router-dom";
import SearchOverlay from "./SearchOverlay";
import DewyLogo from "./DewyLogo";
import { useCart } from "@/hooks/useCart";
import { useAppNotifications } from "@/hooks/useAppNotifications";
import searchIcon from "@/assets/icons/search.svg";
import bellIcon from "@/assets/icons/bell.svg";
import heartIcon from "@/assets/icons/heart.svg";
import cartIcon from "@/assets/icons/cart.svg";
import helpIcon from "@/assets/icons/help.svg";

const HomeHeader = () => {
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { itemCount } = useCart();
  const { unreadCount } = useAppNotifications();

  return (
    <>
      <header className="sticky safe-sticky-header z-50 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 h-[var(--app-header-height)]">
          {/* Logo + Guide */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-1.5"
            >
              <DewyLogo size={28} />
              <span className="font-logo text-[20px] leading-[25px] text-foreground">
                Dewy
              </span>
            </button>
            <button
              onClick={() => navigate("/tutorial")}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
              aria-label="튜토리얼"
            >
              <img src={helpIcon} alt="" className="w-[14px] h-[15px]" />
            </button>
          </div>

          {/* Right Icons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
              aria-label="검색"
            >
              <img src={searchIcon} alt="" className="w-[18px] h-[18px]" />
            </button>
            <button
              onClick={() => navigate("/notifications/inbox")}
              className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
              aria-label={unreadCount > 0 ? `알림 ${unreadCount}개` : "알림"}
            >
              <img src={bellIcon} alt="" className="w-[19px] h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => navigate("/favorites")}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
              aria-label="찜한 목록"
            >
              <img src={heartIcon} alt="" className="w-5 h-[18px]" />
            </button>
            <button
              onClick={() => navigate("/cart")}
              className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
              aria-label={itemCount > 0 ? `장바구니 (${itemCount}개)` : "장바구니"}
            >
              <img src={cartIcon} alt="" className="w-[22px] h-[22px]" />
              {itemCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                  {itemCount > 99 ? "99+" : itemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
};

export default HomeHeader;
