// 청첩장 에셋 관리 데이터 접근 레이어 (Task #3 — console 도메인).
// 패턴: docs/data-access-layer.md. AdminInvitationAssets 의 invitation_assets CRUD 를 여기로 모은다.
// invitation_assets 는 types 에 존재 → (supabase as any) 캐스트 제거. React 비의존(테스트 가능).

import { supabase } from "@/integrations/supabase/client";

export interface Asset {
  id: string;
  name: string;
  image_url: string;
  thumbnail_url: string | null;
  category: string;
  collection: string | null;
  tags: string[] | null;
  is_recolorable: boolean;
  natural_width: number | null;
  natural_height: number | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

// 템플릿 편집기에서 카드에 끌어다 놓을 활성 에셋 옵션(목록 화면 Asset 의 일부 컬럼만).
export interface AssetOption {
  id: string;
  name: string;
  image_url: string;
  category: string;
  is_recolorable: boolean;
  natural_width: number | null;
  natural_height: number | null;
}

export const invitationAssetKeys = {
  all: ["admin", "invitationAssets"] as const,
  list: () => [...invitationAssetKeys.all, "list"] as const,
  options: () => [...invitationAssetKeys.all, "options"] as const,
};

/** 활성 에셋 옵션(편집기 드래그용) — 카테고리·display_order 정렬. */
export async function fetchAssetOptions(): Promise<AssetOption[]> {
  const { data, error } = await supabase
    .from("invitation_assets")
    .select("id,name,image_url,category,is_recolorable,natural_width,natural_height")
    .eq("is_active", true)
    .order("category")
    .order("display_order");
  if (error) throw error;
  return (data ?? []) as unknown as AssetOption[];
}

export async function fetchAssets(): Promise<Asset[]> {
  const { data, error } = await supabase
    .from("invitation_assets")
    .select("*")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Asset[];
}

/** 에셋 저장 — editingId 있으면 update, 없으면 insert. 에러 시 throw. */
export async function saveAsset(editingId: string | null, payload: Record<string, unknown>): Promise<void> {
  const { error } = editingId
    ? await supabase.from("invitation_assets").update(payload as never).eq("id", editingId)
    : await supabase.from("invitation_assets").insert(payload as never);
  if (error) throw error;
}

export async function setAssetActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from("invitation_assets").update({ is_active: isActive } as never).eq("id", id);
  if (error) throw error;
}

export async function deleteAsset(id: string): Promise<void> {
  const { error } = await supabase.from("invitation_assets").delete().eq("id", id);
  if (error) throw error;
}
