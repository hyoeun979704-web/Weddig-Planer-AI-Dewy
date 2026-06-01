-- 모바일 청첩장 템플릿 4종 시드.
--
-- 세로 스크롤형 모바일 청첩장(타 서비스 구성: 커버·인사말·갤러리·정보·오시는길·QR)을
-- 단일 긴 캔버스(1080×3500~3800)에 섹션 슬롯으로 구성. format='mobile', 단면(face='both').
-- 필드는 위저드 입력(couple_names/wedding_date/venue_*/parents)에서 자동 채움.
-- slug 기준 upsert — 재실행 안전.

INSERT INTO public.invitation_templates
  (slug, name, format, face, tone, price_hearts, engine_grade, recommended_fonts, thumbnail_url, layout, display_order, is_active)
VALUES
('mobile-modern-minimal','모던 미니멀 (모바일)','mobile','both','modern_minimal',0,'basic',ARRAY['Pretendard','Noto Serif KR'],'',
 '{"canvas":{"w":1080,"h":3500},"slots":[
   {"id":"main_photo","type":"image","field":"main_photo","role":"photo","fit":"cover","image_order":1,"placeholder":"대표 사진","x":0,"y":0,"w":1080,"h":1280,"z":1},
   {"id":"names_ko","type":"text","field":"couple_names","role":"names","placeholder":"신랑 · 신부","x":90,"y":1360,"w":900,"h":90,"z":2,"font_size":54,"align":"center","color":"#1A1A1A","letter_spacing":4},
   {"id":"wedding_date","type":"text","field":"wedding_date","role":"date","placeholder":"2026. 00. 00","x":90,"y":1480,"w":900,"h":56,"z":2,"font_size":28,"align":"center","color":"#999999","letter_spacing":6},
   {"id":"intro_text","type":"text","field":"intro_text","role":"intro","ai_promptable":true,"placeholder":"두 사람이 사랑으로 만나 하나가 되는 날, 귀한 걸음으로 축복해 주시면 감사하겠습니다.","x":160,"y":1680,"w":760,"h":360,"z":2,"font_size":34,"align":"center","color":"#444444","line_height":1.9},
   {"id":"wedding_calendar","type":"calendar","x":290,"y":2120,"w":500,"h":480,"z":2,"calendar_color":"#1A1A1A","calendar_accent_color":"#E0A4A4"},
   {"id":"gallery_1","type":"image","field":"sub_photo","role":"photo","fit":"cover","image_order":2,"placeholder":"사진","x":90,"y":2700,"w":430,"h":540,"z":1},
   {"id":"gallery_2","type":"image","field":"sub_photo","role":"photo","fit":"cover","image_order":3,"placeholder":"사진","x":560,"y":2700,"w":430,"h":540,"z":1},
   {"id":"venue_name","type":"text","field":"venue_name","role":"venue_address","placeholder":"OO웨딩홀","x":90,"y":3300,"w":900,"h":50,"z":2,"font_size":30,"align":"center","color":"#1A1A1A"},
   {"id":"share_qr","type":"qr","x":490,"y":3380,"w":100,"h":100,"z":2}
 ]}'::jsonb,38,true),

('mobile-romantic-floral','로맨틱 플로럴 (모바일)','mobile','both','natural_romantic',0,'basic',ARRAY['Gowun Batang','Pretendard'],'',
 '{"canvas":{"w":1080,"h":3600},"slots":[
   {"id":"main_photo","type":"image","field":"main_photo","role":"photo","fit":"cover","image_order":1,"placeholder":"대표 사진","x":80,"y":120,"w":920,"h":1120,"z":1},
   {"id":"names_ko","type":"text","field":"couple_names","role":"names","placeholder":"신랑 · 신부","x":90,"y":1340,"w":900,"h":90,"z":2,"font_size":52,"align":"center","color":"#5A4A42","letter_spacing":2},
   {"id":"wedding_date","type":"text","field":"wedding_date","role":"date","placeholder":"2026년 00월 00일","x":90,"y":1460,"w":900,"h":56,"z":2,"font_size":28,"align":"center","color":"#A08C82","letter_spacing":3},
   {"id":"intro_text","type":"text","field":"intro_text","role":"intro","ai_promptable":true,"placeholder":"서로의 계절이 되어준 두 사람이 한 걸음 더 나아가려 합니다. 따뜻한 마음으로 함께해 주세요.","x":150,"y":1660,"w":780,"h":380,"z":2,"font_size":34,"align":"center","color":"#6B5B53","line_height":2.0},
   {"id":"wedding_calendar","type":"calendar","x":290,"y":2140,"w":500,"h":480,"z":2,"calendar_color":"#6B5B53","calendar_accent_color":"#C98B8B"},
   {"id":"gallery_1","type":"image","field":"sub_photo","role":"photo","fit":"cover","image_order":2,"placeholder":"사진","x":80,"y":2720,"w":920,"h":620,"z":1},
   {"id":"venue_name","type":"text","field":"venue_name","role":"venue_address","placeholder":"OO웨딩홀","x":90,"y":3400,"w":900,"h":50,"z":2,"font_size":30,"align":"center","color":"#5A4A42"},
   {"id":"venue_address","type":"text","field":"venue_address","role":"venue_address","placeholder":"서울시 OO구 OO로 00","x":90,"y":3460,"w":900,"h":44,"z":2,"font_size":24,"align":"center","color":"#A08C82"},
   {"id":"share_qr","type":"qr","x":490,"y":3470,"w":100,"h":100,"z":2}
 ]}'::jsonb,37,true),

('mobile-film-emotional','필름 감성 (모바일)','mobile','both','cinematic_emotional',10,'photo',ARRAY['Cormorant Garamond','Pretendard'],'',
 '{"canvas":{"w":1080,"h":3800},"slots":[
   {"id":"main_photo","type":"image","field":"main_photo","role":"photo","fit":"cover","image_order":1,"placeholder":"대표 사진","x":0,"y":0,"w":1080,"h":1440,"z":1},
   {"id":"names_en","type":"text","role":"names","placeholder":"Groom & Bride","x":90,"y":1180,"w":900,"h":70,"z":2,"font_size":40,"font_style":"italic","align":"center","color":"#FFFFFF","letter_spacing":4},
   {"id":"names_ko","type":"text","field":"couple_names","role":"names","placeholder":"신랑 · 신부","x":90,"y":1520,"w":900,"h":80,"z":2,"font_size":48,"align":"center","color":"#1A1A1A","letter_spacing":3},
   {"id":"wedding_date","type":"text","field":"wedding_date","role":"date","placeholder":"2026. 00. 00","x":90,"y":1630,"w":900,"h":54,"z":2,"font_size":26,"align":"center","color":"#999999","letter_spacing":6},
   {"id":"intro_text","type":"text","field":"intro_text","role":"intro","ai_promptable":true,"placeholder":"오래 기억하고 싶은 하루에 소중한 분들을 초대합니다.","x":150,"y":1800,"w":780,"h":300,"z":2,"font_size":32,"align":"center","color":"#444444","line_height":1.9},
   {"id":"gallery_1","type":"image","field":"sub_photo","role":"photo","fit":"cover","image_order":2,"placeholder":"사진","x":90,"y":2180,"w":430,"h":560,"z":1},
   {"id":"gallery_2","type":"image","field":"sub_photo","role":"photo","fit":"cover","image_order":3,"placeholder":"사진","x":560,"y":2180,"w":430,"h":560,"z":1},
   {"id":"gallery_3","type":"image","field":"sub_photo","role":"photo","fit":"cover","image_order":4,"placeholder":"사진","x":90,"y":2780,"w":900,"h":560,"z":1},
   {"id":"wedding_calendar","type":"calendar","x":290,"y":3420,"w":500,"h":300,"z":2,"calendar_color":"#1A1A1A","calendar_accent_color":"#C0392B"},
   {"id":"share_qr","type":"qr","x":490,"y":3680,"w":100,"h":100,"z":2}
 ]}'::jsonb,36,true),

('mobile-classic-letter','클래식 레터 (모바일)','mobile','both','warm_letter',0,'basic',ARRAY['Noto Serif KR','Pretendard'],'',
 '{"canvas":{"w":1080,"h":3600},"slots":[
   {"id":"main_photo","type":"image","field":"main_photo","role":"photo","fit":"cover","image_order":1,"placeholder":"대표 사진","x":90,"y":140,"w":900,"h":1140,"z":1},
   {"id":"intro_text","type":"text","field":"intro_text","role":"intro","ai_promptable":true,"placeholder":"두 사람이 사랑과 믿음으로 한 가정을 이루려 합니다. 바쁘시더라도 오셔서 축복해 주시면 감사하겠습니다.","x":150,"y":1380,"w":780,"h":420,"z":2,"font_size":34,"align":"center","color":"#333333","line_height":2.0},
   {"id":"groom_parents","type":"text","field":"groom_parents","role":"parents","placeholder":"홍OO · 박OO 의 아들 OO","x":90,"y":1900,"w":900,"h":48,"z":2,"font_size":28,"align":"center","color":"#555555"},
   {"id":"bride_parents","type":"text","field":"bride_parents","role":"parents","placeholder":"김OO · 이OO 의 딸 OO","x":90,"y":1960,"w":900,"h":48,"z":2,"font_size":28,"align":"center","color":"#555555"},
   {"id":"names_ko","type":"text","field":"couple_names","role":"names","placeholder":"신랑 · 신부","x":90,"y":2080,"w":900,"h":80,"z":2,"font_size":46,"align":"center","color":"#1A1A1A","letter_spacing":3},
   {"id":"wedding_date","type":"text","field":"wedding_date","role":"date","placeholder":"2026년 00월 00일 토요일 낮 12시","x":90,"y":2200,"w":900,"h":54,"z":2,"font_size":26,"align":"center","color":"#888888"},
   {"id":"wedding_calendar","type":"calendar","x":290,"y":2340,"w":500,"h":480,"z":2,"calendar_color":"#1A1A1A","calendar_accent_color":"#B7935A"},
   {"id":"venue_name","type":"text","field":"venue_name","role":"venue_address","placeholder":"OO웨딩홀","x":90,"y":2920,"w":900,"h":50,"z":2,"font_size":30,"align":"center","color":"#1A1A1A"},
   {"id":"venue_address","type":"text","field":"venue_address","role":"venue_address","placeholder":"서울시 OO구 OO로 00","x":90,"y":2980,"w":900,"h":44,"z":2,"font_size":24,"align":"center","color":"#888888"},
   {"id":"account_info","type":"text","role":"account","placeholder":"마음 전하실 곳\n신랑측 OO은행 000-0000\n신부측 OO은행 000-0000","x":150,"y":3120,"w":780,"h":220,"z":2,"font_size":26,"align":"center","color":"#666666","line_height":1.8},
   {"id":"share_qr","type":"qr","x":490,"y":3420,"w":100,"h":100,"z":2}
 ]}'::jsonb,35,true)
ON CONFLICT (slug) DO UPDATE SET
  name=EXCLUDED.name, format=EXCLUDED.format, face=EXCLUDED.face, tone=EXCLUDED.tone,
  price_hearts=EXCLUDED.price_hearts, engine_grade=EXCLUDED.engine_grade,
  recommended_fonts=EXCLUDED.recommended_fonts, layout=EXCLUDED.layout,
  display_order=EXCLUDED.display_order, is_active=true, updated_at=now();
