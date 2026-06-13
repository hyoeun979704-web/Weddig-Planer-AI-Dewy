-- 커뮤니티 운영자 전용 공지사항. 운영자만 작성/수정/삭제, 사용자는 활성 공지 읽기만.
-- 커뮤니티 상단에 고정 노출(pinned 우선, 최신순). 멱등 작성.

CREATE TABLE IF NOT EXISTS public.community_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 노출 정렬용: 활성 공지를 pinned 우선 → 최신순.
CREATE INDEX IF NOT EXISTS idx_community_announcements_active
  ON public.community_announcements(is_active, pinned DESC, created_at DESC);

ALTER TABLE public.community_announcements ENABLE ROW LEVEL SECURITY;

-- 사용자: 활성 공지 읽기만.
DROP POLICY IF EXISTS "announcements public read" ON public.community_announcements;
CREATE POLICY "announcements public read" ON public.community_announcements
  FOR SELECT USING (is_active);

-- 운영자: 전체 권한(작성/수정/삭제). has_role 은 기존 정책들과 동일한 SECURITY DEFINER 헬퍼.
DROP POLICY IF EXISTS "announcements admin all" ON public.community_announcements;
CREATE POLICY "announcements admin all" ON public.community_announcements
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- updated_at 자동 갱신 트리거(기존 set_updated_at 헬퍼 재사용).
DROP TRIGGER IF EXISTS trg_community_announcements_updated ON public.community_announcements;
CREATE TRIGGER trg_community_announcements_updated
  BEFORE UPDATE ON public.community_announcements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
