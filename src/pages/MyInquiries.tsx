import { useNavigate } from "react-router-dom";
import { ArrowLeft, MessageSquare, Calendar, ChevronRight, Clock } from "lucide-react";
import BottomNav from "@/components/BottomNav";

const inquiries = [
  { 
    id: 1, 
    type: "inquiry",
    vendor: "더채플앳청담",
    title: "예약 가능 일정 문의",
    date: "2025-01-20",
    status: "answered",
    lastMessage: "네, 6월 15일 오후 2시 예약 가능합니다."
  },
  { 
    id: 2, 
    type: "reservation",
    vendor: "루미에르 스튜디오",
    title: "스튜디오 촬영 예약",
    date: "2025-01-18",
    status: "pending",
    lastMessage: "예약 요청이 접수되었습니다."
  },
  { 
    id: 3, 
    type: "inquiry",
    vendor: "블룸 드레스",
    title: "드레스 피팅 예약",
    date: "2025-01-15",
    status: "answered",
    lastMessage: "2월 중으로 피팅 가능합니다."
  },
];

const statusConfig = {
  answered: { label: "답변완료", color: "bg-green-100 text-green-700" },
  pending: { label: "대기중", color: "bg-amber-100 text-amber-700" },
};

const MyInquiries = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center h-14 px-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-center font-semibold text-lg pr-10">내 문의/예약</h1>
        </div>
      </header>

      <main className="pb-20">
        {/* Tabs */}
        <div className="flex border-b border-border">
          <button className="flex-1 py-3 text-sm font-medium text-primary border-b-2 border-primary">
            전체
          </button>
          <button className="flex-1 py-3 text-sm font-medium text-muted-foreground">
            문의
          </button>
          <button className="flex-1 py-3 text-sm font-medium text-muted-foreground">
            예약
          </button>
        </div>

        {inquiries.length > 0 ? (
          <div className="p-4 space-y-3">
            {inquiries.map((item) => {
              const status = statusConfig[item.status as keyof typeof statusConfig];
              
              return (
                <button
                  key={item.id}
                  className="w-full bg-card rounded-2xl border border-border p-4 text-left hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-xs text-muted-foreground">{item.vendor}</span>
                      <h3 className="font-medium text-foreground">{item.title}</h3>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                  
                  <p className="text-sm text-muted-foreground line-clamp-1 mb-3">
                    {item.lastMessage}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {item.date}
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <MessageSquare className="w-16 h-16 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">문의/예약 내역이 없습니다</p>
          </div>
        )}
      </main>

      <BottomNav activeTab="/mypage" onTabChange={(href) => navigate(href)} />
    </div>
  );
};

export default MyInquiries;
