import { useState } from "react";
import { useNavigate } from "react-router-dom";
import SearchOverlay from "./SearchOverlay";
import DewyLogo from "./DewyLogo";
import searchIcon from "@/assets/icons/search.svg";
import bellIcon from "@/assets/icons/bell.svg";
import heartIcon from "@/assets/icons/heart.svg";
import cartIcon from "@/assets/icons/cart.svg";
import helpIcon from "@/assets/icons/help.svg";

const HomeHeader = () => {
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

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
              onClick={() => navigate("/notifications")}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
              aria-label="알림"
            >
              <img src={bellIcon} alt="" className="w-[19px] h-5" />
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
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
              aria-label="장바구니"
            >
              <img src={cartIcon} alt="" className="w-[22px] h-[22px]" />
            </button>
          </div>
        </div>
      </header>

      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
};

export default HomeHeader;
