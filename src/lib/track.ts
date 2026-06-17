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
      // user_events 는 아직 supabase types.ts 에 미반영 — 다른 후속 테이블
      // (guest_list_items, budget_settings 등) 과 동일한 (supabase as any)
      // 패턴으로 통일.
      const { error } = await (supabase as any)
        .from("user_events")
        .insert({
          user_id: userId,
          event_name: name,
          properties: properties ?? {},
        });
      if (error) {
        console.warn("trackEvent insert failed", name, error.message);
      }
    } catch (e) {
      console.warn("trackEvent failed", name, e);
    }
  }, 0);
};

/** 홈→서비스 전환 퍼널 이벤트의 properties 형태(순수 — 테스트용). */
export const buildHomeNavProps = (
  source: string,
  target: string,
  extra?: Record<string, unknown>,
): Record<string, unknown> => ({ source, target, ...(extra ?? {}) });

/**
 * 홈 화면의 서비스 진입 CTA 클릭 측정. source=홈 섹션 식별자, target=이동 라우트.
 * 기존 trackEvent/user_events 인프라 재사용(새 테이블 없음) — navigate 직전에 호출.
 * 이게 깔려야 "홈의 어느 진입점이 전환되고 어디서 이탈하나"를 데이터로 본다.
 */
export const trackHomeNav = (
  source: string,
  target: string,
  extra?: Record<string, unknown>,
): void => {
  trackEvent("home_nav_click", buildHomeNavProps(source, target, extra));
};
