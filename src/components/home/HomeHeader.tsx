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
      <header className="sticky top-0 z-50 bg-background backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          {/* Logo + Guide */}
          <div className="flex items-center gap-1">
            <button onClick={() => navigate("/")} className="flex items-center gap-2">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="heartGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FF6B9D"/>
                    <stop offset="40%" stopColor="#FF4B77"/>
                    <stop offset="100%" stopColor="#FF8C42"/>
                  </linearGradient>
                </defs>
                <path d="M16 28C16 28 4 19.5 4 11.5C4 8.42 6.42 6 9.5 6C11.24 6 12.91 6.81 14 8.09C15.09 6.81 16.76 6 18.5 6C21.58 6 24 8.42 24 11.5C24 19.5 16 28 16 28Z" fill="url(#heartGrad)"/>
                <path d="M16 28C16 28 4 19.5 4 11.5C4 8.42 6.42 6 9.5 6C11.24 6 12.91 6.81 14 8.09C15.09 6.81 16.76 6 18.5 6C21.58 6 24 8.42 24 11.5C24 19.5 16 28 16 28Z" fill="url(#heartGrad)"/>
              </svg>
              <span className="text-lg font-bold text-foreground">Dewy</span>
            </button>
            <button
              onClick={() => navigate("/tutorial")}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
              aria-label="튜토리얼"
            >
              <HelpCircle className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Right Icons */}
          <div className="flex items-center gap-1">
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
