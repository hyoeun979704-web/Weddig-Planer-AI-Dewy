import { MessageSquare } from "lucide-react";
import PageHeader from "@/components/PageHeader";

const BusinessInquiries = () => {
  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto">
      <PageHeader title="문의/예약 관리" />

      <main className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
          <MessageSquare className="w-10 h-10 text-muted-foreground/50" />
        </div>
        <h2 className="text-lg font-bold text-foreground mb-2">준비중입니다</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          고객 문의 및 예약 관리 기능은<br />곧 업데이트될 예정입니다.
        </p>
      </main>
    </div>
  );
};

export default BusinessInquiries;
