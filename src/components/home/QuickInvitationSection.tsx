import { useNavigate } from "react-router-dom";

/**
 * "5분 완성! 청첩장 만들기" home section.
 *
 * Mirrors the design spec: three placeholder template tiles (큰 회색
 * 썸네일 + "템플 이름" 캡션) representing invitation templates the user
 * can drop into. The thumbnail tiles are intentional placeholders for
 * now — actual template artwork drops in later. All three currently
 * route to /ai-studio so the home tab still has a one-tap on-ramp to
 * the invitation flow.
 */

interface TemplateCard {
  id: string;
  /** Template name placeholder per design ("템플 이름"). */
  name: string;
  /** Slogan / one-line description placeholder per design. */
  caption: string;
}

const cards: TemplateCard[] = [
  { id: "template-1", name: "템플 이름", caption: "슬로건 또는 한 줄 추가 캡션" },
  { id: "template-2", name: "템플 이름", caption: "슬로건 또는 한 줄 추가 캡션" },
  { id: "template-3", name: "템플 이름", caption: "슬로건 또는 한 줄 추가 캡션" },
];

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
            key={card.id}
            onClick={() => navigate("/ai-studio")}
            className="flex-shrink-0 w-[120px] rounded-2xl overflow-hidden bg-white border border-border shadow-[var(--shadow-card)] active:scale-[0.98] transition-transform text-left"
            aria-label={`${card.name} — ${card.caption}`}
          >
            {/* Thumbnail placeholder — gray block per design. Actual template
                artwork drops in here later. Aspect ~3:4 to match the design. */}
            <div className="aspect-[3/4] bg-[#d9d9d9]" aria-hidden />
            <div className="px-3 py-2.5">
              <p className="text-[13px] font-bold text-foreground leading-tight">
                {card.name}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-1">
                {card.caption}
              </p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};

export default QuickInvitationSection;
