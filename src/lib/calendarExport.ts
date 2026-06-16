// 일정 → 외부 캘린더 연동 유틸(백엔드/OAuth 없이 동작하는 표준 경로).
//  · ICS(.ics) 내보내기: Google·Apple·Kakao·Outlook 모두 "가져오기/구독"으로 수용하는 표준 포맷.
//  · Google Calendar "추가" 링크: 항목 1건을 미리 채워 Google 캘린더 작성 화면을 연다(설치 불필요).
// 실시간 양방향 동기화(앱 ↔ Google/Kakao)는 OAuth + 서버가 필요해 별도 작업으로 둔다.
import type { ScheduleItem } from "@/hooks/useWeddingSchedule";

export interface CalendarEvent {
  uid: string;
  title: string;
  /** "YYYY-MM-DD" (종일 일정). */
  date: string;
  description?: string;
}

const pad = (n: number) => String(n).padStart(2, "0");
// "YYYY-MM-DD" → "YYYYMMDD" (종일 일정 DATE 값). 잘못된 입력은 빈 문자열.
const ymd = (date: string): string => (/^\d{4}-\d{2}-\d{2}$/.test(date) ? date.replace(/-/g, "") : "");
// 종일 일정의 종료일(다음 날) — ICS DTEND/Google end 는 exclusive.
function nextDayYmd(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + 1));
  return `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}`;
}

// ICS 텍스트 이스케이프(쉼표·세미콜론·백슬래시·개행). RFC5545.
function esc(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function stamp(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(
    d.getUTCMinutes(),
  )}${pad(d.getUTCSeconds())}Z`;
}

// 일정 항목들을 ICS(VCALENDAR) 문자열로. 종일 일정으로 생성한다.
export function buildICS(events: CalendarEvent[]): string {
  const now = stamp();
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Dewy//Wedding Planner//KO",
    "CALSCALE:GREGORIAN",
  ];
  for (const e of events) {
    const start = ymd(e.date);
    if (!start) continue; // 날짜 불량 항목은 건너뜀(엣지케이스 방어)
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}@dewy.app`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${nextDayYmd(e.date)}`,
      `SUMMARY:${esc(e.title)}`,
      ...(e.description ? [`DESCRIPTION:${esc(e.description)}`] : []),
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

// 스케줄 항목 → 캘린더 이벤트(완료 항목은 제목에 ✓ 표기).
export function scheduleItemsToEvents(items: ScheduleItem[]): CalendarEvent[] {
  return items
    .filter((i) => /^\d{4}-\d{2}-\d{2}$/.test(i.scheduled_date))
    .map((i) => ({
      uid: i.id,
      title: `${i.completed ? "✓ " : ""}${i.title}`,
      date: i.scheduled_date,
      description: i.notes ?? undefined,
    }));
}

// 브라우저에서 .ics 파일 다운로드(웹뷰 포함 best-effort).
export function downloadICS(filename: string, ics: string): void {
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // 즉시 revoke 하면 일부 브라우저가 다운로드를 취소 → 약간 지연.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// 단건을 Google 캘린더 작성 화면으로 여는 링크(종일). OAuth 불필요.
export function googleCalendarUrl(e: CalendarEvent): string {
  const start = ymd(e.date);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${start}/${nextDayYmd(e.date)}`,
  });
  if (e.description) params.set("details", e.description);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
