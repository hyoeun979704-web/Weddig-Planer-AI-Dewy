import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart } from "lucide-react";

interface Template {
  id: string;
  name: string;
  thumbnail_url: string | null;
  tag: string;
}

const TEMPLATES: Template[] = [
  { id: "tpl-classic", name: "클래식 화이트", thumbnail_url: null, tag: "심플" },
  { id: "tpl-floral", name: "플로럴 무드", thumbnail_url: null, tag: "로맨틱" },
  { id: "tpl-modern", name: "모던 베이지", thumbnail_url: null, tag: "모던" },
  { id: "tpl-luxe", name: "럭스 골드", thumbnail_url: null, tag: "럭셔리" },
];

const CARD_W = 110;
const THUMB_H = 130;

const TemplateCard = ({ template, onClick }: { template: Template; onClick: () => void }) => {
  const [liked, setLiked] = useState(false);

  return (
    <button
      onClick={onClick}
      aria-label={template.name}
      className="flex-shrink-0 flex flex-col gap-1.5 active:scale-[0.97] text-left"
      style={{ width: CARD_W }}
    >
      <div
        className="relative w-full overflow-hidden rounded-[10px] bg-[#d9d9d9]"
        style={{ height: THUMB_H }}
      >
        {template.thumbnail_url ? (
          <img
            src={template.thumbnail_url}
            alt={template.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
            <span className="text-2xl">💌</span>
          </div>
        )}

        <span
          role="button"
          aria-label={liked ? "찜 해제" : "찜하기"}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setLiked((v) => !v);
          }}
          className="absolute right-2 top-2 z-10 inline-flex"
        >
          <Heart
            className={
              liked
                ? "h-4 w-4 fill-[#f29aa3] text-[#f29aa3]"
                : "h-4 w-4 text-white drop-shadow"
            }
            strokeWidth={2}
          />
        </span>
      </div>

      <div className="flex flex-col gap-[2px] px-[2px]">
        <p className="text-[11px] font-semibold leading-tight text-black line-clamp-1">
          {template.name}
        </p>
        <p className="text-[10px] leading-tight text-black/55 line-clamp-1">
          {template.tag}
        </p>
        <p className="text-[10px] font-medium leading-tight text-[#f29aa3]">무료</p>
      </div>
    </button>
  );
};

const InvitationTemplateSection = () => {
  const navigate = useNavigate();

  return (
    <section className="pt-[10px] pb-[30px] px-[30px] bg-[hsl(var(--pink-50))]">
      <div className="mb-[10px] flex items-center justify-between">
        <h2 className="text-[16px] font-bold text-black">5분 완성! 청첩장 만들기</h2>
        <button
          type="button"
          onClick={() => navigate("/invitation-venues")}
          className="text-[12px] text-black/50"
        >
          더보기
        </button>
      </div>
      <div className="flex gap-[10px] overflow-x-auto scrollbar-hide">
        {TEMPLATES.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            onClick={() => navigate("/invitation-venues")}
          />
        ))}
      </div>
    </section>
  );
};

export default InvitationTemplateSection;
