-- 커뮤니티 모더레이션 인프라
--
-- Play Store / 일반 UGC 정책상 사용자 생성 콘텐츠가 있는 앱은
-- 신고·차단 기능과 그것을 처리할 운영 흐름이 있어야 한다.
-- 이 마이그레이션은 그 백엔드 테이블·정책만 깐다 (UI 연동은 별도).
--
-- 추가되는 테이블:
--   1) community_reports — 신고 접수함
--   2) user_blocks       — 사용자 간 차단 관계
--
-- 둘 다 RLS 켜져 있고, 본인 행만 본인이 조작.
-- 어드민(`has_role(uid, 'admin')`) 은 신고 테이블 전부 조회·갱신 가능.

-- ============================================================================
-- 1. community_reports
-- ============================================================================

CREATE TABLE public.community_reports (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type   text NOT NULL CHECK (target_type IN ('post', 'comment')),
  target_id     uuid NOT NULL,
  reason_code   text NOT NULL CHECK (reason_code IN (
                  'spam',          -- 스팸·광고
                  'abuse',         -- 욕설·괴롭힘
                  'sexual',        -- 음란
                  'misinformation',-- 허위정보
                  'illegal',       -- 불법 콘텐츠
                  'other'
                )),
  reason_text   text,              -- 자유 서술 (선택)
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN (
                  'pending',       -- 접수 직후
                  'reviewing',     -- 어드민 확인 중
                  'actioned',      -- 조치 완료 (삭제·경고 등)
                  'dismissed'      -- 신고 기각
                )),
  resolved_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),

  -- 같은 사람이 같은 대상에 중복 신고 못 함
  UNIQUE (reporter_id, target_type, target_id)
);

CREATE INDEX idx_community_reports_target ON public.community_reports(target_type, target_id);
CREATE INDEX idx_community_reports_status ON public.community_reports(status) WHERE status IN ('pending', 'reviewing');

ALTER TABLE public.community_reports ENABLE ROW LEVEL SECURITY;

-- 본인 신고 INSERT 가능 (자기 자신을 reporter 로)
CREATE POLICY "users_insert_own_reports"
ON public.community_reports
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = reporter_id);

-- 본인이 낸 신고 SELECT 가능 (내가 신고한 거 확인 용)
CREATE POLICY "users_select_own_reports"
ON public.community_reports
FOR SELECT
TO authenticated
USING (auth.uid() = reporter_id);

-- 어드민은 모든 신고 SELECT
CREATE POLICY "admin_select_all_reports"
ON public.community_reports
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 어드민은 status / resolved_* 갱신 가능
CREATE POLICY "admin_update_reports"
ON public.community_reports
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

COMMENT ON TABLE public.community_reports IS
  '커뮤니티 게시글·댓글 신고 접수함. 사용자 INSERT, 어드민 검토.';


-- ============================================================================
-- 2. user_blocks
-- ============================================================================

CREATE TABLE public.user_blocks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),

  -- 자기 자신은 못 막음, 같은 사람 중복 차단도 못함
  CHECK (blocker_id <> blocked_id),
  UNIQUE (blocker_id, blocked_id)
);

CREATE INDEX idx_user_blocks_blocker ON public.user_blocks(blocker_id);
CREATE INDEX idx_user_blocks_blocked ON public.user_blocks(blocked_id);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

-- 본인이 만든 차단만 CRUD 가능
CREATE POLICY "users_manage_own_blocks_insert"
ON public.user_blocks
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "users_manage_own_blocks_select"
ON public.user_blocks
FOR SELECT
TO authenticated
USING (auth.uid() = blocker_id);

CREATE POLICY "users_manage_own_blocks_delete"
ON public.user_blocks
FOR DELETE
TO authenticated
USING (auth.uid() = blocker_id);

COMMENT ON TABLE public.user_blocks IS
  '사용자 간 차단 관계. blocker 가 blocked 의 콘텐츠를 피드에서 안 보고 싶을 때.
   피드 쿼리에서 NOT EXISTS 서브쿼리로 필터링하는 게 표준 사용법.';


-- ============================================================================
-- 3. 헬퍼 뷰 — 어드민 대시보드용 (신고 + 대상 미리보기)
-- ============================================================================

CREATE OR REPLACE VIEW public.admin_reports_overview AS
SELECT
  r.id              AS report_id,
  r.reporter_id,
  r.target_type,
  r.target_id,
  r.reason_code,
  r.reason_text,
  r.status,
  r.created_at      AS reported_at,
  r.resolved_at,
  CASE r.target_type
    WHEN 'post'    THEN (SELECT title FROM public.community_posts WHERE id = r.target_id)
    WHEN 'comment' THEN (SELECT LEFT(content, 80) FROM public.community_comments WHERE id = r.target_id)
  END               AS target_preview,
  CASE r.target_type
    WHEN 'post'    THEN (SELECT user_id FROM public.community_posts WHERE id = r.target_id)
    WHEN 'comment' THEN (SELECT user_id FROM public.community_comments WHERE id = r.target_id)
  END               AS target_author_id
FROM public.community_reports r;

-- 뷰는 어드민만 SELECT (RLS 는 underlying table 의 admin_select_all_reports 가 처리).
REVOKE ALL ON public.admin_reports_overview FROM PUBLIC;
GRANT SELECT ON public.admin_reports_overview TO authenticated;

COMMENT ON VIEW public.admin_reports_overview IS
  '신고 + 대상(게시글·댓글) 미리보기를 한 줄로 묶은 어드민 대시보드용 뷰.';
