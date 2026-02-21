import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Package, Clock, CheckCircle, XCircle, Truck, CreditCard, Loader2 } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface OrderItem {
  id: string;
  product_name: string;
  product_price: number;
  quantity: number;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  shipping_name: string;
  created_at: string;
  paid_at: string | null;
  order_items: OrderItem[];
}

const statusConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  pending: { label: "결제대기", icon: CreditCard, color: "text-amber-500" },
  paid: { label: "결제완료", icon: CheckCircle, color: "text-blue-500" },
  shipping: { label: "배송중", icon: Truck, color: "text-primary" },
  delivered: { label: "배송완료", icon: Package, color: "text-green-500" },
  cancelled: { label: "취소됨", icon: XCircle, color: "text-destructive" },
};

const formatPrice = (price: number) => price.toLocaleString() + "원";
const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
};

const Orders = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const fetch = async () => {
      const { data, error } = await (supabase
        .from("orders" as any)
        .select("*, order_items(*)") as any)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) setOrders(data as any);
      setIsLoading(false);
    };
    fetch();
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background max-w-[430px] mx-auto flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center h-14 px-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-center font-semibold text-lg pr-10">주문내역</h1>
        </div>
      </header>

      <main className="pb-20">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Package className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <p className="font-semibold text-foreground mb-1">주문 내역이 없어요</p>
            <p className="text-sm text-muted-foreground mb-4">듀이 스토어에서 쇼핑해보세요</p>
            <button
              onClick={() => navigate("/store")}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium"
            >
              스토어 가기
            </button>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {orders.map((order) => {
              const status = statusConfig[order.status] || statusConfig.pending;
              const StatusIcon = status.icon;
              const itemSummary =
                order.order_items.length > 0
                  ? order.order_items[0].product_name +
                    (order.order_items.length > 1 ? ` 외 ${order.order_items.length - 1}건` : "")
                  : "상품";

              return (
                <div key={order.id} className="bg-card rounded-2xl border border-border p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xs text-muted-foreground font-mono">{order.order_number}</p>
                      <h3 className="font-bold text-foreground mt-0.5">{itemSummary}</h3>
                    </div>
                    <div className={`flex items-center gap-1 ${status.color}`}>
                      <StatusIcon className="w-4 h-4" />
                      <span className="text-sm font-medium">{status.label}</span>
                    </div>
                  </div>

                  {/* Items */}
                  {order.order_items.length > 0 && (
                    <div className="mb-3 space-y-1">
                      {order.order_items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-muted-foreground truncate flex-1">{item.product_name} x{item.quantity}</span>
                          <span className="text-foreground ml-2">{formatPrice(item.product_price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Summary */}
                  <div className="border-t border-border pt-3 space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">결제금액</span>
                      <span className="font-bold text-primary">{formatPrice(order.total_amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">주문일</span>
                      <span className="text-foreground">{formatDate(order.created_at)}</span>
                    </div>
                  </div>

                  {/* Action */}
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => navigate("/contact")}
                      className="flex-1 py-2 bg-primary/10 text-primary rounded-xl text-sm font-medium"
                    >
                      문의하기
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav activeTab="/mypage" onTabChange={(href) => navigate(href)} />
    </div>
  );
};

export default Orders;
