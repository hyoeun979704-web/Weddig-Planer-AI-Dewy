import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import VendorMediaCard, { type VendorMediaCardData } from "./VendorMediaCard";

interface TemplateRow {
  id: string;
  name: string;
  thumbnail_url: string | null;
  format: string;
  tone: string | null;
  price_hearts: number | null;
}

const TONE_LABEL: Record<string, string> = {
  ROMANTIC: "로맨틱",
  MODERN: "모던",
  CLASSIC: "클래식",
  MINIMAL: "미니멀",
  CUTE: "큐트",
  LUXURY: "럭셔리",
};

const toCardData = (t: TemplateRow): VendorMediaCardData => ({
  id: t.id,
  thumbnail_url: t.thumbnail_url,
  name: t.name,
  category: t.format === "paper" ? "종이" : "모바일",
  concept: t.tone ? TONE_LABEL[t.tone] ?? t.tone : "",
  mood: "",
  strength: "",
  info_lines: [
    {
      label: "가격",
      value: (t.price_hearts ?? 0) > 0 ? `${t.price_hearts}하트` : "무료",
      isPrice: true,
    },
  ],
});

const InvitationTemplateSection = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<TemplateRow[]>([]);

  // 실제 등록된(노출 중인) 청첩장 템플릿을 불러와 카드로 연동.
  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("invitation_templates")
        .select("id, name, thumbnail_url, format, tone, price_hearts")
        .eq("is_active", true)
        .in("face", ["front", "both"])
        .order("display_order", { ascending: true })
        .limit(10);
      setTemplates((data as TemplateRow[]) ?? []);
    })();
  }, []);

  // 등록된 템플릿이 아직 없으면 섹션을 숨김(가짜 카드 노출 방지).
  if (templates.length === 0) return null;

  const goCreate = (t: TemplateRow) =>
    navigate(
      `/invitation/new?format=${t.format === "paper" ? "paper" : "mobile"}&template=${t.id}`,
    );

  return (
    <section className="pt-[10px] pb-[20px] px-[20px] bg-[hsl(var(--pink-50))]">
      <div className="mb-[10px] flex items-center justify-between">
        <h2 className="text-[16px] font-bold text-black">5분 완성! 청첩장 만들기</h2>
        <button
          type="button"
          onClick={() => navigate("/invitation/new")}
          className="text-[12px] text-black/50"
        >
          더보기
        </button>
      </div>
      <div className="flex gap-[8px] overflow-x-auto scrollbar-hide">
        {templates.map((t) => (
          <VendorMediaCard
            key={t.id}
            data={toCardData(t)}
            onClick={() => goCreate(t)}
          />
        ))}
      </div>
    </section>
  );
};

export default InvitationTemplateSection;
