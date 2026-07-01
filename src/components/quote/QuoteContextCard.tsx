import { CalendarDays, MapPin, Wallet, Sparkles, ImageIcon, ClipboardList } from "lucide-react";
import { PLACE_CATEGORY_LABEL } from "@/lib/categoryLabels";
import { QUOTE_STYLE_LABEL, formatBudgetRange, type QuoteContext } from "@/lib/quoteContext";

/**
 * 견적 스레드 상단 요청 요약 카드 — 소비자·업체가 같은 화면을 본다(RLS 보호).
 * 업체는 이 카드로 예식일·지역·예산·스타일을 즉시 파악해 맞춤 답변할 수 있고,
 * 소비자는 자기 조건이 전달됐음을 확인한다. 데이터는 quote_requests 행(이미 입력한 값).
 */
const QuoteContextCard = ({ context }: { context: QuoteContext }) => {
  const dday = (() => {
    if (!context.wedding_date) return null;
    const t = new Date(context.wedding_date + "T00:00:00").getTime();
    if (Number.isNaN(t)) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.ceil((t - today.getTime()) / 86_400_000);
  })();

  const region = [context.region_city, context.region_district].filter(Boolean).join(" ");
  const budget = formatBudgetRange(context.budget_min, context.budget_max);
  const styleLabel = context.style ? QUOTE_STYLE_LABEL[context.style] : null;
  const categoryLabel = PLACE_CATEGORY_LABEL[context.category];

  const rows: { icon: React.ReactNode; text: string }[] = [];
  if (categoryLabel) rows.push({ icon: <ClipboardList className="w-3.5 h-3.5" />, text: categoryLabel });
  if (context.wedding_date) {
    const d = new Date(context.wedding_date);
    const dateStr = Number.isNaN(d.getTime()) ? context.wedding_date : d.toLocaleDateString("ko-KR");
    rows.push({
      icon: <CalendarDays className="w-3.5 h-3.5" />,
      text: dday != null && dday >= 0 ? `${dateStr} (D-${dday})` : dateStr,
    });
  }
  if (region) rows.push({ icon: <MapPin className="w-3.5 h-3.5" />, text: region });
  if (budget) rows.push({ icon: <Wallet className="w-3.5 h-3.5" />, text: `예산 ${budget}` });
  if (styleLabel) rows.push({ icon: <Sparkles className="w-3.5 h-3.5" />, text: styleLabel });
  if (context.image_count > 0) rows.push({ icon: <ImageIcon className="w-3.5 h-3.5" />, text: `참고 사진 ${context.image_count}장` });

  // 채울 신호가 하나도 없으면 카드 자체를 숨김(dead-end 방지).
  if (rows.length === 0 && !context.note) return null;

  return (
    <div className="rounded-xl border border-border bg-muted/40 p-3 mb-2">
      <p className="text-[11px] font-semibold text-muted-foreground mb-2">요청 요약</p>
      {rows.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {rows.map((r, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 text-[12px] text-foreground bg-background border border-border rounded-full px-2 py-1"
            >
              <span className="text-primary">{r.icon}</span>
              {r.text}
            </span>
          ))}
        </div>
      )}
      {context.note && (
        <p className="text-[12px] text-muted-foreground mt-2 whitespace-pre-line line-clamp-4">
          “{context.note}”
        </p>
      )}
    </div>
  );
};

export default QuoteContextCard;
