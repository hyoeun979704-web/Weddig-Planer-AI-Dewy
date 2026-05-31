import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * 청첩장 폰트 로더.
 *
 * invitation_fonts(is_active) 를 한 번 읽어와서:
 *   1. @font-face 를 <style id="invitation-fontfaces"> 로 1회 주입 (문서 전역)
 *   2. 실제 폰트 파일 로드 완료(document.fonts.load)를 기다려 fontsReady=true
 *
 * Konva 캔버스는 폰트 파일이 로드되기 전에 그리면 fallback(Pretendard/시스템)으로
 * 렌더되므로, fontsReady 를 캔버스에 넘겨 로드 후 텍스트 노드를 재렌더해야 한다.
 *
 * 결과는 모듈 캐시에 저장 — 같은 세션에서 여러 화면(스튜디오/뷰어/플로우)이
 * 중복 fetch 하지 않는다.
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

async function waitForFonts(list: InvitationFont[]) {
  const fontSet = (document as unknown as { fonts?: FontFaceSet }).fonts;
  if (!fontSet?.load) return;
  await Promise.all(
    list.map((f) =>
      fontSet
        .load(`${f.weight || "400"} 16px "${f.family.replace(/"/g, "")}"`)
        .catch(() => undefined),
    ),
  );
  await fontSet.ready?.catch?.(() => undefined);
}

export function useInvitationFonts() {
  const [fonts, setFonts] = useState<InvitationFont[]>(fontCache ?? []);
  // 캐시가 있으면(이미 로드됨) 즉시 ready
  const [fontsReady, setFontsReady] = useState<boolean>(fontCache !== null);

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
          if (!cancelled) setFontsReady(true); // 폰트 없어도 진행 (fallback 렌더)
          return;
        }
        list = data as InvitationFont[];
        fontCache = list;
      }
      if (cancelled) return;
      setFonts(list);
      injectFontFaces(list);
      try {
        await waitForFonts(list);
      } catch {
        /* noop */
      }
      if (!cancelled) setFontsReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { fonts, fontsReady };
}
