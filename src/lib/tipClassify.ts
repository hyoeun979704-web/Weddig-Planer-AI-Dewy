// Topic classifier for tip videos.
//
// The collector pulls videos by seed query (e.g. "음식 시연 후기" for
// wedding_hall), but YouTube routinely returns off-topic results — a
// "공기청정기" review surfaced from the food-tasting query has nothing to
// do with venues. Tagging by query alone produces visible mismatches in
// the Tips UI (a 공기청정기 thumbnail under the 웨딩홀 chip).
//
// This module classifies a video by scanning its own text (title +
// description + channel name) against broad topic patterns. A video can
// match multiple topics — 한복 + 결혼식 surfaces under both — and a video
// that matches nothing returns []. Patterns intentionally do not require
// a wedding prefix: a generic 다이어트 video is still useful under
// bridal_care, a generic 가전 review under appliance.
//
// Round 21 — 사용자 보고 회귀 정정:
//   ① 분류 0개 영상이 UI 노출 (영화 여배우·김계란 등 클릭베이트) →
//      collector + DB 레벨에서 차단 (useTipVideos.is_active 활용)
//   ② "이케아화장대" 가 makeup_shop 로 오분류 → "화장" 단독 제거
//   ③ "40년차 시계장인 추천 시계" 가 wedding_gifts 로 오분류 → 제거
//   ④ "공간 디자이너 가벽 사용법" 가 newlywed_home 로 오분류 → 약한 단독 제거
//   ⑤ "1분순삭" 류 드라마 몰아보기가 general 로 통과 → ANTI_PATTERNS 도입

// 분류 후 강제 무효화 — 명백한 off-topic 시그널이 있으면 어떤 topic 도 매칭
// 되지 않은 것으로 간주. classifier 가 우연히 잡은 topic 을 override.
const ANTI_PATTERNS: ReadonlyArray<RegExp> = [
  // 클릭베이트 / 드라마 몰아보기 / 짧은 정보 가공
  /1분\s*순삭|순삭\s*드라마|드라마\s*몰아|드라마\s*요약|썰\s*티비|썰\s*풀이|짤\s*편집|아침먹고가/i,
  // 연예 가십 / 배우 순위
  /여배우|연예\s*뉴스|연예\s*가십|아이돌\s*몸매|배우\s*순위|연예인\s*근황|연예인\s*몸매/i,
  // 헬스 유튜버 가십 (피지컬갤러리 등)
  /피지컬\s*갤러리|운동\s*유튜버|헬스\s*유튜버|보디빌딩\s*대회/i,
  // 명백한 무관 토픽
  /시식\s*코너|알바\s*후기|초봉|마운자로|쇼츠\s*다운|영상\s*소스\s*다운/i,
  // 시댁/혼수 막장 드라마 (실용 정보 아님)
  /시모\s*참교육|시댁\s*참교육|시모\s*복수|썰\s*풀이/i,
  // 부동산 매수 자금 (결혼과 무관한 일반 부동산)
  /\d+억\s*짜리\s*집\s*매수|매수\s*자금\s*계획/i,
  // 채널 단위 noise — 결혼과 무관한 일반 부동산/시니어/드라마 큐레이션
  /월급쟁이부자들|황혼지혜|K드라마\s*박스|드라마\s*박스/i,
  // 부동산 일반 클릭베이트 ("99% 모르는", "전세의 함정" 등 일반 부동산 정보)
  /\d+%\s*(사람들이|이상이)\s*모르는|전세의\s*함정|집\s*사면\s*분명\s*후회/i,
];

const TOPIC_PATTERNS: ReadonlyArray<readonly [string, RegExp]> = [
  ["family_meeting", /상견례/i],
  // Round 21 — 약한 단독 토큰 (아파트/평수/이사/매물/인테리어/가벽/중문) 제거.
  // "공간 디자이너 가벽 사용법" 같은 일반 인테리어 영상이 오분류되어 사용자
  // 보고. 신혼 prefix 가 있거나 작은집·혼수 specific 토큰만 매칭.
  [
    "newlywed_home",
    /신혼집|신혼\s*집|신혼\s*인테리어|신혼인테리어|신혼\s*가구|신혼\s*아파트|신혼\s*전세|신혼\s*평수|신혼\s*매물|신혼\s*이사|혼수\s*가구|예비\s*신혼|작은집\s*인테리어|신혼\s*전셋집|신혼\s*살림/i,
  ],
  // Round 21 — "시계장인" 제거 (40년차 시계장인 추천 시계 같은 일반 시계 영상
  // 오분류).
  [
    "wedding_gifts",
    /예단|예물|예단함|결혼\s*반지|결혼\s*시계|예물반지|예물시계|예물함|결혼\s*함|함\s*보내|커플링|웨딩\s*밴드|웨딩밴드|혼주\s*예물|결혼\s*시계\s*추천|예물\s*시계|웨딩\s*시계|웨딩\s*반지|예물\s*반지|명품\s*예물/i,
  ],
  [
    "legal_paperwork",
    /혼인신고|혼인\s*신고|법적\s*혼인|디딤돌\s*대출|전세자금\s*대출|혼인\s*혜택|결혼\s*지원금|혼인\s*지원/i,
  ],
  // Round 21 — "운동"/"식단"/"루틴" 단독 제거. wedding context 가 있는 토큰만
  // 유지. 일반 헬스/식단 영상이 신부관리로 흘러드는 것을 막음. "예비신부"
  // 같은 wedding context 명시 토큰 추가.
  [
    "bridal_care",
    /다이어트|체지방|감량|살\s*빼|살빼|체형|몸매|헬스|홈트|팔뚝살|등살|어깨운동|마사지|피부\s*시술|피부\s*관리|뷰티\s*시술|보톡스|레이저|림프|예비\s*신부|예비신부|신부관리|신부\s*관리|바디관리|바디\s*관리|예신\s*관리|예비신부\s*관리|웨딩\s*다이어트|결혼\s*다이어트|웨딩\s*헬스|신부\s*다이어트/i,
  ],
  [
    "ceremony",
    /결혼식|본식|예식|주례|사회자\s*멘트|식순|축의금|답례품|하객|부케|폐백|혼주\s*인사|결혼\s*진행|결혼\s*순서|결혼식\s*순서|예식\s*순서|신랑\s*입장|신부\s*입장|결혼\s*준비\s*순서|결혼식\s*비용|결혼\s*비용|결혼\s*시간대/i,
  ],
  [
    "wedding_hall",
    /웨딩홀|예식장|결혼식장|스몰웨딩|호텔웨딩|하우스웨딩|야외웨딩|예식\s*홀|결혼식\s*홀|음식\s*시연|음식시연|시연\s*후기/i,
  ],
  [
    "studio",
    /웨딩\s*스튜디오|웨딩스튜디오|본식\s*스냅|본식스냅|셀프\s*웨딩|셀프웨딩|리허설\s*촬영|본식\s*DVD|스드메|웨딩\s*촬영|웨딩촬영|결혼\s*촬영|웨딩\s*사진|웨딩사진|본식\s*촬영|드레스\s*투어|드레스투어|예비신부\s*촬영/i,
  ],
  ["dress_shop", /드레스/i],
  // Round 21 — "화장"/"머리" 단독 제거. "이케아화장대" 가 makeup_shop 으로
  // 오분류되어 사용자 보고. specific 토큰 (화장품/화장법/신부 화장 등) 으로 좁힘.
  [
    "makeup_shop",
    /메이크업|헤어\s*메이크업|헤메|웨딩\s*헤어|신부\s*헤어|신부\s*머리|화장품|화장법|신부\s*화장|뷰티\s*시술|아이라인|립스틱|파운데이션|마스카라|아이섀도|쉐도우|블러셔|치크/i,
  ],
  ["hanbok", /한복|저고리|치마저고리/i],
  ["tailor_shop", /정장|턱시도|예복|슈트|수트|넥타이|셔츠|남자\s*패션/i],
  [
    "honeymoon",
    /허니문|신혼여행|honeymoon|신혼\s*여행|여행지|휴양지|패키지여행|패키지\s*여행|유럽여행|유럽\s*여행|동남아|해외여행|해외\s*여행|호텔\s*추천/i,
  ],
  // Round 21 — "TV" 단독 제거. 채널명 "ClassyTV"·"베틀TV"·"부읽남TV" 등의
  // 'TV' 가 매치되어 시계/부동산/한복 영상이 전부 appliance 로 오분류.
  // 명시적 가전 컨텍스트 (혼수 TV / 신혼 TV / TV 추천) 만 잡음.
  [
    "appliance",
    /가전|가구|침대|매트리스|냉장고|세탁기|건조기|에어컨|식기세척기|로봇청소기|청소기|공기청정기|음식물처리기|살림\s*템|살림\s*추천|혼수\s*가전|신혼\s*가전|혼수\s*가구|신혼\s*가구|혼수\s*TV|신혼\s*TV|TV\s*추천/i,
  ],
  ["invitation_venue", /청첩장|모청|모바일\s*청첩장/i],
  [
    "general",
    /결혼\s*준비|예비부부|결혼\s*꿀팁|웨딩\s*꿀팁|결혼\s*후기|결혼\s*비용|결혼\s*기간|결혼\s*시작|웨딩\s*트렌드|결혼\s*트렌드|시집보내/i,
  ],
];

export function classifyTipCategories(
  text: string,
  order: ReadonlyArray<string>,
): string[] {
  // Anti-pattern 우선 — off-topic 시그널 1개라도 매치되면 어떤 topic 도 매칭
  // 안 된 것으로 간주. classifier 가 우연히 잡은 카테고리를 override.
  for (const re of ANTI_PATTERNS) {
    if (re.test(text)) return [];
  }
  const matched = new Set<string>();
  for (const [cat, re] of TOPIC_PATTERNS) {
    if (re.test(text)) matched.add(cat);
  }
  return order.filter((c) => matched.has(c));
}

/**
 * 분류 입력 텍스트의 표준 구성. collect-tips/index.ts, sync-channels-rss.ts,
 * reclassify.ts 가 동일한 순서·구성으로 텍스트를 생성하도록 보장 —
 * 세 스크립트의 drift 가능성을 차단.
 *
 * 순서: title → full description (videos.list) → creator tags (snippet.tags)
 * → transcript (youtube-transcript) → channel name.
 *
 * 각 필드는 빈 문자열로 안전하게 default — undefined 가 "undefined" 문자열로
 * stringify 되는 회귀 방지.
 */
export function buildClassifyText(parts: {
  title?: string | null;
  description?: string | null;
  tags?: ReadonlyArray<string> | null;
  transcript?: string | null;
  channelName?: string | null;
}): string {
  const title = parts.title ?? "";
  const description = parts.description ?? "";
  const tagsText = (parts.tags ?? []).join(" ");
  const transcript = parts.transcript ?? "";
  const channelName = parts.channelName ?? "";
  return `${title} ${description} ${tagsText} ${transcript} ${channelName}`;
}
