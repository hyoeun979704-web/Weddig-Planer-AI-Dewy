import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { isNativeApp } from "./lib/platform";

// Capacitor 네이티브 컨테이너에서만 딥링크/resume 훅을 동적 로드한다.
// 동적 import 로 묶어두면 웹 번들에는 @capacitor/app 코드가 들어가지 않는다.
if (isNativeApp()) {
  void (async () => {
    const [{ registerDeepLinks }, { App: CapApp }] = await Promise.all([
      import("./lib/native/deepLink"),
      import("@capacitor/app"),
    ]);
    registerDeepLinks();

    // WebView 가 백그라운드에서 JS 타이머를 throttle 하므로
    // autoRefreshToken 만 믿지 않고 resume 마다 한 번 명시 갱신한다.
    void CapApp.addListener("resume", async () => {
      const { supabase } = await import("./integrations/supabase/client");
      void supabase.auth.refreshSession();
    });
  })();
}

createRoot(document.getElementById("root")!).render(<App />);
