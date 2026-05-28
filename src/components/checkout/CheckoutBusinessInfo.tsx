// 결제 화면 하단에 표시하는 사업자 정보. 전자상거래법 / PG 심사 요건.
// 통신판매업 신고번호는 발급 후 보완 예정 (현재 미발급 상태).

const CheckoutBusinessInfo = () => (
  <div className="p-3 rounded-2xl border border-border bg-muted/30 text-[11px] text-muted-foreground leading-relaxed">
    <p className="font-semibold text-foreground text-[12px] mb-1">사업자 정보</p>
    <p>(주)듀이 · 대표 김효은 · 사업자등록번호 218-38-01132</p>
    <p>충청남도 천안시 서북구 천안대로 1446, 16층 듀이</p>
    <p>고객센터 050-6459-7504 (평일 10:00~18:00) · kheceo@dewy-wedding.com</p>
  </div>
);

export default CheckoutBusinessInfo;
