import { ReactNode, useState } from "react";
import { ArrowLeft, Search, Bell, Heart, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SearchOverlay from "@/components/home/SearchOverlay";
import { useCart } from "@/hooks/useCart";

interface PageHeaderProps {
  title: string;
  /** 우측 아이콘 노출. 페이지별로 선택 가능. */
  search?: boolean;
  bell?: boolean;
  fav?: boolean;
  cart?: boolean;
  /** 우측에 커스텀 노드(예: 글쓰기 펜) 추가. 기본 아이콘과 함께 노출. */
  rightExtra?: ReactNode;
  /** 백 버튼 동작 커스텀 (기본: navigate(-1)) */
  onBack?: () => void;
}

const HeaderIconButton = ({
  onClick,
  ariaLabel,
  children,
}: {
  onClick: () => void;
  ariaLabel: string;
  children: ReactNode;
}) => (
  <button
    onClick={onClick}
    aria-label={ariaLabel}
    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted active:bg-muted/80 transition-colors"
  >
    {children}
  </button>
);

const PageHeader = ({
  title,
  search,
  bell,
  fav,
  cart,
  rightExtra,
  onBack,
}: PageHeaderProps) => {
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { itemCount } = useCart();

  const handleBack = onBack ?? (() => navigate(-1));

  return (
    <>
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          {/* Back + Title (좌측 정렬) */}
          <div className="flex items-center gap-1 min-w-0">
            <button
              onClick={handleBack}
              aria-label="뒤로 가기"
              className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full hover:bg-muted active:bg-muted/80 transition-colors shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-title text-foreground truncate">{title}</h1>
          </div>

          {/* Right Icons (페이지별 노출 선택) */}
          <div className="flex items-center gap-1 shrink-0">
            {search && (
              <HeaderIconButton
                onClick={() => setIsSearchOpen(true)}
                ariaLabel="검색"
              >
                <Search className="w-5 h-5 text-muted-foreground" />
              </HeaderIconButton>
            )}
            {bell && (
              <HeaderIconButton
                onClick={() => navigate("/notifications")}
                ariaLabel="알림"
              >
                <Bell className="w-5 h-5 text-muted-foreground" />
              </HeaderIconButton>
            )}
            {fav && (
              <HeaderIconButton
                onClick={() => navigate("/favorites")}
                ariaLabel="찜한 목록"
              >
                <Heart className="w-5 h-5 text-muted-foreground" />
              </HeaderIconButton>
            )}
            {cart && (
              <button
                onClick={() => navigate("/cart")}
                aria-label={itemCount > 0 ? `장바구니 (${itemCount}개)` : "장바구니"}
                className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted active:bg-muted/80 transition-colors"
              >
                <ShoppingCart className="w-5 h-5 text-muted-foreground" />
                {itemCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-card">
                    {itemCount > 99 ? "99+" : itemCount}
                  </span>
                )}
              </button>
            )}
            {rightExtra}
          </div>
        </div>
      </header>

      {search && (
        <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      )}
    </>
  );
};

export default PageHeader;
