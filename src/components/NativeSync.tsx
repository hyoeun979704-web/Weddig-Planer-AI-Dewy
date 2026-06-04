import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import { useBudget } from "@/hooks/useBudget";
import { isNativeApp } from "@/lib/platform";
import {
  buildDdayPlan,
  buildSchedulePlan,
  buildBudgetPlan,
  type PlannedNotification,
} from "@/lib/notifications/schedulePlan";
import { buildWidgetPayload } from "@/lib/notifications/widgetData";
import {
  rescheduleLocalNotifications,
  registerLocalTapHandler,
} from "@/lib/native/localNotifications";
import { initPushNotifications, refreshPushRegistration } from "@/lib/native/pushNotifications";
import { syncWidgets } from "@/lib/native/widgetSync";
import {
  setNotificationNavigator,
  clearNotificationNavigator,
} from "@/lib/native/notificationRouter";

/**
 * 네이티브 동기화 허브 — Router 내부에 1회 마운트(렌더 없음).
 *
 * 책임:
 *  1) 알림/위젯 탭 → 앱 내 라우팅 navigator 등록.
 *  2) 푸시 초기화(토큰 등록) + 로컬 알림 탭 핸들러 등록.
 *  3) 예식일/일정/예산 데이터가 바뀔 때마다 로컬 알림 재예약 + 위젯 갱신.
 *  4) 앱 resume 시 재동기화.
 *
 * 웹에서는 isNativeApp() 가드로 전부 no-op.
 */
const NativeSync = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { weddingSettings, scheduleItems } = useWeddingSchedule();
  const { summary, settings: budgetSettings } = useBudget();

  // 탭 → 라우팅 navigator 등록(콜드스타트 pending 도 흘려보냄).
  useEffect(() => {
    const fn = (route: string) => navigate(route);
    setNotificationNavigator(fn);
    return () => clearNotificationNavigator(fn);
  }, [navigate]);

  // 부팅 시 1회: 로컬 탭 핸들러 + 푸시 초기화.
  useEffect(() => {
    if (!isNativeApp()) return;
    void registerLocalTapHandler();
    void initPushNotifications();
  }, []);

  // 로그인 상태 변화 시 푸시 토큰을 사용자에 재바인딩.
  useEffect(() => {
    if (!isNativeApp() || !user) return;
    void refreshPushRegistration();
  }, [user]);

  const weddingDate = weddingSettings.wedding_date;
  const hasBudget = !!budgetSettings && summary.totalSpent >= 0;
  // 일정 항목 변화 감지용 시그니처 — 의존성 배열에 인라인 표현식을 넣지 않기 위해 분리.
  const scheduleSignature = JSON.stringify(
    scheduleItems.map((i) => [i.id, i.scheduled_date, i.completed, i.title]),
  );

  // 최신 데이터로 로컬 알림 재예약 + 위젯 갱신. resume 리스너가 stale 클로저를
  // 잡지 않도록 ref 에 최신 구현을 보관하고, 리스너는 ref 만 호출한다.
  const runSyncRef = useRef<() => void>(() => {});
  runSyncRef.current = () => {
    if (!isNativeApp()) return;
    const now = new Date();
    const plans: PlannedNotification[] = [
      ...buildDdayPlan(weddingDate, now),
      ...buildSchedulePlan(scheduleItems, now),
      ...buildBudgetPlan({ remaining: budgetSettings ? summary.remaining : null }, now),
    ];
    void rescheduleLocalNotifications(plans);
    void syncWidgets(
      buildWidgetPayload(
        weddingDate,
        scheduleItems,
        hasBudget
          ? {
              spent: summary.totalSpent,
              total: budgetSettings?.total_budget ?? 0,
              remaining: summary.remaining,
            }
          : null,
        now,
      ),
    );
  };

  // 데이터 변경 시 동기화. 원시값으로 의존성 고정(객체는 매 렌더 새 참조).
  useEffect(() => {
    runSyncRef.current();
  }, [
    weddingDate,
    scheduleSignature,
    summary.totalSpent,
    summary.remaining,
    budgetSettings?.total_budget,
  ]);

  // resume 시 재동기화(백그라운드 동안의 날짜 경과 반영). 리스너는 1회만 등록하고
  // 최신 데이터는 ref 로 읽어 누수/stale 클로저를 피한다.
  useEffect(() => {
    if (!isNativeApp()) return;
    let handle: { remove: () => Promise<void> } | undefined;
    let cancelled = false;
    void (async () => {
      const { App: CapApp } = await import("@capacitor/app");
      const h = await CapApp.addListener("resume", () => runSyncRef.current());
      if (cancelled) void h.remove();
      else handle = h;
    })();
    return () => {
      cancelled = true;
      void handle?.remove();
    };
  }, []);

  return null;
};

export default NativeSync;
