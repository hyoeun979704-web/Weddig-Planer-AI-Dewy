// 청첩장(invitation) 데이터 접근 레이어 (Task #3 — consumer 도메인).
// 패턴: docs/data-access-layer.md · dressFitting.ts. 청첩장 코어 화면들(Flow·Studio·
// Market·Photos·GuestPhotoUpload)이 흩어서 복붙해 온 supabase 호출(템플릿·에셋·저장/발행·
// 사진 업로드·스토리지·edge function·RPC)을 한곳으로 모은다. 스토리지 idiom 은 공용
// 헬퍼(@/lib/storage) 재사용. 이 모듈은 나머지 청첩장 화면(Gallery·Viewer·Rsvp 등)도
// 재사용할 수 있게 feature 범위로 이름을 명확히 둔다.
//
// 타입 주의: invitations.layout / user_data / ai_generated_text 는 DB 상 Json 컬럼이라
// 임의 객체 쓰기가 가능하다. 다만 페이지 원본이 (supabase as any) 로 중첩 조인·Json 캐스트를
// 우회해 왔으므로, 동작을 1:1 보존하기 위해 동일하게 `as never`(쓰기)·`as unknown as T`(읽기)
// 캐스트를 사용한다(중첩 select 의 PostgREST 응답 타입은 generated types 와 어긋남).

import { supabase } from "@/integrations/supabase/client";
import { createSignedUrl, uploadToBucket, SIGNED_URL_TTL } from "@/lib/storage";
import type { InvitationUserData } from "@/lib/invitation/types";

const UPLOAD_BUCKET = "invitation-uploads";
const GUEST_BUCKET = "guest-photos";

/** 발행 뷰어용 long-lived 서명 URL — 1년(초). */
const VIEWER_URL_TTL = 60 * 60 * 24 * 365;
/** 하객 사진 다운로드용 서명 URL — 1시간(초). */
const GUEST_PHOTO_URL_TTL = 60 * 60;

// ─────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────

/** 템플릿 카드/편집에 쓰는 invitation_templates 행(필요 컬럼만). */
export interface InvitationTemplateRow {
  id: string;
  name: string;
  thumbnail_url: string;
  format: string;
  tone: string;
  price_hearts: number;
  layout: unknown;
  text_prompt_hint: string | null;
  default_back_template_id?: string | null;
}

/** 마켓 디자인 카드(designer_designs). */
export interface DesignerDesignRow {
  id: string;
  title: string;
  price: number;
  preview_urls: string[];
  style_tags: string[];
  sellable: string[];
}

/** 하객 사진(invitation_guest_photos) 행. */
export interface GuestPhotoRow {
  id: string;
  uploader_name: string | null;
  storage_path: string;
  content_type: string | null;
  created_at: string;
}

/** 종이→모바일 QR 연결용 발행된 모바일 청첩장 행(중첩 템플릿 포함). */
export interface PublishedMobileInvitationRow {
  id: string;
  share_slug: string;
  status?: string;
  invitation_templates: { name: string; format?: string } | null;
}

/** publish_invitation RPC 결과 행. */
export interface PublishInvitationResult {
  invitation_id: string;
  share_slug: string;
  status: string;
}

/** spend_hearts RPC 결과 행. */
export interface SpendHeartsResult {
  success: boolean;
  message: string;
  balance_after: number;
}

export const invitationKeys = {
  all: ["consumer", "invitation"] as const,
  templates: (format: string) => [...invitationKeys.all, "templates", format] as const,
  detail: (id: string) => [...invitationKeys.all, "detail", id] as const,
  market: () => [...invitationKeys.all, "market"] as const,
  guestPhotos: (invitationId: string) =>
    [...invitationKeys.all, "guestPhotos", invitationId] as const,
};

// ─────────────────────────────────────────────
// 템플릿
// ─────────────────────────────────────────────

/** 전면으로 쓸 수 있는 활성 템플릿 목록(format 필터, display_order 오름차순). 에러 시 throw. */
export async function fetchFrontTemplates(
  format: "paper" | "mobile",
): Promise<InvitationTemplateRow[]> {
  const { data, error } = await supabase
    .from("invitation_templates")
    .select(
      "id, name, thumbnail_url, format, tone, price_hearts, layout, text_prompt_hint, default_back_template_id",
    )
    .eq("is_active", true)
    .eq("format", format)
    .in("face", ["front", "both"])
    .order("display_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as InvitationTemplateRow[];
}

/** 무료(price_hearts=0) 활성 템플릿 목록(Studio V1 — display_order 내림차순). 에러 시 throw. */
export async function fetchFreeTemplates(
  format: "paper" | "mobile",
): Promise<InvitationTemplateRow[]> {
  const { data, error } = await supabase
    .from("invitation_templates")
    .select(
      "id, name, thumbnail_url, format, tone, price_hearts, layout, text_prompt_hint",
    )
    .eq("is_active", true)
    .eq("format", format)
    .eq("price_hearts", 0)
    .order("display_order", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as InvitationTemplateRow[];
}

/** 후면 템플릿 목록(종이 전용, face in back/both — display_order 내림차순). 에러 시 throw. */
export async function fetchBackTemplates(): Promise<InvitationTemplateRow[]> {
  const { data, error } = await supabase
    .from("invitation_templates")
    .select(
      "id, name, thumbnail_url, format, tone, price_hearts, layout, text_prompt_hint",
    )
    .eq("is_active", true)
    .eq("format", "paper")
    .in("face", ["back", "both"])
    .order("display_order", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as InvitationTemplateRow[];
}

/** 단일 템플릿 조회(짝꿍 후면 자동 로드용 — 일부 컬럼). 없으면 null. */
export async function fetchTemplateById(
  id: string,
): Promise<InvitationTemplateRow | null> {
  const { data } = await supabase
    .from("invitation_templates")
    .select("id, name, thumbnail_url, format, tone, price_hearts, layout, text_prompt_hint")
    .eq("id", id)
    .maybeSingle();
  return (data as unknown as InvitationTemplateRow | null) ?? null;
}

/** 단일 템플릿 전체 컬럼 조회(편집 로드 시 후면 복원용). 없으면 null. */
export async function fetchTemplateFull(
  id: string,
): Promise<InvitationTemplateRow | null> {
  const { data } = await supabase
    .from("invitation_templates")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as unknown as InvitationTemplateRow | null) ?? null;
}

/** 활성 스티커/장식 에셋 목록(invitation_assets — category·display_order 순). 에러는 흡수(빈 배열). */
export async function fetchStickerAssets(): Promise<Record<string, unknown>[]> {
  const { data } = await supabase
    .from("invitation_assets")
    .select("id,name,image_url,thumbnail_url,category,natural_width,natural_height")
    .eq("is_active", true)
    .order("category")
    .order("display_order");
  return (data ?? []) as unknown as Record<string, unknown>[];
}

// ─────────────────────────────────────────────
// 청첩장 행(invitations) — 읽기
// ─────────────────────────────────────────────

/** 가장 최근 청첩장의 user_data(개인정보 prefill용). 없으면 null. */
export async function fetchLatestUserData(
  userId: string,
): Promise<InvitationUserData | null> {
  const { data } = await supabase
    .from("invitations")
    .select("user_data")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return ((data as { user_data?: InvitationUserData } | null)?.user_data ??
    null) as InvitationUserData | null;
}

/** 내 청첩장 개수(첫 사용 반값 판정용). 에러 시 0. */
export async function countInvitations(userId: string): Promise<number> {
  const { count } = await supabase
    .from("invitations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  return count ?? 0;
}

/** 청첩장 전체 + 중첩 템플릿 조회(편집 로드 — 소유자 한정). 없으면 null. */
export async function fetchInvitationForEdit(
  id: string,
  userId: string,
): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from("invitations")
    .select("*, invitation_templates(*)")
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  if (error || !data) return null;
  return data as unknown as Record<string, unknown>;
}

/** 발행된 내 모바일 청첩장 목록(종이 QR 연결용 — 중첩 템플릿 포함). 에러는 흡수(빈 배열). */
export async function fetchPublishedMobileInvitations(
  userId: string,
): Promise<PublishedMobileInvitationRow[]> {
  const { data, error } = await supabase
    .from("invitations")
    .select("id, share_slug, status, invitation_templates(name, format)")
    .eq("user_id", userId)
    .eq("status", "published");
  if (error || !data) return [];
  return data as unknown as PublishedMobileInvitationRow[];
}

/** 청첩장의 layout 만 조회(발행 시 면별 구조 보존용). 없으면 null. */
export async function fetchInvitationLayout(id: string): Promise<unknown> {
  const { data } = await supabase
    .from("invitations")
    .select("layout")
    .eq("id", id)
    .single();
  return (data as { layout?: unknown } | null)?.layout ?? null;
}

/** 인가 교차검증용 청첩장 메타(소유자·user_data·share_slug). 없으면 null. */
export async function fetchInvitationOwnerMeta(
  id: string,
): Promise<{ user_id: string; user_data: InvitationUserData; share_slug: string | null } | null> {
  const { data } = await supabase
    .from("invitations")
    .select("user_id, user_data, share_slug")
    .eq("id", id)
    .maybeSingle();
  return (data as unknown as {
    user_id: string;
    user_data: InvitationUserData;
    share_slug: string | null;
  } | null) ?? null;
}

/** 공개 slug 로 발행본 조회(하객 업로드 페이지 — published 만). 없으면 null. */
export async function fetchPublishedInvitationBySlug(
  slug: string,
): Promise<{ id: string; user_data: InvitationUserData } | null> {
  const { data, error } = await supabase
    .from("invitations")
    .select("id, user_data")
    .eq("share_slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as { id: string; user_data: InvitationUserData };
}

// ─────────────────────────────────────────────
// 청첩장 행(invitations) — 쓰기
// ─────────────────────────────────────────────

/** 청첩장 신규 insert(payload 자유 — status 포함 가능) → 생성된 id. 에러 시 throw. */
export async function insertInvitation(
  payload: Record<string, unknown>,
): Promise<string> {
  const { data, error } = await supabase
    .from("invitations")
    .insert(payload as never)
    .select("id")
    .single();
  if (error) throw error;
  const id = (data as { id?: string } | null)?.id;
  if (!id) throw new Error("청첩장 저장에 실패했어요");
  return id;
}

/** 청첩장 update(부분 payload). 에러 시 throw. */
export async function updateInvitation(
  id: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase
    .from("invitations")
    .update(payload as never)
    .eq("id", id);
  if (error) throw error;
}

/** 청첩장 삭제(하트 차감 실패 보상용). 에러는 흡수(best-effort). */
export async function deleteInvitation(id: string): Promise<void> {
  await supabase.from("invitations").delete().eq("id", id);
}

// ─────────────────────────────────────────────
// RPC — 발행·하트 차감
// ─────────────────────────────────────────────

/** publish_invitation RPC — slug 발급. 에러 시 throw. 결과 행(없으면 null) 반환. */
export async function publishInvitation(
  invitationId: string,
): Promise<PublishInvitationResult | null> {
  const { data, error } = await supabase.rpc("publish_invitation", {
    p_invitation_id: invitationId,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return (row as PublishInvitationResult | undefined) ?? null;
}

/** spend_hearts RPC — 하트 차감. 에러 시 throw. 결과 행(없으면 null) 반환. */
export async function spendHearts(args: {
  userId: string;
  amount: number;
  reason: string;
  refId?: string;
}): Promise<SpendHeartsResult | null> {
  const { data, error } = await supabase.rpc("spend_hearts", {
    p_user_id: args.userId,
    p_amount: args.amount,
    p_reason: args.reason,
    p_ref_id: args.refId,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return (row as SpendHeartsResult | undefined) ?? null;
}

// ─────────────────────────────────────────────
// Edge functions — 누끼·일러스트·약도·문구·결제
// ─────────────────────────────────────────────

/** invitation-cutout — 사진 배경 제거(remove.bg). 에러/응답 error 시 throw. */
export async function invokeCutout(sourcePaths: string[]): Promise<{
  cutout_paths?: Record<string, string>;
  cutout_urls?: Record<string, string>;
}> {
  const { data, error } = await supabase.functions.invoke("invitation-cutout", {
    body: { source_paths: sourcePaths },
  });
  if (error) throw error;
  const result = data as {
    cutout_paths?: Record<string, string>;
    cutout_urls?: Record<string, string>;
    error?: string;
  };
  if (result.error) throw new Error(result.error);
  return result;
}

/** invitation-illustration — 사진/약도 일러스트 변환. 호출부가 error 컨텍스트를 직접 다뤄야
 *  하는 경우(insufficient_hearts 분기)가 있어 원본 { data, error } 를 그대로 반환한다. */
export function invokeIllustration(body: Record<string, unknown>) {
  return supabase.functions.invoke("invitation-illustration", { body });
}

/** invitation-map — 식장 주소 → 네이버 지도 약도 생성. 원본 { data, error } 반환
 *  (호출부가 data.path / data.error 분기를 직접 처리). */
export function invokeMap(address: string) {
  return supabase.functions.invoke("invitation-map", { body: { address } });
}

/** invitation-text-suggest — 슬롯별 AI 인사말 후보. 에러/응답 error 시 throw. */
export async function invokeTextSuggest(
  body: Record<string, unknown>,
): Promise<{ suggestions?: string[] }> {
  const { data, error } = await supabase.functions.invoke(
    "invitation-text-suggest",
    { body },
  );
  if (error) throw error;
  const result = data as { suggestions?: string[]; error?: string };
  if (result.error) throw new Error(result.error);
  return result;
}

/** invitation-address-search — 식장 검색(네이버 지역검색·지오코딩). 원본 { data, error } 반환
 *  (호출부가 data.results / data.error 분기를 직접 처리). */
export function invokeAddressSearch(query: string) {
  return supabase.functions.invoke("invitation-address-search", {
    body: { query },
  });
}

/** design-purchase-ready — 마켓 디자인 결제 준비(KakaoPay redirect). 원본 { data, error } 반환
 *  (호출부가 data.success / next_redirect_* 분기를 직접 처리). */
export function invokeDesignPurchaseReady(body: {
  designId: string;
  usePoints: number;
  origin: string;
}) {
  return supabase.functions.invoke("design-purchase-ready", { body });
}

// ─────────────────────────────────────────────
// 마켓 — 디자인·포인트·구매내역
// ─────────────────────────────────────────────

/** 승인·활성 마켓 디자인 목록(최신순). 에러는 흡수(빈 배열). */
export async function fetchMarketDesigns(): Promise<DesignerDesignRow[]> {
  const { data } = await supabase
    .from("designer_designs")
    .select("id, title, price, preview_urls, style_tags, sellable")
    .eq("status", "approved")
    .eq("active", true)
    .order("created_at", { ascending: false });
  return (data ?? []) as unknown as DesignerDesignRow[];
}

/** 사용자 포인트 잔액(user_points). 행이 없으면 0. (에러도 0 으로 흡수) */
export async function fetchPointBalance(userId: string): Promise<number> {
  const { data } = await supabase
    .from("user_points")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as { balance?: number } | null)?.balance ?? 0;
}

/** 내가 구매한 디자인 id 집합(design_purchases). 에러는 흡수(빈 Set). */
export async function fetchOwnedDesignIds(userId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from("design_purchases")
    .select("design_id")
    .eq("user_id", userId);
  return new Set(
    ((data as { design_id: string }[] | null) ?? []).map((o) => o.design_id),
  );
}

// ─────────────────────────────────────────────
// 하객 사진(invitation_guest_photos) + 스토리지
// ─────────────────────────────────────────────

/** 청첩장의 하객 사진 목록(최신순). 에러 시 throw. */
export async function fetchGuestPhotos(
  invitationId: string,
): Promise<GuestPhotoRow[]> {
  const { data, error } = await supabase
    .from("invitation_guest_photos")
    .select("id, uploader_name, storage_path, content_type, created_at")
    .eq("invitation_id", invitationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as GuestPhotoRow[];
}

/** 하객 사진 행 등록(익명 업로드). 에러 시 throw. */
export async function insertGuestPhoto(row: {
  invitationId: string;
  uploaderName: string | null;
  storagePath: string;
  contentType: string | null;
  sizeBytes: number;
}): Promise<void> {
  const { error } = await supabase
    .from("invitation_guest_photos")
    .insert({
      invitation_id: row.invitationId,
      uploader_name: row.uploaderName,
      storage_path: row.storagePath,
      content_type: row.contentType,
      size_bytes: row.sizeBytes,
    } as never);
  if (error) throw error;
}

/** 하객 사진 행 삭제. 에러 시 throw. */
export async function deleteGuestPhoto(id: string): Promise<void> {
  const { error } = await supabase
    .from("invitation_guest_photos")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// ─────────────────────────────────────────────
// 스토리지 — 청첩장 업로드/하객 버킷 (공용 헬퍼 재사용)
// ─────────────────────────────────────────────

/** 청첩장 업로드 버킷에 파일 업로드 + 표시용 서명 URL(24h) 반환. 업로드 실패 시 throw. */
export async function uploadInvitationImage(
  userId: string,
  file: File,
  opts?: { prefix?: string; fallbackExt?: string },
): Promise<{ path: string; signedUrl: string | null }> {
  const ext = file.name.split(".").pop()?.toLowerCase() || opts?.fallbackExt || "jpg";
  const prefix = opts?.prefix ? `${opts.prefix}-` : "";
  const path = `${userId}/${prefix}${crypto.randomUUID()}.${ext}`;
  await uploadToBucket(UPLOAD_BUCKET, path, file, { contentType: file.type });
  const signedUrl = await createSignedUrl(UPLOAD_BUCKET, path, SIGNED_URL_TTL.day);
  return { path, signedUrl };
}

/** 청첩장 업로드 버킷의 path → 표시용 서명 URL(24h). 실패 시 null. */
export function invitationImageUrl(path: string): Promise<string | null> {
  return createSignedUrl(UPLOAD_BUCKET, path, SIGNED_URL_TTL.day);
}

/** 청첩장 업로드 버킷의 path → 발행 뷰어용 long-lived 서명 URL(1년). 실패 시 null. */
export function invitationViewerUrl(path: string): Promise<string | null> {
  return createSignedUrl(UPLOAD_BUCKET, path, VIEWER_URL_TTL);
}

/** 하객 사진 버킷에 익명 업로드. 에러 시 throw. */
export async function uploadGuestPhoto(
  path: string,
  file: File,
): Promise<void> {
  await uploadToBucket(GUEST_BUCKET, path, file, {
    contentType: file.type || "image/jpeg",
  });
}

/** 하객 사진 버킷에서 객체 삭제(고아 정리·삭제). 에러는 흡수(best-effort). */
export async function removeGuestPhoto(path: string): Promise<void> {
  await supabase.storage
    .from(GUEST_BUCKET)
    .remove([path])
    .catch(() => undefined);
}

/** 하객 사진 path 배열 → 다운로드용 서명 URL(1시간) 배열. 실패한 항목은 null. */
export async function guestPhotoSignedUrls(
  paths: string[],
): Promise<(string | null)[]> {
  const { data } = await supabase.storage
    .from(GUEST_BUCKET)
    .createSignedUrls(paths, GUEST_PHOTO_URL_TTL);
  return (data ?? []).map((s) => s?.signedUrl ?? null);
}
