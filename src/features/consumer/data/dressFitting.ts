// 드레스 AI 피팅/추천(dress_fittings·dress_samples + storage + edge function) 데이터 접근
// 레이어 (Task #3 — consumer 도메인). 패턴: docs/data-access-layer.md.
// DressFitting·DressRecommend·DressFittingGallery·DressFittingResult 가 공유하는 DB·스토리지·
// 생성 호출을 모은다. 스토리지 idiom 은 공용 헬퍼(@/lib/storage) 재사용.

import { supabase } from "@/integrations/supabase/client";
import { createSignedUrl, uploadToBucket, SIGNED_URL_TTL } from "@/lib/storage";
import { toStudioError } from "@/lib/studioErrors";

const UPLOAD_BUCKET = "dress-uploads";
const RESULT_BUCKET = "dress-results";

export interface DressGalleryRow {
  id: string;
  result_image_path: string | null;
  prompt_params: { scene_code?: string } | null;
  created_at: string;
}

export interface DressFittingDetail {
  id: string;
  status: string;
  result_image_path: string | null;
  source_image_path: string | null;
  error_message: string | null;
  prompt_params: { scene_code?: string } | null;
  selected_sample_id: string | null;
  created_at: string;
}

export const dressFittingKeys = {
  all: ["consumer", "dressFitting"] as const,
  gallery: (userId: string) => [...dressFittingKeys.all, "gallery", userId] as const,
  detail: (id: string) => [...dressFittingKeys.all, "detail", id] as const,
};

/** 원본 사진을 업로드 버킷에 올리고 미리보기용 서명 URL(2h)을 반환. 업로드 실패 시 throw. */
export async function uploadDressSource(
  userId: string,
  file: File,
): Promise<{ path: string; signedUrl: string | null }> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  await uploadToBucket(UPLOAD_BUCKET, path, file, { contentType: file.type });
  const signedUrl = await createSignedUrl(UPLOAD_BUCKET, path, SIGNED_URL_TTL.preview);
  return { path, signedUrl };
}

/** 활성 카탈로그 드레스 목록(진열순). 에러 시 throw. */
export async function fetchActiveDresses(): Promise<Record<string, unknown>[]> {
  const { data, error } = await supabase
    .from("dress_samples")
    .select("id, name, image_url, silhouette, neckline, sleeve, color, pregnancy_supported")
    .eq("is_active", true)
    .order("display_order", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Record<string, unknown>[];
}

/** dewy-fitting 호출 → fitting_id 반환. error/응답 error/누락 시 throw(호출부가 메시지 분기). */
export async function generateDressFitting(body: Record<string, unknown>): Promise<string> {
  const { data, error } = await supabase.functions.invoke("dewy-fitting", { body });
  if (error) throw await toStudioError(error); // 코드 추출(@/lib/studioErrors)
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  const fittingId = (data as { fitting_id?: string })?.fitting_id;
  if (!fittingId) throw new Error("생성 요청 실패");
  return fittingId;
}

/** dewy-dress-recommend 호출 → fitting_id 반환. 누락 시 generation_failed throw. */
export async function generateDressRecommend(body: Record<string, unknown>): Promise<string> {
  const { data, error } = await supabase.functions.invoke("dewy-dress-recommend", { body });
  if (error) throw await toStudioError(error); // 코드 추출(@/lib/studioErrors)
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  const fittingId = (data as { fitting_id?: string })?.fitting_id;
  if (!fittingId) throw new Error("generation_failed");
  return fittingId;
}

/** 내가 만든 완료(status=done) 드레스 피팅 목록(최신순). 에러 시 throw. */
export async function fetchDressGallery(userId: string): Promise<DressGalleryRow[]> {
  const { data, error } = await supabase
    .from("dress_fittings")
    .select("id, result_image_path, prompt_params, created_at")
    .eq("user_id", userId)
    .eq("status", "done")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as DressGalleryRow[];
}

/** 단일 드레스 피팅 상세 조회(폴링용). 없으면 null. */
export async function fetchDressFitting(id: string): Promise<DressFittingDetail | null> {
  const { data, error } = await supabase
    .from("dress_fittings")
    .select("id, status, result_image_path, source_image_path, error_message, prompt_params, selected_sample_id, created_at")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as unknown as DressFittingDetail;
}

/** 결과 이미지(결과 버킷) 서명 URL(24h). */
export function dressResultUrl(path: string): Promise<string | null> {
  return createSignedUrl(RESULT_BUCKET, path, SIGNED_URL_TTL.day);
}

/** 원본 이미지(업로드 버킷) 서명 URL(24h) — 전후 비교용. */
export function dressSourceUrl(path: string): Promise<string | null> {
  return createSignedUrl(UPLOAD_BUCKET, path, SIGNED_URL_TTL.day);
}
