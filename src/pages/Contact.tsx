import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Send, MessageSquare, Mail } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const Contact = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !title || !content) {
      toast.error("모든 항목을 입력해주세요");
      return;
    }
    if (!user) {
      toast.error("로그인 후 문의할 수 있어요");
      navigate("/auth");
      return;
    }
    setSubmitting(true);
    const { error } = await (supabase as any).from("inquiries").insert({
      user_id: user.id,
      category,
      title: title.trim(),
      content: content.trim(),
    });
    setSubmitting(false);
    if (error) {
      toast.error("문의 접수에 실패했어요. 잠시 후 다시 시도해주세요");
      return;
    }
    toast.success("문의가 접수되었습니다. 빠른 시일 내에 답변드리겠습니다.");
    setCategory("");
    setTitle("");
    setContent("");
    navigate("/my-inquiries");
  };

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      <PageHeader title="1:1 문의" />

      <main className="pb-20">
        {/* Contact Info */}
        <div className="p-4 bg-primary/5 border-b border-border">
          <div className="flex gap-4">
            <a href="mailto:help@dewy-wedding.com" className="flex-1 flex items-center justify-center gap-2 py-3 bg-card rounded-xl border border-border">
              <Mail className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">이메일 문의 (help@dewy-wedding.com)</span>
            </a>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-3">
            운영시간: 평일 10:00 - 18:00 (주말/공휴일 휴무)
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="space-y-2">
            <Label>문의 유형</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="문의 유형을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reservation">예약 문의</SelectItem>
                <SelectItem value="payment">결제 문의</SelectItem>
                <SelectItem value="cancel">취소/환불 문의</SelectItem>
                <SelectItem value="service">서비스 이용 문의</SelectItem>
                <SelectItem value="partnership">제휴/입점 문의</SelectItem>
                <SelectItem value="other">기타 문의</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">제목</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="문의 제목을 입력하세요"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">문의 내용</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="문의 내용을 상세히 작성해주세요"
              rows={6}
            />
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={submitting}>
            <Send className="w-4 h-4 mr-2" />
            {submitting ? "접수 중..." : "문의하기"}
          </Button>
        </form>

        {/* Recent Inquiries */}
        <div className="px-4 py-2">
          <button 
            onClick={() => navigate("/my-inquiries")}
            className="w-full py-3 text-center text-sm text-primary font-medium"
          >
            내 문의 내역 보기 →
          </button>
        </div>
      </main>

      <BottomNav activeTab="/mypage" onTabChange={(href) => navigate(href)} />
    </div>
  );
};

export default Contact;
