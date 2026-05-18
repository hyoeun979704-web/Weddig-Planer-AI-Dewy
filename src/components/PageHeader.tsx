import { useState } from "react";
import { ChevronLeft, Search, Bell, Heart, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SearchOverlay from "@/components/home/SearchOverlay";

interface PageHeaderProps {
  title: string;
}

const PageHeader = ({ title }: PageHeaderProps) => {
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          {/* Back + Title */}
          <div className="flex items-center gap-1 min-w-0">
            <button
              onClick={() => navigate(-1)}
              aria-label="뒤로 가기"
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted active:bg-muted/80 transition-colors -ml-1 shrink-0"
            >
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </button>
            <span className="text-lg font-bold text-foreground truncate">{title}</span>
          </div>

          {/* Right Icons */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setIsSearchOpen(true)}
              aria-label="검색"
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted active:bg-muted/80 transition-colors"
            >
              <Search className="w-5 h-5 text-muted-foreground" />
            </button>
            <button
              onClick={() => navigate("/notifications")}
              aria-label="알림"
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted active:bg-muted/80 transition-colors"
            >
              <Bell className="w-5 h-5 text-muted-foreground" />
            </button>
            <button
              onClick={() => navigate("/favorites")}
              aria-label="찜한 목록"
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted active:bg-muted/80 transition-colors"
            >
              <Heart className="w-5 h-5 text-muted-foreground" />
            </button>
            <button
              onClick={() => navigate("/cart")}
              aria-label="장바구니"
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted active:bg-muted/80 transition-colors"
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

export default PageHeader;
