// 임신 차수 계산 유틸. 본식 시점·현재 시점의 임신 주수와 차수
// (초기/중기/후기) 를 산출해 일정 시프트·미션·AI 톤 분기에 사용.
//
// 산부인과 통상 기준:
//   - 총 임신 기간 = 40주 (280일) ≈ 출산예정일 - 마지막 생리 시작일
//   - 출산예정일(due date)에서 거꾸로 계산:
//       임신 주수(N) = 40 - floor((dueDate - 기준일) / 7일)
//   - 차수 (trimester):
//       1st (초기) = 1~13주
//       2nd (중기) = 14~27주
//       3rd (후기) = 28~40주
//
// 본식일과 출산예정일이 둘 다 있어야 의미가 있음. 어느 하나라도 없으면
// null 을 반환한다.

export type PregnancyTrimester = "first" | "second" | "third";

export interface PregnancyContext {
  /** 오늘 기준 현재 임신 주수 (정수, 1~40). 출산 이후면 null. */
  currentWeek: number | null;
  /** 본식일 기준 임신 주수 (정수). 본식이 출산 이후면 null. */
  weeksAtWedding: number | null;
  /** 본식일 기준 차수. 본식 정보 없으면 null. */
  trimesterAtWedding: PregnancyTrimester | null;
}

const TOTAL_WEEKS = 40;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

const startOfDay = (d: Date): Date => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

/**
 * 두 날짜 사이의 임신 주수 차이를 정수로 반환. dueDate 가 from 보다
 * 미래면 양수, 과거면 음수.
 */
const weeksUntil = (from: Date, dueDate: Date): number => {
  const diffDays = Math.round((startOfDay(dueDate).getTime() - startOfDay(from).getTime()) / MS_PER_DAY);
  return Math.floor(diffDays / 7);
};

/**
 * 특정 시점의 임신 주수. 음수·40 초과는 null 로 normalize.
 * dueDate 가 from 보다 미래(아직 출산 안 됨)일 때만 의미가 있음.
 */
const weekAt = (from: Date, dueDate: Date): number | null => {
  const week = TOTAL_WEEKS - weeksUntil(from, dueDate);
  if (week < 1 || week > TOTAL_WEEKS) return null;
  return week;
};

export const trimesterFromWeek = (week: number | null): PregnancyTrimester | null => {
  if (week === null) return null;
  if (week <= 13) return "first";
  if (week <= 27) return "second";
  return "third";
};

/**
 * pregnant=true 이고 dueDate 가 있을 때만 의미 있는 컨텍스트를 반환.
 * 한 쪽이라도 빠지면 모든 필드 null. weddingDate 가 없어도 currentWeek
 * 은 계산 가능.
 */
export function computePregnancyContext(
  pregnant: boolean,
  pregnancyDueDate: string | null,
  weddingDate: string | null,
  now: Date = new Date(),
): PregnancyContext {
  if (!pregnant || !pregnancyDueDate) {
    return { currentWeek: null, weeksAtWedding: null, trimesterAtWedding: null };
  }
  const due = new Date(pregnancyDueDate);
  if (isNaN(due.getTime())) {
    return { currentWeek: null, weeksAtWedding: null, trimesterAtWedding: null };
  }
  const currentWeek = weekAt(now, due);
  const weddingDateObj = weddingDate ? new Date(weddingDate) : null;
  const weeksAtWedding = weddingDateObj && !isNaN(weddingDateObj.getTime())
    ? weekAt(weddingDateObj, due)
    : null;
  return {
    currentWeek,
    weeksAtWedding,
    trimesterAtWedding: trimesterFromWeek(weeksAtWedding),
  };
}

export const trimesterLabel = (t: PregnancyTrimester | null): string => {
  switch (t) {
    case "first": return "임신 초기";
    case "second": return "임신 중기";
    case "third": return "임신 후기";
    default: return "임신 모드";
  }
};
