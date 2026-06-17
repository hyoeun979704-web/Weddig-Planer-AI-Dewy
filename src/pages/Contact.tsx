import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Send, Mail, Headset } from "lucide-react";
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
import { useContactConfig } from "@/hooks/useAppConfig";
import { useTextDraft } from "@/hooks/useTextDraft";
import { INQUIRY_CATEGORIES } from "@/lib/inquiryCategories";

const Contact = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const contact = useContactConfig();
  // 오류 화면·CX 챗봇에서 ?category=&context= 로 진입하면 미리 채워준다.
  const [searchParams] = useSearchParams();
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState(() => {
    const ctx = searchParams.get("context");
    return ctx ? `[발생 위치] ${ctx}\n\n` : "";
  });
  const [submitting, setSubmitting] = useState(false);

  // 미저장 입력 유실 방지(iOS 웹 등). 제출 성공 시 clear.
  const draft = useTextDraft({
    scope: "contact",
    userId: user?.id,
    enabled: !!user,
    values: { category, title, content },
    apply: (d) => {
      if (d.category != null) setCategory(d.category);
      if (d.title != null) setTitle(d.title);
      if (d.content != null) setContent(d.content);
    },
    hasContent: (v) => !!(v.title?.trim() || v.content?.trim()),
  });

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
    draft.clear();
    setCategory("");
    setTitle("");
    setContent("");
    navigate("/my-inquiries");
  };

  return (
    <div className="min-h-screen bg-background app-col mx-auto relative">
      <PageHeader title="1:1 문의" />

      <main className="pb-20">
        {/* Contact Info */}
        <div className="p-4 bg-primary/5 border-b border-border">
          <div className="flex gap-4">
            <a href={`mailto:${contact.email}`} className="flex-1 flex items-center justify-center gap-2 py-3 bg-card rounded-xl border border-border">
              <Mail className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">이메일 문의 ({contact.email})</span>
            </a>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-3">
            운영시간: 평일 10:00 - 18:00 (주말/공휴일 휴무)
          </p>
          {/* CX 챗봇 우선 안내 — 즉시 해결 가능한 문제는 챗봇이 빠르다 */}
          <button
            type="button"
            onClick={() => navigate("/support")}
            className="w-full mt-3 flex items-center justify-center gap-2 py-3 bg-primary/10 rounded-xl border border-primary/20 active:scale-[0.98] transition-all"
          >
            <Headset className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">고객센터 챗봇으로 바로 해결해 보기</span>
          </button>
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
                {INQUIRY_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
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
