-- profiles.phone: 마이페이지 연락처 입력 필드 백엔드.
-- Profile.tsx 가 select/update 하던 컬럼인데 DB 에 없어 프로필 로드가 PostgREST 400
-- 으로 실패하던 회귀를 해소한다. 선택 입력(nullable).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT;

COMMENT ON COLUMN public.profiles.phone IS
  '사용자 연락처(선택). 마이페이지에서 직접 입력. 형식 검증은 클라이언트 측.';
