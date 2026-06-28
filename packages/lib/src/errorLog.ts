// 클라이언트 에러 로깅 — 운영자 어드민(client_error_logs)으로 프로덕션 오류를 관측.
// 외부 의존 0(Sentry 없이도 동작). 로깅은 절대 앱 흐름에 영향 주면 안 됨 → 전부 try/catch,
// 실패해도 조용히 무시. 폭주 방지를 위해 세션당 캡 + 동일 오류 중복 차단 + 노이즈 필터.

import { supabase } from "@/integrations/supabase/client";

const SESSION_CAP = 20; // 한 세션에서 전송할 최대 오류 수(폭주·과금 방지)
const seen = new Set<string>(); // 세션 내 동일 digest 재전송 차단
let sent = 0;
let installed = false;

// 그룹핑/중복 차단 키 — 메시지 + 첫 스택 프레임.
function digestOf(message: string, stack?: string): string {
  const firstFrame = (stack ?? "")
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.startsWith("at ") || l.includes("@")) ?? "";
  return `${message}::${firstFrame}`.slice(0, 200);
}

// 로깅 가치 없는 브라우저/확장/측정 잡음.
function isNoise(message: string): boolean {
  return (
    !message ||
    /ResizeObserver loop/i.test(message) ||
    /^Script error\.?$/i.test(message) || // cross-origin, 정보 없음
    // 청크 로드 실패는 ErrorBoundary 가 자동 새로고침으로 복구 → 별도 로깅 불필요.
    /ChunkLoadError/i.test(message) ||
    /dynamically imported module/i.test(message) ||
    /importing a module script failed/i.test(message) ||
    // Capacitor 네이티브 플러그인 미구현(예: iOS 위젯 플러그인 미번들) — 호출부가 graceful
    // 폴백하므로 앱 영향 0. 양성 잡음이 실제 오류를 묻어 로깅 가치 없음.
    /plugin is not implemented on/i.test(message)
  );
}

// 에러 메시지·스택에 사용자 PII(이메일·전화·토큰)가 섞여 client_error_logs 에 평문 저장되지
// 않도록 마스킹한다(PIPA 안전조치 — 스택에 우연히 들어간 식별정보 차단).
function redactPii(s: string): string {
  if (!s) return s;
  return s
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]")
    .replace(/\b01[016789][-\s]?\d{3,4}[-\s]?\d{4}\b/g, "[phone]")
    .replace(/\b[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b/g, "[token]")
    .replace(/(Bearer\s+)[A-Za-z0-9._-]+/gi, "$1[token]");
}

export interface ClientErrorInput {
  message: string;
  stack?: string;
  /** errorboundary | window.onerror | unhandledrejection | manual */
  source: string;
}

export async function logClientError(input: ClientErrorInput): Promise<void> {
  try {
    const message = redactPii((input.message || "").slice(0, 2000));
    if (isNoise(message)) return;
    const stack = redactPii((input.stack || "").slice(0, 8000));

    const digest = digestOf(message, stack);
    if (seen.has(digest)) return; // 같은 오류 반복 → 1회만
    if (sent >= SESSION_CAP) return; // 폭주 차단
    seen.add(digest);
    sent += 1;

    // 세션은 로컬 캐시에서 읽혀 네트워크 비용이 거의 없다(getUser 의 원격 호출 회피).
    let userId: string | null = null;
    try {
      const { data } = await supabase.auth.getSession();
      userId = data.session?.user?.id ?? null;
    } catch {
      /* 세션 조회 실패해도 익명으로 기록 */
    }

    await (supabase as unknown as {
      from: (t: string) => { insert: (v: unknown) => Promise<unknown> };
    })
      .from("client_error_logs")
      .insert({
        user_id: userId,
        message,
        stack: stack || null,
        source: input.source.slice(0, 40),
        url: (typeof location !== "undefined" ? location.pathname : "").slice(0, 300) || null,
        user_agent: (typeof navigator !== "undefined" ? navigator.userAgent : "").slice(0, 300) || null,
        digest,
      });
  } catch {
    /* 로깅 실패는 절대 앱에 영향 주지 않는다(조용히 무시) */
  }
}

// 전역 핸들러 1회 설치 — main 부트스트랩에서 호출.
export function installGlobalErrorLogging(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (e: ErrorEvent) => {
    void logClientError({
      message: e.message || String(e.error ?? "unknown error"),
      stack: e.error instanceof Error ? e.error.stack : undefined,
      source: "window.onerror",
    });
  });

  window.addEventListener("unhandledrejection", (e: PromiseRejectionEvent) => {
    const reason = e.reason as { message?: string; stack?: string } | string | undefined;
    const message =
      typeof reason === "string" ? reason : reason?.message || String(reason ?? "unhandled rejection");
    void logClientError({
      message,
      stack: typeof reason === "object" ? reason?.stack : undefined,
      source: "unhandledrejection",
    });
  });
}
