// AI 웨딩컨설팅(wedding_consulting_reports + storage + edge function) 데이터 접근 레이어
// (Task #3 — consumer 도메인). 패턴: docs/data-access-layer.md.
// WeddingConsulting·ConsultingGallery·ConsultingResult 가 공유하는 DB·스토리지·생성 호출을 모은다.
// 스토리지 idiom 은 공용 헬퍼(@/lib/storage) 재사용.

import { supabase } from "@/integrations/supabase/client";
import { createSignedUrl, uploadToBucket, SIGNED_URL_TTL } from "@/lib/storage";

const BUCKET = "invitation-uploads";

export interface ConsultingListRow {
  id: string;
  status: string;
  sections: string[] | null;
  created_at: string;
}

export interface ConsultingResultBoard {
  section: string;
  path: string;
}

export interface ConsultingReport {
  id: string;
  status: string;
  results: ConsultingResultBoard[] | null;
  error: string | null;
  sections: string[] | null;
  charged: number | null;
  created_at: string;
}

/** 컨설팅 섹션 키(백엔드 ALL_SECTIONS 와 동일 — 신부/신랑 공유). */
export const CONSULTING_SECTION_KEYS = ["personal_color", "hair", "makeup", "dress"] as const;
export type ConsultingSectionKey = (typeof CONSULTING_SECTION_KEYS)[number];

/**
 * 섹션 라벨 단일 소스 — 신부(드레스+부케·메이크업) vs 신랑(예복+타이·그루밍).
 * 백엔드는 같은 키(makeup/dress)를 성별별로 재해석하므로 표시 라벨만 분기(드리프트 방지).
 */
const CONSULTING_SECTION_LABELS: Record<"bride" | "groom", Record<ConsultingSectionKey, string>> = {
  bride: { personal_color: "퍼스널컬러", hair: "헤어", makeup: "메이크업", dress: "드레스+부케" },
  groom: { personal_color: "퍼스널컬러", hair: "헤어", makeup: "그루밍", dress: "예복+타이" },
};

export function consultingSectionLabel(section: string, gender: "bride" | "groom" = "bride"): string {
  return CONSULTING_SECTION_LABELS[gender][section as ConsultingSectionKey] ?? section;
}

export const weddingConsultingKeys = {
  all: ["consumer", "weddingConsulting"] as const,
  gallery: (userId: string) => [...weddingConsultingKeys.all, "gallery", userId] as const,
  detail: (id: string) => [...weddingConsultingKeys.all, "detail", id] as const,
};

/** 원본 사진을 컨설팅 업로드 경로에 올리고 path 반환. 실패 시 "업로드 실패: ..." throw. */
export async function uploadConsultingSource(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/consulting/${crypto.randomUUID()}.${ext}`;
  try {
    await uploadToBucket(BUCKET, path, file, { contentType: file.type });
  } catch (err) {
    throw new Error(`업로드 실패: ${err instanceof Error ? err.message : "알 수 없는 오류"}`);
  }
  return path;
}

/**
 * wedding-consulting 잡 생성 → report_id 반환. 생성은 서버 백그라운드(결과는 폴링).
 * 에러 시 edge function 의 error code(예: insufficient_hearts)를 추출해 그 code 를
 * 메시지로 throw — 호출부가 code 로 분기(하트부족 안내 등). report_id 누락 시 "요청 실패".
 */
export async function requestConsulting(
  sourcePath: string,
  sections: string[],
  gender: "bride" | "groom" = "bride",
): Promise<string> {
  const { data, error } = await supabase.functions.invoke("wedding-consulting", {
    body: { source_path: sourcePath, sections, gender },
  });
  if (error) {
    let code: string | undefined;
    try {
      const ctx = (error as { context?: { json?: () => Promise<{ error?: string }> } }).context;
      if (ctx?.json) code = (await ctx.json())?.error;
    } catch {
      /* ignore — code 추출 실패 시 아래 fallback */
    }
    throw new Error(code ?? (error as { message?: string }).message ?? "요청 실패");
  }
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  const reportId = (data as { report_id?: string })?.report_id;
  if (!reportId) throw new Error("요청 실패");
  return reportId;
}

/** 첫 1회 할인 여부 — wedding_consulting_usage.used_count===0. 행 없으면 할인(true). */
export async function fetchConsultingDiscounted(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("wedding_consulting_usage")
    .select("used_count")
    .eq("user_id", userId)
    .maybeSingle();
  return ((data as { used_count?: number } | null)?.used_count ?? 0) === 0;
}

/** 내 컨설팅 리포트 목록(최신순, limit 지정 가능). 에러 시 throw. */
export async function fetchConsultingReports(userId: string, limit?: number): Promise<ConsultingListRow[]> {
  let query = supabase
    .from("wedding_consulting_reports")
    .select("id, status, sections, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (limit != null) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as ConsultingListRow[];
}

/** 단일 컨설팅 리포트 조회(폴링용). 없으면 null. */
export async function fetchConsultingReport(id: string): Promise<ConsultingReport | null> {
  const { data, error } = await supabase
    .from("wedding_consulting_reports")
    .select("id, status, results, error, sections, charged, created_at")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as unknown as ConsultingReport;
}

/** 결과 보드 이미지 서명 URL(24h). */
export function consultingResultUrl(path: string): Promise<string | null> {
  return createSignedUrl(BUCKET, path, SIGNED_URL_TTL.day);
}
