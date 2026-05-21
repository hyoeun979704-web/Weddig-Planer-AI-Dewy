import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, Clock, Hash, User, FileText, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

const SERVICE_CATEGORIES = [
  { value: "wedding_hall", label: "웨딩홀" },
  { value: "studio", label: "스드메 (스튜디오/드레스/메이크업)" },
  { value: "hanbok", label: "한복" },
  { value: "suit", label: "예복" },
  { value: "honeymoon", label: "허니문" },
  { value: "appliance", label: "혼수가전" },
  { value: "jewelry", label: "예물/예단" },
  { value: "invitation_venue", label: "청첩장 모임" },
];

// 흐름: 사업자정보 → 카테고리 → (사업자 인증 + 운영자 검토 대기). 업체 상세정보
// 입력은 운영자 승인 후 별도 단계에서 진행한다.
const STEPS = ["사업자 정보", "서비스 카테고리", "완료"];

const BusinessOnboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [businessNumber, setBusinessNumber] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [representativeName, setRepresentativeName] = useState("");
  const [openDate, setOpenDate] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [bizPhone, setBizPhone] = useState("");
  const [serviceCategory, setServiceCategory] = useState("");

  const [result, setResult] = useState<{ is_verified: boolean; message: string } | null>(null);

  const formatBusinessNumber = (value: string) => {
    const nums = value.replace(/\D/g, "").slice(0, 10);
    if (nums.length <= 3) return nums;
    if (nums.length <= 5) return `${nums.slice(0, 3)}-${nums.slice(3)}`;
    return `${nums.slice(0, 3)}-${nums.slice(3, 5)}-${nums.slice(5)}`;
  };

  const canProceedStep = (s: number) => {
    if (s === 0) return businessNumber.replace(/-/g, "").length === 10 && !!businessName && !!representativeName;
    if (s === 1) return !!serviceCategory;
    return true;
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error("로그인이 필요합니다");
      navigate("/auth");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(
        `${((import.meta as any).env?.VITE_SUPABASE_URL ?? "")}/functions/v1/verify-business`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            business_number: businessNumber,
            business_name: businessName,
            representative_name: representativeName,
            open_date: openDate,
            business_type: businessType,
            service_category: serviceCategory,
            phone: bizPhone,
          }),
        }
      );

      const data = await resp.json();
      if (!resp.ok) {
        toast.error(data.error || "등록에 실패했습니다");
        return;
      }

      setResult(data);
      setStep(2);
      toast.success("등록 신청이 접수되었어요");
    } catch (error) {
      console.error("Business registration error:", error);
      toast.error("등록 중 오류가 발생했습니다");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (step === 1) handleSubmit();
    else setStep(step + 1);
  };

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto">
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center h-14 px-4">
          <button onClick={() => (step > 0 && step < 2 ? setStep(step - 1) : navigate(-1))} className="w-10 h-10 flex items-center justify-center -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-center font-semibold text-lg pr-10">기업회원 등록</h1>
        </div>
        {step < 2 && (
          <div className="flex gap-1 px-4 pb-3">
            {STEPS.slice(0, 2).map((_, i) => (
              <div key={i} className={`flex-1 h-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>
        )}
      </header>

      <main className="p-5">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Building2 className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-lg font-bold text-foreground">사업자 정보 입력</h2>
                <p className="text-sm text-muted-foreground mt-1">국세청 API로 자동 검증됩니다</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">사업자등록번호 *</Label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="000-00-00000" value={businessNumber} onChange={(e) => setBusinessNumber(formatBusinessNumber(e.target.value))} className="pl-10" maxLength={12} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">상호명 *</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="상호명을 입력하세요" value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="pl-10" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">대표자명 *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="대표자 성명" value={representativeName} onChange={(e) => setRepresentativeName(e.target.value)} className="pl-10" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">개업일자</Label>
                  <Input type="date" value={openDate} onChange={(e) => setOpenDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">업태</Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="예: 서비스업" value={businessType} onChange={(e) => setBusinessType(e.target.value)} className="pl-10" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">연락처</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="02-0000-0000" value={bizPhone} onChange={(e) => setBizPhone(e.target.value)} className="pl-10" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
              <div className="text-center py-4">
                <h2 className="text-lg font-bold text-foreground">서비스 카테고리 선택</h2>
                <p className="text-sm text-muted-foreground mt-1">등록할 업체의 카테고리를 선택하세요</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {SERVICE_CATEGORIES.map((cat) => (
                  <button key={cat.value} onClick={() => setServiceCategory(cat.value)} className={`p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.97] ${serviceCategory === cat.value ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:border-primary/30"}`}>
                    <p className="text-sm font-semibold text-foreground">{cat.label}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12 space-y-6">
              <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
                <Clock className="w-10 h-10 text-amber-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">등록 신청 완료 · 검토 중</h2>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  {result?.message ?? "운영자 검토 후 등록 결과를 알려드릴게요."}
                </p>
                <p className="text-xs text-muted-foreground mt-3 bg-muted rounded-lg p-3 leading-relaxed">
                  검토가 완료되면 비즈니스 화면에서 안내해드려요. 승인 후 업체 상세정보를
                  입력하면 상세페이지가 노출됩니다.
                </p>
              </div>
              <div className="space-y-3 pt-2">
                <Button onClick={() => navigate("/business/dashboard")} className="w-full h-12 text-base font-medium">
                  비즈니스 화면으로 이동
                </Button>
                <Button variant="outline" onClick={() => navigate("/")} className="w-full h-12 text-base">
                  홈으로 돌아가기
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {step < 2 && (
          <div className="mt-8 space-y-3">
            <Button onClick={handleNext} disabled={!canProceedStep(step) || isSubmitting} className="w-full h-12 text-base font-medium">
              {isSubmitting ? "신청 중..." : step === 1 ? "등록 신청" : "다음"}
            </Button>
            {step > 0 && (
              <Button variant="ghost" onClick={() => setStep(step - 1)} className="w-full">
                이전
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default BusinessOnboard;
