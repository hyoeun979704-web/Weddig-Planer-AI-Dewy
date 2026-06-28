import { createRoot } from "react-dom/client";
import App from "./App";
// 소비자 앱과 동일한 디자인 토큰·Tailwind 베이스를 공유한다(단일 소스).
import "@/index.css";
import { getPlatform } from "@/lib/platform";
import { installGlobalErrorLogging } from "@/lib/errorLog";

// 안전영역/플랫폼 클래스(소비자 앱과 동일 처리). 네이티브 플러그인 init(딥링크·푸시·safeArea)은
// 4-B2(네이티브 패키징)에서 추가한다 — 이 스캐폴드는 웹 우선.
if (typeof document !== "undefined") {
  document.documentElement.classList.add(`platform-${getPlatform()}`);
}
installGlobalErrorLogging();

createRoot(document.getElementById("root")!).render(<App />);
