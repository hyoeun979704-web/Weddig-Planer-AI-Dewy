import { faqs, FAQ_CATEGORIES, type Faq } from "@/data/faqs";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import Seo from "@/components/Seo";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// 실제 제품(AI 웨딩플래너: 체크리스트·예산·AI 시뮬·청첩장·커플·구독)에 맞춘 FAQ.
// 카테고리 탭/검색은 실제 필터로 동작하며, FAQPage 구조화 데이터를 함께 제공한다.
const faqCategories = FAQ_CATEGORIES;


const FAQ = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return faqs.filter((f) => {
      const inCategory = activeCategory === "all" || f.category === activeCategory;
      const inQuery = q === "" || (f.question + f.answer).toLowerCase().includes(q);
      return inCategory && inQuery;
    });
  }, [query, activeCategory]);

  // FAQPage 구조화 데이터(가시 콘텐츠와 일치). 리치결과는 deprecated 이나 AI/검색 이해에 유효.
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      <Seo
        title="자주 묻는 질문 | Dewy AI 웨딩플래너"
        description="Dewy 사용법부터 비용·AI 시뮬레이션·데이터까지, 예비부부가 가장 궁금해하는 질문과 답변을 모았습니다."
        path="/faq"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <PageHeader title="자주 묻는 질문" />

      <main className="pb-20">
        {/* Search */}
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="궁금한 내용을 검색해보세요"
              className="pl-10"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 p-4 overflow-x-auto">
          {faqCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                cat.id === activeCategory
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* FAQ List */}
        <div className="px-4">
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              검색 결과가 없어요. 다른 키워드로 검색하거나 1:1 문의를 남겨주세요.
            </p>
          ) : (
            <Accordion type="single" collapsible className="space-y-2">
              {filtered.map((faq) => (
                <AccordionItem
                  key={faq.id}
                  value={`faq-${faq.id}`}
                  className="bg-card rounded-xl border border-border px-4"
                >
                  <AccordionTrigger className="text-left text-sm font-medium py-4">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground pb-4 whitespace-pre-line">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>

        {/* Contact Link */}
        <div className="p-4 mt-4">
          <div className="p-4 bg-muted rounded-2xl text-center">
            <p className="text-sm text-muted-foreground mb-2">찾으시는 답변이 없으신가요?</p>
            <button
              onClick={() => navigate("/contact")}
              className="text-sm text-primary font-medium"
            >
              1:1 문의하기 →
            </button>
          </div>
        </div>
      </main>

      <BottomNav activeTab="/mypage" onTabChange={(href) => navigate(href)} />
    </div>
  );
};

export default FAQ;
