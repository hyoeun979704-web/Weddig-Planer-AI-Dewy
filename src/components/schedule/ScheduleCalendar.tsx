import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CalendarPlus, Download, Heart, Plus } from "lucide-react";
import { toast } from "sonner";
import { openExternal } from "@/lib/native/openExternal";
import { parseLocalDate } from "@/lib/schedule";
import type { ScheduleItem } from "@/hooks/useWeddingSchedule";
import {
  buildICS,
  downloadICS,
  googleCalendarUrl,
  scheduleItemsToEvents,
  type CalendarEvent,
} from "@/lib/calendarExport";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const keyOf = (d: Date) => format(d, "yyyy-MM-dd");

interface Props {
  items: ScheduleItem[];
  weddingDate: string | null;
  onToggleItem?: (id: string) => void;
}

// 일정 최상단 월 캘린더 — 등록된 일정을 날짜에 점으로 표시하고, 날짜를 누르면 그날 일정을
// 펼친다. 각 일정은 Google 캘린더로 바로 추가, 전체는 .ics 로 내보내 Google·Apple·카카오
// 캘린더에서 가져올 수 있다(백엔드/OAuth 불필요한 표준 연동).
const ScheduleCalendar = ({ items, weddingDate, onToggleItem }: Props) => {
  const navigate = useNavigate();
  const [cursor, setCursor] = useState<Date>(() => new Date());
  const [selected, setSelected] = useState<Date>(() => new Date());

  // 날짜별 일정 묶음(빠른 조회). scheduled_date 가 키.
  const byDate = useMemo(() => {
    const m = new Map<string, ScheduleItem[]>();
    for (const it of items) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(it.scheduled_date)) continue;
      const arr = m.get(it.scheduled_date) ?? [];
      arr.push(it);
      m.set(it.scheduled_date, arr);
    }
    return m;
  }, [items]);

  // 6주 그리드(월 시작주 일요일 ~ 월 끝주 토요일).
  const grid = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const weddingKey = weddingDate && /^\d{4}-\d{2}-\d{2}$/.test(weddingDate) ? weddingDate : null;
  const selectedItems = byDate.get(keyOf(selected)) ?? [];

  const exportAll = () => {
    const events: CalendarEvent[] = scheduleItemsToEvents(items);
    if (weddingKey) events.unshift({ uid: `wedding-${weddingKey}`, title: "💍 결혼식 (D-Day)", date: weddingKey });
    if (events.length === 0) { toast.info("내보낼 일정이 없어요. 먼저 일정을 추가해보세요."); return; }
    downloadICS("dewy-schedule.ics", buildICS(events));
    toast.success("캘린더 파일(.ics)을 저장했어요", {
      description: "Google·Apple·카카오 캘린더의 '가져오기'로 추가할 수 있어요.",
      duration: 4500,
    });
  };

  const addOneToGoogle = (it: ScheduleItem) => {
    const [e] = scheduleItemsToEvents([it]);
    if (e) void openExternal(googleCalendarUrl(e));
  };

  return (
    <div className="bg-white rounded-2xl border border-border p-4">
      {/* 월 네비 + 내보내기 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCursor((c) => subMonths(c, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
            aria-label="이전 달"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[15px] font-bold text-foreground min-w-[88px] text-center">
            {format(cursor, "yyyy년 M월", { locale: ko })}
          </span>
          <button
            onClick={() => setCursor((c) => addMonths(c, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
            aria-label="다음 달"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={exportAll}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-primary/10 text-primary text-[12px] font-semibold active:scale-95"
        >
          <Download className="w-3.5 h-3.5" /> 내보내기
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((w, i) => (
          <div key={w} className={`text-center text-[11px] font-medium py-1 ${i === 0 ? "text-rose-400" : i === 6 ? "text-blue-400" : "text-muted-foreground"}`}>
            {w}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-y-1">
        {grid.map((day) => {
          const k = keyOf(day);
          const inMonth = isSameMonth(day, cursor);
          const dayItems = byDate.get(k) ?? [];
          const hasItems = dayItems.length > 0;
          const allDone = hasItems && dayItems.every((d) => d.completed);
          const isSel = isSameDay(day, selected);
          const isWedding = k === weddingKey;
          const dow = day.getDay();
          return (
            <button
              key={k}
              onClick={() => setSelected(day)}
              className="flex flex-col items-center py-1"
            >
              <span
                className={`w-8 h-8 flex items-center justify-center rounded-full text-[13px] transition-colors ${
                  isSel
                    ? "bg-primary text-primary-foreground font-bold"
                    : isWedding
                      ? "bg-primary/15 text-primary font-bold"
                      : isToday(day)
                        ? "ring-1 ring-primary text-foreground font-semibold"
                        : !inMonth
                          ? "text-muted-foreground/35"
                          : dow === 0
                            ? "text-rose-500"
                            : dow === 6
                              ? "text-blue-500"
                              : "text-foreground"
                }`}
              >
                {isWedding && !isSel ? <Heart className="w-3.5 h-3.5 fill-primary text-primary" /> : day.getDate()}
              </span>
              {/* 일정 점 — 미완료는 강조색, 모두 완료는 연한 초록 */}
              <span className="h-1.5 mt-0.5 flex items-center gap-0.5">
                {hasItems && (
                  <span className={`w-1.5 h-1.5 rounded-full ${allDone ? "bg-green-400" : "bg-primary"}`} />
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* 선택한 날의 일정 */}
      <div className="mt-3 border-t border-border pt-3">
        <p className="text-[13px] font-bold text-foreground mb-2">
          {format(selected, "M월 d일 (EEEE)", { locale: ko })}
          {selectedItems.length > 0 && <span className="text-muted-foreground font-medium"> · {selectedItems.length}건</span>}
        </p>
        {selectedItems.length > 0 ? (
          <ul className="space-y-1.5">
            {selectedItems.map((it) => (
              <li key={it.id} className="flex items-center gap-2.5">
                <button
                  onClick={() => onToggleItem?.(it.id)}
                  aria-label={it.completed ? "완료 취소" : "완료 처리"}
                  className={`w-4 h-4 rounded-full border-2 shrink-0 transition-colors ${
                    it.completed ? "bg-green-500 border-green-500" : "border-muted-foreground/30 hover:border-primary"
                  }`}
                />
                <span className={`flex-1 min-w-0 text-[13px] truncate ${it.completed ? "text-muted-foreground line-through" : "text-foreground"}`}>
                  {it.title}
                </span>
                <button
                  onClick={() => addOneToGoogle(it)}
                  className="flex items-center gap-0.5 text-[11px] font-semibold text-primary shrink-0 px-1.5 py-0.5 rounded-full hover:bg-primary/10"
                  title="Google 캘린더에 추가"
                >
                  <CalendarPlus className="w-3 h-3" /> Google
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <button
            onClick={() => navigate("/my-schedule")}
            className="w-full flex items-center justify-center gap-1.5 py-3 rounded-xl border border-dashed border-border text-[12px] text-muted-foreground active:bg-muted/40"
          >
            <Plus className="w-3.5 h-3.5" /> 이 날 일정 추가하기
          </button>
        )}
      </div>
    </div>
  );
};

export default ScheduleCalendar;
