import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Inbox, Check, Phone, PartyPopper, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import EmptyState from "@/components/ui/empty-state";
import { relativeTime } from "@/lib/relativeTime";
import { PLACE_CATEGORY_LABEL } from "@/lib/categoryLabels";
import { useBusinessLeads, submitQuoteResponse, getQuoteLeadContact, type BusinessLead } from "@/hooks/useQuotes";

const LeadCard = ({ lead, onResponded }: { lead: BusinessLead; onResponded: () => void }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [sending, setSending] = useState(false);
  const [contact, setContact] = useState<{ name: string | null; phone: string | null } | null>(null);

  // 고객이 수락하면 연락처를 공개(이 업체에만). 수락 리드일 때만 조회.
  useEffect(() => {
    if (lead.responseStatus !== "accepted") return;
    let alive = true;
    void getQuoteLeadContact(lead.id).then((c) => { if (alive) setContact(c); });
    return () => { alive = false; };
  }, [lead.responseStatus, lead.id]);

  const send = async () => {
    if (!message.trim()) { toast.error("답변 메시지를 입력해주세요."); return; }
    setSending(true);
    const res = await submitQuoteResponse(
      lead.id, message.trim(),
      priceMin ? parseInt(priceMin, 10) : null,
      priceMax ? parseInt(priceMax, 10) : null,
    );
    setSending(false);
    if (!res.ok) {
      toast.error(res.error === "closed" ? "마감된 요청이에요." : "전송에 실패했어요.");
      return;
    }
    toast.success("견적을 보냈어요!");
    setOpen(false);
    onResponded();
  };

  const accepted = lead.responseStatus === "accepted";
  return (
    <li className={`rounded-2xl border p-4 ${
      accepted ? "border-emerald-300 bg-emerald-50/60"
        : lead.responseStatus === "sent" ? "border-dashed border-border bg-muted/40" : "border-border bg-card"
    }`}>
      <div className="flex items-center justify-between gap-2">
        <p className="font-bold text-foreground">
          {PLACE_CATEGORY_LABEL[lead.category] ?? lead.category}
          {lead.region_city ? ` · ${lead.region_city}` : ""}
        </p>
        {accepted ? (
          <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-600 shrink-0">
            <PartyPopper className="w-3.5 h-3.5" /> 수락됨
          </span>
        ) : lead.responseStatus === "sent" ? (
          <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-muted-foreground shrink-0">
            <Check className="w-3.5 h-3.5" /> 응답함
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-[12px] text-muted-foreground">
        {lead.budget_min || lead.budget_max ? `예산 ${lead.budget_min ?? "?"}~${lead.budget_max ?? "?"}만원 · ` : ""}
        {lead.wedding_date ? `예식 ${lead.wedding_date} · ` : ""}{relativeTime(lead.created_at)}
      </p>
      {lead.note && <p className="mt-2 text-[13px] text-foreground/80 whitespace-pre-line">{lead.note}</p>}

      {/* 수락 시 고객 연락처 공개 → 업체가 직접 연락 */}
      {accepted && (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-white p-3">
          <p className="text-[12px] font-bold text-emerald-700">고객이 회원님 견적을 선택했어요! 지금 연락해보세요.</p>
          {contact && (contact.name || contact.phone) ? (
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <span className="text-[13px] text-foreground">
                {contact.name ?? "고객"}{contact.phone ? ` · ${contact.phone}` : ""}
              </span>
              {contact.phone && (
                <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-1 text-[13px] font-bold text-primary">
                  <Phone className="w-4 h-4" /> 전화
                </a>
              )}
            </div>
          ) : (
            <p className="mt-1 text-[12px] text-muted-foreground">고객이 연락처를 등록하지 않았어요. 앱 알림으로 안내됩니다.</p>
          )}
        </div>
      )}

      {lead.responseStatus !== "none" && (
        <Button size="sm" variant="outline" className="mt-3 w-full"
          onClick={() => navigate(`/quote/${lead.id}/thread/${lead.place_id}`)}>
          <MessageCircle className="w-4 h-4 mr-1" /> 고객과 메시지
        </Button>
      )}
      {lead.responseStatus === "none" && !open && (
        <Button size="sm" className="mt-3" onClick={() => setOpen(true)}>견적 답변하기</Button>
      )}
      {open && (
        <div className="mt-3 space-y-2">
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="고객에게 보낼 견적/안내 메시지" />
          <div className="grid grid-cols-2 gap-2">
            <Input type="number" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} placeholder="최소(만원)" />
            <Input type="number" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} placeholder="최대(만원)" />
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setOpen(false)}>취소</Button>
            <Button size="sm" onClick={send} disabled={sending}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : "보내기"}
            </Button>
          </div>
        </div>
      )}
    </li>
  );
};

// 업체: 나에게 매칭된 견적 요청(리드)을 보고 응답한다.
const BusinessLeads = () => {
  const navigate = useNavigate();
  const { leads, loading, reload } = useBusinessLeads();

  return (
    <div className="min-h-screen bg-background app-col mx-auto pb-24">
      <header className="sticky safe-sticky-header z-50 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center h-14 px-4">
          <button onClick={() => navigate("/business/dashboard")} className="w-10 h-10 flex items-center justify-center -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-center font-semibold text-lg pr-10">받은 견적 요청</h1>
        </div>
      </header>
      <main className="px-4 py-5">
        {loading ? (
          <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : leads.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="아직 들어온 견적 요청이 없어요"
            description="고객이 조건에 맞는 견적을 요청하면 여기로 리드가 도착해요. 빠르게 답할수록 선택될 확률이 높아요."
          />
        ) : (
          <ul className="space-y-2">
            {leads.map((lead) => (
              <LeadCard key={`${lead.id}-${lead.place_id}`} lead={lead} onResponded={reload} />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
};

export default BusinessLeads;
