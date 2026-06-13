-- 범용 인앱 알림 — 커뮤니티 전용(community_notifications, post/comment FK)과 별개로
-- 기업 승인·시스템 안내 등 도메인 무관 알림을 담는다.
-- 클라 직접 INSERT 금지(위조 방지) → SECURITY DEFINER 트리거/함수만 생성. 읽기/읽음/삭제는 본인만.

CREATE TABLE IF NOT EXISTS public.app_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (char_length(type) <= 40),
  title text NOT NULL CHECK (char_length(title) <= 200),
  body text CHECK (body IS NULL OR char_length(body) <= 1000),
  link text CHECK (link IS NULL OR char_length(link) <= 300),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_notifications_recipient_idx
  ON public.app_notifications (recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS app_notifications_unread_idx
  ON public.app_notifications (recipient_id) WHERE read_at IS NULL;

ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;

-- 본인 알림만 읽기/읽음처리/삭제. INSERT 정책은 두지 않음 → 클라 위조 불가
-- (SECURITY DEFINER 트리거는 RLS 우회하므로 생성 가능).
DROP POLICY IF EXISTS "own notifications read" ON public.app_notifications;
CREATE POLICY "own notifications read" ON public.app_notifications
  FOR SELECT TO authenticated USING (recipient_id = auth.uid());

DROP POLICY IF EXISTS "own notifications update" ON public.app_notifications;
CREATE POLICY "own notifications update" ON public.app_notifications
  FOR UPDATE TO authenticated USING (recipient_id = auth.uid()) WITH CHECK (recipient_id = auth.uid());

DROP POLICY IF EXISTS "own notifications delete" ON public.app_notifications;
CREATE POLICY "own notifications delete" ON public.app_notifications
  FOR DELETE TO authenticated USING (recipient_id = auth.uid());

-- 기업회원 승인/반려 시 사장님에게 알림 — approval_status 가 실제로 바뀔 때만.
CREATE OR REPLACE FUNCTION public.notify_on_business_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.approval_status IS DISTINCT FROM OLD.approval_status
     AND NEW.approval_status IN ('approved', 'rejected')
     AND NEW.user_id IS NOT NULL THEN
    INSERT INTO public.app_notifications (recipient_id, type, title, body, link)
    VALUES (
      NEW.user_id,
      'business_' || NEW.approval_status,
      CASE WHEN NEW.approval_status = 'approved'
           THEN '기업회원 승인 완료 🎉'
           ELSE '기업회원 신청 결과 안내' END,
      CASE WHEN NEW.approval_status = 'approved'
           THEN COALESCE(NEW.business_name, '회원') || '님, 입점이 승인되었어요. 이제 대시보드를 이용할 수 있어요.'
           ELSE COALESCE(NEW.review_note, '신청이 반려되었어요. 자세한 내용은 고객센터로 문의해 주세요.') END,
      CASE WHEN NEW.approval_status = 'approved'
           THEN '/business/dashboard'
           ELSE '/business/onboard' END
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_business_review ON public.business_profiles;
CREATE TRIGGER trg_notify_on_business_review
  AFTER UPDATE ON public.business_profiles
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_business_review();
