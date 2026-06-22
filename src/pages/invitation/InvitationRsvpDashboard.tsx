import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, Download, UserPlus, Users } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
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
  const { rows, stats, importedIds, isLoading, importToGuestList } =
    useInvitationRsvps(id);

  // 인가 확인 겸 제목. invitations RLS(본인+배우자 SELECT)가 서버단 인가를 보장하지만,
  // 공개 발행본은 누구나 SELECT 가능하므로 클라에서도 소유자/배우자만 허용하도록 교차 검증.
  useEffect(() => {
    if (!user || !id || coupleLoading) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("invitations")
        .select("user_id, user_data")
        .eq("id", id)
        .maybeSingle();
      const authorized = !!data && (data.user_id === user.id || data.user_id === partnerId);
      if (!authorized) {
        navigate("/invitation/my", { replace: true });
        return;
      }
      const groom = data.user_data?.groom_name ?? "";
      const bride = data.user_data?.bride_name ?? "";
      setTitle(groom && bride ? `${groom} · ${bride}` : "");
    })();
  }, [user, id, partnerId, coupleLoading, navigate]);

  const handleExport = () => {
    downloadCsv(`rsvp-${id?.slice(0, 8) ?? "list"}`, toCsv(CSV_COLUMNS, rows));
  };

  const freshRows = rows.filter((r) => !importedIds.has(r.id));

  return (
    <div className="min-h-screen bg-background app-col mx-auto pb-10">
      <PageHeader title="참석 응답 관리" />

      <main className="px-4 py-5 space-y-5">
        {title && (
          <p className="text-sm text-muted-foreground -mt-2">{title}</p>
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
