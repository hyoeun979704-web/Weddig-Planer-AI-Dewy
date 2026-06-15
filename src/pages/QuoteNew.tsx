import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { PLACE_CATEGORY_LABEL } from "@/lib/categoryLabels";
import { createQuoteRequest } from "@/hooks/useQuotes";

const STYLES: { v: string; label: string }[] = [
  { v: "general", label: "일반 예식" },
  { v: "small", label: "스몰웨딩" },
  { v: "self", label: "셀프웨딩" },
  { v: "custom", label: "기타" },
];

// 소비자가 필요를 한 번에 남기면 조건 매칭 업체들에 리드가 뿌려진다(견적 요청).
const QuoteNew = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [category, setCategory] = useState(params.get("category") ?? "");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [weddingDate, setWeddingDate] = useState("");
  const [style, setStyle] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!user) { navigate("/auth"); return; }
    if (!category) { toast.error("카테고리를 골라주세요."); return; }
    setSubmitting(true);
    const res = await createQuoteRequest({
      category,
      city: city.trim() || undefined,
      district: district.trim() || undefined,
      budgetMin: budgetMin ? parseInt(budgetMin, 10) : null,
      budgetMax: budgetMax ? parseInt(budgetMax, 10) : null,
      weddingDate: weddingDate || null,
      style: style || null,
      note: note.trim() || null,
    });
    setSubmitting(false);
    if (!res.ok) {
      toast.error(
        res.error === "too_many_open" ? "진행 중인 견적 요청이 너무 많아요(최대 5개)." : "요청에 실패했어요. 다시 시도해주세요.",
      );
      return;
    }
    toast.success(
      res.matched && res.matched > 0
        ? `${res.matched}곳에 견적 요청을 보냈어요!`
        : "요청을 등록했어요. 조건에 맞는 업체가 늘면 전달돼요.",
    );
    navigate(`/quote/${res.requestId}`, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background app-col mx-auto pb-28">
      <PageHeader title="견적 요청" />
      <main className="px-5 py-5 space-y-4">
        <p className="text-[13px] text-muted-foreground">
          필요한 정보를 남기면 조건에 맞는 업체들에게 한 번에 견적을 요청해요. 업체가 답하면 알림으로 알려드려요.
        </p>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">어떤 업체를 찾으세요? *</Label>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(PLACE_CATEGORY_LABEL).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setCategory(key)}
                className={`h-10 rounded-lg border text-[13px] font-medium ${
                  category === key ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">지역(시/도)</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="서울특별시" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">구/군</Label>
            <Input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="강남구" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">예산 최소(만원)</Label>
            <Input type="number" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} placeholder="100" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">예산 최대(만원)</Label>
            <Input type="number" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} placeholder="300" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">예식 예정일</Label>
          <Input type="date" value={weddingDate} onChange={(e) => setWeddingDate(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">스타일</Label>
          <div className="grid grid-cols-4 gap-2">
            {STYLES.map((s) => (
              <button
                key={s.v}
                type="button"
                onClick={() => setStyle(style === s.v ? "" : s.v)}
                className={`h-10 rounded-lg border text-[12px] font-medium ${
                  style === s.v ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">요청 메모</Label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="원하는 조건·일정·궁금한 점을 적어주세요." />
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 app-col mx-auto bg-background border-t border-border p-3 z-40">
        <Button onClick={submit} disabled={submitting} className="w-full h-12 gap-2">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          견적 요청 보내기
        </Button>
      </div>
    </div>
  );
};

export default QuoteNew;
