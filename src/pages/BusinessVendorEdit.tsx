import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

// vendors 테이블이 schema cleanup에서 삭제되어, B2B 업체 등록·편집은 다음 라운드에서
// places + business_profiles 기반으로 재설계 예정. 현재는 안내 페이지만 노출.
const BusinessVendorEdit = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => navigate("/business/dashboard"), 4000);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto px-4">
      <div className="flex items-center h-14">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center -ml-2"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold flex-1 text-center -mr-8">업체 정보</h1>
      </div>
      <div className="text-center py-20">
        <p className="text-muted-foreground mb-4">
          B2B 업체 정보 편집 기능은 현재 재설계 중입니다.
        </p>
        <p className="text-sm text-muted-foreground/80 mb-8">
          잠시 후 대시보드로 이동합니다.
        </p>
        <Button onClick={() => navigate("/business/dashboard")}>
          대시보드로 이동
        </Button>
      </div>
    </div>
  );
};

export default BusinessVendorEdit;
