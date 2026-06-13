import { Component, type ErrorInfo, type ReactNode } from "react";
import { logClientError } from "@/lib/errorLog";

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

// 동적 import(코드 스플리팅) 청크가 404 나는 케이스를 식별.
// 재배포로 해시 청크 파일명이 바뀌면, 이전에 열어둔 탭이 옛 청크를 요청하다
// "Failed to fetch dynamically imported module" / ChunkLoadError 로 reject 된다.
// Suspense 는 import reject 를 못 잡으므로 ErrorBoundary 가 필요하다.
function isChunkLoadError(error: Error | null): boolean {
  if (!error) return false;
  const msg = `${error.name} ${error.message}`;
  return (
    /ChunkLoadError/i.test(msg) ||
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg)
  );
}

const RELOAD_GUARD_KEY = "dewy:chunk-reload-once";

/**
 * 앱 전역 에러 바운더리.
 * - 청크 로드 실패(재배포 후 stale 탭)는 1회 자동 새로고침으로 복구 시도.
 * - 그 외 렌더 에러는 재시도/새로고침 UI 를 보여줘 화이트스크린을 막는다.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);

    // 렌더 크래시를 운영자 어드민으로 수집(청크 로드 실패는 노이즈 필터로 제외됨).
    void logClientError({
      message: error.message,
      stack: error.stack ?? info.componentStack ?? undefined,
      source: "errorboundary",
    });

    // 청크 로드 실패는 한 번만 자동 새로고침(루프 방지).
    if (isChunkLoadError(error)) {
      let alreadyReloaded = false;
      try {
        alreadyReloaded = sessionStorage.getItem(RELOAD_GUARD_KEY) === "1";
        if (!alreadyReloaded) sessionStorage.setItem(RELOAD_GUARD_KEY, "1");
      } catch {
        // sessionStorage 접근 불가(시크릿 등) → 자동 새로고침 생략하고 UI 표시.
        alreadyReloaded = true;
      }
      if (!alreadyReloaded) window.location.reload();
    }
  }

  private handleReload = () => {
    try {
      sessionStorage.removeItem(RELOAD_GUARD_KEY);
    } catch {
      /* noop */
    }
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    const chunk = isChunkLoadError(this.state.error);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <p className="text-base font-medium text-foreground">
          {chunk ? "새 버전이 배포되었어요" : "문제가 발생했어요"}
        </p>
        <p className="text-sm text-muted-foreground">
          {chunk
            ? "앱을 새로고침하면 정상적으로 이용할 수 있어요."
            : "잠시 후 다시 시도해 주세요. 계속되면 새로고침해 주세요."}
        </p>
        <button
          type="button"
          onClick={this.handleReload}
          className="rounded-full bg-primary px-6 py-2 text-sm font-medium text-primary-foreground"
        >
          새로고침
        </button>
        {/* 새로고침으로도 안 풀리는 불편 → CX 챗봇으로 접수(라우터 밖이라 a 태그). */}
        {!chunk && (
          <a
            href={`/support?context=${encodeURIComponent(
              `${window.location.pathname} 화면 오류: ${this.state.error?.message ?? "unknown"}`.slice(0, 300),
            )}`}
            className="text-xs text-muted-foreground underline underline-offset-2"
          >
            계속 안 되면 고객센터에 알려주세요 →
          </a>
        )}
      </div>
    );
  }
}

export default ErrorBoundary;
