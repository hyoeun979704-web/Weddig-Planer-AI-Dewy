-- 포인트 표기 한글화: promotional_events 의 영어 "P" 단위를 "포인트" 로 통일.
UPDATE public.promotional_events
   SET title    = REPLACE(REPLACE(REPLACE(REPLACE(title,    '1,000P', '1,000포인트'), '500P', '500포인트'), '3,000P', '3,000포인트'), '50P', '50포인트'),
       subtitle = REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(subtitle,''), '1,000P', '1,000포인트'), '500P', '500포인트'), '3,000P', '3,000포인트'), '50P', '50포인트'),
       updated_at = now()
 WHERE title ~ 'P[ )$,.]' OR subtitle ~ 'P[ )$,.]';
