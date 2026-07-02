-- 감사 260702 후속 — 회원탈퇴 파기 커버리지 보강(개인정보보호법 파기의무).
-- 실DB 대조(public 베이스 테이블 147개 × user 참조 컬럼 × FK confdeltype)에서 발견된 누락:
--  · 파트너측 커플 데이터: couple_links 가 단일행 모델(user_id|partner_user_id)인데 기존 RPC 는
--    user_id 만 지워 **partner 측이 탈퇴하면** 링크·본인 작성 일기(couple_diary)·투표 응답이 잔존.
--  · couple_diary(author_id)·community_notifications(recipient/actor)·quote_messages(sender)·
--    quote_responses/business_coupons/business_events(owner) 는 auth.users FK 자체가 없어
--    cascade 로도 안 지워짐(업체 계정 탈퇴 시 견적 회신·발신 메시지 잔존).
--  · 보존 선언 테이블 8개(heart_transactions·point_transactions·billing_attempts·user_hearts·
--    user_consents·design_purchases·design_purchase_intents·iap_transactions)가 auth.users
--    ON DELETE CASCADE 라 탈퇴(auth.admin.deleteUser) 시 전량 소실 — 20260624120100 의 보존
--    정책(전자상거래법 거래기록 보존·동의 입증)과 정반대. FK 를 끊어 보존한다(행의 user_id 는
--    탈퇴 후 매칭 불가 uuid 로 남아 사실상 가명화; PII 컬럼 익명화는 후속 과제).
--  · product_blocklist.blocked_by FK 가 ON DELETE 규칙 없음(NO ACTION) → 차단 이력을 남긴
--    관리자는 auth 삭제가 FK 위반으로 실패해 탈퇴 자체가 500. SET NULL 로 교정.
--  · community_reports.target_type 확장(20260620040000: +ai_content)이 실DB 미적용 드리프트 —
--    AI 생성물 신고가 CHECK 위반으로 전량 실패 중. 재적용 + 업체후기 신고 'review' 추가
--    (App Store 1.2: 모든 UGC 표면에 신고 수단).
-- ⚠️ 스토리지 파기(sdm/vendor-deliveries)는 delete-account edge 쪽 수정으로 커버(본 마이그 범위 밖).

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
  -- 타인 글에 남은 내 활동 알림(무FK — post/comment cascade 로 안 지워지는 행)
  DELETE FROM public.community_notifications WHERE recipient_id = p_user_id OR actor_id = p_user_id;

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

  -- 커플 데이터 — 단일행 모델이라 양측 모두 파기해야 한다.
  -- 내가 작성한 일기(사진 row 는 diary FK cascade). 내가 링크 소유자(user_id)면 아래
  -- couple_links 삭제 cascade 로도 지워지지만, partner 측 탈퇴는 이 줄이 유일한 파기 경로.
  DELETE FROM public.couple_diary WHERE author_id = p_user_id;
  DELETE FROM public.couple_votes         WHERE user_id = p_user_id;
  -- 파트너로 참여한 투표: 행 소유자는 상대방이므로 행은 남기고 내 응답만 파기(가명화)
  UPDATE public.couple_votes
     SET partner_user_id = NULL, partner_pick = NULL, partner_reason = NULL
   WHERE partner_user_id = p_user_id;
  DELETE FROM public.couple_links         WHERE user_id = p_user_id;
  -- 파트너 측 링크 해제(클라 unlink 와 동일 패턴: status='unlinked' + 참조 제거)
  UPDATE public.couple_links
     SET status = 'unlinked', partner_user_id = NULL
   WHERE partner_user_id = p_user_id;
  DELETE FROM public.user_wedding_settings WHERE user_id = p_user_id;
  -- 남은 파트너의 결혼 설정에서 탈퇴자 참조 제거(dangling uuid 방지)
  UPDATE public.user_wedding_settings
     SET partner_user_id = NULL
   WHERE partner_user_id = p_user_id;
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
  -- 업체(발신자/응답자) 측 탈퇴: 소비자 스레드에 남는 발신 메시지·견적 회신도 파기(무FK)
  DELETE FROM public.quote_messages          WHERE sender_user_id = p_user_id;
  DELETE FROM public.quote_responses         WHERE owner_user_id = p_user_id;
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

  -- 역할·기업프로필·기업 콘텐츠·핵심 프로필(마지막)
  DELETE FROM public.user_roles        WHERE user_id = p_user_id;
  -- 기업 소유 콘텐츠(무FK — 방치 시 탈퇴 업체 쿠폰/이벤트가 소비자에 계속 노출)
  DELETE FROM public.business_coupons  WHERE owner_user_id = p_user_id;
  DELETE FROM public.business_events   WHERE owner_user_id = p_user_id;
  DELETE FROM public.business_profiles WHERE user_id = p_user_id;
  DELETE FROM public.profiles          WHERE user_id = p_user_id;
END;
$$;

-- CREATE OR REPLACE 는 기존 ACL 을 유지하지만, 260702 P0(grant 드리프트) 재발 방지를 위해 명시 재잠금.
REVOKE ALL ON FUNCTION public.delete_user_data(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_user_data(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.delete_user_data(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_data(uuid) TO service_role;

COMMENT ON FUNCTION public.delete_user_data(uuid) IS
  '회원탈퇴 시 사용자 개인 콘텐츠/식별정보 파기(파트너측 커플 데이터·업체측 견적/콘텐츠 포함). 금융·거래·동의 기록은 법적 보존. delete-account edge 전용, service_role only.';

-- ── 보존 대상 거래·동의 기록을 auth 삭제 cascade 에서 분리(FK 해제) ─────────────────
-- 이 8개는 20260624120100 정책상 "보존"인데 실DB FK 가 ON DELETE CASCADE 라 탈퇴 시 소실됐다.
ALTER TABLE public.heart_transactions      DROP CONSTRAINT IF EXISTS heart_transactions_user_id_fkey;
ALTER TABLE public.point_transactions      DROP CONSTRAINT IF EXISTS point_transactions_user_id_fkey;
ALTER TABLE public.billing_attempts        DROP CONSTRAINT IF EXISTS billing_attempts_user_id_fkey;
ALTER TABLE public.user_hearts             DROP CONSTRAINT IF EXISTS user_hearts_user_id_fkey;
ALTER TABLE public.user_consents           DROP CONSTRAINT IF EXISTS user_consents_user_id_fkey;
ALTER TABLE public.design_purchases        DROP CONSTRAINT IF EXISTS design_purchases_user_id_fkey;
ALTER TABLE public.design_purchase_intents DROP CONSTRAINT IF EXISTS design_purchase_intents_user_id_fkey;
ALTER TABLE public.iap_transactions        DROP CONSTRAINT IF EXISTS iap_transactions_user_id_fkey;

-- ── 관리자 탈퇴 차단 FK 교정(NO ACTION → SET NULL) ─────────────────────────────────
ALTER TABLE public.product_blocklist DROP CONSTRAINT IF EXISTS product_blocklist_blocked_by_fkey;
ALTER TABLE public.product_blocklist
  ADD CONSTRAINT product_blocklist_blocked_by_fkey
  FOREIGN KEY (blocked_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ── community_reports.target_type — ai_content 드리프트 재적용 + review 추가 ─────────
ALTER TABLE public.community_reports DROP CONSTRAINT IF EXISTS community_reports_target_type_check;
ALTER TABLE public.community_reports
  ADD CONSTRAINT community_reports_target_type_check
  CHECK (target_type IN ('post', 'comment', 'ai_content', 'review'));
