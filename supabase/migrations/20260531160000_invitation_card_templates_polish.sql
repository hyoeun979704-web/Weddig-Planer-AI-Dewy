-- 카드 템플릿 디자인값 보강 (font_size / align / color / line_height).
--
-- 초기 시드(20260531150000)는 입력 JSON 에 충실히 좌표만 넣어 1000×1600 캔버스에서
-- 기본 폰트(18px)로 작게 보였다. 역할(role)별로 가독 사이즈/정렬/색을 채운다.
-- slug 기준 layout 통째 교체 — 재실행 안전.

UPDATE public.invitation_templates SET layout = '{"canvas":{"w":1000,"h":1600},"slots":[
  {"id":"couple_names","type":"text","field":"couple_names","role":"names","placeholder":"신랑 · 신부","x":180,"y":660,"w":640,"h":90,"z":2,"font_size":52,"align":"center","color":"#1A1A1A","letter_spacing":2},
  {"id":"wedding_date","type":"text","field":"wedding_date","role":"date","placeholder":"2026. 00. 00","x":300,"y":780,"w":400,"h":56,"z":2,"font_size":30,"align":"center","color":"#555555","letter_spacing":3}
]}'::jsonb WHERE slug='editorial-white-front';

UPDATE public.invitation_templates SET layout = '{"canvas":{"w":1000,"h":1600},"slots":[
  {"id":"couple_names","type":"text","field":"couple_names","role":"names","placeholder":"신랑 · 신부","x":170,"y":720,"w":660,"h":88,"z":2,"font_size":52,"align":"center","color":"#1A1A1A","letter_spacing":2},
  {"id":"wedding_date","type":"text","field":"wedding_date","role":"date","placeholder":"2026년 00월 00일","x":240,"y":845,"w":520,"h":54,"z":2,"font_size":30,"align":"center","color":"#555555","letter_spacing":2}
]}'::jsonb WHERE slug='botanical-line-front';

UPDATE public.invitation_templates SET layout = '{"canvas":{"w":1000,"h":1600},"slots":[
  {"id":"main_photo","type":"image","field":"main_photo","role":"photo","placeholder":"대표 사진","x":120,"y":180,"w":760,"h":980,"z":1},
  {"id":"couple_names","type":"text","field":"couple_names","role":"names","placeholder":"신랑 · 신부","x":150,"y":1220,"w":700,"h":76,"z":2,"font_size":48,"align":"center","color":"#1A1A1A","letter_spacing":2},
  {"id":"wedding_date","type":"text","field":"wedding_date","role":"date","placeholder":"2026. 00. 00","x":280,"y":1320,"w":440,"h":52,"z":2,"font_size":28,"align":"center","color":"#555555","letter_spacing":3}
]}'::jsonb WHERE slug='film-photo-front';

UPDATE public.invitation_templates SET layout = '{"canvas":{"w":1000,"h":1600},"slots":[
  {"id":"couple_names","type":"text","field":"couple_names","role":"names","placeholder":"신랑 · 신부","x":150,"y":690,"w":700,"h":96,"z":2,"font_size":56,"align":"center","color":"#1A1A1A","letter_spacing":2},
  {"id":"wedding_date","type":"text","field":"wedding_date","role":"date","placeholder":"2026. 00. 00","x":300,"y":835,"w":400,"h":56,"z":2,"font_size":30,"align":"center","color":"#555555","letter_spacing":3}
]}'::jsonb WHERE slug='opera-lace-front';

UPDATE public.invitation_templates SET layout = '{"canvas":{"w":1000,"h":1600},"slots":[
  {"id":"intro_text","type":"text","field":"intro_text","role":"intro","ai_promptable":true,"placeholder":"두 사람이 같은 마음으로 새로운 시작을 함께하려 합니다. 소중한 날에 함께해 주시면 감사하겠습니다.","x":150,"y":220,"w":700,"h":260,"z":2,"font_size":32,"align":"center","color":"#333333","line_height":1.8},
  {"id":"wedding_date","type":"text","field":"wedding_date","role":"date","placeholder":"2026. 00. 00  |  00:00","x":180,"y":560,"w":640,"h":58,"z":2,"font_size":28,"align":"center","color":"#555555","letter_spacing":2},
  {"id":"couple_names","type":"text","field":"couple_names","role":"names","placeholder":"신랑 · 신부","x":220,"y":660,"w":560,"h":64,"z":2,"font_size":38,"align":"center","color":"#1A1A1A","letter_spacing":2}
]}'::jsonb WHERE slug='clean-info-back';

UPDATE public.invitation_templates SET layout = '{"canvas":{"w":1000,"h":1600},"slots":[
  {"id":"intro_text","type":"text","field":"intro_text","role":"intro","ai_promptable":true,"placeholder":"서로의 계절이 되어준 두 사람이 이제 한 걸음 더 나아가려 합니다. 따뜻한 마음으로 함께해 주시면 감사하겠습니다.","x":145,"y":300,"w":710,"h":340,"z":2,"font_size":32,"align":"center","color":"#333333","line_height":1.8},
  {"id":"couple_names","type":"text","field":"couple_names","role":"names","placeholder":"신랑 · 신부","x":250,"y":760,"w":500,"h":70,"z":2,"font_size":38,"align":"center","color":"#1A1A1A","letter_spacing":2},
  {"id":"wedding_date","type":"text","field":"wedding_date","role":"date","placeholder":"2026년 00월 00일","x":240,"y":875,"w":520,"h":56,"z":2,"font_size":28,"align":"center","color":"#555555","letter_spacing":2}
]}'::jsonb WHERE slug='letter-botanical-back';

UPDATE public.invitation_templates SET layout = '{"canvas":{"w":1000,"h":1600},"slots":[
  {"id":"main_photo","type":"image","field":"main_photo","role":"photo","placeholder":"후면 사진","x":110,"y":120,"w":780,"h":620,"z":1},
  {"id":"intro_text","type":"text","field":"intro_text","role":"intro","ai_promptable":true,"placeholder":"오래 기억하고 싶은 하루에 소중한 분들을 초대합니다. 함께해 주시는 마음을 깊이 간직하겠습니다.","x":150,"y":830,"w":700,"h":230,"z":2,"font_size":30,"align":"center","color":"#333333","line_height":1.7},
  {"id":"couple_names","type":"text","field":"couple_names","role":"names","placeholder":"신랑 · 신부","x":230,"y":1130,"w":540,"h":68,"z":2,"font_size":36,"align":"center","color":"#1A1A1A","letter_spacing":2},
  {"id":"wedding_date","type":"text","field":"wedding_date","role":"date","placeholder":"2026. 00. 00","x":300,"y":1235,"w":400,"h":54,"z":2,"font_size":26,"align":"center","color":"#555555","letter_spacing":3}
]}'::jsonb WHERE slug='photo-caption-back';

UPDATE public.invitation_templates SET layout = '{"canvas":{"w":1000,"h":1600},"slots":[
  {"id":"main_photo","type":"image","field":"main_photo","role":"photo","placeholder":"사진 1","x":100,"y":130,"w":380,"h":520,"z":1},
  {"id":"sub_photo","type":"image","field":"sub_photo","role":"photo","placeholder":"사진 2","x":520,"y":130,"w":380,"h":520,"z":1},
  {"id":"intro_text","type":"text","field":"intro_text","role":"intro","ai_promptable":true,"placeholder":"함께 쌓아온 시간 위에 새로운 약속을 더하려 합니다. 귀한 걸음으로 축복해 주시면 감사하겠습니다.","x":150,"y":760,"w":700,"h":230,"z":2,"font_size":30,"align":"center","color":"#333333","line_height":1.7},
  {"id":"couple_names","type":"text","field":"couple_names","role":"names","placeholder":"신랑 · 신부","x":230,"y":1060,"w":540,"h":64,"z":2,"font_size":34,"align":"center","color":"#1A1A1A","letter_spacing":2},
  {"id":"wedding_date","type":"text","field":"wedding_date","role":"date","placeholder":"2026. 00. 00","x":300,"y":1160,"w":400,"h":54,"z":2,"font_size":26,"align":"center","color":"#555555","letter_spacing":3}
]}'::jsonb WHERE slug='gallery-qr-back';
