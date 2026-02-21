import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Loader2, CreditCard, Building, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const formatPrice = (price: number) => price.toLocaleString() + "원";

const paymentMethods = [
  { id: "card", label: "카드 결제", icon: CreditCard },
  { id: "transfer", label: "계좌이체", icon: Building },
  { id: "toss", label: "토스페이", icon: Smartphone },
];

const Checkout = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, totalAmount, clearCart } = useCart();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [memo, setMemo] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const generateOrderNumber = () => {
    const now = new Date();
    const date = now.toISOString().slice(2, 10).replace(/-/g, "");
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `DW${date}${rand}`;
  };

  const handleSubmit = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (!name.trim() || !phone.trim() || !address.trim()) {
      toast.error("배송 정보를 모두 입력해주세요");
      return;
    }

    if (items.length === 0) {
      toast.error("장바구니가 비어있습니다");
      return;
    }

    setIsSubmitting(true);

    try {
      const orderNumber = generateOrderNumber();

      // 1. 주문 생성
      const { data: order, error: orderError } = await (supabase
        .from("orders" as any) as any)
        .insert({
          user_id: user.id,
          order_number: orderNumber,
          status: "pending",
          total_amount: totalAmount,
          shipping_name: name.trim(),
          shipping_phone: phone.trim(),
          shipping_address: address.trim(),
          shipping_memo: memo.trim() || null,
          payment_method: paymentMethod,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. 주문 상품 생성
      const orderItems = items.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product.name,
        product_price: item.product.sale_price ?? item.product.price,
        quantity: item.quantity,
      }));

      const { error: itemsError } = await (supabase
        .from("order_items" as any) as any)
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // 3. 장바구니 비우기
      await clearCart();

      // 4. 결제 완료 (현재는 바로 paid 처리, 나중에 PG 연동)
      await (supabase
        .from("orders" as any) as any)
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", order.id);

      toast.success("주문이 완료되었습니다! 🎉");
      navigate(`/order-complete/${order.id}`, { replace: true });
    } catch (error) {
      console.error("Error placing order:", error);
      toast.error("주문에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background max-w-[430px] mx-auto flex flex-col items-center justify-center px-4">
        <p className="text-muted-foreground mb-4">장바구니가 비어있습니다</p>
        <Button onClick={() => navigate("/store")}>스토어로 이동</Button>
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
          <h1 className="text-lg font-bold text-foreground">주문서</h1>
        </div>
      </header>

      <main className="pb-36 px-4 py-4 space-y-6">
        {/* Order Summary */}
        <div>
          <h3 className="font-bold text-foreground mb-3">주문 상품</h3>
          <div className="space-y-2">
            {items.map((item) => {
              const price = item.product.sale_price ?? item.product.price;
              return (
                <div key={item.id} className="flex items-center justify-between p-3 bg-card rounded-xl border border-border">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground line-clamp-1">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">수량: {item.quantity}개</p>
                  </div>
                  <span className="text-sm font-bold text-foreground">{formatPrice(price * item.quantity)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Shipping Info */}
        <div>
          <h3 className="font-bold text-foreground mb-3">배송 정보</h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">받는 분</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">연락처</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="010-0000-0000" type="tel" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">배송지</label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="주소를 입력하세요" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">배송 메모</label>
              <Textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="배송 요청사항 (선택)"
                className="resize-none h-20"
              />
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div>
          <h3 className="font-bold text-foreground mb-3">결제 수단</h3>
          <div className="space-y-2">
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => setPaymentMethod(method.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                  paymentMethod === method.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <method.icon className={`w-5 h-5 ${paymentMethod === method.id ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`text-sm font-medium ${paymentMethod === method.id ? "text-primary" : "text-foreground"}`}>
                  {method.label}
                </span>
                {paymentMethod === method.id && (
                  <Check className="w-4 h-4 text-primary ml-auto" />
                )}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            * 현재 테스트 모드입니다. 실제 결제가 이루어지지 않습니다.
          </p>
        </div>
      </main>

      {/* Fixed Bottom */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto p-4 bg-background border-t border-border">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">총 결제 금액</span>
          <span className="text-xl font-bold text-primary">{formatPrice(totalAmount)}</span>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !name.trim() || !phone.trim() || !address.trim()}
          className="w-full h-12 text-base font-semibold"
        >
          {isSubmitting ? (
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
          ) : null}
          {formatPrice(totalAmount)} 결제하기
        </Button>
      </div>
    </div>
  );
};

export default Checkout;
