import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Service id matching the keys in AdminServiceWaitlist's SERVICE_LABELS. */
  serviceId: string | null;
  /** Human title for the bottom-sheet header. */
  serviceTitle: string;
}

/**
 * Pre-launch waitlist signup sheet. Used by AI Studio's locked cards to
 * collect interest in services that aren't shipped yet. Writes a row to
 * `service_waitlist` (the same table AdminServiceWaitlist administers).
 *
 * Auth handling: when signed in, user_id is filled and contact is optional.
 * When signed out, contact (email or phone) is required so we can still
 * reach the user once the service ships. RLS on service_waitlist allows
 * anonymous inserts but enforces shape (see existing migration).
 */
const WaitlistSignupSheet = ({ open, onOpenChange, serviceId, serviceTitle }: Props) => {
  const { user } = useAuth();
  const [contact, setContact] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    if (submitting) return;
    setContact("");
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceId) return;

    const trimmedContact = contact.trim();
    if (!user && !trimmedContact) {
      toast.error("연락처를 입력해주세요");
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        service_id: serviceId,
        user_id: user?.id ?? null,
        contact: trimmedContact || null,
        notified: false,
      };
      const { error } = await (supabase as any)
        .from("service_waitlist")
        .insert(payload);
      if (error) throw error;
      toast.success("사전알림 신청 완료!", {
        description: "서비스 출시 시 가장 먼저 알려드릴게요.",
      });
      setContact("");
      onOpenChange(false);
    } catch (err) {
      console.error("Waitlist signup failed:", err);
      toast.error("신청에 실패했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[360px] rounded-2xl">
        <DialogHeader>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-accent mx-auto flex items-center justify-center mb-2">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-center">{serviceTitle}</DialogTitle>
          <p className="text-center text-[13px] text-muted-foreground">
            출시 알림을 가장 먼저 받아보세요
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              연락처 {user ? <span className="text-muted-foreground font-normal">(선택)</span> : <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder={user ? "이메일·전화 등 추가 연락처 (선택)" : "이메일 또는 전화번호"}
              className="w-full px-3 py-2.5 border rounded-xl text-sm"
              disabled={submitting}
            />
            {user ? (
              <p className="text-[11px] text-muted-foreground mt-1">
                로그인된 계정으로도 알림을 보내드려요.
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground mt-1">
                로그인하지 않아도 신청할 수 있어요.
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="flex-1 py-3 rounded-xl text-foreground font-semibold text-sm border border-border bg-card"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-[2] py-3 rounded-xl text-primary-foreground font-bold text-sm bg-primary disabled:opacity-50"
            >
              {submitting ? "신청 중…" : "사전알림 신청"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default WaitlistSignupSheet;
