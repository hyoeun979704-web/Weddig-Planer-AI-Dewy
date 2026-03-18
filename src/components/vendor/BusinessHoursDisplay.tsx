import { parseBusinessHours, type BusinessHoursData, type DaySchedule } from "./BusinessHoursEditor";
import { Clock, Coffee, AlertCircle } from "lucide-react";

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const DAY_SHORT: Record<string, string> = {
  mon: "월", tue: "화", wed: "수", thu: "목", fri: "금", sat: "토", sun: "일",
};

const getTodayKey = (): string => {
  const idx = new Date().getDay(); // 0=Sun
  return DAY_KEYS[idx === 0 ? 6 : idx - 1];
};

interface Props {
  businessHours: string | null;
}

const BusinessHoursDisplay = ({ businessHours }: Props) => {
  if (!businessHours) return null;

  // Legacy plain text
  let data: BusinessHoursData;
  try {
    data = JSON.parse(businessHours);
    if (!data.mon) throw new Error();
  } catch {
    // Plain text fallback
    return (
      <div className="flex items-start gap-2 text-sm text-muted-foreground">
        <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>{businessHours}</span>
      </div>
    );
  }

  const todayKey = getTodayKey();
  const todaySchedule = data[todayKey as keyof BusinessHoursData] as DaySchedule;
  const isOpenNow = !todaySchedule.closed;

  // Group consecutive days with same schedule for compact display
  const groups: { days: string[]; schedule: DaySchedule }[] = [];
  for (const day of DAY_KEYS) {
    const sched = data[day] as DaySchedule;
    const last = groups[groups.length - 1];
    if (last && last.schedule.closed === sched.closed && last.schedule.open === sched.open && last.schedule.close === sched.close) {
      last.days.push(day);
    } else {
      groups.push({ days: [day], schedule: { ...sched } });
    }
  }

  return (
    <div className="space-y-2.5">
      {/* Today status badge */}
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-primary flex-shrink-0" />
        <span className="text-sm font-semibold text-foreground">영업시간</span>
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${isOpenNow ? "bg-emerald-500/15 text-emerald-600" : "bg-destructive/10 text-destructive"}`}>
          {isOpenNow ? "영업 중" : "오늘 휴무"}
        </span>
      </div>

      {/* Day schedule table */}
      <div className="rounded-lg border border-border overflow-hidden bg-card">
        {groups.map((group, i) => {
          const isToday = group.days.includes(todayKey);
          const dayLabel = group.days.length === 1
            ? DAY_SHORT[group.days[0]]
            : `${DAY_SHORT[group.days[0]]}~${DAY_SHORT[group.days[group.days.length - 1]]}`;

          return (
            <div
              key={i}
              className={`flex items-center px-3 py-2 text-sm ${i > 0 ? "border-t border-border" : ""} ${isToday ? "bg-primary/5" : ""}`}
            >
              <span className={`w-14 font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                {dayLabel}
                {isToday && <span className="text-[9px] ml-0.5">•</span>}
              </span>
              {group.schedule.closed ? (
                <span className="text-xs text-destructive font-medium">휴무</span>
              ) : (
                <span className={`text-sm ${isToday ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                  {group.schedule.open} ~ {group.schedule.close}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Break time */}
      {data.breakTime && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Coffee className="w-3.5 h-3.5 flex-shrink-0" />
          <span>브레이크 타임: {data.breakTime}</span>
        </div>
      )}

      {/* Holidays */}
      {data.holidays && (
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-destructive/70" />
          <span>{data.holidays}</span>
        </div>
      )}
    </div>
  );
};

export default BusinessHoursDisplay;
