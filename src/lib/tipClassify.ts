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

const TOPIC_PATTERNS: ReadonlyArray<readonly [string, RegExp]> = [
  ["family_meeting", /상견례/i],
  [
    "newlywed_home",
    /신혼집|신혼\s*집|신혼\s*인테리어|신혼인테리어|신혼\s*가구|신혼\s*아파트|신혼\s*전세|신혼\s*평수|신혼부부|아파트|평수|전세|매물|이사|집\s*구하|집구하|인테리어|작은집|집꾸미기|가벽|중문/i,
  ],
  [
    "wedding_gifts",
    /예단|예물|예단함|결혼\s*반지|결혼\s*시계|예물반지|예물시계|예물함|결혼\s*함|함\s*보내|커플링|웨딩\s*밴드|웨딩밴드|혼주\s*예물|시계\s*추천|반지\s*추천|명품\s*반지|명품\s*시계|롤렉스|까르띠에|티파니|불가리|샤넬\s*반지|시계장인/i,
  ],
  [
    "legal_paperwork",
    /혼인신고|혼인\s*신고|법적\s*혼인|디딤돌\s*대출|전세자금\s*대출|혼인\s*혜택|결혼\s*지원금|혼인\s*지원/i,
  ],
  [
    "bridal_care",
    /다이어트|체지방|감량|살\s*빼|살빼|체형|몸매|헬스|홈트|팔뚝살|등살|어깨운동|마사지|피부\s*시술|피부\s*관리|뷰티\s*시술|보톡스|레이저|림프|식단|급찐|급빠|운동|전신운동|루틴/i,
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
  ["makeup_shop", /메이크업|헤어|헤메|머리|화장|뷰티|눈화장|아이라인|립스틱|파운데이션/i],
  ["hanbok", /한복|저고리|치마저고리/i],
  ["tailor_shop", /정장|턱시도|예복|슈트|수트|넥타이|셔츠|남자\s*패션/i],
  [
    "honeymoon",
    /허니문|신혼여행|honeymoon|신혼\s*여행|여행지|휴양지|패키지여행|패키지\s*여행|유럽여행|유럽\s*여행|동남아|해외여행|해외\s*여행|호텔\s*추천/i,
  ],
  [
    "appliance",
    /가전|가구|침대|매트리스|냉장고|세탁기|건조기|TV|에어컨|식기세척기|로봇청소기|청소기|공기청정기|음식물처리기|살림|혼수\s*가전|신혼\s*가전|혼수\s*가구|신혼\s*가구/i,
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
  const matched = new Set<string>();
  for (const [cat, re] of TOPIC_PATTERNS) {
    if (re.test(text)) matched.add(cat);
  }
  return order.filter((c) => matched.has(c));
}
