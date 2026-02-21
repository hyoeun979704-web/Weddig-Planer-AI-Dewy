import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CheckCircle, Package, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const formatPrice = (price: number) => price.toLocaleString() + "원";

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  shipping_name: string;
  shipping_address: string;
  created_at: string;
}

const OrderComplete = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      const { data } = await (supabase
        .from("orders" as any)
        .select("id, order_number, total_amount, shipping_name, shipping_address, created_at") as any)
        .eq("id", id)
        .single();
      setOrder(data as any);
      setIsLoading(false);
    };
    fetch();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background max-w-[430px] mx-auto flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto flex flex-col items-center justify-center px-6">
      <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-6">
        <CheckCircle className="w-10 h-10 text-green-500" />
      </div>

      <h1 className="text-2xl font-bold text-foreground mb-2">주문 완료!</h1>
      <p className="text-muted-foreground text-center mb-8">
        주문이 성공적으로 완료되었어요
      </p>

      {order && (
        <div className="w-full bg-card rounded-2xl border border-border p-5 mb-8 space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">주문번호</span>
            <span className="text-sm font-mono font-medium text-foreground">{order.order_number}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">결제금액</span>
            <span className="text-sm font-bold text-primary">{formatPrice(order.total_amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">받는분</span>
            <span className="text-sm text-foreground">{order.shipping_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">배송지</span>
            <span className="text-sm text-foreground text-right max-w-[200px] truncate">{order.shipping_address}</span>
          </div>
        </div>
      )}

      <div className="w-full space-y-3">
        <Button onClick={() => navigate("/orders")} variant="outline" className="w-full h-12">
          <Package className="w-4 h-4 mr-2" />
          주문 내역 보기
        </Button>
        <Button onClick={() => navigate("/store")} className="w-full h-12">
          쇼핑 계속하기
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default OrderComplete;
