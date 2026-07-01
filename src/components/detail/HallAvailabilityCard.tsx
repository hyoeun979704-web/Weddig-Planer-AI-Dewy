import { CalendarCheck } from "lucide-react";
import { useHallAvailability } from "@/hooks/useHallAvailability";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import { AVAILABILITY_META, statusForDate } from "@/lib/hallAvailability";
import { cn } from "@/lib/utils";

const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];
const fmtDate = (iso: string): string => {
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAY[d.getDay()]})`;
};

/**
 * 홀 예약 가능일 카드(wedding_hall 전용) — 파트너가 입력한 날짜별 상태를 소비자에게.
 * 개인화 핵심: 경쟁사의 일반 달력이 아니라 **내 예식 예정일에 이 홀이 가능한지**를 먼저 알려준다.
 * 데이터(입력된 가능일)가 하나도 없으면 카드 숨김(dead-end 방지 — 미입력 홀에 빈 달력 안 띄움).
 */
/**
 * @param onPickDate 입점(in-app 문의 가능) 홀에서만 전달 — 가능일 칩을 "이 날짜로 예약 문의"
 *   버튼으로 만들어 문의 시트를 그 날짜로 연다. 미전달(미입점)이면 칩은 표시만 하고 dead-end 없음.
 */
const HallAvailabilityCard = ({
  placeId,
  onPickDate,
}: {
  placeId: string;
  onPickDate?: (iso: string) => void;
}) => {
  const { data: map = {}, isLoading } = useHallAvailability(placeId);
  const { weddingSettings } = useWeddingSchedule();

  if (isLoading) return null;
  const dates = Object.keys(map);
  if (dates.length === 0) return null; // 입력된 가능일 없음 → 숨김

  const myDate =
    !weddingSettings.wedding_date_tbd && weddingSettings.wedding_date ? weddingSettings.wedding_date : null;
  const myStatus = statusForDate(map, myDate);
  const upcomingAvailable = dates.filter((d) => map[d] === "available").slice(0, 6);

  return (
    <div className="mt-3 rounded-xl border border-border bg-muted/30 p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <CalendarCheck className="w-3.5 h-3.5 text-primary" />
        <p className="text-xs font-semibold text-foreground">예약 가능일</p>
      </div>

      {/* 개인화 — 내 예식 예정일 상태 */}
      {myDate && (
        <div className="mb-2 rounded-lg bg-background border border-border px-3 py-2">
          <p className="text-[11px] text-muted-foreground">내 예식 예정일 {fmtDate(myDate)}</p>
          {myStatus ? (
            <p className={cn("text-sm font-bold", AVAILABILITY_META[myStatus].tone)}>
              {AVAILABILITY_META[myStatus].label}
            </p>
          ) : (
            <p className="text-sm font-semibold text-muted-foreground">아직 표시 없음 · 문의해보세요</p>
          )}
        </div>
      )}

      {/* 다가오는 가능일 — 입점 홀이면 칩을 눌러 그 날짜로 예약 문의(결제 아님). */}
      {upcomingAvailable.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {upcomingAvailable.map((d) =>
            onPickDate ? (
              <button
                key={d}
                type="button"
                onClick={() => onPickDate(d)}
                aria-label={`${fmtDate(d)} 예약 문의`}
                className="inline-flex items-center gap-1 text-[12px] text-foreground bg-background border border-border rounded-full pl-2 pr-2.5 py-1.5 min-h-[36px] hover:border-primary hover:text-primary transition-colors"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {fmtDate(d)}
              </button>
            ) : (
              <span
                key={d}
                className="inline-flex items-center gap-1 text-[12px] text-foreground bg-background border border-border rounded-full px-2 py-1"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {fmtDate(d)}
              </span>
            ),
          )}
        </div>
      ) : (
        <p className="text-[12px] text-muted-foreground">표시된 가능일이 없어요. 원하는 날짜는 문의해보세요.</p>
      )}
      {onPickDate && upcomingAvailable.length > 0 && (
        <p className="text-[11px] text-primary mt-1.5">날짜를 누르면 그 날짜로 예약 문의를 보낼 수 있어요.</p>
      )}

      <p className="text-[10px] text-muted-foreground/80 mt-2">
        업체가 등록한 정보예요. 정확한 예약 가능 여부는 문의로 확인하세요.
      </p>
    </div>
  );
};

export default HallAvailabilityCard;
