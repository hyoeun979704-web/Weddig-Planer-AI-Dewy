-- couple-diary-photos 스토리지: 커플 파트너도 상대 폴더 사진을 읽게 허용.
--
-- 문제(260624 감사): 사진은 `{author_id}/...` 경로에 저장되는데, SELECT 정책이
-- 본인 폴더로만 제한(20260225074751)돼 있어 파트너는 객체 서명 URL 을 재발급할
-- 수 없었다. 그래서 코드가 업로드 시점에 7일 서명 URL 을 DB(photo_url)에 박아두고
-- 렌더했는데, 7일이 지나면 URL 이 만료돼 **양쪽 모두 사진이 깨졌다**(조회 시점
-- 재서명이 불가능했던 근본 원인).
--
-- 해결: 본인 폴더 + "현재 linked 파트너의 폴더"까지 SELECT 허용. 이러면 클라가
-- 조회 시점에 storage_path 로 서명 URL 을 재발급할 수 있어 만료 문제가 사라지고,
-- 언링크 시에는 is_couple_partner 가 false 가 되어 파트너 접근이 즉시 끊긴다
-- (couple_diary_photos 테이블 RLS 의 is_couple_member 게이트와 일관).
--
-- 폴더명 1번째 세그먼트(author_id)는 항상 uuid 형식(업로드 경로가 `${user.id}/...`)
-- 이라 캐스팅 안전. 정책은 이 버킷에만 적용.

DROP POLICY IF EXISTS "Users can view own folder diary photos" ON storage.objects;
DROP POLICY IF EXISTS "Couple members can view diary photos storage" ON storage.objects;
CREATE POLICY "Couple members can view diary photos storage"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'couple-diary-photos'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.is_couple_partner(((storage.foldername(name))[1])::uuid)
    )
  );
