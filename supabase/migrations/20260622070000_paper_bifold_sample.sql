-- 종이 청첩장 2단 접이식(bifold) 샘플 — 비즈하우스 기준 메인 포맷.
-- 펼침 256×182mm, 가운데 세로 접는선(score @128mm). 캔버스 1280×910(5px/mm)로 비율 정합.
-- product_kind='bifold', 2 페이지(외부 스프레드=뒷면+표지, 내부 스프레드=인사말+예식정보).
-- 인쇄 마크(재단·접는선)는 exportInvitationPrintPdf 가 print.folds/bleed 로 생성.
-- ⚠️ 실물 접이·레이저컷·코팅 교정은 파트너 출력으로 최종 확인 필요(디지털 규격만 정합).

INSERT INTO public.invitation_templates
  (slug, name, format, face, tone, price_hearts, engine_grade, recommended_fonts, thumbnail_url, layout, display_order, is_active)
VALUES
('paper-bifold-01','2단 접이식 — 클래식','paper','both','CLASSIC',0,'basic',ARRAY['Noto Serif KR','Pretendard'],'',
 '{
   "canvas":{"w":1280,"h":910,"bg":"#FFFFFF"},
   "product_kind":"bifold",
   "presentation":"paged",
   "print":{"wMm":256,"hMm":182,"bleedMm":3,"safeMarginMm":5,"folds":[{"axis":"v","atMm":128,"type":"score"}]},
   "slots":[],
   "pages":[
     {
       "id":"outer","label":"외부(표지)","order":1,
       "canvas":{"w":1280,"h":910,"bg":"#FFFFFF"},
       "print":{"wMm":256,"hMm":182,"bleedMm":3,"safeMarginMm":5,"folds":[{"axis":"v","atMm":128,"type":"score"}]},
       "slots":[
         {"id":"main_photo","type":"image","field":"main_photo","role":"photo","fit":"cover","image_order":1,"placeholder":"대표 사진","x":680,"y":80,"w":540,"h":460,"z":1},
         {"id":"names_ko","type":"text","field":"couple_names","role":"names","placeholder":"신랑 · 신부","x":680,"y":575,"w":540,"h":70,"z":2,"font_size":40,"align":"center","color":"#2A2A2A","letter_spacing":2},
         {"id":"wedding_date","type":"text","field":"wedding_date","role":"date","placeholder":"2026. 00. 00","x":680,"y":660,"w":540,"h":44,"z":2,"font_size":22,"align":"center","color":"#888888","letter_spacing":3},
         {"id":"back_greeting","type":"text","field":"intro_text","role":"intro","placeholder":"우리 결혼합니다","x":80,"y":380,"w":480,"h":160,"z":2,"font_size":28,"align":"center","color":"#555555","line_height":1.8}
       ]
     },
     {
       "id":"inner","label":"내부(인사말·정보)","order":2,
       "canvas":{"w":1280,"h":910,"bg":"#FFFFFF"},
       "print":{"wMm":256,"hMm":182,"bleedMm":3,"safeMarginMm":5,"folds":[{"axis":"v","atMm":128,"type":"score"}]},
       "slots":[
         {"id":"intro_text","type":"text","field":"intro_text","role":"intro","ai_promptable":true,"placeholder":"두 사람이 사랑과 믿음으로 한 가정을 이루려 합니다. 귀한 걸음으로 축복해 주세요.","x":70,"y":180,"w":500,"h":360,"z":2,"font_size":28,"align":"center","color":"#444444","line_height":1.9},
         {"id":"groom_parents","type":"text","field":"groom_parents","role":"parents","placeholder":"홍OO · 박OO 의 아들 OO","x":70,"y":600,"w":500,"h":40,"z":2,"font_size":22,"align":"center","color":"#666666"},
         {"id":"bride_parents","type":"text","field":"bride_parents","role":"parents","placeholder":"김OO · 이OO 의 딸 OO","x":70,"y":650,"w":500,"h":40,"z":2,"font_size":22,"align":"center","color":"#666666"},
         {"id":"venue_name","type":"text","field":"venue_name","role":"venue_address","placeholder":"OO웨딩홀","x":680,"y":150,"w":540,"h":48,"z":2,"font_size":26,"align":"center","color":"#2A2A2A"},
         {"id":"venue_address","type":"text","field":"venue_address","role":"venue_address","placeholder":"서울시 OO구 OO로 00","x":680,"y":205,"w":540,"h":40,"z":2,"font_size":20,"align":"center","color":"#888888"},
         {"id":"wedding_calendar","type":"calendar","x":800,"y":300,"w":320,"h":300,"z":2,"calendar_color":"#2A2A2A","calendar_accent_color":"#C98B8B"},
         {"id":"account_info","type":"text","role":"account","placeholder":"마음 전하실 곳\n신랑측 OO은행 000-0000\n신부측 OO은행 000-0000","x":680,"y":640,"w":540,"h":200,"z":2,"font_size":22,"align":"center","color":"#666666","line_height":1.7}
       ]
     }
   ]
 }'::jsonb,34,true)
ON CONFLICT (slug) DO UPDATE SET
  name=EXCLUDED.name, format=EXCLUDED.format, face=EXCLUDED.face, tone=EXCLUDED.tone,
  price_hearts=EXCLUDED.price_hearts, engine_grade=EXCLUDED.engine_grade,
  recommended_fonts=EXCLUDED.recommended_fonts, layout=EXCLUDED.layout,
  display_order=EXCLUDED.display_order, is_active=true, updated_at=now();
