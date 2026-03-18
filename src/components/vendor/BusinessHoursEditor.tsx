import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Clock, Coffee } from "lucide-react";

export interface DaySchedule {
  open: string;
  close: string;
  closed: boolean;
}

export interface BusinessHoursData {
  mon: DaySchedule;
  tue: DaySchedule;
  wed: DaySchedule;
  thu: DaySchedule;
  fri: DaySchedule;
  sat: DaySchedule;
  sun: DaySchedule;
  holidays: string;
  breakTime?: string;
}

const DAY_LABELS: Record<string, string> = {
  mon: "월요일",
  tue: "화요일",
  wed: "수요일",
  thu: "목요일",
  fri: "금요일",
  sat: "토요일",
  sun: "일요일",
};

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

const DEFAULT_SCHEDULE: DaySchedule = { open: "10:00", close: "19:00", closed: false };

export const parseBusinessHours = (raw: string | null): BusinessHoursData => {
  if (!raw) {
    return {
      mon: { ...DEFAULT_SCHEDULE },
      tue: { ...DEFAULT_SCHEDULE },
      wed: { ...DEFAULT_SCHEDULE },
      thu: { ...DEFAULT_SCHEDULE },
      fri: { ...DEFAULT_SCHEDULE },
      sat: { ...DEFAULT_SCHEDULE },
      sun: { open: "10:00", close: "19:00", closed: true },
      holidays: "",
      breakTime: "",
    };
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed.mon !== undefined) return parsed;
  } catch {}
  // Legacy plain text fallback
  return {
    mon: { ...DEFAULT_SCHEDULE },
    tue: { ...DEFAULT_SCHEDULE },
    wed: { ...DEFAULT_SCHEDULE },
    thu: { ...DEFAULT_SCHEDULE },
    fri: { ...DEFAULT_SCHEDULE },
    sat: { ...DEFAULT_SCHEDULE },
    sun: { open: "10:00", close: "19:00", closed: true },
    holidays: raw,
    breakTime: "",
  };
};

export const serializeBusinessHours = (data: BusinessHoursData): string => {
  return JSON.stringify(data);
};

interface Props {
  value: string;
  onChange: (value: string) => void;
}

const BusinessHoursEditor = ({ value, onChange }: Props) => {
  const [data, setData] = useState<BusinessHoursData>(() => parseBusinessHours(value));

  useEffect(() => {
    onChange(serializeBusinessHours(data));
  }, [data]);

  const updateDay = (day: string, field: keyof DaySchedule, val: string | boolean) => {
    setData((prev) => ({
      ...prev,
      [day]: { ...prev[day as keyof BusinessHoursData] as DaySchedule, [field]: val },
    }));
  };

  const applyToWeekdays = (sourceDay: string) => {
    const src = data[sourceDay as keyof BusinessHoursData] as DaySchedule;
    setData((prev) => ({
      ...prev,
      mon: { ...src },
      tue: { ...src },
      wed: { ...src },
      thu: { ...src },
      fri: { ...src },
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Clock className="w-4 h-4 text-primary" />
        <Label className="text-sm font-semibold">요일별 영업시간</Label>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        {DAY_KEYS.map((day, i) => {
          const schedule = data[day] as DaySchedule;
          const isWeekend = day === "sat" || day === "sun";
          return (
            <div
              key={day}
              className={`flex items-center gap-2 px-3 py-2.5 ${i > 0 ? "border-t border-border" : ""} ${isWeekend ? "bg-muted/40" : ""}`}
            >
              <span className={`text-sm font-medium w-12 ${schedule.closed ? "text-muted-foreground" : "text-foreground"}`}>
                {DAY_LABELS[day]}
              </span>

              <Switch
                checked={!schedule.closed}
                onCheckedChange={(checked) => updateDay(day, "closed", !checked)}
                className="scale-75"
              />

              {schedule.closed ? (
                <span className="text-xs text-destructive font-medium ml-1">휴무</span>
              ) : (
                <div className="flex items-center gap-1.5 flex-1">
                  <Input
                    type="time"
                    value={schedule.open}
                    onChange={(e) => updateDay(day, "open", e.target.value)}
                    className="h-8 text-xs w-[100px]"
                  />
                  <span className="text-xs text-muted-foreground">~</span>
                  <Input
                    type="time"
                    value={schedule.close}
                    onChange={(e) => updateDay(day, "close", e.target.value)}
                    className="h-8 text-xs w-[100px]"
                  />
                </div>
              )}

              {i === 0 && !schedule.closed && (
                <button
                  type="button"
                  onClick={() => applyToWeekdays(day)}
                  className="text-[10px] text-primary whitespace-nowrap underline ml-auto"
                >
                  평일 동일 적용
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Coffee className="w-4 h-4 text-primary" />
          <Label className="text-sm font-medium">브레이크 타임</Label>
        </div>
        <Input
          placeholder="예: 12:00~13:00"
          value={data.breakTime || ""}
          onChange={(e) => setData((prev) => ({ ...prev, breakTime: e.target.value }))}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium">정기 휴무 / 특이사항</Label>
        <Textarea
          placeholder="예: 매월 첫째, 셋째 월요일 휴무 / 설·추석 연휴 휴무"
          value={data.holidays}
          onChange={(e) => setData((prev) => ({ ...prev, holidays: e.target.value }))}
          rows={2}
        />
      </div>
    </div>
  );
};

export default BusinessHoursEditor;
