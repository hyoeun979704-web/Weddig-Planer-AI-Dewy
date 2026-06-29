-- 업체 상세 "자주 묻는 질문"(FAQ) — place 1:N. 골격(스키마+RLS)만 선반영한다.
-- 공개 읽기 = 활성(is_active) 행만 · 쓰기 = 해당 place 오너 또는 운영자(admin).
-- 데이터(예: 제휴 작가 FAQ)는 업체가 places 에 등재된 뒤 INSERT 한다(빈 업체엔 안 붙음).
-- 소비자 표시는 PlaceFaqs 컴포넌트가 is_active 행만 읽어 렌더, 0건이면 섹션 숨김.
--
-- 주의(드리프트): places.place_id 는 실 DB 에서 UUID 다(일부 구 마이그 파일이 TEXT 로
-- 적었으나 information_schema 기준 uuid). FK 타입을 실 DB 에 맞춰 UUID 로 둔다.

CREATE TABLE IF NOT EXISTS public.place_faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id UUID NOT NULL REFERENCES public.places(place_id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,    -- 표시 순서(오름차순), 동률이면 created_at
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_place_faqs_place ON public.place_faqs(place_id);

ALTER TABLE public.place_faqs ENABLE ROW LEVEL SECURITY;

-- 공개 읽기: 활성 FAQ 만. (RLS permissive=OR 이므로 아래 오너/운영자 정책이 비활성행도 추가 허용)
CREATE POLICY "Anyone can view active place faqs"
  ON public.place_faqs FOR SELECT USING (is_active = true);

-- 운영자(admin): 비활성 포함 전체 읽기/쓰기.
CREATE POLICY "Admin can view all place faqs"
  ON public.place_faqs FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can insert place faqs"
  ON public.place_faqs FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can update place faqs"
  ON public.place_faqs FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can delete place faqs"
  ON public.place_faqs FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- 업체 오너: 본인 소유(claimed) place 의 FAQ 만. owner_user_id 가 null(미인수) 이면 매칭 안 됨 → 운영자만 관리.
CREATE POLICY "Owner can view own place faqs"
  ON public.place_faqs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.places p
                 WHERE p.place_id = place_faqs.place_id AND p.owner_user_id = auth.uid()));
CREATE POLICY "Owner can insert own place faqs"
  ON public.place_faqs FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.places p
                      WHERE p.place_id = place_faqs.place_id AND p.owner_user_id = auth.uid()));
CREATE POLICY "Owner can update own place faqs"
  ON public.place_faqs FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.places p
                 WHERE p.place_id = place_faqs.place_id AND p.owner_user_id = auth.uid()));
CREATE POLICY "Owner can delete own place faqs"
  ON public.place_faqs FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.places p
                 WHERE p.place_id = place_faqs.place_id AND p.owner_user_id = auth.uid()));

COMMENT ON TABLE public.place_faqs IS '업체 상세 자주 묻는 질문(place 1:N). 공개=활성행, 쓰기=오너/운영자.';
