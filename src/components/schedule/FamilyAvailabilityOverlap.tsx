// 양가 일정 조율 도구 — P1(메인), P8(워킹맘 재혼), P9(해외 거주) 페르소나 핵심.
// 신부측·신랑측 가용 일자를 각각 입력받아 교집합을 시각화한다.
// localStorage 로컬 저장 — 본격 서버 동기화는 family_invites 와 연결 시 별도 작업.
//
// 피로도 줄이기:
//   - 캘린더 멀티 선택 (한 picker 에서 여러 날 클릭)
//   - "다음 4주 토요일 자동 추가" 빠른 시드 버튼
//   - 픽커가 닫혀도 추가 일자가 칩으로 즉시 반영
//
// MVP 동작:
//   1. 사용자가 신부측 가용일·신랑측 가용일을 칩으로 추가 (멀티/원클릭 시드)
//   2. 교집합 일자를 하단에 굵게 표시(식장 투어·상견례 후보일)
//   3. 양가 부재 페르소나(P10)에선 신랑측만 / 신부측만 입력 가능

import { useState, useEffect } from "react";
import { Calendar as CalIcon, Plus, X, Sparkles, Zap } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";

const STORAGE_KEY = "dewy:family-availability";

interface State {
  bride: string[];   // YYYY-MM-DD
  groom: string[];
}

function load(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { bride: [], groom: [] };
    const parsed = JSON.parse(raw);
    return {
      bride: Array.isArray(parsed?.bride) ? parsed.bride : [],
      groom: Array.isArray(parsed?.groom) ? parsed.groom : [],
    };
  } catch {
    return { bride: [], groom: [] };
  }
}

function save(s: State) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* best effort */
  }
}

const toKey = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const fromKey = (k: string): Date => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const formatChip = (s: string): string => {
  return format(fromKey(s), "M.d (E)", { locale: ko });
};

// 빠른 시드 — 오늘 기준 N주간 매주 토/일 자동 생성. 가장 자주 쓰는 케이스를 1클릭.
function nextNWeekendDates(weeks: number = 4): string[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const out: string[] = [];
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    if (d.getDay() === 0 || d.getDay() === 6) out.push(toKey(d));
  }
  return out;
}

export default function FamilyAvailabilityOverlap() {
  const { weddingSettings } = useWeddingSchedule();
  const hasParentsBride = weddingSettings.has_parents_bride;
  const hasParentsGroom = weddingSettings.has_parents_groom;

  const [state, setState] = useState<State>(() => load());
  const [pickerSide, setPickerSide] = useState<"bride" | "groom" | null>(null);

  useEffect(() => save(state), [state]);

  // 멀티 선택 모드 캘린더 — 사용자가 같은 picker 안에서 여러 일자를 토글로 추가/제거.
  // picker 닫을 필요 없이 한 번에 여러 일을 시드.
  const handleMultiSelect = (side: "bride" | "groom", days: Date[] | undefined) => {
    const keys = (days ?? []).map(toKey);
    setState((s) => ({ ...s, [side]: keys.sort() }));
  };

  const removeDate = (side: "bride" | "groom", key: string) => {
    setState((s) => ({ ...s, [side]: s[side].filter((k) => k !== key) }));
  };

  const quickAddWeekends = (side: "bride" | "groom") => {
    const seeds = nextNWeekendDates(4);
    setState((s) => {
      const merged = Array.from(new Set([...s[side], ...seeds])).sort();
      return { ...s, [side]: merged };
    });
  };

  const clearSide = (side: "bride" | "groom") => {
    setState((s) => ({ ...s, [side]: [] }));
  };

  const overlap = state.bride.filter((b) => state.groom.includes(b));
  const onlyBride = state.bride.filter((b) => !state.groom.includes(b));
  const onlyGroom = state.groom.filter((g) => !state.bride.includes(g));

  // 양가 모두 부모 없으면 도구 자체 노출 안 함 — 다른 P10 가이드가 더 적절.
  if (!hasParentsBride && !hasParentsGroom) return null;

  return (
    <section className="mx-4 my-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-1.5 mb-1">
        <CalIcon className="w-4 h-4 text-primary" />
        <h3 className="text-[14px] font-bold text-foreground">양가 일정 조율</h3>
      </div>
      <p className="text-[11px] text-muted-foreground leading-snug mb-3">
        식장 투어·상견례·시댁/친정 방문에 가능한 일자를 양가별로 입력하면 교집합을 알려드려요.
      </p>

      <div className="grid grid-cols-2 gap-2 mb-3">
        {hasParentsBride && (
          <SideColumn
            side="bride"
            label="신부측 가능"
            tone="bg-pink-50 border-pink-200 text-pink-900"
            dates={state.bride}
            onRemove={(k) => removeDate("bride", k)}
            pickerOpen={pickerSide === "bride"}
            onSelectMulti={(d) => handleMultiSelect("bride", d)}
            onPickerOpenChange={(open) => setPickerSide(open ? "bride" : null)}
            onQuickAddWeekends={() => quickAddWeekends("bride")}
            onClearAll={() => clearSide("bride")}
          />
        )}
        {hasParentsGroom && (
          <SideColumn
            side="groom"
            label="신랑측 가능"
            tone="bg-sky-50 border-sky-200 text-sky-900"
            dates={state.groom}
            onRemove={(k) => removeDate("groom", k)}
            pickerOpen={pickerSide === "groom"}
            onSelectMulti={(d) => handleMultiSelect("groom", d)}
            onPickerOpenChange={(open) => setPickerSide(open ? "groom" : null)}
            onQuickAddWeekends={() => quickAddWeekends("groom")}
            onClearAll={() => clearSide("groom")}
          />
        )}
      </div>

      {hasParentsBride && hasParentsGroom && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
            <p className="text-[12px] font-bold text-emerald-900">
              교집합 {overlap.length}일 — 양가 모두 가능
            </p>
          </div>
          {overlap.length === 0 ? (
            <p className="text-[11px] text-emerald-700">
              아직 양가 동시 가능한 일자가 없어요. 위에서 더 추가하거나, 각 측에 일자를 더 받아오세요.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {overlap.map((k) => (
                <span
                  key={k}
                  className="px-2 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-bold"
                >
                  {formatChip(k)}
                </span>
              ))}
            </div>
          )}
          {(onlyBride.length > 0 || onlyGroom.length > 0) && (
            <p className="text-[10px] text-emerald-800 mt-2 leading-snug">
              {onlyBride.length}일은 신부측만, {onlyGroom.length}일은 신랑측만 가능 — 한쪽에 동의 받으면 후보 추가 가능.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

interface SideColumnProps {
  side: "bride" | "groom";
  label: string;
  tone: string;
  dates: string[];
  onRemove: (key: string) => void;
  pickerOpen: boolean;
  onSelectMulti: (dates: Date[] | undefined) => void;
  onPickerOpenChange: (open: boolean) => void;
  onQuickAddWeekends: () => void;
  onClearAll: () => void;
}

function SideColumn({ label, tone, dates, onRemove, pickerOpen, onSelectMulti, onPickerOpenChange, onQuickAddWeekends, onClearAll }: SideColumnProps) {
  const selected = dates.map(fromKey);
  return (
    <div className={`rounded-xl border p-2.5 ${tone}`}>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[11px] font-bold">{label}</p>
        {dates.length > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="text-[10px] opacity-60 hover:opacity-100"
          >
            전체 지우기
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1 mb-1.5 min-h-[20px]">
        {dates.length === 0 ? (
          <span className="text-[10px] opacity-50">아직 없어요 — 아래 버튼으로 추가</span>
        ) : (
          dates.map((k) => (
            <span key={k} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-white/70 rounded-full text-[10px] font-medium">
              {formatChip(k)}
              <button
                type="button"
                onClick={() => onRemove(k)}
                className="ml-0.5 opacity-60 hover:opacity-100"
                aria-label="제거"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        <Popover open={pickerOpen} onOpenChange={onPickerOpenChange}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/80 border border-current/20 text-[11px] font-semibold"
            >
              <Plus className="w-3 h-3" />
              여러 일자
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            {/* 멀티 모드 — 한 picker 안에서 여러 날을 클릭/해제. picker 안 닫고 한 번에 시드. */}
            <Calendar
              mode="multiple"
              selected={selected}
              onSelect={onSelectMulti}
              className="p-3 pointer-events-auto"
            />
            <div className="border-t px-3 py-2 text-[10px] text-muted-foreground">
              여러 날 누르고 바깥 영역을 클릭해 닫기
            </div>
          </PopoverContent>
        </Popover>
        <button
          type="button"
          onClick={onQuickAddWeekends}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/80 border border-current/20 text-[11px] font-semibold"
          title="다음 4주간의 토·일을 자동 추가"
        >
          <Zap className="w-3 h-3" />
          4주 주말
        </button>
      </div>
    </div>
  );
}

