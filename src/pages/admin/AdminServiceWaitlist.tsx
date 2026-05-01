import { useEffect, useState, useCallback } from "react";
import { Loader2, CheckCircle2, Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import AdminGuard from "@/components/admin/AdminGuard";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface WaitlistEntry {
  id: string;
  user_id: string | null;
  service_id: string;
  contact: string | null;
  notified: boolean;
  created_at: string;
}

const SERVICE_LABELS: Record<string, string> = {
  "makeup-finder": "착붙 메이크업 찾기",
  "mobile-invitation": "간편 모바일 청첩장",
  "paper-invitation": "정성가득 종이 청첩장",
  "wedding-photo": "웨딩촬영 시안",
  "ceremony-video": "특별한 식전 영상",
};

const AdminServiceWaitlist = () => {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [notifiedFilter, setNotifiedFilter] = useState<string>("all");

  const fetchEntries = useCallback(async () => {
    setIsLoading(true);
    let query = (supabase as any)
      .from("service_waitlist")
      .select("*")
      .order("created_at", { ascending: false });

    if (serviceFilter !== "all") {
      query = query.eq("service_id", serviceFilter);
    }
    if (notifiedFilter === "pending") {
      query = query.eq("notified", false);
    } else if (notifiedFilter === "notified") {
      query = query.eq("notified", true);
    }

    const { data, error } = await query;
    if (error) {
      toast({ title: "불러오기 실패", description: error.message, variant: "destructive" });
    } else {
      setEntries(data ?? []);
    }
    setIsLoading(false);
  }, [serviceFilter, notifiedFilter]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleMarkNotified = async (entry: WaitlistEntry) => {
    const { error } = await (supabase as any)
      .from("service_waitlist")
      .update({ notified: true })
      .eq("id", entry.id);
    if (error) {
      toast({ title: "처리 실패", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "알림 발송 처리 완료" });
      fetchEntries();
    }
  };

  const handleBulkMarkNotified = async () => {
    if (!confirm("모든 미발송 신청을 발송 완료로 처리하시겠어요?")) return;
    const { error } = await (supabase as any)
      .from("service_waitlist")
      .update({ notified: true })
      .eq("notified", false);
    if (error) {
      toast({ title: "처리 실패", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "일괄 처리 완료" });
      fetchEntries();
    }
  };

  const pendingCount = entries.filter((e) => !e.notified).length;

  return (
    <AdminGuard>
      <AdminLayout
        title="사전알림 신청"
        description="출시 예정 서비스에 대한 사용자 신청 관리"
        rightAction={
          pendingCount > 0 && (
            <Button size="sm" variant="outline" onClick={handleBulkMarkNotified}>
              <CheckCircle2 className="w-4 h-4 mr-1" />
              미발송 일괄 처리
            </Button>
          )
        }
      >
        {/* 필터 바 */}
        <div className="flex flex-wrap gap-2 mb-4 p-3 bg-background rounded-lg border border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="w-4 h-4" />
            <span>필터:</span>
          </div>
          <Select value={serviceFilter} onValueChange={setServiceFilter}>
            <SelectTrigger className="w-44 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 서비스</SelectItem>
              {Object.entries(SERVICE_LABELS).map(([id, label]) => (
                <SelectItem key={id} value={id}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={notifiedFilter} onValueChange={setNotifiedFilter}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="pending">미발송</SelectItem>
              <SelectItem value="notified">발송 완료</SelectItem>
            </SelectContent>
          </Select>
          <div className="ml-auto text-sm text-muted-foreground self-center">
            총 {entries.length}건 · 미발송 {pendingCount}건
          </div>
        </div>

        {/* 리스트 */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : entries.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="bg-background rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted text-xs text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold">서비스</th>
                  <th className="text-left px-4 py-2 font-semibold">연락처</th>
                  <th className="text-left px-4 py-2 font-semibold">신청일</th>
                  <th className="text-left px-4 py-2 font-semibold">상태</th>
                  <th className="text-right px-4 py-2 font-semibold">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3 text-foreground">
                      {SERVICE_LABELS[entry.service_id] ?? entry.service_id}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {entry.contact || (entry.user_id ? "(로그인 사용자)" : "-")}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(entry.created_at).toLocaleString("ko-KR")}
                    </td>
                    <td className="px-4 py-3">
                      {entry.notified ? (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                          발송 완료
                        </span>
                      ) : (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                          미발송
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!entry.notified && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkNotified(entry)}
                          className="h-7 text-xs"
                        >
                          처리 완료
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminLayout>
    </AdminGuard>
  );
};

const EmptyState = () => (
  <div className="text-center py-20 px-6">
    <h2 className="text-base font-semibold text-foreground mb-2">신청 내역이 없어요</h2>
    <p className="text-sm text-muted-foreground">
      잠금된 AI Studio 카드에서 사용자가 신청하면 여기에 표시됩니다.
    </p>
  </div>
);

export default AdminServiceWaitlist;
