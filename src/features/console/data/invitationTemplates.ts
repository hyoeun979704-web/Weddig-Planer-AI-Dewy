// 청첩장 템플릿 관리 데이터 접근 레이어 (Task #3 — console 도메인).
// 패턴: docs/data-access-layer.md. AdminInvitationTemplates 의 raw supabase(템플릿/폰트 CRUD +
// Storage 업로드)를 여기로 모은다. invitation_templates/invitation_fonts 는 types 에 존재 → 캐스트 제거.

import { supabase } from "@/integrations/supabase/client";

export interface Font {
  id: string;
  name: string;
  family: string;
  file_url: string;
  weight: string;
  style: string;
}

export interface Template {
  id: string;
  slug: string | null;
  name: string;
  thumbnail_url: string;
  preview_url: string | null;
  format: string; // 'mobile' | 'paper'
  tone: string;
  price_hearts: number;
  layout: Record<string, unknown>;
  default_font_id: string | null;
  text_prompt_hint: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

const TEMPLATE_BUCKET = "invitation-templates";

export const invitationTemplateKeys = {
  all: ["admin", "invitationTemplates"] as const,
  list: () => [...invitationTemplateKeys.all, "list"] as const,
};

/**
 * 템플릿 + 활성 폰트를 병렬 로드. 목록별 에러는 플래그로 분리(템플릿 실패는 호출부 토스트,
 * 폰트 실패는 무시) — 기존 페이지 동작 보존.
 */
export async function fetchTemplatesAndFonts(): Promise<{
  templates: Template[];
  templatesError: boolean;
  fonts: Font[];
  fontsError: boolean;
}> {
  const [tpl, fnt] = await Promise.all([
    supabase
      .from("invitation_templates")
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false }),
    supabase
      .from("invitation_fonts")
      .select("id, name, family, file_url, weight, style")
      .eq("is_active", true)
      .order("display_order", { ascending: false }),
  ]);
  return {
    templates: (tpl.data ?? []) as unknown as Template[],
    templatesError: Boolean(tpl.error),
    fonts: (fnt.data ?? []) as unknown as Font[],
    fontsError: Boolean(fnt.error),
  };
}

/** 템플릿 저장 — editingId 있으면 update, 없으면 insert. 에러 시 throw. */
export async function saveTemplate(editingId: string | null, payload: Record<string, unknown>): Promise<void> {
  const { error } = editingId
    ? await supabase.from("invitation_templates").update(payload as never).eq("id", editingId)
    : await supabase.from("invitation_templates").insert(payload as never);
  if (error) throw error;
}

export async function setTemplateActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from("invitation_templates").update({ is_active: isActive } as never).eq("id", id);
  if (error) throw error;
}

export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await supabase.from("invitation_templates").delete().eq("id", id);
  if (error) throw error;
}

/** 템플릿 페이지 이미지(blob)를 공개 버킷에 업로드하고 공개 URL 반환. 에러 시 throw. */
export async function uploadTemplateBlob(blob: Blob, extension = "png"): Promise<string> {
  const path = `pages/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(TEMPLATE_BUCKET).upload(path, blob, {
    cacheControl: "3600",
    upsert: false,
    contentType: blob.type || "image/png",
  });
  if (error) throw error;
  return supabase.storage.from(TEMPLATE_BUCKET).getPublicUrl(path).data.publicUrl;
}
