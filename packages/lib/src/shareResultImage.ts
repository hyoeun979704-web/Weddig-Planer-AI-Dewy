import { toast } from "sonner";

// AI 결과 이미지 **원탭 공유** 공통 유틸(결과 페이지 6종 공용 — DRY).
// navigator.share 로 이미지 파일을 공유하고, 불가하면 URL 복사로 폴백한다.
// 반환값으로 호출부가 토스트를 띄울 수 있다(sonner 미사용 환경 대비).
export async function shareResultImage(opts: {
  url: string | null | undefined;
  title: string;
  fileName?: string;
}): Promise<"shared" | "copied" | "skipped" | "error"> {
  const { url, title, fileName = "dewy-result.png" } = opts;
  if (!url) return "skipped";
  try {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        const res = await fetch(url);
        const blob = await res.blob();
        const file = new File([blob], fileName, { type: blob.type || "image/png" });
        if (!navigator.canShare || navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title });
          return "shared";
        }
      } catch {
        /* 파일 공유 불가 → 아래 URL/텍스트 공유로 폴백 */
      }
      await navigator.share({ title, url });
      return "shared";
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      return "copied";
    }
    return "skipped";
  } catch (e) {
    if ((e as Error).name === "AbortError") return "skipped";
    return "error";
  }
}

// 결과를 토스트 피드백과 함께 공유하는 헬퍼(호출부 1줄 사용).
export async function shareResultWithToast(opts: { url?: string | null; title: string; fileName?: string }) {
  const r = await shareResultImage(opts);
  if (r === "copied") toast("이미지 주소를 복사했어요");
  else if (r === "error") toast("공유에 실패했어요");
}
