import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart } from "lucide-react";

interface Template {
  id: string;
  name: string;
  thumbnail_url: string | null;
  tag: string;
  description: string;
}

const TEMPLATES: Template[] = [
  {
    id: "tpl-classic",
    name: "템플릿 이름",
    thumbnail_url: null,
    tag: "심플",
    description: "심플한 클래식 화이트 디자인",
  },
  {
    id: "tpl-floral",
    name: "템플릿 이름",
    thumbnail_url: null,
    tag: "로맨틱",
    description: "은은한 플로럴 무드 디자인",
  },
  {
    id: "tpl-modern",
    name: "템플릿 이름",
    thumbnail_url: null,
    tag: "모던",
    description: "깔끔한 모던 베이지 디자인",
  },
  {
    id: "tpl-luxe",
    name: "템플릿 이름",
    thumbnail_url: null,
    tag: "럭셔리",
    description: "고급스러운 골드 라인 디자인",
  },
];

const CARD_W = 100;
const CARD_H = 165;
const IMG_H = 100;

const TemplateCard = ({ template, onClick }: { template: Template; onClick: () => void }) => {
  const [liked, setLiked] = useState(false);

  return (
    <button
      onClick={onClick}
      aria-label={template.name}
      className="flex-shrink-0 flex flex-col bg-[#d9d9d9] rounded-[10px] overflow-hidden text-left active:scale-[0.97]"
      style={{ width: CARD_W, height: CARD_H }}
    >
      <div className="relative w-full" style={{ height: IMG_H }}>
        {template.thumbnail_url ? (
          <img
            src={template.thumbnail_url}
            alt={template.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/15 to-primary/5" />
        )}

        <span
          role="button"
          aria-label={liked ? "찜 해제" : "찜하기"}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setLiked((v) => !v);
          }}
          className="absolute right-1.5 top-1.5 z-10 inline-flex"
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

      <div className="flex-1 flex flex-col gap-[3px] px-2 py-1.5">
        <p className="text-[10px] font-bold leading-tight text-black line-clamp-1">
          {template.name}
        </p>
        <p className="text-[9px] leading-[1.25] text-black/55 line-clamp-2">
          {template.description}
        </p>
        <p className="text-[9px] font-semibold leading-tight text-[#f29aa3] line-clamp-1 mt-auto">
          {template.tag}
        </p>
      </div>
    </button>
  );
};

const InvitationTemplateSection = () => {
  const navigate = useNavigate();

  return (
    <section className="pt-[10px] pb-[20px] px-[20px] bg-[hsl(var(--pink-50))]">
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
      <div className="flex gap-[8px] overflow-x-auto scrollbar-hide">
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
