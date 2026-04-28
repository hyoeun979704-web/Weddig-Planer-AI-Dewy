import { useNavigate } from "react-router-dom";
import VendorMediaCard, { type VendorMediaCardData } from "./VendorMediaCard";

const TEMPLATES: VendorMediaCardData[] = [
  {
    id: "tpl-classic",
    thumbnail_url: null,
    name: "클래식 화이트",
    category_tag: "심플",
    keyword_tags: ["미니멀", "화이트"],
    info_lines: [
      { label: "가격", value: "무료", isPrice: true },
      { label: "발송", value: "100매" },
    ],
  },
  {
    id: "tpl-floral",
    thumbnail_url: null,
    name: "플로럴 무드",
    category_tag: "로맨틱",
    keyword_tags: ["플라워", "로맨틱"],
    info_lines: [
      { label: "가격", value: "무료", isPrice: true },
      { label: "발송", value: "100매" },
    ],
  },
  {
    id: "tpl-modern",
    thumbnail_url: null,
    name: "모던 베이지",
    category_tag: "모던",
    keyword_tags: ["베이지", "트렌디"],
    info_lines: [
      { label: "가격", value: "무료", isPrice: true },
      { label: "발송", value: "100매" },
    ],
  },
  {
    id: "tpl-luxe",
    thumbnail_url: null,
    name: "럭스 골드",
    category_tag: "럭셔리",
    keyword_tags: ["골드", "프리미엄"],
    info_lines: [
      { label: "가격", value: "1만원~", isPrice: true },
      { label: "발송", value: "200매" },
    ],
  },
];

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
          <VendorMediaCard
            key={template.id}
            data={template}
            onClick={() => navigate("/invitation-venues")}
          />
        ))}
      </div>
    </section>
  );
};

export default InvitationTemplateSection;
