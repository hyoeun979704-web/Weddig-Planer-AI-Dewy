import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Drawer } from "vaul";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import { useTextDraft } from "@/hooks/useTextDraft";
import { draftKey, loadDraft } from "@/lib/formDraft";
import { toast } from "sonner";

const TITLE_MAX = 100;
const CONTENT_MAX = 2000;
const CONTACT_MAX = 50;

interface InquiryRow {
  id: string;
  title: string;
  content: string;
  status: "open" | "answered" | "closed";
  answer: string | null;
  answered_at: string | null;
  created_at: string;
}

interface Props {
  placeId: string;
  placeName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * 홀 예약 가능일 카드에서 특정 날짜(ISO yyyy-mm-dd)를 골라 문의를 열 때 그 날짜.
   * 있으면 제목/내용을 그 날짜 기준으로 prefill(예식월 기반 prefill보다 우선). 결제 아님.
   */
  suggestedDate?: string;
}

const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];
/** ISO(yyyy-mm-dd) → "M월 D일(요일)". 파싱 실패 시 원문 반환(방어). */
const fmtInquiryDate = (iso: string): string => {
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getMonth() + 1}월 ${d.getDate()}일(${WEEKDAY[d.getDay()]})`;
};

/**
 * 입점 업체 인앱 문의 시트 — 작성 + 내 문의/답변 확인을 한 화면에서.
 * RLS: 본인 문의만 조회되고, 소유자 있는(입점) 업체에만 INSERT 가 허용된다.
 */
const PlaceInquirySheet = ({ placeId, placeName, open, onOpenChange, suggestedDate }: Props) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { weddingSettings } = useWeddingSchedule();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [contact, setContact] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mine, setMine] = useState<InquiryRow[] | null>(null);
  const prefilledRef = useRef(false);

  // 미저장 입력 유실 방지 — 시트를 닫거나 페이지 이탈해도 작성하던 문의 복원(업체별 격리).
  const draft = useTextDraft({
    scope: `place-inquiry:${placeId}`,
    userId: user?.id,
    enabled: open && !!user,
    values: { title, content, contact },
    apply: (d) => {
      if (d.title != null) setTitle(d.title);
      if (d.content != null) setContent(d.content);
      if (d.contact != null) setContact(d.contact);
    },
    hasContent: (v) => !!(v.title?.trim() || v.content?.trim()),
  });

  // 빈 폼 마찰 줄이기 — 신부가 가진 예식 신호(예식월·지역)로 제목/내용 초안을 미리 채운다.
  // 의향의 순간 빈 textarea 가 최대 이탈점이라, 한 번만(시트 열릴 때) 비어있을 때만 채운다.
  // 이미 작성하던 draft 가 있으면(복원 대상) 건드리지 않는다 — draft 훅이 복원하도록 양보.
  useEffect(() => {
    if (!open) {
      prefilledRef.current = false;
      return;
    }
    if (prefilledRef.current || !user) return;
    prefilledRef.current = true;
    // 작성 중이던 초안이 있으면 prefill 생략(사용자 입력 우선).
    const saved = loadDraft<{ title?: string; content?: string }>(
      draftKey(`place-inquiry:${placeId}`, user.id),
    );
    if (saved?.title?.trim() || saved?.content?.trim()) return;
    // 가능일 카드에서 고른 특정 날짜가 있으면 그 날짜로 예약 문의 초안(예식월 prefill보다 우선).
    if (suggestedDate) {
      const label = fmtInquiryDate(suggestedDate);
      setTitle((cur) => cur || `${label} 예약 문의`);
      setContent(
        (cur) =>
          cur ||
          `${label}에 예약 가능한지 문의드려요. 예상 인원·견적도 함께 안내 부탁드려요.`,
      );
      return;
    }
    const date = weddingSettings.wedding_date;
    const month =
      !weddingSettings.wedding_date_tbd && date
        ? parseInt(date.slice(5, 7), 10)
        : null;
    const region =
      weddingSettings.wedding_venue_city || weddingSettings.wedding_region || "";
    if (!month && !region) return; // 채울 신호가 없으면 빈 폼 유지
    if (month) {
      setTitle((cur) => cur || `${month}월 예식 견적 문의`);
    }
    setContent((cur) => {
      if (cur) return cur;
      const head = month ? `${month}월 예식 예정이에요` : "예식 준비 중이에요";
      const loc = region ? ` (${region})` : "";
      return `${head}${loc}. 가능 날짜와 견적 안내 부탁드려요.`;
    });
  }, [open, user, placeId, weddingSettings, suggestedDate]);

  // 열릴 때 이 업체에 보낸 내 문의 + 답변 로드
  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      const { data, error } = await (supabase as any)
        .from("place_inquiries")
        .select("id, title, content, status, answer, answered_at, created_at")
        .eq("place_id", placeId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (!error) setMine((data ?? []) as InquiryRow[]);
    })();
  }, [open, user, placeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const t = title.trim();
    const c = content.trim();
    if (!t || !c) return;
    setSubmitting(true);
    try {
      const { error } = await (supabase as any).from("place_inquiries").insert({
        place_id: placeId,
        user_id: user.id,
        title: t.slice(0, TITLE_MAX),
        content: c.slice(0, CONTENT_MAX),
        contact: contact.trim() ? contact.trim().slice(0, CONTACT_MAX) : null,
      });
      if (error) throw error;
      toast.success("문의를 보냈어요", {
        description: "업체가 답변하면 여기에서 확인할 수 있어요.",
      });
      draft.clear();
      setTitle("");
      setContent("");
      setContact("");
      setMine((prev) =>
        prev
          ? [
              {
                id: crypto.randomUUID(),
                title: t,
                content: c,
                status: "open" as const,
                answer: null,
                answered_at: null,
                created_at: new Date().toISOString(),
              },
              ...prev,
            ]
          : prev,
      );
    } catch (err) {
      toast.error("문의 전송 실패", {
        description: err instanceof Error ? err.message : "다시 시도해주세요.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Drawer.Content className="bg-background flex flex-col rounded-t-[10px] h-[85%] mt-24 fixed bottom-0 left-0 right-0 app-col mx-auto z-50 focus:outline-none">
          <div className="px-4 pt-4 pb-[calc(1rem+var(--safe-bottom))] bg-background rounded-t-[10px] flex-1 overflow-y-auto">
            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted mb-5" />
            <Drawer.Title className="text-lg font-bold text-center mb-1 text-foreground">
              업체에 문의하기
            </Drawer.Title>
            {placeName && (
              <p className="text-[12px] text-muted-foreground text-center mb-5 truncate">
                {placeName}
              </p>
            )}

            {!user ? (
              <div className="py-10 text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  문의를 보내려면 로그인이 필요해요.
                </p>
                <Button onClick={() => navigate("/auth")}>로그인하기</Button>
              </div>
            ) : (
              <>
                <form onSubmit={handleSubmit} className="space-y-3">
                  <input
                    type="text"
                    required
                    maxLength={TITLE_MAX}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="제목 (예: 10월 예식 견적 문의)"
                    className="w-full h-11 px-3 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <textarea
                    required
                    maxLength={CONTENT_MAX}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="궁금한 내용을 적어주세요. 예식 날짜·인원·예산대를 함께 적으면 더 정확한 답변을 받아요."
                    className="w-full h-28 p-3 rounded-md border border-input bg-background text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <input
                    type="text"
                    maxLength={CONTACT_MAX}
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="연락처 (선택 — 빠른 연락을 원하시면)"
                    className="w-full h-11 px-3 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <Button type="submit" disabled={submitting} className="w-full h-11">
                    {submitting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    문의 보내기
                  </Button>
                </form>

                {/* 내 문의 내역 + 업체 답변 */}
                {mine && mine.length > 0 && (
                  <div className="mt-6 space-y-2">
                    <p className="text-[12px] font-bold text-muted-foreground">
                      내 문의 내역
                    </p>
                    {mine.map((q) => (
                      <div
                        key={q.id}
                        className="p-3 bg-card rounded-xl border border-border space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[13px] font-semibold text-foreground truncate">
                            {q.title}
                          </p>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${
                              q.answer
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {q.answer ? "답변 완료" : "대기 중"}
                          </span>
                        </div>
                        <p className="text-[12px] text-muted-foreground whitespace-pre-wrap">
                          {q.content}
                        </p>
                        {q.answer && (
                          <div className="mt-1 p-2.5 bg-primary/5 rounded-lg">
                            <p className="text-[11px] font-bold text-primary mb-0.5">
                              업체 답변
                            </p>
                            <p className="text-[12px] text-foreground whitespace-pre-wrap">
                              {q.answer}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};

export default PlaceInquirySheet;
