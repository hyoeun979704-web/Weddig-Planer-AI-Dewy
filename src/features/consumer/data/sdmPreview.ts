// 스드메 미리보기(sdm_previews + dress_samples + storage + edge function) 데이터 접근
// 레이어 (Task #3 — consumer 도메인). 패턴: docs/data-access-layer.md.
// SdmPreview·SdmPreviewResult 가 공유하는 DB·스토리지·생성 호출을 모은다.
// 스토리지 idiom 은 공용 헬퍼(@/lib/storage), 하트 잔액은 hearts.ts 재사용.

import { supabase } from "@/integrations/supabase/client";
import { createSignedUrl, uploadToBucket, SIGNED_URL_TTL } from "@/lib/storage";

const UPLOAD_BUCKET = "sdm-uploads";
const RESULT_BUCKET = "sdm-results";

export interface SdmDressSample {
  id: string;
  name: string;
  image_url: string;
  silhouette: string | null;
  neckline: string | null;
  length: string | null;
}

export interface SdmPreviewRow {
  id: string;
  status: "pending" | "done" | "failed" | "refunded";
  result_image_path: string | null;
  error_message: string | null;
}

export const sdmPreviewKeys = {
  all: ["consumer", "sdmPreview"] as const,
  dresses: () => [...sdmPreviewKeys.all, "dresses"] as const,
  detail: (id: string) => [...sdmPreviewKeys.all, "detail", id] as const,
};

/** 원본 사진을 업로드 버킷에 올리고 미리보기용 서명 URL(2h)을 반환. 업로드 실패 시 throw. */
export async function uploadSdmSource(
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
export async function fetchActiveDresses(): Promise<SdmDressSample[]> {
  const { data, error } = await supabase
    .from("dress_samples")
    .select("id, name, image_url, silhouette, neckline, length")
    .eq("is_active", true)
    .order("display_order", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as SdmDressSample[];
}

/** 카탈로그 드레스 메타데이터 전체 조회(프롬프트 주입용). 없으면 null. */
export async function fetchDressMeta(sampleId: string): Promise<Record<string, unknown> | null> {
  const { data } = await supabase
    .from("dress_samples")
    .select("name, silhouette, neckline, sleeve, length, fabric, details, back_design, color, waist, mood")
    .eq("id", sampleId)
    .maybeSingle();
  return (data as Record<string, unknown> | null) ?? null;
}

/** dewy-sdm 호출 → preview_id 반환. error/응답 error/누락 시 throw(호출부가 메시지 분기). */
export async function generateSdmPreview(body: Record<string, unknown>): Promise<string> {
  const { data, error } = await supabase.functions.invoke("dewy-sdm", { body });
  if (error) throw error;
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  const previewId = (data as { preview_id?: string })?.preview_id;
  if (!previewId) throw new Error("생성 요청 실패");
  return previewId;
}

/** 단일 스드메 미리보기 상세 조회(폴링용). 없으면 null. */
export async function fetchSdmPreview(id: string): Promise<SdmPreviewRow | null> {
  const { data, error } = await supabase
    .from("sdm_previews")
    .select("id, status, result_image_path, error_message")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as unknown as SdmPreviewRow;
}

/** 결과 이미지(결과 버킷) 서명 URL(24h). */
export function sdmResultUrl(path: string): Promise<string | null> {
  return createSignedUrl(RESULT_BUCKET, path, SIGNED_URL_TTL.day);
}
