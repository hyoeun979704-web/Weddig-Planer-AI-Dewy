// 청첩장 폰트 관리 데이터 접근 레이어 (Task #3 — console 도메인).
// 패턴: docs/data-access-layer.md. AdminInvitationFonts 의 invitation_fonts CRUD + Storage 업로드를
// 여기로 모은다. invitation_fonts 는 types 에 존재 → (supabase as any) 캐스트 제거.

import { supabase } from "@/integrations/supabase/client";

export interface Font {
  id: string;
  name: string;
  family: string;
  file_url: string;
  preview_url: string | null;
  category: string;
  weight: string;
  style: string;
  supports_korean: boolean;
  license: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

const FONT_BUCKET = "invitation-fonts";

export const invitationFontKeys = {
  all: ["admin", "invitationFonts"] as const,
  list: () => [...invitationFontKeys.all, "list"] as const,
};

export async function fetchFonts(): Promise<Font[]> {
  const { data, error } = await supabase
    .from("invitation_fonts")
    .select("*")
    .order("display_order", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Font[];
}

/** 폰트 저장 — editingId 있으면 update, 없으면 insert. 에러 시 throw. */
export async function saveFont(editingId: string | null, form: Record<string, unknown>): Promise<void> {
  const { error } = editingId
    ? await supabase.from("invitation_fonts").update(form as never).eq("id", editingId)
    : await supabase.from("invitation_fonts").insert(form as never);
  if (error) throw error;
}

export async function setFontActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from("invitation_fonts").update({ is_active: isActive } as never).eq("id", id);
  if (error) throw error;
}

export async function deleteFont(id: string): Promise<void> {
  const { error } = await supabase.from("invitation_fonts").delete().eq("id", id);
  if (error) throw error;
}

/** 폰트 파일을 공개 버킷에 업로드하고 공개 URL 반환(1년 캐시). 에러 시 throw. */
export async function uploadFontFile(file: File, ext: string, fallbackMime: string): Promise<string> {
  const filename = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(FONT_BUCKET).upload(filename, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType: file.type || fallbackMime,
  });
  if (error) throw error;
  return supabase.storage.from(FONT_BUCKET).getPublicUrl(filename).data.publicUrl;
}
