// 되돌리기/다시실행 가능한 상태 훅.
//
// 단일 document 상태(예: 편집기 layout, 청첩장 face)에 past/future 스택을 붙여
// undo/redo 를 제공한다. 편집기들이 이미 단일 setter funnel 을 쓰므로, 그 setter 를
// 이 훅의 `set` 으로 교체하면 모든 변경이 자동으로 히스토리에 쌓인다.
//
// - coalesce: 타이핑·드래그·리사이즈처럼 짧은 시간에 연속되는 변경은 한 단계로 묶어
//   (기본 600ms) undo 가 픽셀/글자 단위로 쪼개지지 않게 한다.
// - reset: 히스토리를 비우고 값만 교체(서버 로드/하이드레이션 — 되돌림 대상 아님).
//
// 뷰 상태(선택 슬롯, 활성 탭, 격자 토글 등)는 이 훅에 넣지 말 것 — document 만.

import { useCallback, useRef, useState } from "react";

export interface Undoable<T> {
  state: T;
  /** 변경 적용 + 히스토리 push. coalesce=true 면 직전 변경과 묶음(연속 입력). */
  set: (next: T | ((prev: T) => T), opts?: { coalesce?: boolean }) => void;
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
  const past = useRef<T[]>([]);
  const future = useRef<T[]>([]);
  const lastTs = useRef(0);
  // canUndo/canRedo 는 ref 길이에서 읽으므로, 변경 시 강제 리렌더로 최신화.
  const [, bump] = useState(0);
  const rerender = useCallback(() => bump((v) => v + 1), []);

  const set = useCallback(
    (next: T | ((prev: T) => T), opts?: { coalesce?: boolean }) => {
      setStateRaw((prev) => {
        const value =
          typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        if (Object.is(value, prev)) return prev;
        const now = Date.now();
        const coalesce = !!opts?.coalesce && now - lastTs.current < COALESCE_MS;
        if (!coalesce) {
          past.current.push(prev);
          if (past.current.length > MAX_HISTORY) past.current.shift();
          future.current = [];
        }
        lastTs.current = now;
        return value;
      });
      rerender();
    },
    [rerender],
  );

  const undo = useCallback(() => {
    setStateRaw((prev) => {
      if (past.current.length === 0) return prev;
      const p = past.current.pop() as T;
      future.current.push(prev);
      lastTs.current = 0; // 다음 변경은 새 단계로
      return p;
    });
    rerender();
  }, [rerender]);

  const redo = useCallback(() => {
    setStateRaw((prev) => {
      if (future.current.length === 0) return prev;
      const f = future.current.pop() as T;
      past.current.push(prev);
      lastTs.current = 0;
      return f;
    });
    rerender();
  }, [rerender]);

  const reset = useCallback(
    (value: T) => {
      past.current = [];
      future.current = [];
      lastTs.current = 0;
      setStateRaw(value);
      rerender();
    },
    [rerender],
  );

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
