import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Minus, Plus, Trash2, ShoppingCart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import { useCart } from "@/hooks/useCart";

const formatPrice = (price: number) => price.toLocaleString() + "원";

const Cart = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { items, isLoading, totalAmount, updateQuantity, removeItem } = useCart();

  const handleTabChange = (href: string) => navigate(href);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background max-w-[430px] mx-auto flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3 px-4 h-14">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">장바구니</h1>
          <span className="text-sm text-muted-foreground">({items.length})</span>
        </div>
      </header>

      <main className="pb-36 px-4 py-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <ShoppingCart className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <p className="font-semibold text-foreground mb-1">장바구니가 비어있어요</p>
            <p className="text-sm text-muted-foreground mb-4">마음에 드는 상품을 담아보세요</p>
            <Button variant="outline" onClick={() => navigate("/store")}>
              쇼핑하러 가기
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const price = item.product.sale_price ?? item.product.price;
              return (
                <div key={item.id} className="flex gap-3 p-3 bg-card rounded-2xl border border-border">
                  {/* Thumbnail */}
                  <div className="w-20 h-20 bg-muted rounded-xl flex-shrink-0 overflow-hidden">
                    {item.product.thumbnail_url ? (
                      <img src={item.product.thumbnail_url} alt={item.product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingCart className="w-6 h-6 text-muted-foreground/20" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-foreground text-sm mb-1 line-clamp-1">{item.product.name}</h4>
                    <p className="text-sm font-bold text-primary mb-2">{formatPrice(price)}</p>

                    <div className="flex items-center justify-between">
                      {/* Quantity */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover:bg-muted"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover:bg-muted"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Subtotal & Delete */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{formatPrice(price * item.quantity)}</span>
                        <button onClick={() => removeItem(item.id)} className="p-1 text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Fixed Bottom */}
      {items.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 max-w-[430px] mx-auto p-4 bg-background border-t border-border">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">총 결제 금액</span>
            <span className="text-xl font-bold text-primary">{formatPrice(totalAmount)}</span>
          </div>
          <Button onClick={() => navigate("/checkout")} className="w-full h-12 text-base font-semibold">
            주문하기
          </Button>
        </div>
      )}

      <BottomNav activeTab={location.pathname} onTabChange={handleTabChange} />
    </div>
  );
};

export default Cart;
