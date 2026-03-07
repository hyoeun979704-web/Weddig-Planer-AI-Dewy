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
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate(-1)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors -ml-1"
            >
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </button>
            <span className="text-lg font-bold text-foreground">{title}</span>
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

export default PageHeader;
