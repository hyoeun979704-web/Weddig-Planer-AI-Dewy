import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { draftKey, loadDraft, saveDraft, clearDraft } from "@/lib/formDraft";

interface UseTextDraftOptions<T extends Record<string, unknown>> {
  /** 폼 식별자(예: "quote-new"). placeId 등 동적 구분이 필요하면 포함해 전달. */
  scope: string;
  userId: string | null | undefined;
  /** 현재 폼 값(직렬화 가능한 텍스트/스칼라/문자열배열만 — File 등은 제외). */
  values: T;
  /** 복원 시 각 필드 setter 호출. draft 는 옛 버전이라 일부 키가 없을 수 있음(?? 기본값). */
  apply: (draft: Partial<T>) => void;
  /** 저장/복원할 만한 "실제 작성 내용"이 있는지 — 프리필만으로 draft 가 생기는 것 방지. */
  hasContent: (v: Partial<T>) => boolean;
  /** false 면 no-op(예: 미인증/시트 닫힘). */
  enabled?: boolean;
  restoreMessage?: string;
}

/**
 * 폼 입력 자동 임시저장(draft) 훅 — 페이지 이탈/iOS Safari 탭 폐기 후 복귀 시 미저장 입력 복원.
 * 변경마다 localStorage 저장(실내용 없으면 제거) → 마운트 시 복원 → 저장 성공 시 clear().
 *
 * 설계: hydrate 가드로 초기/프리필 값이 draft 로 덮이는 것 방지. hasContent 로 프리필만
 * 있는 빈 draft 생성·오인 토스트 차단. apply/hasContent 는 ref 로 최신 유지(stale closure 방지).
 */
export function useTextDraft<T extends Record<string, unknown>>({
  scope,
  userId,
  values,
  apply,
  hasContent,
  enabled = true,
  restoreMessage = "이전에 작성하던 내용을 불러왔어요",
}: UseTextDraftOptions<T>): { clear: () => void } {
  const key = useMemo(() => draftKey(scope, userId), [scope, userId]);
  const hydratedRef = useRef(false);
  const applyRef = useRef(apply);
  const hasContentRef = useRef(hasContent);
  const valuesRef = useRef(values);
  applyRef.current = apply;
  hasContentRef.current = hasContent;
  valuesRef.current = values;

  const serialized = JSON.stringify(values);

  // hydrate(1회): 미저장 draft 가 있고 실제 내용이면 복원.
  useEffect(() => {
    if (!enabled || hydratedRef.current) return;
    const draft = loadDraft<Partial<T>>(key);
    if (draft && hasContentRef.current(draft)) {
      applyRef.current(draft);
      toast(restoreMessage);
    }
    hydratedRef.current = true;
  }, [key, enabled, restoreMessage]);

  // autosave: 변경마다 저장(실내용 없으면 제거). hydrate 전엔 no-op.
  useEffect(() => {
    if (!hydratedRef.current) return;
    const v = valuesRef.current;
    if (hasContentRef.current(v)) saveDraft(key, v);
    else clearDraft(key);
  }, [serialized, key]);

  return { clear: () => clearDraft(key) };
}
