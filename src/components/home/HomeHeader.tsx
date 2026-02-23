import { useState } from "react";
import { Search, Bell, Heart, ShoppingCart, HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SearchOverlay from "./SearchOverlay";

const HomeHeader = () => {
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <>
      {/* Note: top-0 and z-50 ensure header stays above CategoryTabBar */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          {/* Logo */}
          <button 
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5"
          >
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-sm font-bold">D</span>
            </div>
            <span className="text-lg font-bold text-foreground">Dewy</span>
          </button>

          {/* Right Icons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate("/tutorial")}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
              aria-label="튜토리얼"
            >
              <HelpCircle className="w-[18px] h-[18px] text-muted-foreground" />
            </button>
            <button 
              onClick={() => setIsSearchOpen(true)}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
            >
              <Search className="w-5 h-5 text-muted-foreground" />
            </button>
            <button 
              onClick={() => navigate("/notifications")}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors relative"
            >
              <Bell className="w-5 h-5 text-muted-foreground" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
            </button>
            <button 
              onClick={() => navigate("/favorites")}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
            >
              <Heart className="w-5 h-5 text-muted-foreground" />
            </button>
            <button 
              onClick={() => navigate("/cart")}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
            >
              <ShoppingCart className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </header>

      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
};

export default HomeHeader;
