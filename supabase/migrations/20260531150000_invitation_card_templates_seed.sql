-- 카드형 청첩장 템플릿 시드 (전면 4 + 후면 4).
--
-- 입력 포맷의 format=card_front/card_back 는 face 컬럼으로 매핑하고
-- format 은 'paper' 로 통일(기존 format CHECK/필터 호환).
-- canvas {width,height} → layout.canvas {w,h}. slot.id 는 field 값으로 생성.
-- 전면 템플릿은 default_back_template_id 로 짝꿍 기본 후면을 가리킨다(세트).
-- slug 기준 upsert — 재실행 안전.

INSERT INTO public.invitation_templates
  (slug, name, format, face, tone, price_hearts, engine_grade, recommended_fonts,
   thumbnail_url, layout, display_order, is_active)
VALUES
  ('editorial-white-front','에디토리얼 화이트 전면','paper','front','modern_minimal',0,'basic',
   ARRAY['Pretendard','Libre Baskerville'],'',
   '{"canvas":{"w":1000,"h":1600},"slots":[
     {"id":"couple_names","type":"text","field":"couple_names","role":"names","placeholder":"신랑 · 신부","x":180,"y":660,"w":640,"h":90,"z":2},
     {"id":"wedding_date","type":"text","field":"wedding_date","role":"date","placeholder":"2026. 00. 00","x":300,"y":780,"w":400,"h":56,"z":2}
   ]}'::jsonb, 48, true),

  ('botanical-line-front','보태니컬 라인 전면','paper','front','natural_romantic',0,'basic',
   ARRAY['Gowun Batang','Pretendard'],'',
   '{"canvas":{"w":1000,"h":1600},"slots":[
     {"id":"couple_names","type":"text","field":"couple_names","role":"names","placeholder":"신랑 · 신부","x":170,"y":720,"w":660,"h":88,"z":2},
     {"id":"wedding_date","type":"text","field":"wedding_date","role":"date","placeholder":"2026년 00월 00일","x":240,"y":845,"w":520,"h":54,"z":2}
   ]}'::jsonb, 47, true),

  ('film-photo-front','필름 포토 전면','paper','front','cinematic_emotional',5,'photo',
   ARRAY['Cormorant Garamond','Pretendard'],'',
   '{"canvas":{"w":1000,"h":1600},"slots":[
     {"id":"main_photo","type":"image","field":"main_photo","role":"photo","placeholder":"대표 사진","x":120,"y":180,"w":760,"h":980,"z":1},
     {"id":"couple_names","type":"text","field":"couple_names","role":"names","placeholder":"신랑 · 신부","x":150,"y":1220,"w":700,"h":76,"z":2},
     {"id":"wedding_date","type":"text","field":"wedding_date","role":"date","placeholder":"2026. 00. 00","x":280,"y":1320,"w":440,"h":52,"z":2}
   ]}'::jsonb, 46, true),

  ('opera-lace-front','오페라 레이스 전면','paper','front','classic_maximal',15,'premium',
   ARRAY['Playfair Display','Noto Serif KR'],'',
   '{"canvas":{"w":1000,"h":1600},"slots":[
     {"id":"couple_names","type":"text","field":"couple_names","role":"names","placeholder":"신랑 · 신부","x":150,"y":690,"w":700,"h":96,"z":2},
     {"id":"wedding_date","type":"text","field":"wedding_date","role":"date","placeholder":"2026. 00. 00","x":300,"y":835,"w":400,"h":56,"z":2}
   ]}'::jsonb, 45, true),

  ('clean-info-back','클린 인포 후면','paper','back','clean_practical',0,'basic',
   ARRAY['Pretendard','Noto Serif KR'],'',
   '{"canvas":{"w":1000,"h":1600},"slots":[
     {"id":"intro_text","type":"text","field":"intro_text","role":"intro","ai_promptable":true,"placeholder":"두 사람이 같은 마음으로 새로운 시작을 함께하려 합니다. 소중한 날에 함께해 주시면 감사하겠습니다.","x":150,"y":220,"w":700,"h":260,"z":2},
     {"id":"wedding_date","type":"text","field":"wedding_date","role":"date","placeholder":"2026. 00. 00  |  00:00","x":180,"y":560,"w":640,"h":58,"z":2},
     {"id":"couple_names","type":"text","field":"couple_names","role":"names","placeholder":"신랑 · 신부","x":220,"y":660,"w":560,"h":64,"z":2}
   ]}'::jsonb, 24, true),

  ('letter-botanical-back','레터 보태니컬 후면','paper','back','warm_letter',0,'basic',
   ARRAY['Gowun Batang','Pretendard'],'',
   '{"canvas":{"w":1000,"h":1600},"slots":[
     {"id":"intro_text","type":"text","field":"intro_text","role":"intro","ai_promptable":true,"placeholder":"서로의 계절이 되어준 두 사람이 이제 한 걸음 더 나아가려 합니다. 따뜻한 마음으로 함께해 주시면 감사하겠습니다.","x":145,"y":300,"w":710,"h":340,"z":2},
     {"id":"couple_names","type":"text","field":"couple_names","role":"names","placeholder":"신랑 · 신부","x":250,"y":760,"w":500,"h":70,"z":2},
     {"id":"wedding_date","type":"text","field":"wedding_date","role":"date","placeholder":"2026년 00월 00일","x":240,"y":875,"w":520,"h":56,"z":2}
   ]}'::jsonb, 23, true),

  ('photo-caption-back','포토 캡션 후면','paper','back','documentary_photo',5,'photo',
   ARRAY['Libre Baskerville','Pretendard'],'',
   '{"canvas":{"w":1000,"h":1600},"slots":[
     {"id":"main_photo","type":"image","field":"main_photo","role":"photo","placeholder":"후면 사진","x":110,"y":120,"w":780,"h":620,"z":1},
     {"id":"intro_text","type":"text","field":"intro_text","role":"intro","ai_promptable":true,"placeholder":"오래 기억하고 싶은 하루에 소중한 분들을 초대합니다. 함께해 주시는 마음을 깊이 간직하겠습니다.","x":150,"y":830,"w":700,"h":230,"z":2},
     {"id":"couple_names","type":"text","field":"couple_names","role":"names","placeholder":"신랑 · 신부","x":230,"y":1130,"w":540,"h":68,"z":2},
     {"id":"wedding_date","type":"text","field":"wedding_date","role":"date","placeholder":"2026. 00. 00","x":300,"y":1235,"w":400,"h":54,"z":2}
   ]}'::jsonb, 22, true),

  ('gallery-qr-back','갤러리 QR 후면','paper','back','modern_digital',15,'extension_required',
   ARRAY['Pretendard','Cormorant Garamond'],'',
   '{"canvas":{"w":1000,"h":1600},"slots":[
     {"id":"main_photo","type":"image","field":"main_photo","role":"photo","placeholder":"사진 1","x":100,"y":130,"w":380,"h":520,"z":1},
     {"id":"sub_photo","type":"image","field":"sub_photo","role":"photo","placeholder":"사진 2","x":520,"y":130,"w":380,"h":520,"z":1},
     {"id":"intro_text","type":"text","field":"intro_text","role":"intro","ai_promptable":true,"placeholder":"함께 쌓아온 시간 위에 새로운 약속을 더하려 합니다. 귀한 걸음으로 축복해 주시면 감사하겠습니다.","x":150,"y":760,"w":700,"h":230,"z":2},
     {"id":"couple_names","type":"text","field":"couple_names","role":"names","placeholder":"신랑 · 신부","x":230,"y":1060,"w":540,"h":64,"z":2},
     {"id":"wedding_date","type":"text","field":"wedding_date","role":"date","placeholder":"2026. 00. 00","x":300,"y":1160,"w":400,"h":54,"z":2}
   ]}'::jsonb, 21, true)
ON CONFLICT (slug) DO UPDATE SET
  name=EXCLUDED.name, format=EXCLUDED.format, face=EXCLUDED.face, tone=EXCLUDED.tone,
  price_hearts=EXCLUDED.price_hearts, engine_grade=EXCLUDED.engine_grade,
  recommended_fonts=EXCLUDED.recommended_fonts, layout=EXCLUDED.layout,
  display_order=EXCLUDED.display_order, is_active=true, updated_at=now();

-- 전면 → 기본 후면(세트) 연결.
UPDATE public.invitation_templates f
SET default_back_template_id = b.id
FROM public.invitation_templates b
WHERE f.slug = 'editorial-white-front'   AND b.slug = 'clean-info-back';
UPDATE public.invitation_templates f
SET default_back_template_id = b.id
FROM public.invitation_templates b
WHERE f.slug = 'botanical-line-front'    AND b.slug = 'letter-botanical-back';
UPDATE public.invitation_templates f
SET default_back_template_id = b.id
FROM public.invitation_templates b
WHERE f.slug = 'film-photo-front'        AND b.slug = 'photo-caption-back';
UPDATE public.invitation_templates f
SET default_back_template_id = b.id
FROM public.invitation_templates b
WHERE f.slug = 'opera-lace-front'        AND b.slug = 'gallery-qr-back';
