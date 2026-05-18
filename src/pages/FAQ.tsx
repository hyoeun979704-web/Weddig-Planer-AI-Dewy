import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqCategories = [
  { id: "all", label: "전체" },
  { id: "reservation", label: "예약" },
  { id: "payment", label: "결제" },
  { id: "cancel", label: "취소/환불" },
  { id: "service", label: "서비스" },
];

const faqs = [
  {
    id: 1,
    category: "reservation",
    question: "예약은 어떻게 하나요?",
    answer: "원하시는 업체 상세페이지에서 '예약 문의' 버튼을 클릭하시면 예약 상담을 신청하실 수 있습니다. 업체에서 확인 후 연락드립니다."
  },
  {
    id: 2,
    category: "reservation",
    question: "예약 변경은 가능한가요?",
    answer: "예약 변경은 예약일 기준 7일 전까지 가능합니다. 마이페이지 > 내 문의/예약에서 변경 요청을 하시거나, 고객센터로 문의해주세요."
  },
  {
    id: 3,
    category: "payment",
    question: "결제 수단은 무엇이 있나요?",
    answer: "신용카드, 체크카드, 계좌이체, 무통장입금 등 다양한 결제 수단을 지원합니다. 일부 업체의 경우 현장 결제만 가능할 수 있습니다."
  },
  {
    id: 4,
    category: "payment",
    question: "포인트는 어떻게 사용하나요?",
    answer: "예약 결제 시 보유하신 포인트를 사용하실 수 있습니다. 1포인트 = 1원으로 적용되며, 최소 1,000포인트부터 사용 가능합니다."
  },
  {
    id: 5,
    category: "cancel",
    question: "취소 및 환불 정책은 어떻게 되나요?",
    answer: "예약일 기준 7일 전: 100% 환불\n예약일 기준 3-6일 전: 50% 환불\n예약일 기준 2일 이내: 환불 불가\n업체별로 환불 정책이 다를 수 있으니 예약 시 확인해주세요."
  },
  {
    id: 6,
    category: "service",
    question: "쿠폰은 어떻게 받나요?",
    answer: "신규 가입 시 웰컴 쿠폰이 자동 지급됩니다. 또한 앱 내 이벤트 참여, 리뷰 작성 등을 통해 추가 쿠폰을 받으실 수 있습니다."
  },
  {
    id: 7,
    category: "service",
    question: "찜한 업체는 어디서 확인하나요?",
    answer: "하단 네비게이션의 하트 아이콘을 누르시거나, 마이페이지 > 찜에서 확인하실 수 있습니다."
  },
];

const FAQ = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center h-14 px-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-center font-semibold text-lg pr-10">자주 묻는 질문</h1>
        </div>
      </header>

      <main className="pb-20">
        {/* Search */}
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="궁금한 내용을 검색해보세요" className="pl-10" />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 p-4 overflow-x-auto">
          {faqCategories.map((cat) => (
            <button
              key={cat.id}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                cat.id === "all"
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
          <Accordion type="single" collapsible className="space-y-2">
            {faqs.map((faq) => (
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
        </div>

        {/* Contact Link */}
        <div className="p-4 mt-4">
          <div className="p-4 bg-muted rounded-2xl text-center">
            <p className="text-sm text-muted-foreground mb-2">
              찾으시는 답변이 없으신가요?
            </p>
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
