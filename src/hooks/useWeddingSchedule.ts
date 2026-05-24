import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { WeddingStyle } from "@/lib/weddingStyle";
import {
  derivePersonaMode,
  type CeremonyType,
  type UserRole,
  type WeddingPersonaMode,
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

export const useWeddingSchedule = () => {
  const { user } = useAuth();
  const [weddingSettings, setWeddingSettings] = useState<WeddingSettings>({
    wedding_date: null,
    partner_name: null,
    wedding_region: null,
    planning_stage: null,
    wedding_date_tbd: false,
    wedding_region_tbd: false,
    wedding_style: null,
    excluded_categories: [],
    marital_history: null,
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
  });
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch wedding settings and schedule items.
  // Depends on user.id (stable string), not the user object — useAuth may
  // hand back a fresh-reference user on every render which would re-fire
  // the query when nothing meaningful changed.
  const userId = user?.id;
  const fetchData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const [settingsRes, itemsRes] = await Promise.all([
        (supabase as any)
          .from("user_wedding_settings")
          .select(
            "wedding_date, partner_name, wedding_region, planning_stage, wedding_date_tbd, wedding_region_tbd, wedding_style, excluded_categories, marital_history, pregnant, pregnancy_due_date, role, country, wedding_country, wedding_region_sigungu, has_parents_bride, has_parents_groom, ceremony_type, persona_mode, wedding_venue_place_id, wedding_venue_name, wedding_venue_address, wedding_venue_city, wedding_venue_district, wedding_venue_lat, wedding_venue_lng"
          )
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("user_schedule_items")
          .select("id, title, scheduled_date, completed, notes, category, source")
          .eq("user_id", user.id)
          .order("scheduled_date", { ascending: true }),
      ]);

      if (settingsRes.data) {
        const s = settingsRes.data as any;
        // 페르소나 모드는 DB 트리거가 계산하지만, 마이그레이션 직후·캐시 등
        // 누락 케이스를 위해 클라이언트에서도 동일 로직으로 폴백 계산.
        const fallbackMode = derivePersonaMode({
          wedding_style: (s.wedding_style ?? null) as WeddingStyle | null,
          ceremony_type: (s.ceremony_type ?? null) as CeremonyType | null,
          marital_history:
            s.marital_history === "first" || s.marital_history === "remarriage"
              ? s.marital_history
              : null,
          pregnant: !!s.pregnant,
          role: (s.role ?? null) as UserRole | null,
          country: s.country ?? "KR",
          wedding_country: s.wedding_country ?? "KR",
          wedding_region: s.wedding_region ?? null,
          has_parents_bride: s.has_parents_bride !== false,
          has_parents_groom: s.has_parents_groom !== false,
        });
        setWeddingSettings({
          wedding_date: s.wedding_date,
          partner_name: s.partner_name,
          wedding_region: s.wedding_region || null,
          planning_stage: s.planning_stage || null,
          wedding_date_tbd: !!s.wedding_date_tbd,
          wedding_region_tbd: !!s.wedding_region_tbd,
          wedding_style: (s.wedding_style ?? null) as WeddingStyle | null,
          excluded_categories: Array.isArray(s.excluded_categories) ? s.excluded_categories : [],
          marital_history:
            s.marital_history === "first" || s.marital_history === "remarriage"
              ? s.marital_history
              : null,
          pregnant: !!s.pregnant,
          pregnancy_due_date: s.pregnancy_due_date ?? null,
          role: (s.role ?? null) as UserRole | null,
          country: s.country ?? "KR",
          wedding_country: s.wedding_country ?? "KR",
          wedding_region_sigungu: s.wedding_region_sigungu ?? null,
          has_parents_bride: s.has_parents_bride !== false,
          has_parents_groom: s.has_parents_groom !== false,
          ceremony_type: (s.ceremony_type ?? null) as CeremonyType | null,
          persona_mode: (s.persona_mode ?? fallbackMode) as WeddingPersonaMode,
          wedding_venue_place_id: s.wedding_venue_place_id ?? null,
          wedding_venue_name: s.wedding_venue_name ?? null,
          wedding_venue_address: s.wedding_venue_address ?? null,
          wedding_venue_city: s.wedding_venue_city ?? null,
          wedding_venue_district: s.wedding_venue_district ?? null,
          wedding_venue_lat: s.wedding_venue_lat ?? null,
          wedding_venue_lng: s.wedding_venue_lng ?? null,
        });
      }

      if (itemsRes.data) {
        setScheduleItems(itemsRes.data as unknown as ScheduleItem[]);
      }
    } catch (error) {
      console.error("Error fetching wedding schedule:", error);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Save wedding date
  const saveWeddingDate = async (date: string) => {
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

      setWeddingSettings(prev => ({ ...prev, wedding_date: date }));
      toast.success("결혼식 날짜가 저장되었습니다");
      return true;
    } catch (error) {
      console.error("Error saving wedding date:", error);
      toast.error("저장에 실패했습니다");
      return false;
    }
  };

  // Bulk save (date + region + partner_name + planning_stage + tbd flags
  // in one call). Used by the shared WeddingInfoSetupModal that auto-pops
  // on Schedule/Budget/MyPage when the user hasn't entered basic wedding
  // info yet.
  const saveWeddingSettings = async (
    patch: Partial<{
      wedding_date: string | null;
      partner_name: string | null;
      wedding_region: string | null;
      planning_stage: string | null;
      wedding_date_tbd: boolean;
      wedding_region_tbd: boolean;
      wedding_style: WeddingStyle | null;
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
      // 명시적 페르소나 override. DB 트리거가 보존하며, 로컬도 patch 에 들어오면 재계산을 건너뜀.
      persona_mode: WeddingPersonaMode | null;
      // 결혼식장 anchor — "이 식장으로 정하기" CTA 에서 한 번에 전체 필드 patch.
      wedding_venue_place_id: string | null;
      wedding_venue_name: string | null;
      wedding_venue_address: string | null;
      wedding_venue_city: string | null;
      wedding_venue_district: string | null;
      wedding_venue_lat: number | null;
      wedding_venue_lng: number | null;
    }>
  ) => {
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
      // 로컬 state 갱신 — DB 트리거가 권위 소스. 클라이언트는 다음 가드 하에 폴백 계산:
      //   1) patch 에 persona_mode 가 들어있으면(=manual override) 그 값을 그대로 둠.
      //   2) 아니면 다른 시그널이 패치된 경우만 재계산.
      //   3) 위 가드 없이 항상 재계산하면, MyPage 등에서 사용자가 직접 지정한
      //      override 가 저장 직후 자동값으로 되돌아가는 문제(코드 리뷰 F#4).
      setWeddingSettings(prev => {
        const merged = { ...prev, ...patch } as WeddingSettings;
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
          });
        }
        return merged;
      });

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
          }
        }
      }

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
      // Refresh local list so the page renders the new items immediately.
      const { data } = await supabase
        .from("user_schedule_items")
        .select("id, title, scheduled_date, completed, notes, category, source")
        .eq("user_id", user.id)
        .order("scheduled_date", { ascending: true });
      if (data) setScheduleItems(data as unknown as ScheduleItem[]);
      return rows.length;
    } catch (error) {
      console.error("Error seeding schedule:", error);
      return null;
    }
  };

  // Add schedule item
  const addScheduleItem = async (title: string, scheduledDate: string, category: string = 'general') => {
    if (!user) {
      toast.error("로그인이 필요합니다");
      return false;
    }

    try {
      const { data, error } = await supabase
        .from("user_schedule_items")
        .insert({ user_id: user.id, title, scheduled_date: scheduledDate, category })
        .select("id, title, scheduled_date, completed, notes, category, source")
        .single();

      if (error) throw error;

      setScheduleItems(prev =>
        ([...prev, data] as ScheduleItem[]).sort((a, b) =>
          new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime()
        )
      );
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

      setScheduleItems(prev =>
        prev.map(i => (i.id === id ? { ...i, notes } : i))
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
    const item = scheduleItems.find(i => i.id === id);
    if (!item) return;

    try {
      await supabase
        .from("user_schedule_items")
        .update({ completed: !item.completed })
        .eq("id", id);

      setScheduleItems(prev =>
        prev.map(i => (i.id === id ? { ...i, completed: !i.completed } : i))
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
      setScheduleItems(prev => prev.filter(i => i.id !== id));
      toast.success("일정이 삭제되었습니다");
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error("삭제에 실패했습니다");
    }
  };

  // Update schedule item
  const updateScheduleItem = async (id: string, updates: { title?: string; scheduled_date?: string; category?: string }) => {
    try {
      const { error } = await supabase
        .from("user_schedule_items")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      setScheduleItems(prev =>
        prev.map(i => (i.id === id ? { ...i, ...updates } : i))
          .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
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
