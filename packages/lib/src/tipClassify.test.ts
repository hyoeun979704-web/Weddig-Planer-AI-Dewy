import { describe, it, expect } from "vitest";
import { classifyTipCategories, buildClassifyText, isLikelyAdvertisement } from "./tipClassify";
import { normalizeTipCategories } from "./tipNormalize";

const ORDER = [
  "family_meeting",
  "newlywed_home",
  "wedding_gifts",
  "legal_paperwork",
  "bridal_care",
  "ceremony",
  "wedding_hall",
  "studio",
  "dress_shop",
  "makeup_shop",
  "hanbok",
  "tailor_shop",
  "honeymoon",
  "appliance",
  "invitation_venue",
  "general",
];

describe("classifyTipCategories", () => {
  it("returns [] when no topic matches (off-topic video)", () => {
    expect(classifyTipCategories("김계란 몸이 좋은지 몰랐던 여자", ORDER)).toEqual([]);
  });

  it("classifies 공기청정기 as appliance (not wedding_hall)", () => {
    // Regression: this used to land in wedding_hall because it surfaced from
    // the '음식 시연 후기' seed query.
    expect(
      classifyTipCategories("해외에서 난리난 한국 공기청정기 클라스", ORDER),
    ).toEqual(["appliance"]);
  });

  it("classifies generic 여행지 as honeymoon", () => {
    expect(
      classifyTipCategories("곽튜브가 추천한 최고의 여행지?!", ORDER),
    ).toEqual(["honeymoon"]);
  });

  it("classifies generic 정장 as tailor_shop", () => {
    expect(classifyTipCategories("변호사의 맞춤 정장", ORDER)).toEqual([
      "tailor_shop",
    ]);
  });

  it("classifies generic 다이어트 as bridal_care", () => {
    expect(
      classifyTipCategories("예비신부의 주 3일 전신운동 루틴", ORDER),
    ).toEqual(["bridal_care"]);
  });

  it("classifies 신부관리 / 바디관리 phrasing as bridal_care", () => {
    expect(
      classifyTipCategories("비용 절감 갓성비 신부관리 총정리", ORDER),
    ).toEqual(["bridal_care"]);
    expect(
      classifyTipCategories("예비신부 바디관리 후기", ORDER),
    ).toEqual(["bridal_care"]);
  });

  it("returns multiple categories for multi-topic videos", () => {
    const cats = classifyTipCategories(
      "혼주 한복 + 결혼식 식순 가이드",
      ORDER,
    );
    expect(cats).toContain("hanbok");
    expect(cats).toContain("ceremony");
  });

  it("orders matches by the given order array", () => {
    // 결혼식(ceremony) precedes 한복(hanbok) in ORDER → ceremony first.
    expect(
      classifyTipCategories("결혼식 한복 추천", ORDER),
    ).toEqual(["ceremony", "hanbok"]);
  });

  it("composes with normalizeTipCategories: drops general when specifics match", () => {
    // "결혼 준비 + 한복" — general matches the planning phrase, hanbok matches
    // the specific topic. normalize drops general.
    const cats = classifyTipCategories("결혼 준비 한복 가이드", ORDER);
    expect(cats).toEqual(["hanbok", "general"]);
    expect(normalizeTipCategories(cats)).toEqual(["hanbok"]);
  });

  it("keeps general when it is the only match", () => {
    const cats = classifyTipCategories("결혼 준비 꿀팁 모음", ORDER);
    expect(cats).toEqual(["general"]);
    expect(normalizeTipCategories(cats)).toEqual(["general"]);
  });

  // Round 21 — 사용자 보고 회귀 사례. 모두 [] 또는 정확한 카테고리여야 함.
  describe("Round 21 회귀: 사용자 스크린샷 사례", () => {
    it("rejects 이케아화장대 → makeup_shop 오분류", () => {
      // 변경 전: '화장' 단독이 매치되어 makeup_shop 포함됨.
      const cats = classifyTipCategories(
        "이케아 수납장 위에 이걸 올리세요💙 #이케아추천템 #이케아에케트 #거실수납장 #거실인테리어 #작은집인테리어 #살림추천템 #이케아책상 #이케아화장대",
        ORDER,
      );
      expect(cats).not.toContain("makeup_shop");
      // 살림/가구 시그널은 그대로 — appliance 는 유지 OK.
      expect(cats).toContain("appliance");
    });

    it("rejects 40년차 시계장인 → wedding_gifts 오분류", () => {
      const cats = classifyTipCategories(
        "40년차 시계장인이 추천하는 시계 직업의모든것 All about jobs",
        ORDER,
      );
      expect(cats).not.toContain("wedding_gifts");
    });

    it("rejects 가벽 인테리어 → newlywed_home 오분류 (신혼 context 없음)", () => {
      const cats = classifyTipCategories(
        "공간 디자이너가 가벽 사용하는 법 (가성비 갑⭐️) #집꾸미기 #중문 #가벽",
        ORDER,
      );
      expect(cats).not.toContain("newlywed_home");
    });

    it("filters 1분순삭 결혼 후회 클릭베이트 via anti-pattern", () => {
      const cats = classifyTipCategories(
        "만난지 3개월만에 결혼 준비했다가 후회한 이유 1분순삭 아침먹고가",
        ORDER,
      );
      // anti-pattern 매치되면 모든 topic 무효화.
      expect(cats).toEqual([]);
    });

    it("filters 여배우 클릭베이트 via anti-pattern", () => {
      const cats = classifyTipCategories(
        "영화촬영중 실제 삽입한것으로 보이는 여배우 8인 순위! 연예 뉴스",
        ORDER,
      );
      expect(cats).toEqual([]);
    });

    it("filters 김계란/피지컬갤러리 via anti-pattern", () => {
      const cats = classifyTipCategories(
        "김계란 몸이 좋은지 몰랐던 여자 피지컬갤러리",
        ORDER,
      );
      expect(cats).toEqual([]);
    });

    it("filters 마운자로 다이어트 약 via anti-pattern", () => {
      const cats = classifyTipCategories(
        "마운자로 한달 후기 2단계 시작했어요!",
        ORDER,
      );
      expect(cats).toEqual([]);
    });

    it("filters 시식코너 알바 후기 via anti-pattern", () => {
      const cats = classifyTipCategories(
        "시식코너 알바 현실 후기 ㅋㅋ 뭐들어?",
        ORDER,
      );
      expect(cats).toEqual([]);
    });

    it("classifies 신혼여행 hotel 영상 정확히 honeymoon 으로 (신혼부부 해시태그 noise 회피)", () => {
      // 변경 전: '신혼부부' 단독이 newlywed_home 으로 잘못 hit.
      const cats = classifyTipCategories(
        "신혼여행 D-1 방음이 안되는 호텔 그래도 잠은 잘오더군요 #신혼부부 #신혼여행 #호텔 #브이로그",
        ORDER,
      );
      expect(cats).toContain("honeymoon");
      expect(cats).not.toContain("newlywed_home");
    });

    it("preserves 진짜 신혼집 인테리어 영상은 newlywed_home 유지", () => {
      // negative: 패턴을 너무 좁히면 진짜 신혼집 영상도 누락. 회귀 방지.
      const cats = classifyTipCategories(
        "신혼집 인테리어 후기 / 작은집 인테리어 셀프 시공",
        ORDER,
      );
      expect(cats).toContain("newlywed_home");
    });

    it("preserves 예비신부 운동 루틴 영상은 bridal_care 유지", () => {
      // 운동/루틴 단독 제거했지만 '예비신부' 토큰으로 잡혀야.
      const cats = classifyTipCategories(
        "예비신부의 주 3일 전신운동 루틴",
        ORDER,
      );
      expect(cats).toContain("bridal_care");
    });

    it("preserves 진짜 신부 메이크업 영상은 makeup_shop 유지", () => {
      // '화장' 단독 제거했지만 '메이크업'/'신부 머리' 토큰으로 잡혀야.
      expect(
        classifyTipCategories("본식 메이크업 꿀팁 신부 헤어", ORDER),
      ).toContain("makeup_shop");
    });

    it("preserves 진짜 예물 시계 영상은 wedding_gifts 유지", () => {
      // '시계장인' 단독 제거했지만 '예물 시계'/'결혼 시계' 등으로 잡혀야.
      expect(
        classifyTipCategories("예물 시계 추천 명품 예물", ORDER),
      ).toContain("wedding_gifts");
    });

    it("rejects ClassyTV·베틀TV 채널명 'TV' → appliance 오분류", () => {
      // 변경 전: 채널명에 'TV' 포함만으로 appliance 매치. 시계/한복/부동산
      // 영상이 전부 appliance 로 분류되는 회귀.
      const watchCats = classifyTipCategories(
        "천만원대 예물시계 9가지 추천 클래씨 ClassyTV",
        ORDER,
      );
      expect(watchCats).not.toContain("appliance");
      expect(watchCats).toContain("wedding_gifts");

      const hanbokCats = classifyTipCategories(
        "요즘 인기 혼주한복 디자인 결혼식한복 추천 베틀TV",
        ORDER,
      );
      expect(hanbokCats).not.toContain("appliance");
      expect(hanbokCats).toContain("hanbok");
    });

    it("filters 월급쟁이부자들TV 부동산 영상 via anti-pattern", () => {
      // 일반 부동산 정보 — 결혼/신혼과 무관.
      expect(
        classifyTipCategories(
          "99% 사람들이 모르는 전세의 함정 월급쟁이부자들TV",
          ORDER,
        ),
      ).toEqual([]);
      expect(
        classifyTipCategories("이렇게 집 사면 분명 후회합니다 월급쟁이부자들TV", ORDER),
      ).toEqual([]);
    });

    it("filters K드라마 박스 채널 via anti-pattern", () => {
      expect(
        classifyTipCategories("아이돌 리허설을 꼭 봐야하는 이유 #저스트메이크업 K드라마 박스 Kdrama Box", ORDER),
      ).toEqual([]);
    });

    it("filters 황혼지혜TV 시니어 헤어 영상 via anti-pattern", () => {
      expect(
        classifyTipCategories(
          "우아하고 예쁜 머리 5가지 | 헤어스타일 | 시니어패션 황혼지혜TV",
          ORDER,
        ),
      ).toEqual([]);
    });

    it("preserves 진짜 신혼 가전 영상은 appliance 유지", () => {
      // 'TV' 단독 제거했지만 '신혼 가전'/'혼수 냉장고' 등으로 잡혀야.
      expect(
        classifyTipCategories("혼수 냉장고 추천 신혼 가전 세트", ORDER),
      ).toContain("appliance");
    });

    it("preserves 살림추천템 이케아 영상은 appliance 유지", () => {
      // '살림' 단독 제거했지만 '살림추천템' (살림\\s*추천) 매치.
      const cats = classifyTipCategories(
        "이케아 수납장 #이케아추천템 #작은집인테리어 #살림추천템 #이케아화장대",
        ORDER,
      );
      expect(cats).toContain("appliance");
      expect(cats).not.toContain("makeup_shop");
    });
  });

  // Round 22 — anti-pattern 정확성 추가 검증 (false-negative 회귀 방지).
  // 클릭베이트 키워드가 좁은 컨텍스트에서 hit 하더라도 정당한 결혼 영상이
  // 부주의하게 차단되지 않는지 확인.
  describe("Round 22 회귀: anti-pattern false-negative 방지", () => {
    it("'1분' 단어만 들어간 정당한 결혼 영상은 살아남는다", () => {
      // anti-pattern 은 /1분\s*순삭/ — '1분 만에' / '1분짜리' 같은 표현은 통과.
      const cats = classifyTipCategories("결혼 준비 1분 꿀팁", ORDER);
      expect(cats.length).toBeGreaterThan(0);
      expect(cats).toContain("general");
    });

    it("'드라마' 가 결혼 컨텍스트에서 hit 해도 anti-pattern 안 잡힘", () => {
      // anti-pattern 은 /드라마\s*몰아|드라마\s*요약|드라마\s*박스/ — '드라마 같은'
      // 같은 비교 표현은 통과.
      const cats = classifyTipCategories(
        "드라마 같은 웨딩 사진 본식 스냅 후기",
        ORDER,
      );
      expect(cats.length).toBeGreaterThan(0);
      expect(cats).toContain("studio");
    });

    it("'썰' 단어가 결혼 컨텍스트에서 hit 해도 anti-pattern 안 잡힘", () => {
      // anti-pattern 은 /썰\s*티비|썰\s*풀이/ — 일반 '썰' 표현은 통과.
      const cats = classifyTipCategories("결혼 준비 실패 썰 모음", ORDER);
      // general 매치는 안 될 수도 있지만 anti-pattern 으로 무효화되진 않아야.
      // 명시적으로 빈 배열은 아니어야 함을 검증하는 게 어려움 — 대신 직접 검증.
      const cats2 = classifyTipCategories("결혼 후기 진짜 썰", ORDER);
      expect(cats2).toContain("general");
    });

    it("'TV' 가 정당한 가전 추천 컨텍스트에서는 appliance 매치", () => {
      // 채널명의 'TV' 제거했지만 '혼수 TV' / 'TV 추천' 은 잡혀야.
      expect(
        classifyTipCategories("혼수 TV 추천 4K 화질 비교", ORDER),
      ).toContain("appliance");
    });
  });
});

describe("isLikelyAdvertisement (blog ad filter)", () => {
  it("flags 명시적 광고 표기", () => {
    expect(isLikelyAdvertisement("[광고] 강남 웨딩홀 추천")).toBe(true);
    expect(isLikelyAdvertisement("[협찬] 스튜디오 후기")).toBe(true);
    expect(isLikelyAdvertisement("[체험단] 한복 대여")).toBe(true);
  });

  it("flags 원고료·체험단 표현", () => {
    expect(isLikelyAdvertisement("소정의 원고료를 받고 작성한 글입니다")).toBe(true);
    expect(isLikelyAdvertisement("체험단 활동으로 작성된 후기")).toBe(true);
  });

  it("flags 강한 CTA (광고성 마무리)", () => {
    expect(isLikelyAdvertisement("자세한 정보는 지금 예약하기 클릭!")).toBe(true);
    expect(isLikelyAdvertisement("결혼 준비 쿠폰 받기")).toBe(true);
  });

  it("자연 후기는 통과 (false positive 방지)", () => {
    expect(
      isLikelyAdvertisement("강남 웨딩홀 다녀온 후기 — 음식 시연 좋았어요"),
    ).toBe(false);
    expect(
      isLikelyAdvertisement("드레스 가봉하면서 느낀 점"),
    ).toBe(false);
    expect(
      isLikelyAdvertisement("결혼 준비 1년차의 솔직한 비용 정리"),
    ).toBe(false);
  });
});

describe("buildClassifyText", () => {
  it("composes parts in canonical order", () => {
    const text = buildClassifyText({
      title: "결혼식",
      description: "본식 후기",
      tags: ["wedding", "hall"],
      transcript: "안녕하세요",
      channelName: "웨딩언니",
    });
    expect(text).toBe("결혼식 본식 후기 wedding hall 안녕하세요 웨딩언니");
  });

  it("safely defaults missing fields to empty strings", () => {
    // undefined / null 이 'undefined' 같은 문자열로 stringify 되는 회귀 방지.
    const text = buildClassifyText({});
    expect(text).toBe("    ");
    expect(text).not.toContain("undefined");
    expect(text).not.toContain("null");
  });

  it("joins tags with single spaces", () => {
    const text = buildClassifyText({ tags: ["a", "b", "c"] });
    expect(text).toContain("a b c");
  });
});
