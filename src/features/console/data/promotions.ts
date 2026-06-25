// 프로모션(진입 배너·팝업) 관리 데이터 접근 레이어 (Task #3 — console 도메인).
// 패턴: docs/data-access-layer.md. AdminPromotions 의 promotional_events 조회 + 운영자 upsert RPC 를
// 모은다. 테이블·RPC 모두 types 에 존재 → (supabase as any) 캐스트 제거.

import { supabase } from "@/integrations/supabase/client";

export interface PromoRow {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  cta_label: string;
  cta_path: string;
  badge_label: string | null;
  status: string;
  position: number;
  image_url: string | null;
  audience: string | null;
  show_as_popup: boolean | null;
  starts_at: string | null;
  ends_at: string | null;
}

export interface UpsertResult {
  ok: boolean;
  error?: string;
}

const PROMO_SELECT =
  "id, slug, title, subtitle, cta_label, cta_path, badge_label, status, position, image_url, audience, show_as_popup, starts_at, ends_at";

export const promotionKeys = {
  all: ["admin", "promotions"] as const,
  list: () => [...promotionKeys.all, "list"] as const,
};

/** 프로모션 이벤트 목록(position 오름차순). 에러 시 throw. */
export async function fetchPromotions(): Promise<PromoRow[]> {
  const { data, error } = await supabase
    .from("promotional_events")
    .select(PROMO_SELECT)
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as PromoRow[];
}

/**
 * 프로모션 생성/수정 — admin_upsert_promotional_event RPC(slug upsert).
 * { ok, error } 반환(error==="forbidden" 등은 호출부가 메시지 분기).
 */
export async function upsertPromotion(slug: string, payload: Record<string, unknown>): Promise<UpsertResult> {
  const { data, error } = await supabase.rpc("admin_upsert_promotional_event", { p_slug: slug, p_payload: payload });
  const res = data as { ok?: boolean; error?: string } | null;
  if (error || !res?.ok) return { ok: false, error: res?.error || error?.message };
  return { ok: true };
}
