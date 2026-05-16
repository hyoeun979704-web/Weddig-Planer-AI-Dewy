import { supabase } from "@/integrations/supabase/client";

/**
 * 페르소나 v2 회고 권고 3번 — 측정 이벤트 헬퍼.
 *
 * 호출은 fire-and-forget: 실패해도 사용자 경험에 영향 주지 않도록 awaiting
 * 하지 않고 에러도 콘솔에만 남긴다. 인증되지 않은 사용자에서는 조용히 패스
 * (RLS 정책상 어차피 INSERT 실패).
 *
 * 사용 예:
 *   trackEvent("persona_dashboard_view");
 *   trackEvent("value_tag_click", { tag: "친환경", state: "active" });
 *
 * 이벤트 이름 컨벤션: snake_case, 60자 이내, 동사 후행(`_view`, `_toggle`,
 * `_click`, `_added`, `_changed`).
 */
export const trackEvent = (
  name: string,
  properties?: Record<string, unknown>,
): void => {
  // setTimeout 0 — 호출 자리에서 UI 업데이트가 완전히 끝난 다음 비동기로
  // 실행되어, 라우팅·렌더 부담을 늘리지 않는다.
  setTimeout(async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;
      if (!userId) return;
      const { error } = await supabase
        .from("user_events" as never)
        .insert({
          user_id: userId,
          event_name: name,
          properties: properties ?? {},
        } as never);
      if (error) {
        console.warn("trackEvent insert failed", name, error.message);
      }
    } catch (e) {
      console.warn("trackEvent failed", name, e);
    }
  }, 0);
};
