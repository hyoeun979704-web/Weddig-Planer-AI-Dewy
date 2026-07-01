import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useBranches } from "@/features/partners/hooks/useBranches";
import {
  fetchMyAvailability,
  setAvailability,
  clearAvailability,
  type AvailabilityMap,
} from "@/features/partners/data/hallAvailability";
import {
  AVAILABILITY_META,
  buildMonthGrid,
  nextStatus,
  shiftMonth,
} from "@/lib/hallAvailability";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

// 예식장 예약 가능일 관리 — 날짜를 탭하면 가능→마감→문의→미표시로 순환. 소비자 상세에 노출.
const BusinessAvailability = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedId, loading: branchesLoading } = useBranches();
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [map, setMap] = useState<AvailabilityMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [{ year, month0 }, setMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month0: d.getMonth() };
  });

  useEffect(() => {
    if (branchesLoading) return;
    if (!selectedId) { setLoading(false); return; }
    setPlaceId(selectedId);
    (async () => {
      try {
        setMap(await fetchMyAvailability(selectedId));
      } catch {
        toast.error("가능일을 불러오지 못했어요");
      }
      setLoading(false);
    })();
  }, [branchesLoading, selectedId]);

  const grid = useMemo(() => buildMonthGrid(year, month0), [year, month0]);
  const todayIso = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  }, []);

  const toggle = async (dateIso: string) => {
    if (!placeId || !user || dateIso < todayIso) return;
    const cur = map[dateIso] ?? null;
    const next = nextStatus(cur);
    // optimistic
    setMap((prev) => {
      const n = { ...prev };
      if (next) n[dateIso] = next;
      else delete n[dateIso];
      return n;
    });
    setSaving(dateIso);
    try {
      if (next) await setAvailability(placeId, user.id, dateIso, next);
      else await clearAvailability(placeId, dateIso);
    } catch {
      toast.error("저장에 실패했어요");
      setMap((prev) => {
        const n = { ...prev };
        if (cur) n[dateIso] = cur;
        else delete n[dateIso];
        return n;
      });
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-background app-col mx-auto flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }
  if (!placeId) {
    return (
      <div className="min-h-screen bg-background app-col mx-auto">
        <PageHeader title="예약 가능일" />
        <div className="px-5 py-20 text-center">
          <p className="text-muted-foreground">먼저 업체 기본 정보를 저장해주세요.</p>
          <Button className="mt-6" onClick={() => navigate("/business/edit")}>업체 정보 입력</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background app-col mx-auto">
      <PageHeader title="예약 가능일" />
      <main className="p-4 pb-24 space-y-4">
        <p className="text-[13px] text-muted-foreground">
          날짜를 눌러 상태를 바꿔요: <b>가능 → 마감 → 문의 → 미표시</b>. 소비자 상세페이지에 표시되고,
          예식 예정일이 맞는 신랑신부에게 먼저 안내돼요.
        </p>

        {/* 월 네비 */}
        <div className="flex items-center justify-between">
          <button aria-label="이전 달" onClick={() => setMonth((m) => shiftMonth(m.year, m.month0, -1))} className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-muted">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <p className="text-sm font-bold text-foreground">{year}년 {month0 + 1}월</p>
          <button aria-label="다음 달" onClick={() => setMonth((m) => shiftMonth(m.year, m.month0, 1))} className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-muted">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* 요일 */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS.map((w, i) => (
            <span key={w} className={cn("text-[11px] font-medium", i === 0 ? "text-rose-500" : i === 6 ? "text-blue-500" : "text-muted-foreground")}>{w}</span>
          ))}
        </div>

        {/* 날짜 그리드 */}
        <div className="grid grid-cols-7 gap-1">
          {grid.map((iso, i) => {
            if (!iso) return <span key={`pad-${i}`} />;
            const day = Number(iso.slice(8, 10));
            const st = map[iso] ?? null;
            const past = iso < todayIso;
            const meta = st ? AVAILABILITY_META[st] : null;
            return (
              <button
                key={iso}
                type="button"
                disabled={past || saving === iso}
                onClick={() => toggle(iso)}
                className={cn(
                  "aspect-square rounded-lg border text-[13px] flex flex-col items-center justify-center gap-0.5 transition-colors",
                  past ? "border-transparent text-muted-foreground/40" : "border-border hover:border-primary/40",
                  iso === todayIso && "ring-1 ring-primary/40",
                )}
                aria-label={`${month0 + 1}월 ${day}일 ${meta ? meta.label : "미표시"}`}
              >
                <span className={cn(past ? "" : "text-foreground")}>{day}</span>
                {meta && <span className={cn("w-1.5 h-1.5 rounded-full", meta.dot)} />}
              </button>
            );
          })}
        </div>

        {/* 범례 */}
        <div className="flex flex-wrap gap-3 pt-1">
          {(["available", "limited", "booked"] as const).map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <span className={cn("w-2 h-2 rounded-full", AVAILABILITY_META[s].dot)} />
              {AVAILABILITY_META[s].label}
            </span>
          ))}
        </div>
      </main>
    </div>
  );
};

export default BusinessAvailability;
