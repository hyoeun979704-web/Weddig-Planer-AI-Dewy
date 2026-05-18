import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Send, MessageSquare, Phone, Mail } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const Contact = () => {
  const navigate = useNavigate();
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !title || !content) {
      toast.error("모든 항목을 입력해주세요");
      return;
    }
    toast.success("문의가 접수되었습니다. 빠른 시일 내에 답변드리겠습니다.");
    setCategory("");
    setTitle("");
    setContent("");
  };

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center h-14 px-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-center font-semibold text-lg pr-10">1:1 문의</h1>
        </div>
      </header>

      <main className="pb-20">
        {/* Contact Info */}
        <div className="p-4 bg-primary/5 border-b border-border">
          <div className="flex gap-4">
            <a href="tel:02-1234-5678" className="flex-1 flex items-center justify-center gap-2 py-3 bg-card rounded-xl border border-border">
              <Phone className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">전화 문의</span>
            </a>
            <a href="mailto:help@wedding.com" className="flex-1 flex items-center justify-center gap-2 py-3 bg-card rounded-xl border border-border">
              <Mail className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">이메일 문의</span>
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

          <Button type="submit" className="w-full" size="lg">
            <Send className="w-4 h-4 mr-2" />
            문의하기
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
