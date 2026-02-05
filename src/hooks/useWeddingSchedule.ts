import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ScheduleItem {
  id: string;
  title: string;
  scheduled_date: string;
  completed: boolean;
  notes: string | null;
  category: string;
}

interface WeddingSettings {
  wedding_date: string | null;
  partner_name: string | null;
}

export const useWeddingSchedule = () => {
  const { user } = useAuth();
  const [weddingSettings, setWeddingSettings] = useState<WeddingSettings>({ wedding_date: null, partner_name: null });
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch wedding settings and schedule items
  const fetchData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const [settingsRes, itemsRes] = await Promise.all([
        supabase
          .from("user_wedding_settings")
          .select("wedding_date, partner_name")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("user_schedule_items")
          .select("id, title, scheduled_date, completed, notes, category")
          .eq("user_id", user.id)
          .order("scheduled_date", { ascending: true }),
      ]);

      if (settingsRes.data) {
        setWeddingSettings({
          wedding_date: settingsRes.data.wedding_date,
          partner_name: settingsRes.data.partner_name,
        });
      }

      if (itemsRes.data) {
        setScheduleItems(itemsRes.data);
      }
    } catch (error) {
      console.error("Error fetching wedding schedule:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

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
        .select("id, title, scheduled_date, completed, notes, category")
        .single();

      if (error) throw error;

      setScheduleItems(prev => 
        [...prev, data].sort((a, b) => 
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
  const updateItemNotes = async (id: string, notes: string) => {
    try {
      await supabase
        .from("user_schedule_items")
        .update({ notes })
        .eq("id", id);

      setScheduleItems(prev =>
        prev.map(i => (i.id === id ? { ...i, notes } : i))
      );
      toast.success("메모가 저장되었습니다");
    } catch (error) {
      console.error("Error updating notes:", error);
      toast.error("메모 저장에 실패했습니다");
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
    addScheduleItem,
    toggleItemCompletion,
    deleteScheduleItem,
    updateItemNotes,
    updateScheduleItem,
  };
};
