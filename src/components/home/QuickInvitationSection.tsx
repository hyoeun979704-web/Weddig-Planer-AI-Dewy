import { useNavigate } from "react-router-dom";

interface QuickStartCard {
  title: string;
  description: string;
  /** Where the card routes — currently all roads lead to /ai-studio. */
  path: string;
  /** Inline gradient background; mirrors HeroBanner's color language. */
  background: string;
  /** Optional emoji glyph centered on the thumbnail. */
  glyph: string;
}

const cards: QuickStartCard[] = [
  {
    title: "모바일 청첩장",
    description: "AI가 5분 만에 완성",
    path: "/ai-studio",
    background:
      "radial-gradient(circle at 30% 20%, #FFFFFF 0%, #FBD4DC 60%, #F6909B 120%)",
    glyph: "💌",
  },
  {
    title: "종이 청첩장",
    description: "정성가득 인쇄용",
    path: "/ai-studio",
    background:
      "radial-gradient(circle at 30% 20%, #FFFFFF 0%, #FCE3BE 60%, #F5BE7A 120%)",
    glyph: "📜",
  },
  {
    title: "청첩장 모음",
    description: "샘플 둘러보기",
    path: "/ai-studio",
    background:
      "radial-gradient(circle at 30% 20%, #FFFFFF 0%, #DCEEFB 60%, #A8D2F0 120%)",
    glyph: "🎀",
  },
];

/**
 * "5분 완성! 청첩장 만들기" home section — three quick-start tiles that
 * route to AI Studio. The home feed otherwise lacks a fast on-ramp to the
 * invitation flow (the 6-card AI Studio grid is one tab over) so this
 * section turns the most common task into a one-tap path from the home
 * tab itself.
 */
const QuickInvitationSection = () => {
  const navigate = useNavigate();

  return (
    <section className="px-4 py-5">
      <h2 className="text-[16px] font-bold text-black mb-[10px]">
        5분 완성! 청첩장 만들기
      </h2>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4">
        {cards.map((card) => (
          <button
            key={card.title}
            onClick={() => navigate(card.path)}
            className="flex-shrink-0 w-[140px] rounded-2xl overflow-hidden bg-white border border-border shadow-[var(--shadow-card)] active:scale-[0.98] transition-transform text-left"
            aria-label={`${card.title} — ${card.description}`}
          >
            <div
              className="aspect-square flex items-center justify-center text-[40px]"
              style={{ background: card.background }}
              aria-hidden
            >
              {card.glyph}
            </div>
            <div className="px-3 py-2.5">
              <p className="text-[14px] font-bold text-foreground leading-tight">
                {card.title}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {card.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};

export default QuickInvitationSection;
