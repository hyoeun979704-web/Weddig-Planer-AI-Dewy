-- 감사 260624 P0 교정 — 회원탈퇴 시 사용자 소유 DB 행 파기.
-- 실DB 확인 결과: auth.users 를 참조하는 FK 가 **하나도 없어** ON DELETE CASCADE 가 전혀 동작하지
-- 않는다(delete-account 의 "CASCADE 로 삭제" 주석은 사실과 다름). 탈퇴해도 커뮤니티 글·댓글, 프로필,
-- 일정·예산·AI 기록 등 user_id 보유 67개 테이블이 전부 고아로 잔존 → 개인정보보호법 파기의무 위반.
--
-- 정책(분류):
--  · 개인 콘텐츠/식별정보 → DELETE(아래).
--  · 금융·거래·법적 보존 대상 → **보존(미삭제)**: payments, orders, heart_transactions,
--    point_transactions, billing_attempts, subscriptions, design_purchases,
--    design_purchase_intents, user_hearts, user_points, user_consents.
--    (전자상거래법 등 거래기록 보존의무. 보존 레코드의 PII 익명화는 후속 과제 — 본 RPC 범위 밖.)
--  ⚠️ 위 보존/삭제 분류는 운영 정책 선택이다. 프로덕션 적용 전 법무 기준 확인 권장.
--
-- service_role(delete-account edge)만 호출. 본인 식별은 edge 가 getUser(token) 으로 선검증.
CREATE OR REPLACE FUNCTION public.delete_user_data(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 커뮤니티(자식 → 부모 순서로 안전 삭제)
  DELETE FROM public.community_comment_likes WHERE user_id = p_user_id;
  DELETE FROM public.community_likes         WHERE user_id = p_user_id;
  DELETE FROM public.community_comments      WHERE user_id = p_user_id;
  DELETE FROM public.community_posts         WHERE user_id = p_user_id;

  -- AI 생성물·사용량·메모리
  DELETE FROM public.ai_chat_messages          WHERE user_id = p_user_id;
  DELETE FROM public.ai_chat_sessions          WHERE user_id = p_user_id;
  DELETE FROM public.ai_usage_daily            WHERE user_id = p_user_id;
  DELETE FROM public.ai_usage_minute           WHERE user_id = p_user_id;
  DELETE FROM public.user_ai_memory            WHERE user_id = p_user_id;
  DELETE FROM public.dress_fittings            WHERE user_id = p_user_id;
  DELETE FROM public.makeup_fittings           WHERE user_id = p_user_id;
  DELETE FROM public.hair_preview_jobs         WHERE user_id = p_user_id;
  DELETE FROM public.hair_preview_usage        WHERE user_id = p_user_id;
  DELETE FROM public.photo_retouch_jobs        WHERE user_id = p_user_id;
  DELETE FROM public.photo_retouch_usage       WHERE user_id = p_user_id;
  DELETE FROM public.wedding_consulting_reports WHERE user_id = p_user_id;
  DELETE FROM public.wedding_consulting_usage   WHERE user_id = p_user_id;

  -- 준비도구·계획·취향
  DELETE FROM public.budget_items         WHERE user_id = p_user_id;
  DELETE FROM public.budget_settings      WHERE user_id = p_user_id;
  DELETE FROM public.user_schedule_items  WHERE user_id = p_user_id;
  DELETE FROM public.user_events          WHERE user_id = p_user_id;
  DELETE FROM public.vendor_board_items   WHERE user_id = p_user_id;
  DELETE FROM public.guest_list_items     WHERE user_id = p_user_id;
  DELETE FROM public.couple_votes         WHERE user_id = p_user_id;
  DELETE FROM public.couple_links         WHERE user_id = p_user_id;
  DELETE FROM public.user_wedding_settings WHERE user_id = p_user_id;
  DELETE FROM public.favorites            WHERE user_id = p_user_id;
  DELETE FROM public.game_scores          WHERE user_id = p_user_id;
  DELETE FROM public.user_attendance      WHERE user_id = p_user_id;
  DELETE FROM public.tutorial_completions WHERE user_id = p_user_id;

  -- 청첩장(소유) — 하객/게스트 사진 row 는 invitation FK 로 정리되거나 별도 cleanup 대상
  DELETE FROM public.invitations WHERE user_id = p_user_id;

  -- 문의·견적·리뷰·클레임·신청
  DELETE FROM public.inquiries               WHERE user_id = p_user_id;
  DELETE FROM public.place_inquiries         WHERE user_id = p_user_id;
  DELETE FROM public.place_reviews           WHERE user_id = p_user_id;
  DELETE FROM public.place_claims            WHERE user_id = p_user_id;
  DELETE FROM public.quote_requests          WHERE user_id = p_user_id;
  DELETE FROM public.partnership_applications WHERE user_id = p_user_id;
  DELETE FROM public.service_waitlist        WHERE user_id = p_user_id;

  -- 행동로그·마케팅·장바구니
  DELETE FROM public.product_clicks    WHERE user_id = p_user_id;
  DELETE FROM public.view_events       WHERE user_id = p_user_id;
  DELETE FROM public.client_error_logs WHERE user_id = p_user_id;
  DELETE FROM public.deal_claims       WHERE user_id = p_user_id;
  DELETE FROM public.coupon_downloads  WHERE user_id = p_user_id;
  DELETE FROM public.referral_codes    WHERE user_id = p_user_id;
  DELETE FROM public.cart_items        WHERE user_id = p_user_id;

  -- 외부 연동(OAuth 상태·계정 토큰)
  DELETE FROM public.calendar_event_links   WHERE user_id = p_user_id;
  DELETE FROM public.calendar_oauth_states  WHERE user_id = p_user_id;
  DELETE FROM public.user_calendar_accounts WHERE user_id = p_user_id;
  DELETE FROM public.drive_oauth_states     WHERE user_id = p_user_id;
  DELETE FROM public.user_drive_accounts    WHERE user_id = p_user_id;
  DELETE FROM public.mail_oauth_states      WHERE user_id = p_user_id;
  DELETE FROM public.user_mail_accounts     WHERE user_id = p_user_id;

  -- 역할·기업프로필·핵심 프로필(마지막)
  DELETE FROM public.user_roles        WHERE user_id = p_user_id;
  DELETE FROM public.business_profiles WHERE user_id = p_user_id;
  DELETE FROM public.profiles          WHERE user_id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_data(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_data(uuid) TO service_role;

COMMENT ON FUNCTION public.delete_user_data(uuid) IS
  '회원탈퇴 시 사용자 개인 콘텐츠/식별정보 파기(금융·거래·동의 기록은 법적 보존). delete-account edge 전용, service_role only.';
