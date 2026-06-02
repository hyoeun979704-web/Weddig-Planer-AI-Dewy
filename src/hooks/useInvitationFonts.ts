import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fontFamilyName } from "@/lib/invitation/layout";

/**
 * 청첩장 폰트 로더 (on-demand).
 *
 * invitation_fonts(is_active) 를 한 번 읽어와서:
 *   1. @font-face 를 <style id="invitation-fontfaces"> 로 1회 주입 (문서 전역, 다운로드 X)
 *   2. **실제 쓰는 폰트(used)만** document.fonts.load 로 받아 fontsReady=true
 *
 * 활성 폰트가 수십 종이어도 @font-face 주입은 가볍고(브라우저는 실제 사용 전까지 안 받음),
 * 캔버스가 기다리는 건 used 폰트뿐이라 느려지지 않는다. Studio 폰트 피커처럼 목록 전체가
 * 필요한 곳은 미리보기 컴포넌트가 자기 폰트를 그릴 때 on-demand 로 받는다.
 *
 * @param used 이 화면이 실제로 그릴 폰트 family 목록(없으면 전체 로드 — 하위호환).
 */

export interface InvitationFont {
  id: string;
  name: string;
  family: string;
  file_url: string;
  category: string;
  weight: string;
  style: string;
}

const STYLE_EL_ID = "invitation-fontfaces";
let fontCache: InvitationFont[] | null = null;
const loadedFamilies = new Set<string>();

function injectFontFaces(list: InvitationFont[]) {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_EL_ID)) return; // 이미 주입됨
  const css = list
    .filter((f) => f.file_url && f.family)
    .map((f) => {
      const family = f.family.replace(/'/g, "");
      return `@font-face{font-family:'${family}';src:url('${f.file_url}');font-weight:${f.weight || "400"};font-style:${f.style || "normal"};font-display:swap;}`;
    })
    .join("\n");
  const styleEl = document.createElement("style");
  styleEl.id = STYLE_EL_ID;
  styleEl.textContent = css;
  document.head.appendChild(styleEl);
}

async function loadFamilies(list: InvitationFont[], families: string[]) {
  const fontSet = (document as unknown as { fonts?: FontFaceSet }).fonts;
  if (!fontSet?.load) return;
  const want = families.filter((fam) => !loadedFamilies.has(fam));
  await Promise.all(
    want.map(async (fam) => {
      const f = list.find((x) => x.family === fam);
      const weight = f?.weight || "400";
      await fontSet
        .load(`${weight} 16px "${fam.replace(/"/g, "")}"`)
        .catch(() => undefined);
      loadedFamilies.add(fam);
    }),
  );
}

export function useInvitationFonts(used?: string[]) {
  const [fonts, setFonts] = useState<InvitationFont[]>(fontCache ?? []);
  const [fontsReady, setFontsReady] = useState<boolean>(false);

  // used 목록을 안정 키로 — family 이름만 정규화해서 비교 (없으면 전체)
  const usedKey = useMemo(
    () =>
      used
        ? Array.from(new Set(used.map(fontFamilyName))).sort().join(",")
        : "__ALL__",
    [used],
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      let list = fontCache;
      if (!list) {
        const { data, error } = await (supabase as any)
          .from("invitation_fonts")
          .select("id, name, family, file_url, category, weight, style")
          .eq("is_active", true)
          .order("display_order", { ascending: false });
        if (error || !data) {
          if (!cancelled) setFontsReady(true); // 폰트 없어도 진행
          return;
        }
        list = data as InvitationFont[];
        fontCache = list;
      }
      if (cancelled) return;
      setFonts(list);
      injectFontFaces(list);

      const available = new Set(list.map((f) => f.family));
      const families =
        usedKey === "__ALL__"
          ? list.map((f) => f.family)
          : usedKey
            ? usedKey.split(",").filter((f) => available.has(f))
            : [];

      // 필요한 게 모두 이미 로드됐으면 즉시 ready
      if (families.every((f) => loadedFamilies.has(f))) {
        if (!cancelled) setFontsReady(true);
        return;
      }
      if (!cancelled) setFontsReady(false);
      await loadFamilies(list, families);
      if (!cancelled) setFontsReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [usedKey]);

  return { fonts, fontsReady };
}
