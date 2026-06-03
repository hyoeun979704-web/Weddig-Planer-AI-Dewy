// 되돌리기/다시실행 가능한 상태 훅.
//
// 단일 document 상태(예: 편집기 layout, 청첩장 face)에 past/future 스택을 붙여
// undo/redo 를 제공한다. 편집기들이 이미 단일 setter funnel 을 쓰므로, 그 setter 를
// 이 훅의 `set` 으로 교체하면 모든 변경이 자동으로 히스토리에 쌓인다.
//
// - coalesceKey: 같은 "동작"의 연속 변경(같은 슬롯 타이핑, 같은 슬롯 드래그 등)을
//   한 undo 단계로 묶는다. key 가 직전과 같고 600ms 안일 때만 묶음 → 동작/대상이
//   바뀌면(슬롯 A 타이핑 → 슬롯 B 드래그) 새 단계로 분리. key 없으면 항상 새 단계.
// - reset: 히스토리를 비우고 값만 교체(서버 로드/하이드레이션 — 되돌림 대상 아님).
//
// 뷰 상태(선택 슬롯, 활성 탭, 격자 토글 등)는 이 훅에 넣지 말 것 — document 만.
//
// 구현 메모: 히스토리 push 는 setState 업데이터 "밖"에서 한다(업데이터는 순수해야
// StrictMode 이중호출에도 안전). current ref 가 최신 state 를 미러링하고, 이 훅의
// set/undo/redo/reset 만 state 를 바꾸므로 ref 가 항상 동기 상태를 유지한다.

import { useCallback, useRef, useState } from "react";

export interface Undoable<T> {
  state: T;
  /**
   * 변경 적용 + 히스토리 push.
   * coalesceKey 가 직전 변경과 같고 600ms 안이면 한 단계로 묶음(연속 동작).
   * 동작/대상이 다르면 다른 key 를 줄 것 (예: "text:slot-1", "move:slot-2").
   */
  set: (next: T | ((prev: T) => T), opts?: { coalesceKey?: string }) => void;
  /** 히스토리 비우고 값만 교체 (로드/하이드레이션). */
  reset: (value: T) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const COALESCE_MS = 600;
const MAX_HISTORY = 100;

export function useUndoable<T>(initial: T | (() => T)): Undoable<T> {
  const [state, setStateRaw] = useState<T>(initial);
  const current = useRef<T>(state); // 최신 state 미러 (set/undo/redo/reset 에서만 갱신)
  const past = useRef<T[]>([]);
  const future = useRef<T[]>([]);
  const lastTs = useRef(0);
  const lastKey = useRef<string | null>(null);

  const set = useCallback(
    (next: T | ((prev: T) => T), opts?: { coalesceKey?: string }) => {
      const prev = current.current;
      const value =
        typeof next === "function" ? (next as (p: T) => T)(prev) : next;
      if (Object.is(value, prev)) return;
      const now = Date.now();
      const key = opts?.coalesceKey;
      // 같은 동작(key)이 직전과 같고 시간창 안일 때만 묶음. key 없으면 항상 새 단계.
      const coalesce =
        key != null && key === lastKey.current && now - lastTs.current < COALESCE_MS;
      if (!coalesce) {
        past.current.push(prev);
        if (past.current.length > MAX_HISTORY) past.current.shift();
        future.current = [];
      }
      lastTs.current = now;
      lastKey.current = key ?? null;
      current.current = value;
      setStateRaw(value);
    },
    [],
  );

  const undo = useCallback(() => {
    if (past.current.length === 0) return;
    const p = past.current.pop() as T;
    future.current.push(current.current);
    lastTs.current = 0;
    lastKey.current = null;
    current.current = p;
    setStateRaw(p);
  }, []);

  const redo = useCallback(() => {
    if (future.current.length === 0) return;
    const f = future.current.pop() as T;
    past.current.push(current.current);
    lastTs.current = 0;
    lastKey.current = null;
    current.current = f;
    setStateRaw(f);
  }, []);

  const reset = useCallback((value: T) => {
    past.current = [];
    future.current = [];
    lastTs.current = 0;
    lastKey.current = null;
    current.current = value;
    setStateRaw(value);
  }, []);

  return {
    state,
    set,
    reset,
    undo,
    redo,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
  };
}
