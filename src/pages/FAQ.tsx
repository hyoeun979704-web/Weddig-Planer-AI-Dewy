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
const faqCategories = [
  { id: "all", label: "전체" },
  { id: "start", label: "시작·기능" },
  { id: "ai", label: "AI·시뮬레이션" },
  { id: "pay", label: "비용·결제" },
  { id: "account", label: "계정·데이터" },
];

type Faq = { id: number; category: string; question: string; answer: string };

const faqs: Faq[] = [
  // 시작·기능
  {
    id: 1,
    category: "start",
    question: "Dewy는 어떤 앱인가요?",
    answer:
      "Dewy는 결혼 준비 체크리스트, D-Day 일정, 예산 관리, 양가 분담, 웨딩홀·스드메 추천을 한곳에서 정리해주는 AI 웨딩플래너 앱입니다.",
  },
  {
    id: 2,
    category: "start",
    question: "결혼 준비, 어디서부터 시작하면 되나요?",
    answer:
      "결혼식 날짜만 입력하면 남은 기간에 맞춰 해야 할 일이 D-Day 체크리스트로 자동 정리됩니다. 무엇부터 할지 막막한 단계에서 가장 먼저 써보기 좋아요.",
  },
  {
    id: 3,
    category: "start",
    question: "체크리스트는 어떻게 쓰나요?",
    answer:
      "예식일을 기준으로 준비 항목이 시기별로 정렬됩니다. 끝낸 항목을 체크하면 진행률이 보이고, 우리 예식에 맞게 항목을 추가·수정할 수 있어요.",
  },
  {
    id: 4,
    category: "start",
    question: "예산과 양가 분담은 어떻게 관리하나요?",
    answer:
      "항목별 예산과 실제 지출을 기록하고, 양가 분담 시뮬레이터로 분담 비율과 총액을 정리할 수 있습니다. 계약금·잔금 시점도 함께 관리돼요.",
  },
  {
    id: 5,
    category: "start",
    question: "웨딩홀·스드메 추천은 어떻게 받나요?",
    answer:
      "지역과 예산을 기준으로 웨딩홀·스튜디오·드레스·메이크업 등을 추천하고, 같은 기준으로 비교할 수 있습니다. 마음에 든 곳은 예산·체크리스트와 연결해 관리하세요.",
  },
  {
    id: 6,
    category: "start",
    question: "둘이 함께 쓸 수 있나요?",
    answer:
      "커플 투표로 웨딩홀·스드메 후보를 함께 고르고, 커플 다이어리로 준비 과정을 함께 기록할 수 있습니다. 둘이 같이 준비하기 좋아요.",
  },
  {
    id: 7,
    category: "start",
    question: "모바일 청첩장도 만들 수 있나요?",
    answer:
      "네, 결혼식 정보·사진·지도를 담은 모바일 청첩장을 만들어 링크로 공유할 수 있습니다. 결혼 준비 일정과 한 앱에서 이어집니다.",
  },
  {
    id: 8,
    category: "start",
    question: "아이폰에서도 쓸 수 있나요?",
    answer:
      "Dewy는 웹앱으로 제공되어 아이폰·안드로이드 브라우저에서 모두 사용할 수 있고, 안드로이드는 앱 설치도 가능합니다.",
  },
  // AI·시뮬레이션
  {
    id: 9,
    category: "ai",
    question: "AI 웨딩플래너 상담은 무엇을 해주나요?",
    answer:
      "'6개월 남았는데 뭐부터 해야 해요?', '스드메 준비 순서 알려줘' 같은 질문에 결혼 시기·예산·지역을 반영해 답해줍니다. 준비 방향을 잡는 데 도움이 돼요.",
  },
  {
    id: 10,
    category: "ai",
    question: "AI 드레스·메이크업 시뮬레이션은 어떻게 쓰나요?",
    answer:
      "내 사진을 올리면 다양한 드레스 라인과 메이크업 스타일을 합성해 미리 볼 수 있습니다. 발품을 팔기 전에 어울리는 방향을 좁히는 용도로 좋아요. 실제 착용과 100% 같지는 않습니다.",
  },
  {
    id: 11,
    category: "ai",
    question: "업로드한 사진은 어떻게 처리되나요?",
    answer:
      "AI 시뮬레이션에 올린 사진은 처리 후 정해진 기간(30일) 내에 자동 삭제됩니다. 자세한 내용은 개인정보 처리방침에서 확인할 수 있어요.",
  },
  // 비용·결제
  {
    id: 12,
    category: "pay",
    question: "Dewy는 무료인가요?",
    answer:
      "체크리스트·일정·예산 등 핵심 기능은 무료로 사용할 수 있습니다. 일부 AI 시뮬레이션 등 고급 기능은 별도로 제공될 수 있어요.",
  },
  {
    id: 13,
    category: "pay",
    question: "프리미엄 구독은 얼마인가요?",
    answer:
      "프리미엄 구독은 월 4,900원 / 연 39,000원이며, 구독 시 AI 플래너 무제한 이용과 PDF 견적 리포트 등이 제공됩니다. (가격·혜택은 변경될 수 있어요.)",
  },
  {
    id: 14,
    category: "pay",
    question: "하트는 무엇인가요?",
    answer:
      "하트는 AI 시뮬레이션처럼 일부 기능을 이용할 때 쓰는 앱 내 재화입니다. 가입 시 보너스로 지급되며, 필요 시 충전할 수 있어요.",
  },
  {
    id: 15,
    category: "pay",
    question: "결제 취소·환불은 어떻게 하나요?",
    answer:
      "인앱결제·구독 환불은 결제하신 스토어(Google Play 등)의 정책에 따라 처리됩니다. 그 외 문의는 고객센터(1:1 문의)로 남겨주시면 안내해 드려요.",
  },
  // 계정·데이터
  {
    id: 16,
    category: "account",
    question: "회원가입은 어떻게 하나요?",
    answer: "구글 또는 카카오 계정으로 간편하게 가입할 수 있습니다. 만 14세 이상부터 이용 가능해요.",
  },
  {
    id: 17,
    category: "account",
    question: "탈퇴하면 내 데이터는 어떻게 되나요?",
    answer:
      "회원 탈퇴 시 개인정보는 관련 법령상 보관 의무가 있는 항목을 제외하고 지체 없이 삭제됩니다. 자세한 내용은 개인정보 처리방침을 참고하세요.",
  },
  {
    id: 18,
    category: "account",
    question: "입력한 결혼 정보는 안전한가요?",
    answer:
      "예식일·예산 등은 맞춤 추천에 쓰이며, 전송 구간 암호화 등 보호 조치를 적용합니다. 수집 항목·이용 목적·삭제 방법은 개인정보 처리방침에 안내되어 있어요.",
  },
];

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
