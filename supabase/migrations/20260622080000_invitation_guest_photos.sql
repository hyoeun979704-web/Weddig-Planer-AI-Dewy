-- 하객 사진 수집 — 식 후 하객이 청첩장 링크로 사진을 올리면 커플이 한꺼번에 받는다.
-- RSVP 와 동일한 "익명 → 발행된 청첩장에만" 게이트. edge function 없이 RLS 로만 구현.
-- 멱등(재실행 안전): IF NOT EXISTS / DROP POLICY IF EXISTS / ON CONFLICT.

-- ── 스토리지 버킷(비공개) ───────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('guest-photos','guest-photos', false, 20971520,
        ARRAY['image/jpeg','image/png','image/webp','image/heic','image/heif'])
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ── 테이블 ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invitation_guest_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id UUID NOT NULL REFERENCES public.invitations(id) ON DELETE CASCADE,
  uploader_name TEXT,
  storage_path TEXT NOT NULL,
  content_type TEXT,
  size_bytes BIGINT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.invitation_guest_photos
  DROP CONSTRAINT IF EXISTS guest_photos_name_check,
  DROP CONSTRAINT IF EXISTS guest_photos_path_check;
ALTER TABLE public.invitation_guest_photos
  ADD CONSTRAINT guest_photos_name_check
    CHECK (uploader_name IS NULL OR char_length(uploader_name) <= 40),
  ADD CONSTRAINT guest_photos_path_check
    CHECK (char_length(storage_path) BETWEEN 1 AND 400);

CREATE INDEX IF NOT EXISTS idx_guest_photos_invitation
  ON public.invitation_guest_photos(invitation_id);

ALTER TABLE public.invitation_guest_photos ENABLE ROW LEVEL SECURITY;

-- 정책 1: 익명 포함 누구나 추가 — 단 '발행된' 청첩장에만(RSVP 와 동일 게이트).
DROP POLICY IF EXISTS "Anyone can add guest photo" ON public.invitation_guest_photos;
CREATE POLICY "Anyone can add guest photo"
ON public.invitation_guest_photos FOR INSERT TO public
WITH CHECK (
  EXISTS (SELECT 1 FROM public.invitations i
          WHERE i.id = public.invitation_guest_photos.invitation_id
            AND i.status = 'published')
);

-- 정책 2: 조회는 소유자 + 연결된 배우자(I8-A 공유).
DROP POLICY IF EXISTS "Couple can view guest photos" ON public.invitation_guest_photos;
CREATE POLICY "Couple can view guest photos"
ON public.invitation_guest_photos FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.invitations i
          WHERE i.id = public.invitation_guest_photos.invitation_id
            AND (i.user_id = auth.uid() OR public.is_couple_partner(i.user_id)))
);

-- 정책 3: 삭제도 소유자 + 배우자.
DROP POLICY IF EXISTS "Couple can delete guest photos" ON public.invitation_guest_photos;
CREATE POLICY "Couple can delete guest photos"
ON public.invitation_guest_photos FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.invitations i
          WHERE i.id = public.invitation_guest_photos.invitation_id
            AND (i.user_id = auth.uid() OR public.is_couple_partner(i.user_id)))
);

-- 스팸 방어: 청첩장당 상한.
CREATE OR REPLACE FUNCTION public.check_guest_photo_cap()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (SELECT count(*) FROM public.invitation_guest_photos
      WHERE invitation_id = NEW.invitation_id) >= 3000 THEN
    RAISE EXCEPTION 'guest_photo_limit_reached';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guest_photo_cap ON public.invitation_guest_photos;
CREATE TRIGGER trg_guest_photo_cap
BEFORE INSERT ON public.invitation_guest_photos
FOR EACH ROW EXECUTE FUNCTION public.check_guest_photo_cap();

-- ── 스토리지 RLS(storage.objects, 버킷 guest-photos) ────────────────────────
-- 경로 = '{invitation_id}/{uuid}.ext'. 첫 폴더가 발행된 청첩장 id 여야 익명 업로드 허용.
-- id 캐스팅 오류 방지 위해 i.id::text 로 비교.
DROP POLICY IF EXISTS "Guest upload to published invitation" ON storage.objects;
CREATE POLICY "Guest upload to published invitation"
ON storage.objects FOR INSERT TO public
WITH CHECK (
  bucket_id = 'guest-photos'
  AND EXISTS (
    SELECT 1 FROM public.invitations i
    WHERE i.id::text = (storage.foldername(name))[1]
      AND i.status = 'published'
  )
);

DROP POLICY IF EXISTS "Couple read guest photos storage" ON storage.objects;
CREATE POLICY "Couple read guest photos storage"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'guest-photos'
  AND EXISTS (
    SELECT 1 FROM public.invitations i
    WHERE i.id::text = (storage.foldername(name))[1]
      AND (i.user_id = auth.uid() OR public.is_couple_partner(i.user_id))
  )
);

DROP POLICY IF EXISTS "Couple delete guest photos storage" ON storage.objects;
CREATE POLICY "Couple delete guest photos storage"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'guest-photos'
  AND EXISTS (
    SELECT 1 FROM public.invitations i
    WHERE i.id::text = (storage.foldername(name))[1]
      AND (i.user_id = auth.uid() OR public.is_couple_partner(i.user_id))
  )
);
