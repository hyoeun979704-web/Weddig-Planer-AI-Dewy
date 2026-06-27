-- ============================================================================
-- Instagram 카드뉴스 — 주제 큐 (topic queue)
-- ============================================================================
--
-- 파이프라인 막힘 ①주제공급 해소용. 노션 "콘텐츠 캘린더" DB 의 카드뉴스 주제를
-- 이 테이블로 시드해 두면, instagram-draft-generator 가 큐에서 주제를 꺼내
-- draft 를 만든다(생성·렌더 자동 → 운영자 검수 후 발행).
--
-- 흐름:
--   queued    — 시드됨, 아직 draft 안 만듦
--   drafting  — draft-generator 가 처리 중(락)
--   drafted   — instagram_post_drafts 행 생성됨(draft_id 연결). 이후 렌더/검수/발행은 draft 가 담당
--   skipped   — 운영자가 보류(중복·시즌 안 맞음 등)
--   done      — 발행까지 완료(draft.status='published' 와 동기화)
--
-- 운영자(admin)만 read/write. 사용자 데이터 아님 — 마케팅 운영 테이블.
-- 진실원천: 노션 페이지(notion_page_id 로 idempotent 시드, 재실행해도 중복 안 생김).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.instagram_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 콘텐츠
  title TEXT NOT NULL,              -- 카드뉴스 제목(=노션 콘텐츠 이름)
  subtitle TEXT,                    -- 표지 부제(베네핏 한 줄)
  brief TEXT,                       -- 노션 본문 풀스크립트(카드별 제목·설명·TIP) → 카피 생성 grounding 소스
  hashtags TEXT[] NOT NULL DEFAULT '{}',  -- 추천 해시태그(선택)

  -- 출처/자산
  source TEXT NOT NULL DEFAULT 'notion',  -- 'notion' | 'manual'
  notion_page_id TEXT UNIQUE,       -- 노션 페이지 id(idempotent 시드 키, 중복 방지)
  notion_db_id TEXT,                -- 노션 DB id
  notion_url TEXT,
  asset_folder_url TEXT,            -- 사진 자료(구글 드라이브 폴더 등)

  -- 스케줄/우선순위
  scheduled_publish_date DATE,      -- 노션 게시일(있으면)
  priority INTEGER NOT NULL DEFAULT 100,  -- 작을수록 먼저(기본은 게시일 기준 정렬 권장)

  -- 라이프사이클
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'drafting', 'drafted', 'skipped', 'done')),
  draft_id UUID REFERENCES public.instagram_post_drafts(id) ON DELETE SET NULL,

  -- 추적
  last_error TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 큐 픽업: status + 우선순위 + 게시일 순
CREATE INDEX IF NOT EXISTS idx_ig_topics_status_priority
  ON public.instagram_topics(status, priority, scheduled_publish_date);

-- RLS: admin 만 전체 권한 (instagram_post_drafts 와 동일 패턴)
ALTER TABLE public.instagram_topics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage instagram topics" ON public.instagram_topics;
CREATE POLICY "Admins manage instagram topics"
  ON public.instagram_topics
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 자동 updated_at
DROP TRIGGER IF EXISTS update_instagram_topics_updated_at ON public.instagram_topics;
CREATE TRIGGER update_instagram_topics_updated_at
  BEFORE UPDATE ON public.instagram_topics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.instagram_topics IS
  'Dewy 공식 인스타그램 카드뉴스 — 주제 큐. 노션 콘텐츠 캘린더에서 시드, draft-generator 가 픽업.';

-- ============================================================================
-- 시드 — 노션 "콘텐츠 캘린더"(389c032cda8080548976cbfd7df72faa) 카드뉴스 주제 7건
-- notion_page_id 충돌 시 무시(idempotent). brief 는 노션 본문(카드별 스크립트) 발췌.
-- ============================================================================
INSERT INTO public.instagram_topics
  (title, subtitle, brief, hashtags, source, notion_page_id, notion_db_id, notion_url, asset_folder_url, scheduled_publish_date, priority)
VALUES
(
  '7월 여름 웨딩촬영 부케 추천 4선',
  '비율은 살리고 싱그러움은 더하는 인생샷 필수템',
  $brief$표지: 7월 웨딩촬영 한다면 주목! 컬러풀한 여름 부케 추천 4선 / 비율은 살리고 싱그러움은 더하는 인생샷 필수템
1) 화이트 & 피치 튤립 믹스 — 우아한 화이트 카라와 피치 톤 튤립, 입체적인 아스틸베를 믹스해 단아하면서 생기 있는 풍성한 분위기. TIP: 부케 위쪽 라인을 들쑥날쑥하게 잡아주면 꽃 쉐입이 돋보여 더 여리여리하고 세련돼 보여요.
2) 그린 & 화이트 들꽃 와일드 믹스 — 마가렛·아미초 같은 화이트 들꽃에 싱그러운 그린 소재를 믹스해 숲에서 갓 꺾어온 듯한 내추럴 무드. TIP: 정형화되지 않은 미니 쉐입이라 야외 스냅에서 걷거나 뛰는 포즈가 더 자연스러워요.
3) 청초한 화이트 & 블루 넝쿨 카스케이드 — 시원한 푸른빛 델피늄과 화이트 리시안셔스에 넝쿨을 더해 클래식하고 우아하게. TIP: 세로선을 강조하는 카스케이드는 배꼽~명치 높이로 들면 비율이 가장 예뻐 보여요.
4) 컬러풀 믹스 카스케이드 — 오렌지 거베라·블루 델피늄에 길게 늘어지는 줄맨드라미를 조합해 유니크하고 감각적인 색감. TIP: 강렬한 컬러 포인트와 긴 카스케이드가 시선을 분산시켜 허리가 더 슬림해 보여요.
부케 주문 꿀팁: 플로리스트에게 '스튜디오 시안'과 '드레스 사진'을 보여주면 촬영장·체형에 맞는 쉐입을 제안받을 수 있어요.
마무리: 내 드레스와 찰떡인 부케는 몇 번? 여름 촬영 앞둔 친구에게 공유 + 저장.$brief$,
  ARRAY['Dewy','예비신부','웨딩부케','여름웨딩','웨딩촬영'],
  'notion', '389c032c-da80-80a5-8003-e02344d85692', '389c032cda8080548976cbfd7df72faa',
  'https://app.notion.com/p/389c032cda8080a58003e02344d85692',
  'https://drive.google.com/drive/folders/1bCHzWYQbXAKvbB2lgVlHZqHqqbZTbLe2', '2026-06-27', 1
),
(
  '원하는 컨셉에 맞는 웨딩촬영 시간대 추천',
  '채광과 분위기를 고려한 최적의 스튜디오 촬영 시간 가이드',
  $brief$표지: 원하는 컨셉에 맞는 웨딩촬영 시간대 추천 / 채광과 분위기를 고려한 최적의 스튜디오 촬영 시간 가이드
1) 오전 촬영 — 맑고 부드러운 자연광으로 깨끗하고 화사한 인물 중심 컷에 유리. TIP: 메이크업 시작이 매우 이르니 전날 붓기·컨디션 관리에 각별히 유의하세요.
2) 오후 촬영 — 채광이 가장 풍부하고 선명해 색감이 뚜렷하고 생동감 있는 분위기. TIP: 준비·이동 시간이 여유롭고 스튜디오 내 다양한 배경을 가장 안정적으로 활용할 수 있어요.
3) 노을 촬영 — 따뜻한 석양을 배경으로 로맨틱하고 우아한 실루엣 컷. TIP: 계절별 일몰 시각 편차가 크니 정확한 일몰 시간을 파악해 동선을 미리 계획하세요.
4) 야간 촬영 — 인공 조명·스파클러 소품으로 영화처럼 화려하고 극적인 장면. TIP: 야외 스팟은 기온 저하 대비 걸칠 옷을 챙기고 추가 비용 발생 여부를 확인하세요.
마무리: 예약은 원하는 레퍼런스 시간대로! 어떤 시간대가 제일 마음에 드세요?$brief$,
  ARRAY['Dewy','예비신부','웨딩촬영','스튜디오촬영','촬영시간대'],
  'notion', '389c032c-da80-807b-ae6b-e1e9cdc7f7ee', '389c032cda8080548976cbfd7df72faa',
  'https://app.notion.com/p/389c032cda80807bae6be1e9cdc7f7ee',
  'https://drive.google.com/drive/folders/1bCHzWYQbXAKvbB2lgVlHZqHqqbZTbLe2', '2026-06-26', 2
),
(
  '안 챙기면 후회하는 여름 웨딩촬영 준비물',
  '한여름 스튜디오·야외 촬영을 완벽 대비하는 실전 핵심 가이드',
  $brief$표지: 안 챙기면 후회하는 여름 웨딩촬영 준비물 / 한여름 스튜디오·야외 촬영을 완벽 대비하는 실전 핵심 가이드
1) 부착형 쿨링 패치 & 냉각 스프레이 — 피부 온도를 즉각 낮춰 땀을 억제하고 메이크업 지속력을 높여요. TIP: 드레스·턱시도에 가려지는 목덜미·등에 촬영 직전 부착·분사해 체온을 조절하세요.
2) 모기 기피제 — 공원·숲 등 야외 로케이션에서 해충으로부터 피부 보호. TIP: 피부에 직접 분사하기보다 의상 밑단·소품에 뿌려 드레스 얼룩을 방지하세요.
3) 백탁 없는 매트 선스틱 — 메이크업 위에 덧발라도 들뜸 없이 자외선 차단. TIP: 수시 보완을 위해 번들거림 없는 투명 제품으로 선택하세요.
4) 암막 코팅 자외선 차단 양산 — 대기 시간 직사광선을 차단해 급격한 체온 상승 방지. TIP: 헬퍼가 씌워주기 편하게 그늘 면적이 넓고 가벼운 우산형으로 준비하세요.
마무리: 무더운 여름 촬영을 버티게 해줄 가장 중요한 필수품은? 예비부부라면 잊지 말고 챙겨가요.$brief$,
  ARRAY['Dewy','예비신부','웨딩촬영','여름웨딩','촬영준비물'],
  'notion', '389c032c-da80-80b8-89c4-c1defd6be8e1', '389c032cda8080548976cbfd7df72faa',
  'https://app.notion.com/p/389c032cda8080b889c4c1defd6be8e1',
  'https://drive.google.com/drive/folders/1bCHzWYQbXAKvbB2lgVlHZqHqqbZTbLe2', '2026-06-28', 3
),
(
  '"몸매는 포토샵, 표정은 셀프" 실전 포즈 & 각도 공식',
  '카메라 앞에서 뚝딱거리는 예신예랑을 위한 스튜디오 생존 가이드',
  $brief$표지: "몸매는 포토샵, 표정은 셀프" 실전 포즈 & 각도 공식 / 카메라 앞에서 뚝딱거리는 예신예랑을 위한 스튜디오 생존 가이드
1) 코끝 교차 시선 처리 — 눈을 마주치면 웃음이 터지기 쉬우니 상대의 코끝·인중을 부드럽게 바라보세요. TIP: 카메라 정면을 볼 땐 렌즈 중앙 대신 상단 테두리를 응시하면 흰자가 덜 보여 눈빛이 초롱초롱해져요.
2) 드레스 핏 살리는 흉곽 조이기 — 어깨는 아래로 누르고 갈비뼈를 조여 상체가 둔해 보이는 걸 방지. TIP: 팔과 몸통 사이에 주먹 하나 여백을 두면 팔뚝살이 눌려 퍼지는 대참사를 막아요.
3) 수트 핏 살리는 포즈 — 신랑은 뒤쪽 다리에 체중 70%를 싣고 가슴을 펴야 재킷 라인이 깔끔해요. TIP: 주머니에 손을 넣을 땐 엄지만 빼고 가볍게 걸쳐야 어깨가 자연스러워요.
4) 비대칭 V자 밀착 구도 — 몸통은 밀착하되 카메라 가까운 쪽 어깨를 살짝 빼서 입체감을. TIP: 손을 맞잡거나 허리를 감쌀 땐 손가락 힘을 빼야 핏줄이 안 서고 예쁘게 담겨요.
마무리: 카메라만 보면 로봇이 되는 우리, 가장 연습이 시급한 포즈는? 예랑이 태그하고 복습 필수!$brief$,
  ARRAY['Dewy','예비신부','웨딩촬영','촬영포즈','스튜디오촬영'],
  'notion', '389c032c-da80-80f3-bcaf-f108704504c1', '389c032cda8080548976cbfd7df72faa',
  'https://app.notion.com/p/389c032cda8080f3bcaff108704504c1',
  'https://drive.google.com/drive/folders/1bCHzWYQbXAKvbB2lgVlHZqHqqbZTbLe2', '2026-06-29', 4
),
(
  '만족도 200%, 스튜디오 헤어 변형 필수 가이드',
  '촬영 퀄리티를 좌우하는 헤어 변형, 실패 없는 순서와 꿀팁 총정리',
  $brief$표지: 만족도 200%, 스튜디오 헤어 변형 필수 가이드 / 촬영 퀄리티를 좌우하는 헤어 변형, 실패 없는 순서와 꿀팁 총정리
1) 풍성한 S컬 굵은 웨이브 — 가장 기본, 머리숱을 풍성하게 연출해 얼굴을 갸름·작아 보이게. TIP: 시간이 지나면 볼륨이 처질 수 있으니 첫 촬영 때 메인 풍성 드레스와 매치해 인생샷을 건지세요.
2) 로맨틱 생화 장식 반묶음 — 부케와 어울리는 잔잔한 생화로 요정 같은 무드. TIP: 귀 옆 잔머리를 살짝 빼 내추럴하게 연출하면 창가·정원 씬에서 더 사랑스러워요.
3) 단아하고 우아한 로우번 — 실크·슬림 드레스에 찰떡, 목선과 어깨 라인을 예쁘게 강조. TIP: 너무 깔끔히 넘기기보다 정수리·뒤통수 볼륨을 살려야 얼굴형이 입체적으로 예뻐 보여요.
4) 트렌디한 까치 가시번 — 유색·블랙 룩에 매치하면 힙하고 발랄한 매력. TIP: 끝부분 가시 질감을 가닥가닥 살리면 트렌디한 룩북 느낌이 제대로 나요.
마무리: 내 얼굴형을 가장 예뻐 보이게 할 원픽 헤어는? 헤어 변형 고민 중인 예신이라면 저장 필수!$brief$,
  ARRAY['Dewy','예비신부','웨딩헤어','스튜디오촬영','웨딩촬영'],
  'notion', '38ac032c-da80-8013-aab0-e6142e24750c', '389c032cda8080548976cbfd7df72faa',
  'https://app.notion.com/p/38ac032cda808013aab0e6142e24750c',
  'https://drive.google.com/drive/folders/1bCHzWYQbXAKvbB2lgVlHZqHqqbZTbLe2', '2026-06-30', 5
),
(
  '2026년 7월 웨딩촬영 트렌드',
  '더위 피하고 인생샷 건지는 썸머 화보 필승 공식 4',
  $brief$표지: 2026년 7월 웨딩촬영 트렌드 / 뻔한 공장형 스튜디오는 그만! 더위 피하고 인생샷 건지는 썸머 화보 필승 공식 4
1) 자연광 쏟아지는 도심 속 실내 가든 — 폭염·장마의 7월엔 쾌적한 실내에서 야외 느낌을 내는 통유리 가든 스튜디오가 대세. TIP: 채광 예쁜 낮 시간대를 공략해 식물과 함께 찍으면 여름 청량함이 완벽하게 담겨요.
2) 우리만의 찐일상, 데이트 스냅 — 각 잡힌 포즈 대신 단골 카페·실내 피크닉처럼 둘만의 일상을 담는 게 핵심. TIP: 시밀러룩을 맞춰 입고 찐웃음 터지는 찰나를 노리면 10년 뒤에도 안 촌스러워요.
3) 소품으로 완성하는 스토리텔링 — 뻔한 배경 대신 첫 데이트 소품·반려견으로 둘만의 서사를. TIP: 아끼는 LP판·빈티지 카메라를 툭 얹기만 해도 감각적인 매거진 화보가 돼요.
4) 오팔라이트 컬러 & 필름 무드 — 영롱한 파스텔 오팔라이트에 거친 필름 질감을 더한 빈티지 로맨스. TIP: 어두운 실내에서 플래시를 터뜨리거나 흑백 컷을 믹스하면 힙하고 세련돼져요.
마무리: 이번 여름 우리 커플 인생샷 원픽 컨셉은 몇 번? 스튜디오 고민 중이라면 저장!$brief$,
  ARRAY['Dewy','예비신부','웨딩트렌드','여름웨딩','웨딩촬영'],
  'notion', '389c032c-da80-80eb-984f-fde7afea1fde', '389c032cda8080548976cbfd7df72faa',
  'https://app.notion.com/p/389c032cda8080eb984ffde7afea1fde',
  'https://drive.google.com/drive/folders/1bCHzWYQbXAKvbB2lgVlHZqHqqbZTbLe2', '2026-07-01', 6
),
(
  '후회 없는 웨딩촬영 셀렉 노하우',
  '평생 소장할 완벽한 앨범을 완성하는 프로의 사진 고르기 비법',
  $brief$표지: 후회 없는 웨딩촬영 셀렉 노하우 / 평생 소장할 완벽한 앨범을 완성하는 프로의 사진 고르기 비법
1) 거실용 메인 액자 인생컷 먼저 정하기 — 매일 볼 대표 사진을 최우선으로 골라 앨범 중심을 잡아요. TIP: 유행 안 타는 단색 배경에 정면을 보는 인물 위주 컷이 진리예요.
2) 비슷한 배경·구도는 과감히 패스 — 넘길 때 지루하지 않게 겹치는 포즈·무드는 쿨하게 패스. TIP: 클로즈업 인물 컷과 와이드 배경 컷을 섞으면 구성이 훨씬 풍성해져요.
3) 포샵으로도 못 살리는 한계 체크 — 피부톤·몸매는 보정돼도 굳은 표정·어색한 시선은 못 바꿔요. TIP: 미소가 자연스럽고 둘의 찐텐션이 담긴 표정 맛집 원본을 무조건 픽하세요.
4) 펼쳤을 때 이어지는 스토리보드 — 양쪽 페이지를 함께 볼 때 톤앤매너가 자연스럽게 이어지게 배열. TIP: 드레스 라인·세트장 색감이 비슷한 사진끼리 짝지으면 완벽해요.
마무리: 수천 장 원본 중 가장 포기 못 하는 사진 유형은? 셀렉 앞뒀다면 저장하고 열어보세요.$brief$,
  ARRAY['Dewy','예비신부','웨딩앨범','사진셀렉','웨딩촬영'],
  'notion', '389c032c-da80-8036-830a-cf7c04e96ebd', '389c032cda8080548976cbfd7df72faa',
  'https://app.notion.com/p/389c032cda808036830acf7c04e96ebd',
  'https://drive.google.com/drive/folders/1bCHzWYQbXAKvbB2lgVlHZqHqqbZTbLe2', '2026-07-02', 7
)
ON CONFLICT (notion_page_id) DO NOTHING;
