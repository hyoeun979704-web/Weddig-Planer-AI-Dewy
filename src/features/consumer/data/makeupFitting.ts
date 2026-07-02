// 메이크업 AI 피팅/추천(makeup_fittings·makeup_samples + storage + edge function) 데이터
// 접근 레이어 (Task #3 — consumer 도메인). 패턴: docs/data-access-layer.md.
// MakeupFitting·MakeupRecommend·MakeupFittingGallery·MakeupFittingResult 가 공유하는 DB·
// 스토리지·생성 호출을 모은다. 스토리지 idiom 은 공용 헬퍼(@/lib/storage) 재사용.

import { supabase } from "@/integrations/supabase/client";
import { createSignedUrl, uploadToBucket, SIGNED_URL_TTL } from "@/lib/storage";
import { toStudioError } from "@/lib/studioErrors";

const UPLOAD_BUCKET = "makeup-uploads";
const RESULT_BUCKET = "makeup-results";

export interface MakeupGalleryRow {
  id: string;
  result_image_path: string | null;
  prompt_params: { scene_code?: string } | null;
  created_at: string;
}

export interface MakeupFittingDetail {
  id: string;
  status: "pending" | "done" | "failed" | "refunded";
  result_image_path: string | null;
  source_image_path: string | null;
  error_message: string | null;
  prompt_params: { scene_code?: string } | null;
  selected_sample_id: string | null;
  created_at: string;
}

export const makeupFittingKeys = {
  all: ["consumer", "makeupFitting"] as const,
  gallery: (userId: string) => [...makeupFittingKeys.all, "gallery", userId] as const,
  detail: (id: string) => [...makeupFittingKeys.all, "detail", id] as const,
};

/** 원본 사진을 업로드 버킷에 올리고 미리보기용 서명 URL(2h)을 반환. 업로드 실패 시 throw. */
export async function uploadMakeupSource(
  userId: string,
  file: File,
): Promise<{ path: string; signedUrl: string | null }> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  await uploadToBucket(UPLOAD_BUCKET, path, file, { contentType: file.type });
  const signedUrl = await createSignedUrl(UPLOAD_BUCKET, path, SIGNED_URL_TTL.preview);
  return { path, signedUrl };
}

/** 활성 카탈로그 메이크업 목록(진열순). 에러 시 throw. */
export async function fetchActiveMakeups(): Promise<Record<string, unknown>[]> {
  const { data, error } = await supabase
    .from("makeup_samples")
    .select("id, name, image_url, base_finish, lip_color, eye_style")
    .eq("is_active", true)
    .order("display_order", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Record<string, unknown>[];
}

/** dewy-makeup 호출 → fitting_id 반환. error/응답 error/누락 시 throw(호출부가 메시지 분기). */
export async function generateMakeupFitting(body: Record<string, unknown>): Promise<string> {
  const { data, error } = await supabase.functions.invoke("dewy-makeup", { body });
  if (error) throw await toStudioError(error); // 코드 추출(@/lib/studioErrors)
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  const fittingId = (data as { fitting_id?: string })?.fitting_id;
  if (!fittingId) throw new Error("생성 요청 실패");
  return fittingId;
}

/** dewy-makeup-recommend 호출 → fitting_id 반환. 누락 시 generation_failed throw. */
export async function generateMakeupRecommend(body: Record<string, unknown>): Promise<string> {
  const { data, error } = await supabase.functions.invoke("dewy-makeup-recommend", { body });
  if (error) throw await toStudioError(error); // 코드 추출(@/lib/studioErrors)
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  const fittingId = (data as { fitting_id?: string })?.fitting_id;
  if (!fittingId) throw new Error("generation_failed");
  return fittingId;
}

/** 내가 만든 완료(status=done) 메이크업 피팅 목록(최신순). 에러 시 throw. */
export async function fetchMakeupGallery(userId: string): Promise<MakeupGalleryRow[]> {
  const { data, error } = await supabase
    .from("makeup_fittings")
    .select("id, result_image_path, prompt_params, created_at")
    .eq("user_id", userId)
    .eq("status", "done")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as MakeupGalleryRow[];
}

/** 단일 메이크업 피팅 상세 조회(폴링용). 없으면 null. */
export async function fetchMakeupFitting(id: string): Promise<MakeupFittingDetail | null> {
  const { data, error } = await supabase
    .from("makeup_fittings")
    .select(
      "id, status, result_image_path, source_image_path, error_message, prompt_params, selected_sample_id, created_at",
    )
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as unknown as MakeupFittingDetail;
}

/** 결과 이미지(결과 버킷) 서명 URL(24h). */
export function makeupResultUrl(path: string): Promise<string | null> {
  return createSignedUrl(RESULT_BUCKET, path, SIGNED_URL_TTL.day);
}

/** 원본 이미지(업로드 버킷) 서명 URL(24h) — 전후 비교용. */
export function makeupSourceUrl(path: string): Promise<string | null> {
  return createSignedUrl(UPLOAD_BUCKET, path, SIGNED_URL_TTL.day);
}
