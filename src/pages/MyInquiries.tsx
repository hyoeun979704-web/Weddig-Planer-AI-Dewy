import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Calendar, Loader2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Inquiry {
  id: string;
  category: string;
  title: string;
  content: string;
  status: string;
  answer: string | null;
  created_at: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  answered: { label: "답변완료", color: "bg-green-100 text-green-700" },
  pending: { label: "대기중", color: "bg-amber-100 text-amber-700" },
};

const CATEGORY_LABELS: Record<string, string> = {
  reservation: "예약 문의",
  payment: "결제 문의",
  cancel: "취소/환불 문의",
  service: "서비스 이용 문의",
  partnership: "제휴/입점 문의",
  other: "기타 문의",
};

const MyInquiries = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: inquiries = [], isLoading } = useQuery({
    queryKey: ["my-inquiries", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await (supabase as any)
        .from("inquiries")
        .select("id, category, title, content, status, answer, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Inquiry[];
    },
    enabled: !!user,
  });

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      <PageHeader title="내 문의 내역" />

      <main className="pb-20">
        {!user ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <MessageSquare className="w-16 h-16 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground mb-4">로그인 후 문의 내역을 볼 수 있어요</p>
            <button
              onClick={() => navigate("/auth")}
              className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium text-sm"
            >
              로그인하기
            </button>
          </div>
        ) : isLoading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : inquiries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <MessageSquare className="w-16 h-16 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground mb-4">문의 내역이 없습니다</p>
            <button
              onClick={() => navigate("/contact")}
              className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium text-sm"
            >
              1:1 문의하기
            </button>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {inquiries.map((item) => {
              const status = statusConfig[item.status] ?? statusConfig.pending;
              return (
                <div
                  key={item.id}
                  className="w-full bg-card rounded-2xl border border-border p-4 text-left"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-xs text-muted-foreground">
                        {CATEGORY_LABELS[item.category] ?? item.category}
                      </span>
                      <h3 className="font-medium text-foreground">{item.title}</h3>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${status.color}`}>
                      {status.label}
                    </span>
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3 whitespace-pre-line">
                    {item.content}
                  </p>

                  {item.answer && (
                    <div className="mb-3 p-3 bg-muted/50 rounded-xl">
                      <p className="text-xs font-semibold text-foreground mb-1">답변</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">
                        {item.answer}
                      </p>
                    </div>
                  )}

                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(item.created_at).toLocaleDateString("ko-KR")}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav activeTab="/mypage" onTabChange={(href) => navigate(href)} />
    </div>
  );
};

export default MyInquiries;
