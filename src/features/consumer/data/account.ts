// 계정/설정/알림/메일/찜 클러스터 데이터 접근 레이어 (Task #3 — consumer 도메인).
// 패턴: docs/data-access-layer.md · dressFitting.ts. Profile·Settings·Notifications·
// MailInbox·Favorites 페이지에 흩어져 있던 supabase 호출을 잘 명명된 함수로 모은다.
// 스토리지 idiom 은 공용 헬퍼(@/lib/storage)를 재사용한다.

import { supabase } from "@/integrations/supabase/client";
import { uploadToBucket } from "@/lib/storage";

const AVATAR_BUCKET = "vendor-images";
const MARKETING_CONSENT_TYPE = "marketing_v1";

// ──────────────────────────────────────────────────────────────────────────
// 타입
// ──────────────────────────────────────────────────────────────────────────

/** profiles 프로필 기본 정보(프로필 화면). */
export interface ProfileRow {
  display_name: string | null;
  avatar_url: string | null;
  birth_year: number | null;
  phone: string | null;
  community_nickname: string | null;
}

/** user_wedding_settings 결혼 설정(프로필 화면). */
export interface WeddingSettingsRow {
  wedding_date: string | null;
  partner_name: string | null;
  wedding_region: string | null;
}

/** profiles 업데이트 입력. */
export interface ProfileUpdate {
  display_name: string;
  community_nickname: string | null;
  birth_year: number | null;
  phone: string | null;
}

/** 메일 계정 연결 상태(get_my_mail_account RPC). */
export interface MailAccount {
  connected?: boolean;
  email?: string;
}

/** 인앱 메일 목록 아이템. */
export interface MailItem {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
}

/** gmail-send 첨부(전송 페이로드용). */
export interface MailAttachment {
  filename: string;
  mimeType: string;
  dataBase64: string;
}

/** 찜 목록 카드용 places 행. */
export interface FavoritePlaceRow {
  place_id: string;
  name: string;
  main_image_url: string | null;
  avg_rating: number | null;
  category: string | null;
}

/** 찜 목록 카드용 partner_deals 행. */
export interface FavoriteDealRow {
  id: string;
  title: string;
  partner_name: string | null;
  banner_image_url: string | null;
  deal_price: number | null;
  original_price: number | null;
  discount_info: string | null;
}

/** 찜 목록 카드용 products 행. */
export interface FavoriteProductRow {
  id: string;
  name: string;
  thumbnail_url: string | null;
  price: number | null;
  sale_price: number | null;
  rating: number | null;
  category: string | null;
  categories: string[] | null;
}

/** 찜 목록 카드용 tip_videos 행. */
export interface FavoriteTipVideoRow {
  video_id: string;
  title: string;
  thumbnail_url: string | null;
  channel_name: string | null;
}

export const accountKeys = {
  all: ["consumer", "account"] as const,
  profile: (userId: string) => [...accountKeys.all, "profile", userId] as const,
  weddingSettings: (userId: string) => [...accountKeys.all, "weddingSettings", userId] as const,
  mailAccount: () => [...accountKeys.all, "mailAccount"] as const,
  mailList: () => [...accountKeys.all, "mailList"] as const,
};

// ──────────────────────────────────────────────────────────────────────────
// 프로필 (Profile.tsx)
// ──────────────────────────────────────────────────────────────────────────

/** 내 프로필 기본 정보 조회. 없으면 null. */
export async function fetchProfile(userId: string): Promise<ProfileRow | null> {
  const { data } = await supabase
    .from("profiles")
    .select("display_name, avatar_url, birth_year, phone, community_nickname")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as unknown as ProfileRow | null) ?? null;
}

/** 내 결혼 설정 조회. 없으면 null. */
export async function fetchWeddingSettings(userId: string): Promise<WeddingSettingsRow | null> {
  const { data } = await supabase
    .from("user_wedding_settings")
    .select("wedding_date, partner_name, wedding_region")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as unknown as WeddingSettingsRow | null) ?? null;
}

/** 아바타 이미지를 public 버킷의 본인 폴더에 업로드(upsert) 후 공개 URL 반환. 실패 시 throw. */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${userId}/avatar-${Date.now()}.${ext}`;
  await uploadToBucket(AVATAR_BUCKET, path, file, { upsert: true });
  return supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** profiles.avatar_url 갱신. 실패 시 throw. */
export async function updateAvatarUrl(userId: string, url: string): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: url })
    .eq("user_id", userId);
  if (error) throw error;
}

/** profiles 기본 정보 갱신. 실패 시 throw. */
export async function updateProfile(userId: string, patch: ProfileUpdate): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("user_id", userId);
  if (error) throw error;
}

/** 결혼 설정 upsert(있으면 update, 없으면 insert). 결과 검증 없이 best-effort(원본 동작 보존). */
export async function upsertWeddingSettings(
  userId: string,
  patch: { wedding_date: string | null; wedding_region: string | null },
): Promise<void> {
  const { data: existing } = await supabase
    .from("user_wedding_settings")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("user_wedding_settings")
      .update(patch)
      .eq("user_id", userId);
  } else {
    await supabase
      .from("user_wedding_settings")
      .insert({ user_id: userId, ...patch });
  }
}

/** budget_settings.region 동기화(행이 있을 때만 갱신). best-effort. */
export async function syncBudgetRegion(userId: string, regionKey: string): Promise<void> {
  const { data: budgetSettings } = await supabase
    .from("budget_settings")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (budgetSettings) {
    await supabase
      .from("budget_settings")
      .update({ region: regionKey })
      .eq("id", (budgetSettings as { id: string }).id);
  }
}

/** 비밀번호 변경 1단계 — 이메일 OTP(reauthentication) 발송. 에러 객체를 그대로 반환(호출부가 분기). */
export async function sendReauthCode(): Promise<{ error: { message: string } | null }> {
  const { error } = await supabase.auth.reauthenticate();
  return { error };
}

/** 비밀번호 변경 2단계 — 이메일 코드(nonce)로 새 비밀번호 적용. 에러 객체를 그대로 반환(호출부가 분기). */
export async function updatePassword(
  password: string,
  nonce: string,
): Promise<{ error: { message: string } | null }> {
  const { error } = await supabase.auth.updateUser({ password, nonce });
  return { error };
}

// ──────────────────────────────────────────────────────────────────────────
// 설정 (Settings.tsx)
// ──────────────────────────────────────────────────────────────────────────

/** delete-account edge function 호출 → 계정 삭제. 에러 시 throw. */
export async function deleteAccount(): Promise<void> {
  const { error } = await supabase.functions.invoke("delete-account");
  if (error) throw error;
}

// ──────────────────────────────────────────────────────────────────────────
// 알림 (Notifications.tsx)
// ──────────────────────────────────────────────────────────────────────────

/** 마케팅 동의의 현재 상태(canonical view 최신 row). 없으면 null. */
export async function fetchMarketingConsent(userId: string): Promise<boolean | null> {
  const { data } = await supabase
    .from("user_consents_canonical")
    .select("agreed")
    .eq("user_id", userId)
    .eq("consent_type", MARKETING_CONSENT_TYPE)
    .order("agreed_at", { ascending: false })
    .limit(1);
  const rows = (data as unknown as { agreed: boolean }[] | null) ?? [];
  return rows.length > 0 ? !!rows[0].agreed : null;
}

/** 마케팅 동의·철회를 새 row 로 기록(PIPA 이력 보존). 실패 시 throw. */
export async function recordMarketingConsent(userId: string, agreed: boolean): Promise<void> {
  const { error } = await supabase.from("user_consents").insert({
    user_id: userId,
    consent_type: MARKETING_CONSENT_TYPE,
    agreed,
    user_agent:
      typeof navigator !== "undefined" ? navigator.userAgent?.slice(0, 500) : null,
  } as never);
  if (error) throw error;
}

// ──────────────────────────────────────────────────────────────────────────
// 메일 (MailInbox.tsx)
// ──────────────────────────────────────────────────────────────────────────

/** 메일 계정 연결 상태 조회(get_my_mail_account RPC). 에러는 호출부가 로깅하도록 반환. */
export async function fetchMailAccount(): Promise<{ data: MailAccount; error: unknown }> {
  const { data, error } = await supabase.rpc("get_my_mail_account" as never);
  return { data: (data ?? {}) as MailAccount, error };
}

/** 받은 메일 목록 조회(gmail-list edge function). 에러 시 throw(호출부가 로깅). */
export async function fetchMailList(max = 20): Promise<MailItem[]> {
  const { data, error } = await supabase.functions.invoke("gmail-list", { body: { max } });
  if (error) throw error;
  return ((data as { items?: MailItem[] })?.items ?? []) as MailItem[];
}

/** Gmail OAuth 시작 → 리다이렉트 URL 반환. 실패 시 에러 코드/없는 URL 을 그대로 반환(호출부가 분기). */
export async function startMailOAuth(
  origin: string,
  returnPath: string,
): Promise<{ url: string | null; error: unknown; code: string | null }> {
  const { data, error } = await supabase.functions.invoke("mail-oauth-start", {
    body: { origin, returnPath },
  });
  const payload = (data ?? {}) as { url?: string; error?: string };
  return { url: payload.url ?? null, error, code: payload.error ?? null };
}

/** 메일 계정 연결 해제(현재 로그인 사용자의 user_mail_accounts row 삭제). */
export async function disconnectMailAccount(): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  await supabase.from("user_mail_accounts").delete().eq("user_id", u.user.id);
}

/** 메일 전송(gmail-send edge function). 전송 실패(error 또는 응답 error)면 throw. */
export async function sendMail(payload: {
  to: string;
  subject: string;
  body: string;
  attachments: MailAttachment[];
}): Promise<void> {
  const { data, error } = await supabase.functions.invoke("gmail-send", { body: payload });
  if (error || (data as { error?: string })?.error) throw new Error("메일 전송에 실패했어요");
}

// ──────────────────────────────────────────────────────────────────────────
// 찜 (Favorites.tsx)
// ──────────────────────────────────────────────────────────────────────────

/** 찜한 업체(places) 메타 일괄 조회. */
export async function fetchFavoritePlaces(ids: string[]): Promise<FavoritePlaceRow[]> {
  const { data } = await supabase
    .from("places")
    .select("place_id, name, main_image_url, avg_rating, category")
    .in("place_id", ids);
  return (data as unknown as FavoritePlaceRow[] | null) ?? [];
}

/** 찜한 이벤트(partner_deals) 메타 일괄 조회. */
export async function fetchFavoriteDeals(ids: string[]): Promise<FavoriteDealRow[]> {
  const { data } = await supabase
    .from("partner_deals")
    .select("id, title, partner_name, banner_image_url, deal_price, original_price, discount_info")
    .in("id", ids);
  return (data as unknown as FavoriteDealRow[] | null) ?? [];
}

/** 찜한 상품(products) 메타 일괄 조회. */
export async function fetchFavoriteProducts(ids: string[]): Promise<FavoriteProductRow[]> {
  const { data } = await supabase
    .from("products")
    .select("id, name, thumbnail_url, price, sale_price, rating, category, categories")
    .in("id", ids);
  return (data as unknown as FavoriteProductRow[] | null) ?? [];
}

/** 찜한 꿀팁 영상(tip_videos) 메타 일괄 조회. */
export async function fetchFavoriteTipVideos(ids: string[]): Promise<FavoriteTipVideoRow[]> {
  const { data } = await supabase
    .from("tip_videos")
    .select("video_id, title, thumbnail_url, channel_name")
    .in("video_id", ids);
  return (data as unknown as FavoriteTipVideoRow[] | null) ?? [];
}
