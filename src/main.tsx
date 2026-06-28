import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { getPlatform, isNativeApp } from "./lib/platform";
import { installGlobalErrorLogging } from "./lib/errorLog";

// 안전영역(상태바/노치) 소스를 플랫폼별로 고르도록 <html> 에 플랫폼 클래스를 부여한다.
// index.css 기본은 env(safe-area-inset-*)(iOS/웹), .platform-android 는 네이티브 실측값.
// 동기 실행이라 첫 페인트부터 적용 → 헤더가 시스템바에 겹쳐 보이는 깜빡임 없음.
if (typeof document !== "undefined") {
  document.documentElement.classList.add(`platform-${getPlatform()}`);
}

// 전역 미처리 오류/리젝션을 운영자 어드민(client_error_logs)으로 수집 — 프로덕션 관측.
installGlobalErrorLogging();

// Capacitor 네이티브 컨테이너에서만 딥링크/resume 훅을 동적 로드한다.
// 동적 import 로 묶어두면 웹 번들에는 @capacitor/app 코드가 들어가지 않는다.
if (isNativeApp()) {
  void (async () => {
    const [{ registerDeepLinks }, { App: CapApp }] = await Promise.all([
      import("./lib/native/deepLink"),
      import("@capacitor/app"),
    ]);
    registerDeepLinks();

    // 네이티브(안드로이드·iOS) 상태바 안전영역 + 스타일(edge-to-edge, 어두운 아이콘).
    void import("./lib/native/safeArea").then(({ initNativeSafeArea }) => initNativeSafeArea());

    // WebView 가 백그라운드에서 JS 타이머를 throttle 하므로
    // autoRefreshToken 만 믿지 않고 resume 마다 한 번 명시 갱신한다.
    void CapApp.addListener("resume", async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      void supabase.auth.refreshSession();
    });
  })();
}

createRoot(document.getElementById("root")!).render(<App />);
