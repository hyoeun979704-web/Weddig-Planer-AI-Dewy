// AI 샘플(makeup/hair/dress) 관리 공유 데이터 접근 레이어 (Task #3 — console 도메인).
// 세 페이지(AdminMakeupSamples·AdminHairSamples·AdminDressSamples)가 동형 CRUD 라 테이블명을
// 인자로 받는 제네릭 함수로 단일화(DRY). 동적 테이블명이라 .from(table) 캐스트 1개는 정당.
// 패턴: docs/data-access-layer.md.

import { supabase } from "@/integrations/supabase/client";

export type SampleTable = "makeup_samples" | "hair_samples" | "dress_samples";

export const sampleAdminKeys = {
  list: (table: SampleTable) => ["admin", table, "list"] as const,
};

/** 샘플 목록 조회(display_order desc → created_at desc). 행 타입은 호출부가 지정. */
export async function fetchSamples<T>(table: SampleTable): Promise<T[]> {
  const { data, error } = await supabase
    .from(table as never)
    .select("*")
    .order("display_order", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as T[];
}

/** 샘플 저장 — editingId 있으면 update, 없으면 insert. 에러 시 throw. */
export async function saveSample(
  table: SampleTable,
  editingId: string | null,
  payload: Record<string, unknown>,
): Promise<void> {
  const tbl = supabase.from(table as never);
  const { error } = editingId
    ? await tbl.update(payload as never).eq("id" as never, editingId as never)
    : await tbl.insert(payload as never);
  if (error) throw error;
}

export async function setSampleActive(table: SampleTable, id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from(table as never)
    .update({ is_active: isActive } as never)
    .eq("id" as never, id as never);
  if (error) throw error;
}

export async function deleteSample(table: SampleTable, id: string): Promise<void> {
  const { error } = await supabase
    .from(table as never)
    .delete()
    .eq("id" as never, id as never);
  if (error) throw error;
}
