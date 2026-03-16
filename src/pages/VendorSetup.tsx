import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const CATEGORIES = [
  "웨딩홀",
  "스드메",
  "한복",
  "예복",
  "허니문",
  "혼수",
  "청첩장",
  "웨딩플래너",
];

// 사업자등록번호 포맷: XXX-XX-XXXXX
function formatBusinessNumber(raw: string) {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

const VendorSetup = () => {
  const navigate = useNavigate();
  const { user, refreshBusinessProfile } = useAuth();

  const [step, setStep] = useState<'form' | 'done'>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [businessNumber, setBusinessNumber] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [ceoName, setCeoName] = useState("");
  const [categoryType, setCategoryType] = useState("");
  const [region, setRegion] = useState("");
  const [address, setAddress] = useState("");
  const [tel, setTel] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    const digitsOnly = businessNumber.replace(/\D/g, '');
    if (digitsOnly.length !== 10) e.businessNumber = "사업자등록번호 10자리를 입력해주세요";
    if (!businessName.trim()) e.businessName = "상호명을 입력해주세요";
    if (!ceoName.trim()) e.ceoName = "대표자명을 입력해주세요";
    if (!categoryType) e.categoryType = "업체 카테고리를 선택해주세요";
    if (!address.trim()) e.address = "주소를 입력해주세요";
    if (!tel.trim()) e.tel = "전화번호를 입력해주세요";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !user) return;

    setIsSubmitting(true);
    try {
      // 1. vendors 테이블에 새 업체 행 생성
      const { data: vendorData, error: vendorError } = await supabase
        .from('vendors')
        .insert({
          name: businessName,
          category_type: categoryType,
          region: region || null,
          address,
          tel,
          owner_user_id: user.id,
          avg_rating: 0,
          review_count: 0,
        })
        .select('vendor_id')
        .single();

      if (vendorError) throw vendorError;

      // 2. business_profiles 테이블에 사업자 인증 정보 생성
      const { error: bpError } = await supabase
        .from('business_profiles')
        .insert({
          user_id: user.id,
          vendor_id: vendorData.vendor_id,
          business_number: businessNumber.replace(/\D/g, ''),
          business_name: businessName,
          ceo_name: ceoName,
          category_type: categoryType,
          verification_status: 'pending',
        });

      if (bpError) throw bpError;

      await refreshBusinessProfile();
      setStep('done');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '오류가 발생했습니다';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 'done') {
    return (
      <div className="min-h-screen bg-background max-w-[430px] mx-auto flex flex-col items-center justify-center p-6">
        <div className="text-center space-y-4">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
          <h2 className="text-2xl font-bold text-foreground">업체 등록 완료!</h2>
          <p className="text-muted-foreground leading-relaxed">
            사업자 인증 검토가 진행 중입니다.<br />
            승인까지 1~2 영업일이 소요될 수 있습니다.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700 text-left space-y-1">
            <p className="font-semibold">📋 다음 단계</p>
            <p>지금 바로 업체 대시보드에서</p>
            <p>상세 정보, 장점 카드, 포토 갤러리를</p>
            <p>등록하실 수 있습니다.</p>
          </div>
          <Button
            className="w-full h-12 font-semibold"
            onClick={() => navigate('/vendor/dashboard')}
          >
            업체 대시보드로 이동
          </Button>
          <button
            type="button"
            className="text-sm text-muted-foreground"
            onClick={() => navigate('/')}
          >
            나중에 하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center h-14 px-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-center font-semibold text-lg pr-10">업체 등록</h1>
        </div>
      </header>

      <div className="p-5 pb-20">
        {/* 안내 배너 */}
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6">
          <Building2 className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-700">사업자 인증 신청</p>
            <p className="text-xs text-blue-600 mt-0.5 leading-relaxed">
              아래 정보를 입력하면 업체 프로필이 생성됩니다.
              관리자 검토 후 승인되면 서비스에 노출됩니다.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 사업자등록번호 */}
          <div className="space-y-1.5">
            <Label htmlFor="businessNumber">
              사업자등록번호 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="businessNumber"
              value={businessNumber}
              onChange={(e) => setBusinessNumber(formatBusinessNumber(e.target.value))}
              placeholder="000-00-00000"
              inputMode="numeric"
            />
            {errors.businessNumber && <p className="text-xs text-destructive">{errors.businessNumber}</p>}
          </div>

          {/* 상호명 */}
          <div className="space-y-1.5">
            <Label htmlFor="businessName">
              상호명 (업체명) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="businessName"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="예: 드림웨딩홀"
            />
            {errors.businessName && <p className="text-xs text-destructive">{errors.businessName}</p>}
          </div>

          {/* 대표자명 */}
          <div className="space-y-1.5">
            <Label htmlFor="ceoName">
              대표자명 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ceoName"
              value={ceoName}
              onChange={(e) => setCeoName(e.target.value)}
              placeholder="홍길동"
            />
            {errors.ceoName && <p className="text-xs text-destructive">{errors.ceoName}</p>}
          </div>

          {/* 업체 카테고리 */}
          <div className="space-y-1.5">
            <Label>
              업체 카테고리 <span className="text-destructive">*</span>
            </Label>
            <Select value={categoryType} onValueChange={setCategoryType}>
              <SelectTrigger className={errors.categoryType ? 'border-destructive' : ''}>
                <SelectValue placeholder="카테고리를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.categoryType && <p className="text-xs text-destructive">{errors.categoryType}</p>}
          </div>

          {/* 지역 */}
          <div className="space-y-1.5">
            <Label htmlFor="region">지역</Label>
            <Input
              id="region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="예: 서울 강남구"
            />
          </div>

          {/* 주소 */}
          <div className="space-y-1.5">
            <Label htmlFor="address">
              주소 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="서울시 강남구 테헤란로 123"
            />
            {errors.address && <p className="text-xs text-destructive">{errors.address}</p>}
          </div>

          {/* 전화번호 */}
          <div className="space-y-1.5">
            <Label htmlFor="tel">
              대표 전화번호 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="tel"
              type="tel"
              value={tel}
              onChange={(e) => setTel(e.target.value)}
              placeholder="02-1234-5678"
            />
            {errors.tel && <p className="text-xs text-destructive">{errors.tel}</p>}
          </div>

          <Button
            type="submit"
            className="w-full h-12 font-semibold mt-6"
            disabled={isSubmitting}
          >
            {isSubmitting ? "등록 중..." : "업체 등록 신청하기"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default VendorSetup;
