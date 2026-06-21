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
    marital_history: "first" | "remarriage" | null;
    pregnant: boolean | null;
    pregnancy_due_date: string | null;
    // 페르소나 v1 신호 — 신랑/국제/원격/1인진행/시군구/식 형태 분기에 사용.
    role: string | null;
    country: string | null;
    wedding_country: string | null;
    wedding_region_sigungu: string | null;
    has_parents_bride: boolean | null;
    has_parents_groom: boolean | null;
    ceremony_type: string | null;
    persona_mode: string | null;
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
      .select("wedding_date, wedding_region, partner_name, planning_stage, wedding_date_tbd, wedding_region_tbd, marital_history, pregnant, pregnancy_due_date, role, country, wedding_country, wedding_region_sigungu, has_parents_bride, has_parents_groom, ceremony_type, persona_mode")
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

  if (ws?.wedding_region) {
    const sigungu = ws.wedding_region_sigungu ? ` (${ws.wedding_region_sigungu})` : "";
    parts.push(`예식 지역: ${ws.wedding_region}${sigungu}`);
  } else if (ws?.wedding_region_tbd) parts.push(`예식 지역: 미정`);

  // 페르소나 신호 — 헤더로 묶어 한 번에 노출. AI가 호칭·답변 톤·우선순위에
  // 일관 적용하도록 강조.
  if (ws) {
    const personaBits: string[] = [];
    if (ws.role === "groom") {
      personaBits.push("준비 주체: 신랑 주도 (신랑님 호칭, 신랑 예복·예물·신랑 양가 가이드 우선)");
    } else if (ws.role === "shared") {
      personaBits.push("준비 주체: 공동 주도 (양쪽 호칭 균형, 의사결정 분담 가이드)");
    }
    const country = ws.country ?? "KR";
    const weddingCountry = ws.wedding_country ?? "KR";
    if (country !== "KR") {
      personaBits.push(`거주 국가: ${country} — 한국 방문 일정 압축·시차·양가 부모 위임 가능 영역을 우선 안내`);
    }
    if (weddingCountry !== "KR" || (country !== "KR" && country !== weddingCountry)) {
      personaBits.push(
        `국제결혼 모드: 거주 ${country} · 예식 ${weddingCountry}. 한국 관습 + 외국 가족 안내(영문 자료 생성 가능), 두 식 일정 조율 우선. 사용자가 영문 답변을 원하면 영문으로 작성하세요.`
      );
    }
    if (ws.has_parents_bride === false || ws.has_parents_groom === false) {
      const which = ws.has_parents_bride === false && ws.has_parents_groom === false
        ? "양가 모두"
        : ws.has_parents_bride === false ? "신부 측" : "신랑 측";
      personaBits.push(
        `부모 부재: ${which} 부모님이 안 계심. 양가 분담·상견례·폐백 표준 가이드 대신 1인 진행 변형(친정/시댁 역할 부재) 및 정서적 톤을 우선 제공하세요. "부모님께 여쭤보세요" 같은 발언 금지.`
      );
    }
    if (ws.ceremony_type) {
      const map: Record<string, string> = {
        hotel: "호텔 웨딩 (5천~1억 패키지·진짜 후기·PDF 견적·위임 가능 영역 명시)",
        small_real: "진짜 스몰 (40~80명·레스토랑/하우스/카페형, 호텔 스몰 패키지가 아님)",
        outdoor: "야외·가든 (우천 대비·음향·조명·계절·접근성 디테일 강조)",
        restaurant: "레스토랑 웨딩 (소규모 진행 흐름·식순 가이드 중심)",
        public_facility: "공공시설(구민회관/시민회관) — 저예산·DIY 가능 영역 명시",
        self_only: "셀프웨딩 (촬영 노하우·양가 인사 시나리오·혼인신고 체크리스트)",
        none: "결혼식 안 함 (혼인신고만) — 식 정보 숨기고 신혼여행·신혼집·혼수 중심",
        snap_only: "스냅 촬영만 — 결혼 정보 숨기고 콘셉트별 작가·기념일 패키지·라이프스타일",
        dual_ceremony: "이중식 (한국+해외) — 두 식 일정·문화 통합·통역·번역 안내",
      };
      const desc = map[ws.ceremony_type] ?? ws.ceremony_type;
      personaBits.push(`식 형태 세분: ${desc}`);
    }
    if (ws.persona_mode) {
      // I5a — 성향형 페르소나(budget/designer/first_timer/자녀동반 재혼)는 위 role/country/
      // parents/ceremony 신호로 톤이 잡히지 않아 자동분류 문자열만 가던 갭(persona-sim AI백엔드 ❌).
      // 해당 모드에 한해 LLM 톤 지침을 명시 주입. (ceremony_type 맵과 동일한 서버측 인라인 패턴.)
      const personaTone: Record<string, string> = {
        budget_analytic: "예산 최적화·가성비·추가금 투명성을 우선. 숫자·비교 중심으로 답하고 감성 과잉은 자제.",
        designer_late: "디자이너·하우스·컨셉 중심의 트렌디·에디토리얼 톤. 만혼이라 효율과 취향을 모두 존중.",
        first_timer: "결혼 준비가 처음 — 용어를 풀어주고 단계별 What→How로 안내, 막막함을 줄이는 친절한 톤. 한 번에 너무 많은 정보를 쏟지 말 것.",
        remarriage_with_children: "재혼 + 자녀 동반 — 작은 가족식·자녀 동반 식순·정서 배려를 우선하고 표준 양가/폐백을 강요하지 말 것. 다정한 톤.",
      };
      const tone = personaTone[ws.persona_mode];
      personaBits.push(
        `자동 분류 페르소나: ${ws.persona_mode} (위 신호들의 우선순위 결합 결과 — 톤·미션·큐레이션 분기의 단일 anchor로 사용)${tone ? `\n  · 톤 지침: ${tone}` : ""}`
      );
    }
    if (personaBits.length > 0) {
      parts.push(`\n페르소나 컨텍스트:\n- ${personaBits.join("\n- ")}`);
    }
  }

  if (ws?.planning_stage) {
    const label = STAGE_LABELS[ws.planning_stage] ?? ws.planning_stage;
    parts.push(`진행 단계: ${label}`);
  }

  // 결혼 차수·임신 — 답변 톤·우선순위 분기에 사용. NULL/false는 침묵.
  if (ws?.marital_history === "remarriage") {
    parts.push(
      "결혼 차수: 재혼 (양가 설득·작은 가족식·예단 간소화 등 톤을 고려해 답변하세요)"
    );
  }
  if (ws?.pregnant) {
    // 차수 (1~13 / 14~27 / 28~40 주) 계산 — dueDate 가 있으면 본식 시점 주수로 분기.
    const baseMsg =
      "임신 중: 신부가 임신 중입니다. 드레스 가봉·본식 촬영·허니문 일정을 가능하면 앞당기고, 식사·동선·컨디션 부담을 줄이는 옵션을 우선 추천하세요. 알코올·장거리 항공 등은 부적절합니다.";
    if (ws.pregnancy_due_date && ws.wedding_date) {
      const due = new Date(ws.pregnancy_due_date);
      const wedAt = new Date(ws.wedding_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const TOTAL = 40;
      const MS_DAY = 86_400_000;
      const weekAt = (from: Date) => {
        const diffWeeks = Math.floor((due.getTime() - from.getTime()) / MS_DAY / 7);
        const w = TOTAL - diffWeeks;
        return w >= 1 && w <= TOTAL ? w : null;
      };
      const wedWeek = weekAt(wedAt);
      const nowWeek = weekAt(today);
      const trimesterLabel = wedWeek === null
        ? null
        : wedWeek <= 13 ? "초기 (1~13주)"
        : wedWeek <= 27 ? "중기 (14~27주)"
        : "후기 (28~40주)";
      const tone = wedWeek === null
        ? ""
        : wedWeek <= 13
          ? "본식 시점이 임신 초기라 컨디션·드레스 가봉 사이즈 여유 정도만 보수적으로 안내하세요. 입덧·피로감을 고려한 답변."
          : wedWeek <= 27
            ? "본식 시점이 임신 중기라 가장 안정적인 시기예요. 가봉·촬영·시연을 한 시기에 집중하도록 안내하세요."
            : "본식 시점이 임신 후기라 항공 제약·체력 부담이 큽니다. 신혼여행은 단거리·연기 옵션 우선, 본식 동선 최소화, 막달 산부인과 상담 강조.";
      const weekInfo = [
        nowWeek !== null ? `현재 약 ${nowWeek}주차` : null,
        wedWeek !== null ? `본식 시점 약 ${wedWeek}주차 (${trimesterLabel})` : null,
      ].filter(Boolean).join(", ");
      parts.push(`${baseMsg}${weekInfo ? ` 추가 정보: ${weekInfo}. ` : " "}${tone}`);
    } else {
      parts.push(baseMsg);
    }
  }

  const bs = userData.budgetSettings;
  if (bs) {
    const bits: string[] = [];
    // budget_settings.total_budget 은 **만원 단위** 저장(예: 1500 = 1,500만원).
    // 과거 /10000 으로 "총 예산 0만원"이 주입되던 회귀 — 그대로 만원 표기한다.
    if (bs.total_budget) bits.push(`총 예산 ${Math.round(bs.total_budget).toLocaleString()}만원`);
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
