import { useEffect, useRef, useState } from "react";

const PREFIX = "dewy:draft:";

/**
 * Persist a form's state to localStorage with debounce, recover it on
 * mount. Use for write/edit screens (community write/edit, couple diary
 * write) so accidentally hitting back / refreshing doesn't lose what
 * the user typed.
 *
 * Generic over T — pass any serialisable shape. The draft is stored
 * under "dewy:draft:<key>" so different forms don't collide.
 *
 * Usage:
 *   const { draft, hasDraft, save, clear } = useFormDraft("community-write", {
 *     title: "", content: "", category: "전체"
 *   });
 *   useEffect(() => { save({ title, content, category }); },
 *     [title, content, category]);
 *   // After successful submit: clear()
 *   // To restore on mount: setState(draft) when hasDraft
 */
export const useFormDraft = <T,>(key: string, defaultValue: T) => {
  const storageKey = `${PREFIX}${key}`;
  const [draft, setDraft] = useState<T>(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(storageKey) : null;
      return raw ? (JSON.parse(raw) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  // Track whether what we restored was real (user-saved) vs the bare
  // default. The mount-time prompt only makes sense in the former case.
  const [hasDraft, setHasDraft] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(storageKey) !== null;
  });

  // Debounced persistence — typing every 30ms shouldn't write 30 times.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const save = (next: T) => {
    setDraft(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
        setHasDraft(true);
      } catch {
        // Quota / Safari private browsing — fail silently; the user can still type.
      }
    }, 400);
  };

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
    setHasDraft(false);
  };

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return { draft, hasDraft, save, clear };
};
