import { useQuery, useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { WeddingStyle } from "@/lib/weddingStyle";
import {
  derivePersonaMode,
  type CeremonyType,
  type UserRole,
  type WeddingPersonaMode,
  type PlanningStyle,
} from "@/lib/weddingPersona";
import { resolveRegionKey } from "@/data/budgetData";

export interface ScheduleItem {
  id: string;
  title: string;
  scheduled_date: string;
  completed: boolean;
  notes: string | null;
  category: string | null;
  source: "user" | "template";
}

interface WeddingSettings {
  wedding_date: string | null;
  partner_name: string | null;
  wedding_region: string | null;
  planning_stage: string | null;
  wedding_date_tbd: boolean;
  wedding_region_tbd: boolean;
  wedding_style: WeddingStyle | null;
  excluded_categories: string[];
  // 결혼 차수: first(초혼) | remarriage(재혼). NULL=미선택.
  marital_history: "first" | "remarriage" | null;
  // 재혼 시 자녀 동반 여부 → remarriage_with_children. (민감, set_sensitive_preference)
  has_children: boolean | null;
  // 성향 페르소나 신호 → budget_analytic/designer_late/first_timer. (비민감)
  planning_style: PlanningStyle | null;
  // 신부 임신 여부. true일 때 체크리스트 우선순위·AI 톤이 조정됨.
  pregnant: boolean;
  // 출산예정일. pregnant=true 일 때만 의미. 본식일과의 차이로 임신 차수
  // (초기/중기/후기)를 계산해 일정 시프트·미션·AI 톤이 분기.
  pregnancy_due_date: string | null;
  // 페르소나 v1 — 사용자 역할/거주지/예식 국가/시군구/부모 존재/식 형태.
  // 단일 페르소나 enum으로 자동 분류되며 UI/AI/큐레이션 분기의 진입점.
  role: UserRole | null;
  country: string | null;
  wedding_country: string | null;
  wedding_region_sigungu: string | null;
  has_parents_bride: boolean;
  has_parents_groom: boolean;
  ceremony_type: CeremonyType | null;
  /** 자동 분류 페르소나. DB 트리거에서 계산, 클라이언트도 동일 로직(weddingPersona.derivePersonaMode)으로 폴백 가능. */
  persona_mode: WeddingPersonaMode | null;
  // 결혼식장 anchor — 사용자가 명시 등록한 식장 위치. 큐레이션 기준점.
  // place_id 가 있으면 DEWY 카탈로그 내 식장. NULL 이면 외부 식장(name/주소만 사용자 입력).
  wedding_venue_place_id: string | null;
  wedding_venue_name: string | null;
  wedding_venue_address: string | null;
  wedding_venue_city: string | null;
  wedding_venue_district: string | null;
  wedding_venue_lat: number | null;
  wedding_venue_lng: number | null;
}

const DEFAULT_SETTINGS: WeddingSettings = {
  wedding_date: null,
  partner_name: null,
  wedding_region: null,
  planning_stage: null,
  wedding_date_tbd: false,
  wedding_region_tbd: false,
  wedding_style: null,
  excluded_categories: [],
  marital_history: null,
  has_children: null,
  planning_style: null,
  pregnant: false,
  pregnancy_due_date: null,
  role: null,
  country: "KR",
  wedding_country: "KR",
  wedding_region_sigungu: null,
  has_parents_bride: true,
  has_parents_groom: true,
  ceremony_type: null,
  persona_mode: "standard_bride",
  wedding_venue_place_id: null,
  wedding_venue_name: null,
  wedding_venue_address: null,
  wedding_venue_city: null,
  wedding_venue_district: null,
  wedding_venue_lat: null,
  wedding_venue_lng: null,
};

const SETTINGS_SELECT =
  "wedding_date, partner_name, wedding_region, planning_stage, wedding_date_tbd, wedding_region_tbd, wedding_style, excluded_categories, marital_history, has_children, planning_style, pregnant, pregnancy_due_date, role, country, wedding_country, wedding_region_sigungu, has_parents_bride, has_parents_groom, ceremony_type, persona_mode, wedding_venue_place_id, wedding_venue_name, wedding_venue_address, wedding_venue_city, wedding_venue_district, wedding_venue_lat, wedding_venue_lng";

const SCHEDULE_SELECT =
  "id, title, scheduled_date, completed, notes, category, source";

// Query key helpers — 외부에서도 invalidate 할 수 있도록 export.
export const weddingSettingsKey = (userId: string | undefined): QueryKey => [
  "wedding_settings",
  userId ?? null,
];
export const scheduleItemsKey = (userId: string | undefined): QueryKey => [
  "schedule_items",
  userId ?? null,
];

function mapSettingsRow(row: any): WeddingSettings {
  // 페르소나 모드는 DB 트리거가 계산하지만, 마이그레이션 직후·캐시 등
  // 누락 케이스를 위해 클라이언트에서도 동일 로직으로 폴백 계산.
  const fallbackMode = derivePersonaMode({
    wedding_style: (row.wedding_style ?? null) as WeddingStyle | null,
    ceremony_type: (row.ceremony_type ?? null) as CeremonyType | null,
    marital_history:
      row.marital_history === "first" || row.marital_history === "remarriage"
        ? row.marital_history
        : null,
    pregnant: !!row.pregnant,
    role: (row.role ?? null) as UserRole | null,
    country: row.country ?? "KR",
    wedding_country: row.wedding_country ?? "KR",
    wedding_region: row.wedding_region ?? null,
    has_parents_bride: row.has_parents_bride !== false,
    has_parents_groom: row.has_parents_groom !== false,
    has_children: !!row.has_children,
    planning_style: (row.planning_style ?? null) as PlanningStyle | null,
  });
  return {
    wedding_date: row.wedding_date ?? null,
    partner_name: row.partner_name ?? null,
    wedding_region: row.wedding_region || null,
    planning_stage: row.planning_stage || null,
    wedding_date_tbd: !!row.wedding_date_tbd,
    wedding_region_tbd: !!row.wedding_region_tbd,
    wedding_style: (row.wedding_style ?? null) as WeddingStyle | null,
    excluded_categories: Array.isArray(row.excluded_categories) ? row.excluded_categories : [],
    marital_history:
      row.marital_history === "first" || row.marital_history === "remarriage"
        ? row.marital_history
        : null,
    pregnant: !!row.pregnant,
    pregnancy_due_date: row.pregnancy_due_date ?? null,
    role: (row.role ?? null) as UserRole | null,
    country: row.country ?? "KR",
    wedding_country: row.wedding_country ?? "KR",
    wedding_region_sigungu: row.wedding_region_sigungu ?? null,
    has_parents_bride: row.has_parents_bride !== false,
    has_parents_groom: row.has_parents_groom !== false,
    has_children: row.has_children ?? null,
    planning_style: (row.planning_style ?? null) as PlanningStyle | null,
    ceremony_type: (row.ceremony_type ?? null) as CeremonyType | null,
    persona_mode: (row.persona_mode ?? fallbackMode) as WeddingPersonaMode,
    wedding_venue_place_id: row.wedding_venue_place_id ?? null,
    wedding_venue_name: row.wedding_venue_name ?? null,
    wedding_venue_address: row.wedding_venue_address ?? null,
    wedding_venue_city: row.wedding_venue_city ?? null,
    wedding_venue_district: row.wedding_venue_district ?? null,
    wedding_venue_lat: row.wedding_venue_lat ?? null,
    wedding_venue_lng: row.wedding_venue_lng ?? null,
  };
}

export const useWeddingSchedule = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  // React Query 로 단일 source of truth. 같은 queryKey 를 쓰는 모든 useWeddingSchedule
  // 호출자가 동일 cached data 를 공유 → SELECT 중복 fetch 제거 + mutation 후
  // invalidateQueries 한 번이면 전체 화면이 동기화됨.
  const settingsQuery = useQuery<WeddingSettings>({
    queryKey: weddingSettingsKey(userId),
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return DEFAULT_SETTINGS;
      const { data, error } = await (supabase as any)
        .from("user_wedding_settings")
        .select(SETTINGS_SELECT)
        .eq("user_id", userId)
        .maybeSingle();
      if (error) {
        console.error("Error fetching wedding settings:", error);
        throw error;
      }
      if (!data) return DEFAULT_SETTINGS;
      return mapSettingsRow(data);
    },
    // 페르소나/식장 변경이 잦지 않으므로 conservative stale time. 변경이 일어나는 곳은
    // mutation 이 명시적으로 invalidate 하므로 staleTime 길어도 안전.
    staleTime: 60_000,
  });

  const scheduleQuery = useQuery<ScheduleItem[]>({
    queryKey: scheduleItemsKey(userId),
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("user_schedule_items")
        .select(SCHEDULE_SELECT)
        .eq("user_id", userId)
        .order("scheduled_date", { ascending: true });
      if (error) {
        console.error("Error fetching schedule items:", error);
        throw error;
      }
      return (data ?? []) as unknown as ScheduleItem[];
    },
    staleTime: 30_000,
  });

  const weddingSettings = settingsQuery.data ?? DEFAULT_SETTINGS;
  const scheduleItems = scheduleQuery.data ?? [];
  // user 없을 때(로그인 전)는 빠르게 false 로. enabled=false 일 때 isLoading 이 true 로
  // 머무는 React Query 동작 회피.
  const isLoading = !!userId && (settingsQuery.isLoading || scheduleQuery.isLoading);

  const invalidateSettings = () =>
    queryClient.invalidateQueries({ queryKey: weddingSettingsKey(userId) });
  const invalidateSchedule = () =>
    queryClient.invalidateQueries({ queryKey: scheduleItemsKey(userId) });

  // Save wedding date — 기존 시그니처 유지.
  const saveWeddingDate = async (date: string): Promise<boolean> => {
    if (!user) {
      toast.error("로그인이 필요합니다");
      return false;
    }
    try {
      const { data: existing } = await supabase
        .from("user_wedding_settings")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (existing) {
        await supabase
          .from("user_wedding_settings")
          .update({ wedding_date: date })
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("user_wedding_settings")
          .insert({ user_id: user.id, wedding_date: date });
      }
      await invalidateSettings();
      toast.success("결혼식 날짜가 저장되었습니다");
      return true;
    } catch (error) {
      console.error("Error saving wedding date:", error);
      toast.error("저장에 실패했습니다");
      return false;
    }
  };

  type WeddingSettingsPatch = Partial<{
    wedding_date: string | null;
    partner_name: string | null;
    wedding_region: string | null;
    planning_stage: string | null;
    wedding_date_tbd: boolean;
    wedding_region_tbd: boolean;
    wedding_style: WeddingStyle | null;
    planning_style: PlanningStyle | null;
    excluded_categories: string[];
    marital_history: "first" | "remarriage" | null;
    pregnant: boolean;
    pregnancy_due_date: string | null;
    role: UserRole | null;
    country: string | null;
    wedding_country: string | null;
    wedding_region_sigungu: string | null;
    has_parents_bride: boolean;
    has_parents_groom: boolean;
    ceremony_type: CeremonyType | null;
    persona_mode: WeddingPersonaMode | null;
    wedding_venue_place_id: string | null;
    wedding_venue_name: string | null;
    wedding_venue_address: string | null;
    wedding_venue_city: string | null;
    wedding_venue_district: string | null;
    wedding_venue_lat: number | null;
    wedding_venue_lng: number | null;
  }>;

  // Bulk save (date + region + partner_name + planning_stage + tbd flags
  // in one call). Used by the shared WeddingInfoSetupModal that auto-pops
  // on Schedule/Budget/MyPage when the user hasn't entered basic wedding
  // info yet.
  const saveWeddingSettings = async (patch: WeddingSettingsPatch): Promise<boolean> => {
    if (!user) {
      toast.error("로그인이 필요합니다");
      return false;
    }
    try {
      const { data: existing } = await supabase
        .from("user_wedding_settings")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        await (supabase as any)
          .from("user_wedding_settings")
          .update(patch)
          .eq("user_id", user.id);
      } else {
        await (supabase as any)
          .from("user_wedding_settings")
          .insert({ user_id: user.id, ...patch });
      }

      // Optimistic cache update — 모든 호출자가 즉시 새 값을 보도록 setQueryData.
      // 그 다음 invalidate 로 DB 트리거 결과(persona_mode 등) 재반영.
      // 가드: patch 에 persona_mode 가 들어있으면(=manual override) 그 값을 그대로 둠.
      //       아니면 다른 시그널이 패치된 경우만 재계산. (Round 코드리뷰 F#4)
      const prev = queryClient.getQueryData<WeddingSettings>(weddingSettingsKey(user.id)) ?? DEFAULT_SETTINGS;
      const merged: WeddingSettings = { ...prev, ...patch } as WeddingSettings;
      const overrode = Object.prototype.hasOwnProperty.call(patch, "persona_mode");
      if (!overrode) {
        merged.persona_mode = derivePersonaMode({
          wedding_style: merged.wedding_style,
          ceremony_type: merged.ceremony_type,
          marital_history: merged.marital_history,
          pregnant: merged.pregnant,
          role: merged.role,
          country: merged.country,
          wedding_country: merged.wedding_country,
          wedding_region: merged.wedding_region,
          has_parents_bride: merged.has_parents_bride,
          has_parents_groom: merged.has_parents_groom,
          has_children: merged.has_children ?? false,
          planning_style: merged.planning_style,
        });
      }
      queryClient.setQueryData(weddingSettingsKey(user.id), merged);

      // Mirror region into budget_settings if the user has already set up a
      // budget. Keeps the two pages from drifting when the user updates their
      // region from the Schedule onboarding modal first vs the Budget setup
      // sheet first.
      if (patch.wedding_region) {
        const regionKey = resolveRegionKey(patch.wedding_region);
        if (regionKey) {
          const { data: budget } = await (supabase as any)
            .from("budget_settings")
            .select("id, region")
            .eq("user_id", user.id)
            .maybeSingle();
          if (budget && budget.region !== regionKey) {
            await (supabase as any)
              .from("budget_settings")
              .update({ region: regionKey })
              .eq("id", budget.id);
            // budget cache 도 같이 무효화 — Budget 페이지가 새 region 보도록.
            queryClient.invalidateQueries({ queryKey: ["budget-settings", user.id] });
          }
        }
      }

      // 마지막에 invalidate — DB 트리거가 다시 계산한 persona_mode / sync_venue_region
      // 등의 권위적 값을 다음 fetch 에 반영.
      await invalidateSettings();

      toast.success("결혼 정보가 저장되었어요");
      return true;
    } catch (error) {
      console.error("Error saving wedding settings:", error);
      toast.error("저장에 실패했어요");
      return false;
    }
  };

  // Bulk-insert recommended schedule items from the standard checklist
  // template. Skips inserting if the user already has any items (to avoid
  // duplicates on re-onboarding).
  //
  // Returns: number of rows actually inserted (0 when skipped) or null on error.
  const generateScheduleFromTemplate = async (
    items: Array<{ title: string; scheduled_date: string; category: string; completed: boolean }>
  ): Promise<number | null> => {
    if (!user) return null;
    try {
      // Idempotency guard — if user already has any items, don't double-insert.
      const { count } = await supabase
        .from("user_schedule_items")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      if ((count ?? 0) > 0) {
        return 0; // already populated; nothing to do
      }
      const rows = items.map((it) => ({ user_id: user.id, source: "template", ...it }));
      const { error } = await supabase.from("user_schedule_items").insert(rows);
      if (error) throw error;
      await invalidateSchedule();
      return rows.length;
    } catch (error) {
      console.error("Error seeding schedule:", error);
      return null;
    }
  };

  // Add schedule item
  const addScheduleItem = async (
    title: string,
    scheduledDate: string,
    category: string = "general",
  ): Promise<boolean> => {
    if (!user) {
      toast.error("로그인이 필요합니다");
      return false;
    }
    try {
      const { data, error } = await supabase
        .from("user_schedule_items")
        .insert({ user_id: user.id, title, scheduled_date: scheduledDate, category })
        .select(SCHEDULE_SELECT)
        .single();
      if (error) throw error;

      // 캐시 즉시 갱신 + sort.
      queryClient.setQueryData<ScheduleItem[]>(scheduleItemsKey(user.id), (prev) => {
        const next = [...(prev ?? []), data as unknown as ScheduleItem];
        return next.sort(
          (a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime(),
        );
      });
      toast.success("일정이 추가되었습니다");
      return true;
    } catch (error) {
      console.error("Error adding schedule item:", error);
      toast.error("일정 추가에 실패했습니다");
      return false;
    }
  };

  // Update item notes
  const updateItemNotes = async (id: string, notes: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("user_schedule_items")
        .update({ notes })
        .eq("id", id);
      if (error) throw error;
      queryClient.setQueryData<ScheduleItem[]>(scheduleItemsKey(userId), (prev) =>
        (prev ?? []).map((i) => (i.id === id ? { ...i, notes } : i)),
      );
      toast.success("메모가 저장되었습니다");
      return true;
    } catch (error) {
      console.error("Error updating notes:", error);
      toast.error("메모 저장에 실패했습니다");
      return false;
    }
  };

  // Toggle item completion
  const toggleItemCompletion = async (id: string) => {
    const item = scheduleItems.find((i) => i.id === id);
    if (!item) return;
    try {
      await supabase
        .from("user_schedule_items")
        .update({ completed: !item.completed })
        .eq("id", id);
      queryClient.setQueryData<ScheduleItem[]>(scheduleItemsKey(userId), (prev) =>
        (prev ?? []).map((i) => (i.id === id ? { ...i, completed: !i.completed } : i)),
      );
    } catch (error) {
      console.error("Error toggling item:", error);
      toast.error("업데이트에 실패했습니다");
    }
  };

  // Delete schedule item
  const deleteScheduleItem = async (id: string) => {
    try {
      await supabase.from("user_schedule_items").delete().eq("id", id);
      queryClient.setQueryData<ScheduleItem[]>(scheduleItemsKey(userId), (prev) =>
        (prev ?? []).filter((i) => i.id !== id),
      );
      toast.success("일정이 삭제되었습니다");
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error("삭제에 실패했습니다");
    }
  };

  // Update schedule item
  const updateScheduleItem = async (
    id: string,
    updates: { title?: string; scheduled_date?: string; category?: string },
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("user_schedule_items")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
      queryClient.setQueryData<ScheduleItem[]>(scheduleItemsKey(userId), (prev) =>
        (prev ?? [])
          .map((i) => (i.id === id ? { ...i, ...updates } : i))
          .sort(
            (a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime(),
          ),
      );
      toast.success("일정이 수정되었습니다");
      return true;
    } catch (error) {
      console.error("Error updating item:", error);
      toast.error("수정에 실패했습니다");
      return false;
    }
  };

  return {
    weddingSettings,
    scheduleItems,
    isLoading,
    saveWeddingDate,
    saveWeddingSettings,
    generateScheduleFromTemplate,
    addScheduleItem,
    toggleItemCompletion,
    deleteScheduleItem,
    updateItemNotes,
    updateScheduleItem,
  };
};

// 외부에서도 wedding settings cache 를 무효화할 수 있도록 작은 helper.
// 페르소나 변경 등 useWeddingSchedule 의 saveWeddingSettings 우회 경로
// (직접 supabase.upsert 호출하는 컴포넌트) 에서도 일관된 invalidate 가 가능.
export function useInvalidateWeddingSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: weddingSettingsKey(user?.id) });
}
