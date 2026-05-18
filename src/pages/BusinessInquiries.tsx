import { useNavigate } from "react-router-dom";
import { ArrowLeft, MessageSquare } from "lucide-react";

const BusinessInquiries = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center h-14 px-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-center font-semibold text-lg pr-10">문의/예약 관리</h1>
        </div>
      </header>

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
