import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCoupleLink } from "./useCoupleLink";
import { toast } from "sonner";

export interface DiaryPhoto {
  id: string;
  photo_url: string;
  storage_path: string;
  display_order: number;
}

export interface DiaryEntry {
  id: string;
  couple_link_id: string;
  author_id: string;
  title: string;
  content: string;
  mood: string | null;
  diary_date: string;
  created_at: string;
  updated_at: string;
  photos: DiaryPhoto[];
  author_name?: string;
  is_mine: boolean;
}

export const useCoupleDiary = () => {
  const { user } = useAuth();
  const { coupleLink, isLinked } = useCoupleLink();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    if (!user || !coupleLink || !isLinked) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await (supabase
        .from("couple_diary" as any)
        .select(`
          *,
          couple_diary_photos (id, photo_url, storage_path, display_order)
        `) as any)
        .eq("couple_link_id", coupleLink.id)
        .order("diary_date", { ascending: false });

      if (error) throw error;

      // 작성자 이름 가져오기
      const authorIds = [...new Set((data || []).map((d: any) => String(d.author_id)))] as string[];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", authorIds);

      const profileMap = new Map(
        (profiles || []).map((p: { user_id: string; display_name: string | null }) => [p.user_id, p.display_name])
      );

      const enriched: DiaryEntry[] = (data || []).map((entry: any) => ({
        ...entry,
        photos: entry.couple_diary_photos || [],
        author_name: profileMap.get(entry.author_id) || "익명",
        is_mine: entry.author_id === user.id,
      }));

      setEntries(enriched);
    } catch (error) {
      console.error("Error fetching diary:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user, coupleLink, isLinked]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // 사진 업로드
  const uploadPhotos = async (files: File[]): Promise<DiaryPhoto[]> => {
    if (!user) return [];

    const uploaded: DiaryPhoto[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}_${i}.${ext}`;

      const { error } = await supabase.storage
        .from("couple-diary-photos")
        .upload(path, file, { cacheControl: "3600" });

      if (error) {
        console.error("Upload error:", error);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from("couple-diary-photos")
        .getPublicUrl(path);

      uploaded.push({
        id: "",
        photo_url: urlData.publicUrl,
        storage_path: path,
        display_order: i,
      });
    }

    return uploaded;
  };

  // 일기 작성
  const createEntry = async (
    title: string,
    content: string,
    diaryDate: string,
    mood?: string,
    photos?: File[]
  ): Promise<boolean> => {
    if (!user || !coupleLink) {
      toast.error("커플 연결이 필요합니다");
      return false;
    }

    try {
      const { data: entry, error } = await (supabase
        .from("couple_diary" as any) as any)
        .insert({
          couple_link_id: coupleLink.id,
          author_id: user.id,
          title,
          content,
          mood: mood || null,
          diary_date: diaryDate,
        })
        .select()
        .single();

      if (error) throw error;

      // 사진 업로드 및 저장
      if (photos && photos.length > 0) {
        const uploaded = await uploadPhotos(photos);
        if (uploaded.length > 0) {
          await (supabase.from("couple_diary_photos" as any) as any).insert(
            uploaded.map((p) => ({
              diary_id: entry.id,
              photo_url: p.photo_url,
              storage_path: p.storage_path,
              display_order: p.display_order,
            }))
          );
        }
      }

      toast.success("일기가 저장되었습니다 📝");
      await fetchEntries();
      return true;
    } catch (error) {
      console.error("Error creating diary:", error);
      toast.error("일기 저장에 실패했습니다");
      return false;
    }
  };

  // 일기 수정
  const updateEntry = async (
    id: string,
    title: string,
    content: string,
    diaryDate: string,
    mood?: string,
    newPhotos?: File[]
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await (supabase
        .from("couple_diary" as any) as any)
        .update({ title, content, diary_date: diaryDate, mood: mood || null })
        .eq("id", id)
        .eq("author_id", user.id);

      if (error) throw error;

      if (newPhotos && newPhotos.length > 0) {
        const uploaded = await uploadPhotos(newPhotos);
        if (uploaded.length > 0) {
          await (supabase.from("couple_diary_photos" as any) as any).insert(
            uploaded.map((p) => ({
              diary_id: id,
              photo_url: p.photo_url,
              storage_path: p.storage_path,
              display_order: p.display_order,
            }))
          );
        }
      }

      toast.success("일기가 수정되었습니다");
      await fetchEntries();
      return true;
    } catch (error) {
      console.error("Error updating diary:", error);
      toast.error("수정에 실패했습니다");
      return false;
    }
  };

  // 일기 삭제
  const deleteEntry = async (id: string): Promise<boolean> => {
    if (!user) return false;

    try {
      // 사진 스토리지에서도 삭제
      const entry = entries.find((e) => e.id === id);
      if (entry?.photos.length) {
        const paths = entry.photos.map((p) => p.storage_path);
        await supabase.storage.from("couple-diary-photos").remove(paths);
      }

      await (supabase.from("couple_diary" as any) as any).delete().eq("id", id).eq("author_id", user.id);

      setEntries((prev) => prev.filter((e) => e.id !== id));
      toast.success("일기가 삭제되었습니다");
      return true;
    } catch (error) {
      console.error("Error deleting diary:", error);
      toast.error("삭제에 실패했습니다");
      return false;
    }
  };

  // 사진 개별 삭제
  const deletePhoto = async (photoId: string, storagePath: string): Promise<boolean> => {
    try {
      await supabase.storage.from("couple-diary-photos").remove([storagePath]);
      await (supabase.from("couple_diary_photos" as any) as any).delete().eq("id", photoId);

      setEntries((prev) =>
        prev.map((e) => ({
          ...e,
          photos: e.photos.filter((p) => p.id !== photoId),
        }))
      );
      return true;
    } catch (error) {
      console.error("Error deleting photo:", error);
      return false;
    }
  };

  return {
    entries,
    isLoading,
    createEntry,
    updateEntry,
    deleteEntry,
    deletePhoto,
    refetch: fetchEntries,
  };
};
