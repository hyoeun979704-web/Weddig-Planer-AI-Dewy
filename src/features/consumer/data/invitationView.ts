// 청첩장 공개 뷰어·갤러리·RSVP 응답(invitations·invitation_templates + RSVP RPC) 데이터 접근
// 레이어 (Task #3 — consumer 도메인). 패턴: dressFitting.ts.
// InvitationGallery·InvitationViewer·InvitationRsvpDashboard·MobileInvitationView2 가 공유하는
// invitations 조회·마감 메타·RSVP 제출/수정 RPC 호출을 모은다.
//
// 드리프트 주의: rsvp_closed·rsvp_deadline 컬럼과 submit/update RSVP RPC 는 types.ts 에
// 아직 없다(미적용 또는 stale). 존재 컬럼만 쓰는 조회는 타입드 supabase.from("invitations") 로,
// 누락 컬럼/RPC 만 (supabase as any) + as never 캐스트로 동일 런타임 동작을 보존한다.

import { supabase } from "@/integrations/supabase/client";

export interface InvitationGalleryRow {
  id: string;
  user_id: string;
  template_id: string | null;
  user_data: Record<string, string> | null;
  status: string;
  created_at: string;
  updated_at: string;
  invitation_templates: {
    name: string;
    thumbnail_url: string;
    format: string;
  } | null;
}

export interface PublishedInvitationRow {
  id: string;
  user_data: Record<string, unknown>;
  layout: Record<string, unknown>;
  ai_generated_text: Record<string, string> | null;
  share_slug: string;
  status: string;
  back_template_id: string | null;
  invitation_templates: {
    name: string;
    layout: unknown;
    tone: string;
    format: string;
  } | null;
}

/** 마감 메타(별도 best-effort 조회). 컬럼 미적용 시 null. */
export interface InvitationRsvpMeta {
  rsvp_closed: boolean | null;
  rsvp_deadline: string | null;
}

/** 소유자 인가/제목용 소유자 메타. */
export interface InvitationOwnerMeta {
  user_id: string;
  user_data: Record<string, string> | null;
}

/** 모바일 네이티브 뷰어용 원본 row(extractMobileContent 입력). */
export interface MobileInvitationRow {
  user_data: Record<string, unknown>;
  layout: Record<string, unknown>;
  invitation_templates: { tone: string } | null;
}

/** RSVP 제출 payload — 신규/수정 공용. */
export interface RsvpPayload {
  name: string;
  is_attending: boolean;
  side: string;
  meal_preference: string;
  companion_count: number;
  child_count: number;
  message: string | null;
}

export const invitationViewKeys = {
  all: ["consumer", "invitationView"] as const,
  gallery: (ownerIds: string[]) => [...invitationViewKeys.all, "gallery", ...ownerIds] as const,
  published: (slug: string) => [...invitationViewKeys.all, "published", slug] as const,
  mobile: (slug: string) => [...invitationViewKeys.all, "mobile", slug] as const,
  rsvpMeta: (id: string) => [...invitationViewKeys.all, "rsvpMeta", id] as const,
  owner: (id: string) => [...invitationViewKeys.all, "owner", id] as const,
};

/**
 * 내(+배우자) 청첩장 목록(updated_at 내림차순). 에러/없음이면 빈 배열.
 * 호출부가 발행 모바일만 노출하는 필터를 추가로 적용한다.
 */
export async function fetchMyInvitations(ownerIds: string[]): Promise<InvitationGalleryRow[]> {
  const { data, error } = await supabase
    .from("invitations")
    .select(
      "id, user_id, template_id, user_data, status, created_at, updated_at, invitation_templates(name, thumbnail_url, format)",
    )
    .in("user_id", ownerIds)
    .order("updated_at", { ascending: false });
  if (error || !data) return [];
  return data as unknown as InvitationGalleryRow[];
}

/** share_slug 로 발행된 공개 청첩장 1건. 없거나 에러면 null. */
export async function fetchPublishedInvitation(
  slug: string,
): Promise<PublishedInvitationRow | null> {
  const { data, error } = await supabase
    .from("invitations")
    .select(
      "id, user_data, layout, ai_generated_text, share_slug, status, back_template_id, invitation_templates(name, layout, tone, format)",
    )
    .eq("share_slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as PublishedInvitationRow;
}

/**
 * 마감 메타 best-effort 조회(rsvp_closed·rsvp_deadline). 컬럼 미적용(드리프트) 시
 * 메인 fetch 가 422 로 깨지지 않도록 분리. 없으면 null.
 * 두 컬럼은 types.ts 에 없어 (supabase as any) 우회.
 */
export async function fetchRsvpMeta(invitationId: string): Promise<InvitationRsvpMeta | null> {
  const { data } = await (supabase as any)
    .from("invitations")
    .select("rsvp_closed, rsvp_deadline")
    .eq("id", invitationId)
    .maybeSingle();
  return (data as InvitationRsvpMeta | null) ?? null;
}

/** 뒷면 템플릿 레이아웃 조회. 없으면 null. */
export async function fetchBackTemplateLayout(templateId: string): Promise<unknown | null> {
  const { data } = await supabase
    .from("invitation_templates")
    .select("layout")
    .eq("id", templateId)
    .maybeSingle();
  return (data as { layout?: unknown } | null)?.layout ?? null;
}

/** 소유자 인가/제목 메타(user_id·user_data). 없으면 null. */
export async function fetchInvitationOwnerMeta(
  invitationId: string,
): Promise<InvitationOwnerMeta | null> {
  const { data } = await supabase
    .from("invitations")
    .select("user_id, user_data")
    .eq("id", invitationId)
    .maybeSingle();
  return (data as unknown as InvitationOwnerMeta | null) ?? null;
}

/** 모바일 네이티브 뷰어용 row(user_data·layout·tone). 없거나 에러면 null. */
export async function fetchMobileInvitation(slug: string): Promise<MobileInvitationRow | null> {
  const { data, error } = await supabase
    .from("invitations")
    .select("user_data, layout, invitation_templates(tone)")
    .eq("share_slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as MobileInvitationRow;
}

/**
 * 응답 마감 토글(소유자). RLS UPDATE 가 소유자 전용. 에러 시 throw.
 * rsvp_closed 컬럼이 types.ts 에 없어 as never 캐스트.
 */
export async function setRsvpClosed(invitationId: string, closed: boolean): Promise<void> {
  const { error } = await supabase
    .from("invitations")
    .update({ rsvp_closed: closed })
    .eq("id", invitationId);
  if (error) throw error;
}

/** 마감일 저장(소유자). 빈 값이면 무기한(NULL). 에러 시 throw. */
export async function setRsvpDeadline(invitationId: string, date: string): Promise<void> {
  const { error } = await supabase
    .from("invitations")
    .update({ rsvp_deadline: date || null })
    .eq("id", invitationId);
  if (error) throw error;
}

/**
 * 신규 RSVP 제출 RPC — edit_token 을 반환(브라우저에 보관해 이후 수정 가능).
 * 반환이 배열이면 첫 항목. 에러 시 throw(호출부가 메시지 분기).
 * RPC 가 types.ts 에 없어 (supabase as any) 우회.
 */
export async function submitRsvp(
  invitationId: string,
  payload: RsvpPayload,
): Promise<{ id: string; edit_token: string } | null> {
  const { data, error } = await (supabase as any).rpc("submit_invitation_rsvp", {
    p_invitation_id: invitationId,
    p_name: payload.name,
    p_is_attending: payload.is_attending,
    p_side: payload.side,
    p_meal_preference: payload.meal_preference,
    p_companion_count: payload.companion_count,
    p_child_count: payload.child_count,
    p_message: payload.message,
  });
  if (error) throw error;
  const created = Array.isArray(data) ? data[0] : data;
  return (created as { id: string; edit_token: string } | null) ?? null;
}

/**
 * 기존 RSVP 수정 RPC — edit_token 검증(마감 검사는 RPC 내부). 에러 시 throw.
 * RPC 가 types.ts 에 없어 (supabase as any) 우회.
 */
export async function updateRsvp(
  id: string,
  editToken: string,
  payload: RsvpPayload,
): Promise<void> {
  const { error } = await (supabase as any).rpc("update_invitation_rsvp", {
    p_id: id,
    p_edit_token: editToken,
    p_name: payload.name,
    p_is_attending: payload.is_attending,
    p_side: payload.side,
    p_meal_preference: payload.meal_preference,
    p_companion_count: payload.companion_count,
    p_child_count: payload.child_count,
    p_message: payload.message,
  });
  if (error) throw error;
}
