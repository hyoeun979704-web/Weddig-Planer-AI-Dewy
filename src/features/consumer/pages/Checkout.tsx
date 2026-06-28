import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Seo from "@/components/Seo";
import { Loader2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/contexts/AuthContext";
import { readyOrderPayment } from "@/features/consumer/data/orders";
import { openExternal } from "@/lib/native/openExternal";
import { toast } from "sonner";
import { formatWon as formatPrice } from "@dewy/lib";
import { safeSessionStorage } from "@/lib/safeSessionStorage";
import { useTextDraft } from "@/hooks/useTextDraft";

// 결제 복귀 시 승인에 쓸 주문 정보(tid)를 보존.
export const ORDER_SESSION_KEY = "dewy:order:pending";

const Checkout = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, totalAmount } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 배송 정보(물리 배송 필수).
  const [shipName, setShipName] = useState("");
  const [shipPhone, setShipPhone] = useState("");
  const [shipAddress, setShipAddress] = useState("");
  const [shipMemo, setShipMemo] = useState("");
  const [agreed, setAgreed] = useState(false);

  // iOS Safari 탭 폐기 대비 배송 입력 draft 자동저장·복원.
  const { clear: clearDraft } = useTextDraft({
    scope: "checkout-shipping",
    userId: user?.id,
    values: { shipName, shipPhone, shipAddress, shipMemo },
    apply: (d) => {
      if (d.shipName != null) setShipName(d.shipName);
      if (d.shipPhone != null) setShipPhone(d.shipPhone);
      if (d.shipAddress != null) setShipAddress(d.shipAddress);
      if (d.shipMemo != null) setShipMemo(d.shipMemo);
    },
    hasContent: (v) => Boolean(v.shipName || v.shipPhone || v.shipAddress),
    enabled: !!user,
  });

  const phoneValid = /^[0-9+\-\s]{9,20}$/.test(shipPhone.trim());
  const canPay =
    !isSubmitting &&
    items.length > 0 &&
    shipName.trim().length >= 1 &&
    phoneValid &&
    shipAddress.trim().length >= 5 &&
    agreed;

  const handlePayment = async () => {
    if (!user || items.length === 0) return;
    if (!shipName.trim() || !phoneValid || shipAddress.trim().length < 5) {
      toast.error("받는 분·연락처·주소를 정확히 입력해 주세요");
      return;
    }
    if (!agreed) {
      toast.error("주문 내용 및 결제·환불 정책 동의가 필요해요");
      return;
    }
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await readyOrderPayment({
        items: items.map((it) => ({ product_id: it.product.id, quantity: it.quantity })),
        origin: window.location.origin,
        shipping: {
          name: shipName.trim(),
          phone: shipPhone.trim(),
          address: shipAddress.trim(),
          memo: shipMemo.trim(),
        },
      });
      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || "결제 준비에 실패했습니다");
      }
      safeSessionStorage.setItem(
        ORDER_SESSION_KEY,
        JSON.stringify({ tid: data.tid, partnerOrderId: data.partner_order_id, partnerUserId: data.partner_user_id }),
      );
      const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
      const redirectUrl = isMobile ? data.next_redirect_mobile_url : data.next_redirect_pc_url;
      // 리다이렉트 URL 누락 시 무한 스피너 방지 — 명시적 에러로.
      if (!redirectUrl) throw new Error("결제 페이지 주소를 받지 못했어요. 잠시 후 다시 시도해주세요");
      clearDraft(); // 주문 준비 완료 → 배송 draft 정리
      await openExternal(redirectUrl, { target: "_self" });
    } catch (err: any) {
      console.error("order ready failed:", err);
      toast.error(err.message || "결제 요청에 실패했습니다");
      setIsSubmitting(false);
    }
  };

  if (!user) {
    navigate("/auth");
    return null;
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background app-col mx-auto flex flex-col items-center justify-center px-4">
        <p className="text-muted-foreground mb-4">장바구니가 비어있습니다</p>
        <button onClick={() => navigate("/store")} className="text-primary font-medium">스토어로 이동</button>
      </div>
    );
  }

  const inputCls =
    "w-full h-11 px-3 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40";

  return (
    <div className="min-h-screen bg-background app-col mx-auto relative">
      <Seo title="주문·결제 | Dewy" description="주문 정보를 확인하고 결제를 진행하세요." path="/checkout" noIndex />
      <PageHeader title="주문/결제" />

      <main className="pb-44 px-4 py-4 space-y-4">
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

        {/* 배송 정보 — 물리 배송 필수(미수집 시 업체가 배송 불가) */}
        <div>
          <h3 className="font-bold text-foreground mb-3">배송 정보</h3>
          <div className="space-y-2">
            <input className={inputCls} placeholder="받는 분 *" value={shipName} onChange={(e) => setShipName(e.target.value)} maxLength={50} autoComplete="name" />
            <input className={inputCls} placeholder="연락처 * (예: 010-1234-5678)" value={shipPhone} onChange={(e) => setShipPhone(e.target.value)} inputMode="tel" maxLength={20} autoComplete="tel" />
            <input className={inputCls} placeholder="배송 주소 *" value={shipAddress} onChange={(e) => setShipAddress(e.target.value)} maxLength={200} autoComplete="street-address" />
            <input className={inputCls} placeholder="배송 메모 (선택)" value={shipMemo} onChange={(e) => setShipMemo(e.target.value)} maxLength={200} />
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-sm font-semibold text-foreground mb-2">결제 수단</p>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-[#FEE500]/20 border border-[#FEE500]">
            <span className="text-sm font-bold text-foreground">카카오페이</span>
            <span className="text-xs text-muted-foreground">카카오톡으로 간편결제</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">결제 진행 시 카카오페이 결제창으로 이동합니다.</p>
        </div>

        {/* 전자상거래 법적 고지 + 동의 */}
        <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-2">
          <p className="text-xs text-muted-foreground leading-relaxed">
            · <b>청약철회·환불</b>: 단순변심은 수령 후 7일 이내 가능(상품 훼손·일부 디지털재화 등 제외).
            상세는 이용약관의 환불 정책을 따릅니다.
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            · <b>미성년자 결제</b>: 만 19세 미만은 법정대리인 동의가 필요하며, 미동의 시 본인 또는 법정대리인이 취소할 수 있어요.
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            · 판매자 사업자 정보·이용조건은{" "}
            <Link to="/terms" className="text-primary underline">이용약관</Link> ·{" "}
            <Link to="/privacy" className="text-primary underline">개인정보처리방침</Link>에서 확인하실 수 있어요.
          </p>
          <label className="flex items-start gap-2 pt-1 cursor-pointer">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 w-4 h-4 accent-primary" />
            <span className="text-xs text-foreground leading-relaxed">
              주문 내용을 확인했으며, 결제·환불 정책 및 개인정보 수집·이용(배송 처리 목적)에 동의합니다. (필수)
            </span>
          </label>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 app-col mx-auto px-4 pt-4 pb-[calc(1rem+var(--safe-bottom))] bg-background border-t border-border">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">총 결제 금액</span>
          <span className="text-xl font-bold text-primary">{formatPrice(totalAmount)}</span>
        </div>
        <button
          onClick={handlePayment}
          disabled={!canPay}
          className="w-full h-12 bg-primary text-primary-foreground rounded-2xl font-semibold text-base disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
          카카오페이로 {formatPrice(totalAmount)} 결제
        </button>
      </div>
    </div>
  );
};

export default Checkout;
