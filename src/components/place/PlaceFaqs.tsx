import { useEffect, useState, useCallback } from "react";
import { HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface PlaceFaq {
  id: string;
  question: string;
  answer: string;
}

// 업체 상세페이지의 "자주 묻는 질문" 섹션 — place_faqs(place_id별 1:N)를 읽어 아코디언으로 렌더.
// 큐레이션 게이트: is_active=true 만(RLS 도 동일 차단). 0건이면 섹션 자체를 숨긴다(빈 영역·dead-end 방지).
// 데이터 채움은 운영자/업체 오너 권한(RLS)으로 INSERT — 등재된 업체에만 FAQ가 붙는다.
const PlaceFaqs = ({ placeId }: { placeId: string }) => {
  const [faqs, setFaqs] = useState<PlaceFaq[]>([]);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("place_faqs" as any)
      .select("id, question, answer")
      .eq("place_id", placeId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    setFaqs(((data ?? []) as unknown as PlaceFaq[]));
  }, [placeId]);

  useEffect(() => { load(); }, [load]);

  if (faqs.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="font-bold text-sm flex items-center gap-1.5">
        <HelpCircle className="w-4 h-4 text-primary" /> 자주 묻는 질문
      </h3>
      <Accordion type="single" collapsible className="w-full">
        {faqs.map((f) => (
          <AccordionItem key={f.id} value={f.id} className="border-border">
            <AccordionTrigger className="text-sm font-semibold text-left text-foreground py-3">
              {f.question}
            </AccordionTrigger>
            <AccordionContent className="text-[13px] text-muted-foreground leading-relaxed whitespace-pre-line">
              {f.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};

export default PlaceFaqs;
