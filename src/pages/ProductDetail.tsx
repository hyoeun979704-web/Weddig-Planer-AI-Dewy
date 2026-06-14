import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft, ShoppingCart, Star, Minus, Plus, Loader2, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/contexts/AuthContext";
import { FavoriteButton } from "@/components/FavoriteButton";
import { getSourceLabel } from "@/lib/storeCategories";
import { formatWon as formatPrice } from "@/lib/priceFormat";
import { safeUrl } from "@/lib/safeUrl";

interface Product {
  id: string;
  name: string;
  description: string | null;
  short_description: string | null;
  category: string;
  price: number;
  sale_price: number | null;
  thumbnail_url: string | null;
  images: string[];
  stock: number;
  rating: number;
  review_count: number;
  sold_count: number;
  source: string;
  source_url: string | null;
  source_mall: string | null;
}


const ProductDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { addToCart, itemCount } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      const { data } = await (supabase
        .from("products" as any)
        .select("*") as any)
        .eq("id", id)
        .single();
      setProduct(data as any);
      setIsLoading(false);
    };
    fetch();
  }, [id]);

  const handleAddToCart = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!product) return;

    setIsAdding(true);
    const success = await addToCart(product.id, quantity);
    setIsAdding(false);
    if (success) {
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    }
  };

  const handleBuyNow = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!product) return;

    setIsAdding(true);
    const ok = await addToCart(product.id, quantity);
    setIsAdding(false);
    // 담기에 실패하면(에러 토스트는 useCart 에서) 빈/오래된 카트로 보내지 않는다.
    if (ok) navigate("/cart");
  };

  const handleTabChange = (href: string) => navigate(href);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background app-col mx-auto flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background app-col mx-auto flex items-center justify-center">
        <p className="text-muted-foreground">상품을 찾을 수 없습니다</p>
      </div>
    );
  }

  const discountPercent = product.sale_price
    ? Math.round((1 - product.sale_price / product.price) * 100)
    : null;
  const finalPrice = product.sale_price ?? product.price;
  const isExternal = product.source !== "manual" && !!product.source_url;
  const sourceLabel = isExternal ? getSourceLabel(product.source) : null;

  const handleGoExternal = () => {
    const url = safeUrl(product.source_url);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="min-h-screen bg-background app-col mx-auto relative">
      {/* Header */}
      <header className="sticky safe-sticky-header z-40 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex items-center gap-1">
            <FavoriteButton itemId={product.id} itemType="product" />
            <button onClick={() => navigate("/cart")} className="relative p-2">
              <ShoppingCart className="w-5 h-5 text-foreground" />
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="pb-36">
        {/* Image */}
        <div className="relative h-80 bg-muted flex items-center justify-center">
          {product.thumbnail_url ? (
            <img src={product.thumbnail_url} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <ShoppingCart className="w-16 h-16 text-muted-foreground/20" />
          )}
          {sourceLabel && (
            <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-background/90 backdrop-blur-sm text-xs font-semibold text-foreground border border-border">
              {sourceLabel}
              <ExternalLink className="w-3 h-3" />
            </span>
          )}
        </div>

        <div className="px-4 py-4">
          {/* Name */}
          <h1 className="text-xl font-bold text-foreground mb-2">{product.name}</h1>

          {/* Rating */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-primary text-primary" />
              <span className="text-sm font-medium text-foreground">{product.rating}</span>
            </div>
            <span className="text-sm text-muted-foreground">리뷰 {product.review_count}개</span>
            <span className="text-sm text-muted-foreground">· {product.sold_count.toLocaleString()}개 판매</span>
          </div>

          {/* Price */}
          <div className="mb-4 p-4 bg-muted/50 rounded-2xl">
            <div className="flex items-center gap-3">
              {discountPercent && (
                <span className="text-2xl font-black text-primary">{discountPercent}%</span>
              )}
              <div>
                {product.sale_price && (
                  <p className="text-sm text-muted-foreground line-through">{formatPrice(product.price)}</p>
                )}
                <p className="text-2xl font-bold text-foreground">{formatPrice(finalPrice)}</p>
              </div>
            </div>
          </div>

          {/* Quantity (자체 상품 only) */}
          {!isExternal && (
            <>
              <div className="flex items-center justify-between mb-4 p-3 bg-card rounded-xl border border-border">
                <span className="text-sm font-medium text-foreground">수량</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-muted"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-lg font-bold text-foreground w-8 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-muted"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between mb-6">
                <span className="text-sm text-muted-foreground">총 상품 금액</span>
                <span className="text-lg font-bold text-primary">{formatPrice(finalPrice * quantity)}</span>
              </div>
            </>
          )}

          {/* Description */}
          {product.description && (
            <div className="border-t border-border pt-4">
              <h3 className="font-semibold text-foreground mb-2">상품 설명</h3>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{product.description}</p>
            </div>
          )}

          {/* Stock / external notice */}
          {isExternal ? (
            <p className="text-xs text-muted-foreground mt-4">
              {sourceLabel}에서 판매되는 외부 상품입니다. 구매하기를 누르면 {sourceLabel} 페이지로 이동합니다.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-4">재고: {product.stock}개 남음</p>
          )}
        </div>
      </main>

      {/* Fixed Bottom CTA */}
      <div className="fixed bottom-16 left-0 right-0 app-col mx-auto p-4 bg-background border-t border-border">
        {isExternal ? (
          <Button onClick={handleGoExternal} className="w-full h-12 font-semibold">
            <ExternalLink className="w-5 h-5 mr-1" />
            {sourceLabel}에서 구매하기
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleAddToCart}
              disabled={isAdding || product.stock === 0}
              className="flex-1 h-12"
            >
              {isAdding ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : added ? (
                <>
                  <Check className="w-5 h-5 mr-1" />
                  담았어요
                </>
              ) : (
                <>
                  <ShoppingCart className="w-5 h-5 mr-1" />
                  장바구니
                </>
              )}
            </Button>
            <Button
              onClick={handleBuyNow}
              disabled={isAdding || product.stock === 0}
              className="flex-1 h-12 font-semibold"
            >
              바로 구매
            </Button>
          </div>
        )}
      </div>

      <BottomNav activeTab={location.pathname} onTabChange={handleTabChange} />
    </div>
  );
};

export default ProductDetail;
