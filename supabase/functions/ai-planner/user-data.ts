// User-context loading + system-prompt augmentation. Reads wedding_settings,
// budget_settings, schedule, favorites (places), and long-term memories,
// then formats them into a Korean prose block we append to the persona
// prompt before calling Gemini.

export interface UserData {
  profile: { display_name: string | null; email: string | null } | null;
  favorites: { item_type: string; item_id: string; name?: string; city?: string | null; district?: string | null }[];
  weddingSettings: {
    wedding_date: string | null;
    wedding_region: string | null;
    partner_name: string | null;
    planning_stage: string | null;
    wedding_date_tbd: boolean | null;
    wedding_region_tbd: boolean | null;
  } | null;
  budgetSettings: {
    total_budget: number | null;
    guest_count: number | null;
    region: string | null;
  } | null;
  scheduleItems: { title: string; scheduled_date: string; completed: boolean; source?: string | null }[];
  memories: { fact_type: string; fact_text: string }[];
}

// deno-lint-ignore no-explicit-any
export async function fetchUserData(supabase: any, userId: string): Promise<UserData> {
  const [profileRes, favoritesRes, weddingRes, budgetRes, scheduleRes, memoriesRes] = await Promise.all([
    supabase.from("profiles").select("display_name, email").eq("user_id", userId).maybeSingle(),
    supabase.from("favorites").select("item_type, item_id").eq("user_id", userId),
    supabase
      .from("user_wedding_settings")
      .select("wedding_date, wedding_region, partner_name, planning_stage, wedding_date_tbd, wedding_region_tbd")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("budget_settings")
      .select("total_budget, guest_count, region")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("user_schedule_items")
      .select("title, scheduled_date, completed, source")
      .eq("user_id", userId)
      .order("scheduled_date", { ascending: true }),
    supabase
      .from("user_ai_memory")
      .select("fact_type, fact_text")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  const favorites = favoritesRes.data || [];
  // Vendor-side favorites all resolve through places now (legacy per-category
  // tables were dropped). One round-trip via item_id IN (uuid list); other
  // item_types (deal, product, influencer) just don't get a name attached.
  const placeIds = favorites
    .filter((f: { item_id: string }) => /^[0-9a-f-]{36}$/.test(f.item_id))
    .map((f: { item_id: string }) => f.item_id);

  const placeLookup: Record<string, { name: string; city: string | null; district: string | null }> = {};
  if (placeIds.length > 0) {
    const { data: places } = await supabase
      .from("places")
      .select("place_id, name, city, district")
      .in("place_id", placeIds);
    for (const p of (places ?? []) as Array<{ place_id: string; name: string; city: string | null; district: string | null }>) {
      placeLookup[p.place_id] = { name: p.name, city: p.city, district: p.district };
    }
  }

  const enrichedFavorites = favorites.map((fav: { item_type: string; item_id: string }) => ({
    ...fav,
    name: placeLookup[fav.item_id]?.name ?? "",
    city: placeLookup[fav.item_id]?.city ?? null,
    district: placeLookup[fav.item_id]?.district ?? null,
  }));

  return {
    profile: profileRes.data,
    favorites: enrichedFavorites,
    weddingSettings: weddingRes.data,
    budgetSettings: budgetRes.data,
    scheduleItems: scheduleRes.data || [],
    memories: (memoriesRes?.data as Array<{ fact_type: string; fact_text: string }> | null) || [],
  };
}

// Stage labels — same canonical set as src/data/checklistTemplate.ts so the
// AI's "어디까지 진행했는지" view matches the user's onboarding answer.
const STAGE_LABELS: Record<string, string> = {
  just_started: "이제 막 시작 (D-365 이상, 예산·비전 합의 단계)",
  researching: "정보 알아보는 중 (~D-300, 업체 비교·답사 단계)",
  contracting: "일부 업체 계약 (~D-180, 핵심 계약 진행)",
  wrapping_up: "마무리 단계 (~D-60, 시연·시착·하객 안내)",
};

export function buildUserContext(userData: UserData): string {
  const parts: string[] = [];

  if (userData.profile?.display_name) parts.push(`사용자 이름: ${userData.profile.display_name}`);
  if (userData.weddingSettings?.partner_name) parts.push(`파트너 이름: ${userData.weddingSettings.partner_name}`);

  const ws = userData.weddingSettings;
  if (ws?.wedding_date) {
    const weddingDate = new Date(ws.wedding_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysUntil = Math.ceil((weddingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    parts.push(`예식일: ${ws.wedding_date}`);
    if (daysUntil > 0) parts.push(`D-Day: D-${daysUntil} (${daysUntil}일 남음)`);
    else if (daysUntil === 0) parts.push(`D-Day: 오늘이 결혼식입니다!`);
    else parts.push(`D-Day: D+${Math.abs(daysUntil)} (결혼식 ${Math.abs(daysUntil)}일 지남)`);
  } else if (ws?.wedding_date_tbd) {
    parts.push(`예식일: 미정 (사용자가 아직 정하지 않음)`);
  }

  if (ws?.wedding_region) parts.push(`예식 지역: ${ws.wedding_region}`);
  else if (ws?.wedding_region_tbd) parts.push(`예식 지역: 미정`);

  if (ws?.planning_stage) {
    const label = STAGE_LABELS[ws.planning_stage] ?? ws.planning_stage;
    parts.push(`진행 단계: ${label}`);
  }

  const bs = userData.budgetSettings;
  if (bs) {
    const bits: string[] = [];
    if (bs.total_budget) bits.push(`총 예산 ${(bs.total_budget / 10000).toFixed(0)}만원`);
    if (bs.guest_count) bits.push(`예상 하객 ${bs.guest_count}명`);
    if (bs.region && bs.region !== ws?.wedding_region) bits.push(`예산 기준 지역 ${bs.region}`);
    if (bits.length > 0) parts.push(`예산 정보: ${bits.join(", ")}`);
  }

  if (userData.scheduleItems.length > 0) {
    const pending = userData.scheduleItems.filter((i) => !i.completed);
    const completed = userData.scheduleItems.filter((i) => i.completed);
    let scheduleText = `\n웨딩 체크리스트 (총 ${userData.scheduleItems.length}개, 완료 ${completed.length}개):`;
    if (pending.length > 0) {
      scheduleText += `\n- 다가오는 일정:`;
      pending.slice(0, 5).forEach((item) => { scheduleText += `\n  · ${item.title} (${item.scheduled_date})`; });
      if (pending.length > 5) scheduleText += `\n  · ... 외 ${pending.length - 5}개`;
    }
    parts.push(scheduleText);
  }

  if (userData.favorites.length > 0) {
    const grouped: Record<string, string[]> = {};
    const typeLabels: Record<string, string> = {
      venue: "웨딩홀", studio: "스튜디오", honeymoon: "허니문", hanbok: "한복",
      suit: "예복", appliance: "혼수가전", honeymoon_gift: "허니문 선물", invitation_venues: "상견례 장소",
    };
    for (const fav of userData.favorites) {
      if (!fav.name) continue;
      const label = typeLabels[fav.item_type] || fav.item_type;
      if (!grouped[label]) grouped[label] = [];
      grouped[label].push(fav.city ? `${fav.name} (${fav.city})` : fav.name);
    }
    if (Object.keys(grouped).length > 0) {
      const favList = Object.entries(grouped).map(([type, names]) => `- ${type}: ${names.join(", ")}`).join("\n");
      parts.push(`\n관심 업체 목록:\n${favList}`);
    }
  }

  if (userData.memories.length > 0) {
    const grouped: Record<string, string[]> = {};
    const typeLabels: Record<string, string> = {
      preference: "취향·스타일", family: "가족 관계", schedule: "일정·날짜",
      budget: "예산·결제", vendor: "업체 관심", general: "기타",
    };
    for (const m of userData.memories) {
      const label = typeLabels[m.fact_type] || m.fact_type;
      if (!grouped[label]) grouped[label] = [];
      grouped[label].push(m.fact_text);
    }
    const memText = Object.entries(grouped).map(([cat, facts]) => `- ${cat}: ${facts.join(" / ")}`).join("\n");
    parts.push(`\n사용자가 이전 대화에서 알려준 정보 (이 사실들을 기억해서 답변에 자연스럽게 반영하세요):\n${memText}`);
  }

  if (parts.length === 0) return "";
  return `\n\n## 7. 현재 사용자 정보 (User Context)\n\n다음은 현재 대화하고 있는 사용자의 정보입니다. 이 정보를 바탕으로 *맞춤화된* 조언을 제공하세요. 사용자가 묻지 않아도 적절한 추천에 자연스럽게 반영하되, 기억하고 있다는 사실을 노골적으로 드러내거나 매번 반복해서 말하지는 마세요:\n\n${parts.join("\n")}`;
}
