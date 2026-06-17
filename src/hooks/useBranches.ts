import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { createSafeStorage } from "@/integrations/supabase/safeLocalStorage";

// localStorage 가 throw 하는 환경(iOS 프라이빗 등) 안전 래퍼.
const store = createSafeStorage(typeof window !== "undefined" ? window.localStorage : null);

// 멀티지점: 한 기업회원 계정이 여러 places(지점)를 소유할 수 있다.
// 관리 화면들은 이 훅으로 "현재 선택된 지점"을 공유한다(get_my_listing LIMIT 1 의
// 비결정적 선택 → 명시적 선택으로). 선택은 계정별 localStorage 에 보존.

export interface Branch {
  place_id: string;
  name: string | null;
  moderation_status?: string | null;
  moderation_note?: string | null;
  category?: string | null;
  [k: string]: unknown;
}

const selKey = (uid?: string) => `dewy.selectedBranch.${uid ?? "anon"}`;

export function useBranches() {
  const { user } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    // get_my_listings(복수) 미적용 라이브 대비: 실패 시 단수 get_my_listing 로 폴백.
    let rows: Branch[] = [];
    const { data, error } = await supabase.rpc("get_my_listings" as never);
    if (!error && Array.isArray(data)) {
      rows = data as unknown as Branch[];
    } else {
      const single = await supabase.rpc("get_my_listing");
      const r = Array.isArray(single.data) ? single.data[0] : single.data;
      if (r && (r as Branch).place_id) rows = [r as unknown as Branch];
    }
    setBranches(rows);

    const stored = store.getItem(selKey(user.id));
    const valid = rows.find((b) => b.place_id === stored);
    setSelectedId(valid ? (stored as string) : (rows[0]?.place_id ?? null));
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const select = useCallback((id: string) => {
    setSelectedId(id);
    if (user) store.setItem(selKey(user.id), id);
  }, [user]);

  const selected = branches.find((b) => b.place_id === selectedId) ?? null;

  return { branches, selected, selectedId, select, loading, refresh: load };
}
