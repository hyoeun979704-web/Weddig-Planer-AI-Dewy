-- Catalog buckets are publicly readable, but only admins may manage objects.
-- The invitation system migration created the public read policies and omitted
-- the matching admin write policies used by the admin catalog screens.

DROP POLICY IF EXISTS "invitation_catalog_admin_insert" ON storage.objects;
CREATE POLICY "invitation_catalog_admin_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id IN ('invitation-templates', 'invitation-assets', 'invitation-fonts')
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "invitation_catalog_admin_update" ON storage.objects;
CREATE POLICY "invitation_catalog_admin_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id IN ('invitation-templates', 'invitation-assets', 'invitation-fonts')
  AND public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  bucket_id IN ('invitation-templates', 'invitation-assets', 'invitation-fonts')
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "invitation_catalog_admin_delete" ON storage.objects;
CREATE POLICY "invitation_catalog_admin_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id IN ('invitation-templates', 'invitation-assets', 'invitation-fonts')
  AND public.has_role(auth.uid(), 'admin'::app_role)
);
