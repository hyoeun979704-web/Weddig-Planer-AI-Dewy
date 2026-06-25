// 헤어 변형 미리보기(hair_samples·hair_preview_usage·hair_preview_jobs + storage +
// edge function) 데이터 접근 레이어 (Task #3 — consumer 도메인). 패턴: docs/data-access-layer.md.
// HairPreview·HairPreviewGallery·HairPreviewResult 가 공유하는 DB·스토리지·생성 호출을 모은다.
// 스토리지 idiom 은 공용 헬퍼(@/lib/storage) 재사용. 결과는 청첩장 업로드와 같은 버킷에 재호스팅된다.

import { supabase } from "@/integrations/supabase/client";
import { createSignedUrl, uploadToBucket, SIGNED_URL_TTL } from "@/lib/storage";

// 헤어 원본·결과 모두 청첩장 업로드 버킷을 재사용한다(별도 헤어 버킷 없음).
const HAIR_BUCKET = "invitation-uploads";

export interface HairSampleRow {
  id: string;
  name: string;
  image_url: string;
  prompt: string | null;
}

export interface HairResultItem {
  kind: string;
  path: string;
}

export interface HairJobListRow {
  id: string;
  status: "processing" | "completed" | "failed";
  options: string[];
  created_at: string;
}

export interface HairGalleryRow {
  id: string;
  results: HairResultItem[] | null;
  created_at: string;
}

export interface HairJobDetail {
  id: string;
  status: "processing" | "completed" | "failed";
  results: HairResultItem[] | null;
  options: string[] | null;
  error: string | null;
  created_at: string;
}

export const hairPreviewKeys = {
  all: ["consumer", "hairPreview"] as const,
  samples: () => [...hairPreviewKeys.all, "samples"] as const,
  usage: (userId: string) => [...hairPreviewKeys.all, "usage", userId] as const,
  jobs: (userId: string) => [...hairPreviewKeys.all, "jobs", userId] as const,
  gallery: (userId: string) => [...hairPreviewKeys.all, "gallery", userId] as const,
  detail: (id: string) => [...hairPreviewKeys.all, "detail", id] as const,
};

/** 어드민이 등록한 활성 단일 헤어 선택지(진열순). 비핵심이라 에러는 흡수(빈 배열). */
export async function fetchHairSamples(): Promise<HairSampleRow[]> {
  const { data } = await supabase
    .from("hair_samples")
    .select("id, name, image_url, prompt")
    .eq("is_active", true)
    .order("display_order", { ascending: false });
  return (data ?? []) as unknown as HairSampleRow[];
}

/** 첫 1회 50% 할인 여부 판단용 사용 횟수(used_count). 행 없으면 0(=할인 대상). */
export async function fetchHairUsageCount(userId: string): Promise<number> {
  const { data } = await supabase
    .from("hair_preview_usage")
    .select("used_count")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as { used_count?: number } | null)?.used_count ?? 0;
}

/** 내 헤어 미리보기 기록(최신 20건). 비핵심이라 에러는 흡수(빈 배열). */
export async function fetchHairJobs(userId: string): Promise<HairJobListRow[]> {
  const { data } = await supabase
    .from("hair_preview_jobs")
    .select("id, status, options, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);
  return (data ?? []) as unknown as HairJobListRow[];
}

/** 내가 만든 완료(status=completed) 헤어 미리보기 목록(최신순). 에러 시 throw. */
export async function fetchHairGallery(userId: string): Promise<HairGalleryRow[]> {
  const { data, error } = await supabase
    .from("hair_preview_jobs")
    .select("id, results, created_at")
    .eq("user_id", userId)
    .eq("status", "completed")
    .order("created_at", { ascending: false });
  if (error || !data) throw error ?? new Error("헤어 갤러리 조회 실패");
  return data as unknown as HairGalleryRow[];
}

/** 단일 헤어 미리보기 작업 상세 조회(폴링용). 없으면 null. */
export async function fetchHairJob(id: string): Promise<HairJobDetail | null> {
  const { data, error } = await supabase
    .from("hair_preview_jobs")
    .select("id, status, results, options, error, created_at")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as unknown as HairJobDetail;
}

/** 셀카를 헤어 버킷에 올린다(경로는 호출부가 user.id/hair/uuid.ext 로 구성). 실패 시 throw. */
export async function uploadHairSource(path: string, file: File): Promise<void> {
  await uploadToBucket(HAIR_BUCKET, path, file, { contentType: file.type });
}

/** dewy-hair-preview 생성 호출. error/응답 error 를 그대로 반환해 호출부가 코드 분기·메시지 처리. */
export function invokeHairPreview(body: Record<string, unknown>) {
  return supabase.functions.invoke("dewy-hair-preview", { body });
}

/** 헤어 결과/원본 이미지(헤어 버킷) 서명 URL(24h). 실패 시 null. */
export function hairResultUrl(path: string): Promise<string | null> {
  return createSignedUrl(HAIR_BUCKET, path, SIGNED_URL_TTL.day);
}
