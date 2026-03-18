import { Clock, ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface BusinessHoursDisplayProps {
  businessHours: string;
}

const DAYS = ["월", "화", "수", "목", "금", "토", "일"] as const;
const TODAY_INDEX = (() => {
  const jsDay = new Date().getDay(); // 0=Sun
  return jsDay === 0 ? 6 : jsDay - 1; // 0=Mon
})();

/** Try to extract per-day info from free-text business_hours */
const parseHours = (raw: string) => {
  const lines = raw.split(/[,\n;]/).map((l) => l.trim()).filter(Boolean);

  const schedule: { day: string; hours: string; isOff: boolean }[] = [];
  const holidays: string[] = [];

  // Attempt structured parse
  for (const line of lines) {
    const offMatch = line.match(/^(월|화|수|목|금|토|일)[요일]?\s*[:：]?\s*(휴무|정기휴무|휴일|쉬는날)/);
    if (offMatch) {
      schedule.push({ day: offMatch[1], hours: "휴무", isOff: true });
      continue;
    }

    const dayMatch = line.match(/^(월|화|수|목|금|토|일)[요일]?\s*[:：]?\s*(.+)/);
    if (dayMatch) {
      const isOff = /휴무|쉬는/.test(dayMatch[2]);
      schedule.push({ day: dayMatch[1], hours: dayMatch[2], isOff });
      continue;
    }

    const rangeMatch = line.match(/^(월|화|수|목|금|토|일)[~\-–](월|화|수|목|금|토|일)\s*[:：]?\s*(.+)/);
    if (rangeMatch) {
      const start = DAYS.indexOf(rangeMatch[1] as typeof DAYS[number]);
      const end = DAYS.indexOf(rangeMatch[2] as typeof DAYS[number]);
      if (start !== -1 && end !== -1) {
        const isOff = /휴무|쉬는/.test(rangeMatch[3]);
        for (let i = start; i <= end; i++) {
          schedule.push({ day: DAYS[i], hours: rangeMatch[3], isOff });
        }
        continue;
      }
    }

    if (/휴무|정기휴무|쉬는날/.test(line)) {
      holidays.push(line);
      continue;
    }

    // fallback — treat as general info
    holidays.push(line);
  }

  return { schedule, holidays, isParsed: schedule.length > 0 };
};

const BusinessHoursDisplay = ({ businessHours }: BusinessHoursDisplayProps) => {
  const [open, setOpen] = useState(false);
  const { schedule, holidays, isParsed } = parseHours(businessHours);

  // Build full week view
  const weekMap = new Map(schedule.map((s) => [s.day, s]));
  const fullWeek = DAYS.map((d) => weekMap.get(d) ?? { day: d, hours: "정보없음", isOff: false });

  const todayInfo = fullWeek[TODAY_INDEX];
  const todayLabel = isParsed
    ? todayInfo.isOff
      ? "오늘 휴무"
      : `오늘 ${todayInfo.hours}`
    : businessHours.length > 30
      ? businessHours.slice(0, 28) + "…"
      : businessHours;

  const isOpenNow = isParsed && !todayInfo.isOff;

  return (
    <div className="flex gap-3">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Clock className="w-5 h-5 text-primary" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground mb-0.5">영업시간</p>

        {/* Summary row */}
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 w-full text-left group"
        >
          {isParsed && (
            <span
              className={cn(
                "text-[11px] font-semibold px-1.5 py-0.5 rounded-full shrink-0",
                isOpenNow
                  ? "bg-green-500/15 text-green-600"
                  : "bg-red-500/15 text-red-500"
              )}
            >
              {isOpenNow ? "영업중" : "휴무"}
            </span>
          )}
          <span className="font-medium text-foreground text-sm truncate">{todayLabel}</span>
          <ChevronDown
            className={cn(
              "w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        </button>

        {/* Expanded schedule */}
        {open && (
          <div className="mt-3 space-y-0.5 bg-muted/50 rounded-xl p-3">
            {isParsed ? (
              <>
                {fullWeek.map((entry, i) => (
                  <div
                    key={entry.day}
                    className={cn(
                      "flex items-center justify-between py-1.5 px-2 rounded-lg text-sm",
                      i === TODAY_INDEX && "bg-primary/10 font-semibold"
                    )}
                  >
                    <span
                      className={cn(
                        "w-6 text-center",
                        entry.isOff ? "text-destructive" : "text-foreground",
                        i === TODAY_INDEX && "text-primary"
                      )}
                    >
                      {entry.day}
                    </span>
                    <span
                      className={cn(
                        "text-right",
                        entry.isOff
                          ? "text-destructive font-medium"
                          : "text-muted-foreground"
                      )}
                    >
                      {entry.hours}
                    </span>
                  </div>
                ))}

                {holidays.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border">
                    {holidays.map((h, i) => (
                      <p key={i} className="text-xs text-muted-foreground flex items-center gap-1.5 py-0.5">
                        <span className="text-red-400">•</span> {h}
                      </p>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                {businessHours}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BusinessHoursDisplay;
