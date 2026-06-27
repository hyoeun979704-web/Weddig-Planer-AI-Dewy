import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, Download, UserPlus, Users, Lock, LockOpen } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import {
  fetchInvitationOwnerMeta,
  fetchRsvpMeta,
  setRsvpClosed as setRsvpClosedRemote,
  setRsvpDeadline as setRsvpDeadlineRemote,
} from "@/features/consumer/data/invitationView";
import { useAuth } from "@/contexts/AuthContext";
import { useInvitationRsvps } from "@/hooks/useInvitationRsvps";
import { useCouplePartnerId } from "@/hooks/useCouplePartnerId";
import {
  RSVP_SIDE_LABEL,
  RSVP_MEAL_LABEL,
  type InvitationRsvpRow,
} from "@/lib/guestList";
import { toCsv, downloadCsv, type CsvColumn } from "@/lib/exportCsv";

const CSV_COLUMNS: CsvColumn<InvitationRsvpRow>[] = [
  { header: "성함", value: (r) => r.name },
  { header: "참석", value: (r) => (r.is_attending ? "참석" : "불참") },
  { header: "측", value: (r) => RSVP_SIDE_LABEL[r.side] },
  { header: "동행 인원", value: (r) => r.companion_count },
  { header: "아동 수", value: (r) => r.child_count },
  { header: "식사", value: (r) => RSVP_MEAL_LABEL[r.meal_preference] },
  { header: "메시지", value: (r) => r.message ?? "" },
  { header: "응답일", value: (r) => new Date(r.created_at).toLocaleString("ko-KR") },
];

/** 청첩장 소유자용 RSVP 응답 대시보드 — 집계·명단 가져오기·CSV 내보내기. */
const InvitationRsvpDashboard = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  // 커플 공유(I8-A): 소유자 본인뿐 아니라 연결된 배우자도 같은 응답을 본다.
  const { partnerId, isLoading: coupleLoading } = useCouplePartnerId();
  const [title, setTitle] = useState<string>("");
  // I8-B 마감 제어 — 마감 토글·마감일은 소유자만 변경(배우자는 보기만).
  const [isOwner, setIsOwner] = useState(false);
  const [rsvpClosed, setRsvpClosed] = useState(false);
  const [rsvpDeadline, setRsvpDeadline] = useState("");
  const [savingClose, setSavingClose] = useState(false);
  const { rows, stats, importedIds, isLoading, importToGuestList } =
    useInvitationRsvps(id);

  // 인가 확인 겸 제목. invitations RLS(본인+배우자 SELECT)가 서버단 인가를 보장하지만,
  // 공개 발행본은 누구나 SELECT 가능하므로 클라에서도 소유자/배우자만 허용하도록 교차 검증.
  useEffect(() => {
    if (!user || !id || coupleLoading) return;
    (async () => {
      const data = await fetchInvitationOwnerMeta(id);
      const authorized = !!data && (data.user_id === user.id || data.user_id === partnerId);
      if (!authorized) {
        navigate("/invitation/my", { replace: true });
        return;
      }
      setIsOwner(data.user_id === user.id);
      const groom = data.user_data?.groom_name ?? "";
      const bride = data.user_data?.bride_name ?? "";
      setTitle(groom && bride ? `${groom} · ${bride}` : "");
      // 마감 메타는 best-effort(드리프트 시 메인 게이트가 깨지지 않도록 분리 조회).
      const meta = await fetchRsvpMeta(id);
      if (meta) {
        setRsvpClosed(meta.rsvp_closed === true);
        setRsvpDeadline(meta.rsvp_deadline ?? "");
      }
    })();
  }, [user, id, partnerId, coupleLoading, navigate]);

  // 마감 토글(소유자). RLS UPDATE 는 소유자 전용이라 배우자 경로는 애초에 노출 안 함.
  const toggleClosed = async () => {
    if (!id || savingClose) return;
    setSavingClose(true);
    const next = !rsvpClosed;
    try {
      await setRsvpClosedRemote(id, next);
      setRsvpClosed(next);
      toast.success(next ? "응답 받기를 마감했어요" : "응답 받기를 다시 열었어요");
    } catch {
      toast.error("변경에 실패했어요");
    }
    setSavingClose(false);
  };

  // 마감일 저장(소유자). 빈 값이면 무기한(NULL).
  const saveDeadline = async (date: string) => {
    if (!id) return;
    setRsvpDeadline(date);
    try {
      await setRsvpDeadlineRemote(id, date);
    } catch {
      toast.error("마감일 저장에 실패했어요");
    }
  };

  const handleExport = () => {
    downloadCsv(`rsvp-${id?.slice(0, 8) ?? "list"}`, toCsv(CSV_COLUMNS, rows));
  };

  const freshRows = rows.filter((r) => !importedIds.has(r.id));

  return (
    <div className="min-h-screen bg-background app-col mx-auto pb-10">
      <PageHeader title="참석 응답 관리" />

      <main className="px-4 py-5 space-y-5">
        {title && (
          <p className="text-sm text-muted-foreground -mt-2">
            {title}
            {rsvpClosed && (
              <span className="ml-2 text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">응답 마감됨</span>
            )}
          </p>
        )}

        {/* I8-B 응답 마감 제어 — 소유자만(배우자는 보기 전용). */}
        {isOwner && (
          <div className="bg-card border border-border rounded-xl p-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">참석 응답 받기</p>
                <p className="text-[12px] text-muted-foreground">
                  {rsvpClosed ? "지금은 마감 상태예요. 하객이 응답할 수 없어요." : "하객이 청첩장에서 참석 응답을 보낼 수 있어요."}
                </p>
              </div>
              <Button
                variant={rsvpClosed ? "default" : "outline"}
                size="sm"
                onClick={toggleClosed}
                disabled={savingClose}
                className="shrink-0 gap-1"
              >
                {rsvpClosed ? <LockOpen className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                {rsvpClosed ? "다시 열기" : "마감하기"}
              </Button>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
              <label htmlFor="rsvp-deadline" className="text-[13px] text-foreground">
                마감일 <span className="text-muted-foreground">(선택)</span>
              </label>
              <input
                id="rsvp-deadline"
                type="date"
                value={rsvpDeadline}
                onChange={(e) => saveDeadline(e.target.value)}
                className="h-9 px-2 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            {rsvpDeadline && (
              <p className="text-[11px] text-muted-foreground -mt-1">
                {rsvpDeadline}까지 응답을 받고, 다음 날부터 자동으로 마감돼요.
              </p>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Users className="w-8 h-8 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              아직 도착한 참석 응답이 없어요.
              <br />
              청첩장 링크를 공유하면 응답이 여기에 모여요.
            </p>
          </div>
        ) : (
          <>
            {/* 집계 카드 */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-card border border-border rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-foreground">{stats.attendingHeads}</p>
                <p className="text-[11px] text-muted-foreground">
                  참석 인원{stats.attendingChildren > 0 ? ` (아동 ${stats.attendingChildren})` : ""}
                </p>
              </div>
              <div className="bg-card border border-border rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-foreground">{stats.mealHeads}</p>
                <p className="text-[11px] text-muted-foreground">식사 인원</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-foreground">
                  {stats.headsBySide.groom}·{stats.headsBySide.bride}
                </p>
                <p className="text-[11px] text-muted-foreground">신랑·신부측</p>
              </div>
            </div>

            {/* 액션 */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="h-10"
                disabled={freshRows.length === 0 || importToGuestList.isPending}
                onClick={() => importToGuestList.mutate(freshRows)}
              >
                <UserPlus className="w-4 h-4 mr-1" />
                명단으로 {freshRows.length > 0 ? `${freshRows.length}명 ` : ""}가져오기
              </Button>
              <Button variant="outline" className="h-10" onClick={handleExport}>
                <Download className="w-4 h-4 mr-1" />
                CSV 내보내기
              </Button>
            </div>

            {/* 응답 목록 */}
            <div className="space-y-2">
              {rows.map((r) => (
                <div key={r.id} className="bg-card border border-border rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">
                      {r.name}
                      <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
                        {RSVP_SIDE_LABEL[r.side]}
                      </span>
                    </p>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full ${
                        r.is_attending
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {r.is_attending ? "참석" : "불참"}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    총 {1 + r.companion_count}명
                    {r.child_count > 0 ? ` (아동 ${r.child_count})` : ""}
                    {" · 식사 "}
                    {RSVP_MEAL_LABEL[r.meal_preference]}
                    {importedIds.has(r.id) ? " · 명단에 있음" : ""}
                  </p>
                  {r.message && (
                    <p className="text-[12px] text-foreground mt-1.5 whitespace-pre-wrap">
                      {r.message}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default InvitationRsvpDashboard;
