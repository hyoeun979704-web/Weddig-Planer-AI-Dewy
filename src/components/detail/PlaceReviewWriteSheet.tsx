import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  placeId: string;
  /** 저장 성공 후 — 목록/평점 갱신, (이벤트) 미션 체크 트리거 */
  onSubmitted?: () => void;
}

/**
 * 사용자 업체 후기 작성 시트. place_reviews 에 본인(user_id) 후기를 저장한다.
 * RLS: insert 는 auth.uid()=user_id 만 허용. places.avg_rating/review_count 는
 * place_reviews_stats_aiud 트리거가 자동 재계산.
 */
const PlaceReviewWriteSheet = ({ open, onOpenChange, placeId, onSubmitted }: Props) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => { setRating(5); setContent(""); };

  const submit = async () => {
    if (!user) { toast.error("로그인 후 작성할 수 있어요."); return; }
    if (content.trim().length < 10) { toast.error("후기를 10자 이상 적어주세요."); return; }
    setSaving(true);
    try {
      // 작성자 표기는 프로필 닉네임(없으면 익명). 후기 본문/별점만 사용자 입력.
      const { data: prof } = await (supabase as any)
        .from("profiles").select("display_name").eq("user_id", user.id).maybeSingle();
      const author = prof?.display_name?.trim() || "익명";
      const { error } = await (supabase as any).from("place_reviews").insert({
        place_id: placeId,
        user_id: user.id,
        content: content.trim(),
        rating,
        author,
        source_type: "user_unverified",
        is_verified: false,
        review_date: new Date().toISOString().slice(0, 10),
      });
      if (error) throw error;
      toast.success("후기를 등록했어요. 고마워요! 💛");
      reset();
      onOpenChange(false);
      onSubmitted?.();
    } catch (e) {
      console.warn("place review insert failed:", e);
      toast.error("후기 등록에 실패했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="app-col mx-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>후기 작성</SheetTitle>
        </SheetHeader>
        <div className="py-4 space-y-4">
          <div>
            <p className="text-sm font-semibold text-foreground mb-2">별점</p>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setRating(i + 1)}
                  aria-label={`별점 ${i + 1}점`}
                  className="active:scale-90 transition-transform"
                >
                  <Star className={`w-8 h-8 ${i < rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground mb-2">후기</p>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="실제 방문·계약 경험을 솔직하게 적어주세요 (최소 10자). 다른 예비부부에게 큰 도움이 돼요."
              rows={5}
              maxLength={1000}
            />
            <p className="text-[11px] text-muted-foreground mt-1 text-right">{content.length}/1000</p>
          </div>
          <Button className="w-full" onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "후기 등록"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default PlaceReviewWriteSheet;
