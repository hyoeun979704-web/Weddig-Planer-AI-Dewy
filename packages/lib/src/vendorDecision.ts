// 업체 '결정'(예약완료)을 모든 연관 화면에 일관되게 전파하는 단일 소스.
// 그동안 결정 진입점(견적 예약·상세 '이 업체로 결정'·식장 정하기·보드 직접 선택·비교
// 결정)마다 보드/예산/일정 반영 범위가 제각각이라 "같은 결정인데 어디선 보이고 어디선
// 안 보이는" 드리프트가 있었다. 이 함수 하나로 묶어 진입점이 늘어도 연동이 갈리지 않게 한다.
//
// 쓰기 대상(모두 best-effort — 하나가 실패해도 나머지는 진행):
//   1. 업체 보드: 해당 카테고리 대표 슬롯을 '예약완료' + 선택 업체로
//   2. 일정(체크리스트): "<업체> 예약 완료" 항목(완료 상태). 같은 제목 있으면 중복 안 만듦
//   3. 예산: 금액을 입력받은 경우만(앱 외부 계약이라 자동값 없음 — recordVendorBudget)
import { supabase } from "@/integrations/supabase/client";
import { markBoardSlotBookedByQuoteCategory } from "@/hooks/useVendorBoard";
import { recordVendorBudget } from "@/lib/vendorBudget";

export interface VendorDecisionInput {
  userId: string;
  /** place 카테고리(enum: wedding_hall/studio/…). 보드 슬롯·예산 카테고리 매핑 키. */
  placeCategory: string | null | undefined;
  placeId: string | null;
  vendorName: string | null;
  /** 직접 입력받은 계약 금액(만원). 없거나 0이면 예산 기록 생략. */
  amountManwon?: number | null;
  /** 일정 항목 날짜(예식일 등). 없으면 오늘. */
  scheduledDate?: string | null;
  /** 일정 항목 출처 태그(견적="quote", 직접 결정="vendor"). 기본 "vendor". */
  scheduleSource?: string;
  /** 예산 항목 메모(진입점별 출처 표기). */
  budgetMemo?: string;
}

// 일정에 "<업체> 예약 완료"를 1건 보장(idempotent). 같은 user+title 이 이미 있으면 건너뛴다
// — 재결정/다중 진입점에서 같은 항목이 중복으로 쌓이지 않게.
async function ensureBookedScheduleItem(
  userId: string,
  category: string,
  title: string,
  scheduledDate: string,
  source: string,
): Promise<void> {
  const { data: existing } = await supabase
    .from("user_schedule_items")
    .select("id")
    .eq("user_id", userId)
    .eq("title", title)
    .maybeSingle();
  if (existing?.id) return;
  const { error } = await supabase.from("user_schedule_items").insert({
    user_id: userId,
    category,
    title,
    completed: true,
    source,
    scheduled_date: scheduledDate,
  });
  if (error) console.warn("ensureBookedScheduleItem failed (best-effort)", error);
}

// 식장(wedding_hall)을 결정했는데 큐레이션 기준 식장(anchor)이 아직 없으면, 그 식장을
// anchor 로 시드한다. **이미 설정돼 있으면 절대 덮어쓰지 않는다**(명시적 '이 식장으로
// 바꾸기' 로만 변경). 그래서 SetAsWeddingVenueButton(직접 설정) 경로에선 자연히 no-op.
async function seedWeddingVenueIfEmpty(userId: string, placeId: string): Promise<void> {
  const { data: s } = await (supabase as any)
    .from("user_wedding_settings")
    .select("wedding_venue_place_id, wedding_venue_name, wedding_region")
    .eq("user_id", userId)
    .maybeSingle();
  if (s?.wedding_venue_place_id || s?.wedding_venue_name) return; // 이미 식장 있음 → 보존

  const { data: p } = await (supabase as any)
    .from("places")
    // places 테이블의 좌표 컬럼명은 lat / lng (latitude/longitude 아님 — 오타 시 항상 null).
    .select("name, city, district, lat, lng")
    .eq("place_id", placeId)
    .maybeSingle();
  if (!p) return;

  const { error } = await (supabase as any)
    .from("user_wedding_settings")
    .upsert(
      {
        user_id: userId,
        wedding_venue_place_id: placeId,
        wedding_venue_name: p.name,
        wedding_venue_city: p.city ?? null,
        wedding_venue_district: p.district ?? null,
        wedding_venue_lat: p.lat ?? null,
        wedding_venue_lng: p.lng ?? null,
        // wedding_region 미설정이면 식장 city 로 시드(SetAsWeddingVenueButton 과 동일 규칙).
        ...(s?.wedding_region == null && p.city ? { wedding_region: p.city } : {}),
      },
      { onConflict: "user_id" },
    );
  if (error) console.warn("seedWeddingVenueIfEmpty failed (best-effort)", error);
}

export interface VendorDecisionResult {
  board: boolean;
  budget: boolean;
}

export async function recordVendorDecision(input: VendorDecisionInput): Promise<VendorDecisionResult> {
  const { userId, placeCategory, placeId, vendorName, amountManwon, scheduledDate, scheduleSource, budgetMemo } = input;
  if (!userId) return { board: false, budget: false };

  // 1) 보드 — 대표 슬롯이 있는 카테고리만 반영(없으면 무시).
  const board = await markBoardSlotBookedByQuoteCategory(userId, placeCategory, placeId, vendorName);

  // 2) 일정 — 예약 결정은 카테고리 무관하게 체크리스트에 "예약 완료" 1건(보드 슬롯이 없는
  //    혼수 등 카테고리에서도 일정엔 남도록 board 와 분리). 같은 제목 있으면 중복 생략.
  {
    const title = `${vendorName?.trim() || "업체"} 예약 완료`;
    const date = scheduledDate || new Date().toISOString().slice(0, 10);
    await ensureBookedScheduleItem(userId, placeCategory ?? "general", title, date, scheduleSource ?? "vendor");
  }

  // 3) 예산 — 금액을 입력받았을 때만(만원).
  let budget = false;
  if (amountManwon != null && amountManwon > 0) {
    const r = await recordVendorBudget({ userId, placeCategory, vendorName, amountManwon, memo: budgetMemo });
    budget = r.ok;
  }

  // 4) 식장 anchor — wedding_hall 결정이고 식장이 특정될 때, anchor 가 비어있으면 시드.
  //    이미 있으면 보존(덮어쓰지 않음). 큐레이션 기준이 비는 공백을 메운다.
  if (placeCategory === "wedding_hall" && placeId) {
    await seedWeddingVenueIfEmpty(userId, placeId);
  }

  return { board: board.ok, budget };
}
