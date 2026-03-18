import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BusinessHoursEditor from "@/components/vendor/BusinessHoursEditor";

const BusinessVendorEdit = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { businessProfile, isBusiness, isLoading: roleLoading } = useUserRole();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    address: "",
    tel: "",
    business_hours: "",
    parking_location: "",
    parking_hours: "",
    keywords: "",
    amenities: "",
  });

  useEffect(() => {
    if (roleLoading) return;
    if (!isBusiness || !businessProfile?.vendor_id) {
      navigate("/business/dashboard");
      return;
    }

    const fetchVendor = async () => {
      const { data } = await supabase
        .from("vendors")
        .select("name, address, tel, business_hours, parking_location, parking_hours, keywords, amenities")
        .eq("vendor_id", businessProfile.vendor_id!)
        .single();

      if (data) {
        setForm({
          name: data.name || "",
          address: data.address || "",
          tel: data.tel || "",
          business_hours: data.business_hours || "",
          parking_location: data.parking_location || "",
          parking_hours: data.parking_hours || "",
          keywords: data.keywords || "",
          amenities: data.amenities || "",
        });
      }
      setIsLoading(false);
    };

    fetchVendor();
  }, [roleLoading, isBusiness, businessProfile, navigate]);

  const handleSave = async () => {
    if (!businessProfile?.vendor_id) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("vendors")
        .update({
          name: form.name,
          address: form.address,
          tel: form.tel,
          business_hours: form.business_hours,
          parking_location: form.parking_location,
          parking_hours: form.parking_hours,
          keywords: form.keywords,
          amenities: form.amenities,
          region: form.address ? form.address.split(" ").slice(0, 2).join(" ") : "",
        })
        .eq("vendor_id", businessProfile.vendor_id);

      if (error) throw error;
      toast.success("업체 정보가 저장되었습니다");
    } catch (error) {
      console.error("Save error:", error);
      toast.error("저장에 실패했습니다");
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  if (isLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background max-w-[430px] mx-auto flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between h-14 px-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-lg">업체 정보 수정</h1>
          <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-1">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            저장
          </Button>
        </div>
      </header>

      <main className="p-5 space-y-5 pb-20">
        {[
          { key: "name", label: "업체명", placeholder: "업체명을 입력하세요" },
          { key: "address", label: "주소", placeholder: "서울특별시 강남구..." },
          { key: "tel", label: "전화번호", placeholder: "02-0000-0000" },
          { key: "business_hours", label: "영업시간", placeholder: "평일 10:00~19:00" },
          { key: "parking_location", label: "주차 위치", placeholder: "건물 지하 주차장" },
          { key: "parking_hours", label: "주차 시간", placeholder: "2시간 무료" },
        ].map(({ key, label, placeholder }) => (
          <div key={key} className="space-y-1.5">
            <Label className="text-sm font-medium">{label}</Label>
            <Input
              placeholder={placeholder}
              value={(form as any)[key]}
              onChange={(e) => updateField(key, e.target.value)}
            />
          </div>
        ))}

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">키워드</Label>
          <Textarea
            placeholder="검색에 노출될 키워드 (쉼표 구분)"
            value={form.keywords}
            onChange={(e) => updateField("keywords", e.target.value)}
            rows={3}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">부대시설/편의시설</Label>
          <Textarea
            placeholder="예: 신부대기실, 포토존, 폐백실"
            value={form.amenities}
            onChange={(e) => updateField("amenities", e.target.value)}
            rows={3}
          />
        </div>
      </main>
    </div>
  );
};

export default BusinessVendorEdit;
