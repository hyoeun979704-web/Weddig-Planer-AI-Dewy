import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { isNativeApp } from "@/lib/platform";
import { onWidgetNav } from "@/lib/native/widgetNav";
import { syncWidgets } from "@/lib/native/widgetSnapshot";

// 홈 위젯 ↔ 앱 다리. 라우터 안에서: ① 위젯 탭/바로추가 딥링크를 navigate ② 앱 진입·resume 시
// 위젯 스냅샷 동기화. 웹에선 완전 no-op. 설계: docs/widget-system.md.
const WidgetBridgeHost = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // 위젯 딥링크(app.dewy://schedule 등) → 라우터 이동. 콜드스타트 보관분도 구독 즉시 전달됨.
  useEffect(() => {
    if (!isNativeApp()) return;
    return onWidgetNav((path) => navigate(path));
  }, [navigate]);

  // 스냅샷 갱신 시점: ① 진입(mount) ② pause(앱을 떠나 위젯을 보는 순간 — 최신값 푸시)
  // ③ resume(복귀). pause 푸시가 "할 일 추가 → 홈으로 나가 위젯 확인" 경로를 덮는다.
  useEffect(() => {
    if (!isNativeApp() || !user) return;
    void syncWidgets(user.id);

    const removers: Array<() => void> = [];
    void import("@capacitor/app").then(({ App }) => {
      for (const ev of ["pause", "resume"] as const) {
        const handle = App.addListener(ev, () => void syncWidgets(user.id));
        removers.push(() => void handle.then((h) => h.remove()));
      }
    });
    return () => removers.forEach((r) => r());
  }, [user]);

  return null;
};

export default WidgetBridgeHost;
