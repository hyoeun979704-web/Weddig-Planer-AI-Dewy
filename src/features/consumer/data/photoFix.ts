// 사진 체형/화질 보정(photo_retouch_jobs·photo_retouch_usage + storage + edge function)
// 데이터 접근 레이어 (Task #3 — consumer 도메인). 패턴: docs/data-access-layer.md.
// PhotoFix·PhotoFixGallery·PhotoFixResult 가 공유하는 DB·스토리지·생성 호출을 모은다.
// 스토리지 idiom 은 공용 헬퍼(@/lib/storage) 재사용(업로드 버킷·결과 서명 URL 동일).

import { supabase } from "@/integrations/supabase/client";
import { createSignedUrl, uploadToBucket, SIGNED_URL_TTL } from "@/lib/storage";

// 원본/결과 모두 invitation-uploads 버킷의 본인 폴더에 저장된다.
const UPLOAD_BUCKET = "invitation-uploads";

export interface PhotoFixJobRow {
  id: string;
  status: "processing" | "completed" | "failed";
  source_paths: string[];
  created_at: string;
}

export interface PhotoFixResultItem {
  source: string;
  path: string;
}

export interface PhotoFixDetail {
  id: string;
  status: "processing" | "completed" | "failed";
  results: PhotoFixResultItem[] | null;
  source_paths: string[] | null;
  error: string | null;
  charged: number | null;
  created_at: string;
}

export const photoFixKeys = {
  all: ["consumer", "photoFix"] as const,
  jobs: (userId: string) => [...photoFixKeys.all, "jobs", userId] as const,
  detail: (id: string) => [...photoFixKeys.all, "detail", id] as const,
};

/** 첫 1회 할인 여부(계정당) — usage.used_count 가 0 이면 true. 행 없으면 true. */
export async function fetchPhotoFixDiscounted(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("photo_retouch_usage")
    .select("used_count")
    .eq("user_id", userId)
    .maybeSingle();
  return ((data as { used_count?: number } | null)?.used_count ?? 0) === 0;
}

/** 내 보정 잡 목록(최신순). limit 지정 시 그 개수만. 에러는 빈 배열로 흡수(목록 표시는 비핵심). */
export async function fetchPhotoFixJobs(
  userId: string,
  limit?: number,
): Promise<PhotoFixJobRow[]> {
  let query = supabase
    .from("photo_retouch_jobs")
    .select("id, status, source_paths, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (limit != null) query = query.limit(limit);
  const { data } = await query;
  return (data ?? []) as unknown as PhotoFixJobRow[];
}

/** 원본 사진을 업로드 버킷(본인 photofix 폴더)에 올리고 저장 경로 반환. 실패 시 throw(메시지 포함). */
export async function uploadPhotoFixSource(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/photofix/${crypto.randomUUID()}.${ext}`;
  try {
    await uploadToBucket(UPLOAD_BUCKET, path, file, { contentType: file.type });
  } catch (e) {
    throw new Error(`업로드 실패: ${e instanceof Error ? e.message : "오류"}`);
  }
  return path;
}

/** insufficient_hearts 등 구조화된 코드를 호출부 분기에 넘기기 위한 에러. */
export class PhotoFixGenerateError extends Error {
  constructor(public code: string, message?: string) {
    super(message ?? code);
    this.name = "PhotoFixGenerateError";
  }
}

/**
 * photo-enhance-batch 호출 → job_id 반환(보정은 서버 백그라운드).
 * edge 에러는 context.json().error 코드를 파싱해 PhotoFixGenerateError 로 throw
 * (호출부가 insufficient_hearts 분기). 응답 error / job_id 누락 시도 throw.
 */
export async function generatePhotoFix(body: Record<string, unknown>): Promise<string> {
  const { data, error } = await supabase.functions.invoke("photo-enhance-batch", { body });
  if (error) {
    let code: string | undefined;
    try {
      const ctx = (error as { context?: { json?: () => Promise<{ error?: string }> } }).context;
      if (ctx?.json) code = (await ctx.json())?.error;
    } catch {
      /* ignore */
    }
    throw new PhotoFixGenerateError(code ?? error.message ?? "보정 요청 실패");
  }
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  const jobId = (data as { job_id?: string })?.job_id;
  if (!jobId) throw new Error("보정 요청 실패");
  return jobId;
}

/** 단일 보정 잡 상세 조회(폴링용). 없거나 에러면 null. */
export async function fetchPhotoFixJob(id: string): Promise<PhotoFixDetail | null> {
  const { data, error } = await supabase
    .from("photo_retouch_jobs")
    .select("id, status, results, source_paths, error, charged, created_at")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as unknown as PhotoFixDetail;
}

/** 결과 이미지(업로드 버킷) 서명 URL(24h). */
export function photoFixResultUrl(path: string): Promise<string | null> {
  return createSignedUrl(UPLOAD_BUCKET, path, SIGNED_URL_TTL.day);
}
