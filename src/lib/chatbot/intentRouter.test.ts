import { describe, expect, it } from "vitest";
import { matchIntent } from "./intentRouter";

// 의도(가설): 각 입력이 기대한 intent로 라우팅되는지 + 정적/DB/가이드 여부 확인.
// PR 1에서 좁힌 pricing 패턴만 narrow 의도, 나머지는 broad 의도(LLM 호출 절감).

describe("matchIntent — 정적 응답 (staticReply)", () => {
  it("인사: 다양한 표현이 모두 greeting으로", () => {
    for (const input of ["안녕", "안녕하세요", "하이", "hi", "Hello", "반가워요", "처음 와봤어요", "안뇽"]) {
      const m = matchIntent(input);
      expect(m?.intent, `input="${input}"`).toBe("greeting");
      expect(m?.staticReply, `input="${input}"`).toBeTruthy();
    }
  });

  it("감사", () => {
    for (const input of ["고마워", "감사합니다", "thanks", "thx", "땡큐"]) {
      const m = matchIntent(input);
      expect(m?.intent, `input="${input}"`).toBe("thanks");
      expect(m?.staticReply, `input="${input}"`).toBeTruthy();
    }
  });

  it("도움말", () => {
    for (const input of ["도움말 보여줘", "어떻게 써?", "어떻게 사용해", "기능 뭐 있어?", "도와줘"]) {
      const m = matchIntent(input);
      expect(m?.intent, `input="${input}"`).toBe("help");
      expect(m?.staticReply, `input="${input}"`).toBeTruthy();
    }
  });

  it("서비스 소개 — broad 의도 (호명·무료 단어도 정적 응답)", () => {
    // "듀이야 도와줘"는 도움 요청 의미가 강해서 help가 먼저 매칭 — 의도된 동작.
    for (const input of [
      "듀이가 뭐야",
      "dewy 가 뭐예요",
      "이 앱 뭐야",
      "이 서비스 소개해줘",
      "무료로 쓸 수 있어?",
    ]) {
      const m = matchIntent(input);
      expect(m?.intent, `input="${input}"`).toBe("service_intro");
      expect(m?.staticReply, `input="${input}"`).toBeTruthy();
    }
  });

  it("가격 — 구독 맥락에서만 (식대·예물 '얼마'는 빠지지 않게)", () => {
    // 구독 관련 → pricing
    for (const input of [
      "구독 얼마야",
      "프리미엄 가격 알려줘",
      "premium 비용",
      "월정액 얼마",
      "환불 가능해?",
      "구독 취소 어떻게",
    ]) {
      const m = matchIntent(input);
      expect(m?.intent, `input="${input}"`).toBe("pricing");
    }

    // 결혼 도메인 "얼마" → pricing 아니어야 함
    for (const input of ["식대 얼마가 적당해?", "예물 얼마짜리가 좋아?", "스튜디오 얼마야"]) {
      const m = matchIntent(input);
      expect(m?.intent, `input="${input}"`).not.toBe("pricing");
    }

    // "환불" 단독 false positive 체크 — 결제 컨텍스트면 pricing OK
    expect(matchIntent("환불 가능?")?.intent).toBe("pricing");
  });

  it("문의", () => {
    for (const input of ["문의하고 싶어", "이메일 알려줘", "고객 센터", "cs"]) {
      const m = matchIntent(input);
      expect(m?.intent, `input="${input}"`).toBe("contact");
    }
  });
});

describe("matchIntent — DB 핸들러 라우팅", () => {
  it("D-Day", () => {
    for (const input of [
      "D-Day 알려줘",
      "디데이 며칠?",
      "결혼식까지 며칠 남았어",
      "예식까지 얼마 남았어",
      "결혼 며칠 남았어", // 단어 "결혼" 단독 케이스 — 이전 회귀
      "결혼까지 얼마나 남았나",
    ]) {
      const m = matchIntent(input);
      expect(m?.intent, `input="${input}"`).toBe("dday");
      expect(m?.dbHandler, `input="${input}"`).toBe("dday");
    }
  });

  it("D-Day 오트리거 방지 — 예산/포인트/하트 '얼마 남았어'는 dday 아님", () => {
    for (const input of ["예산 얼마 남았어?", "포인트 얼마 남았어", "하트 얼마 남았어"]) {
      const m = matchIntent(input);
      expect(m?.intent, `input="${input}"`).not.toBe("dday");
    }
  });

  it("예산 요약 — '예산 얼마' 같은 핵심 질문이 pricing이 아닌 budget_summary로", () => {
    for (const input of ["예산 얼마 남았어?", "예산 확인", "예산 보여줘", "지출 얼마야?"]) {
      const m = matchIntent(input);
      expect(m?.intent, `input="${input}"`).toBe("budget_summary");
      expect(m?.dbHandler, `input="${input}"`).toBe("budget");
    }
  });

  it("일정", () => {
    expect(matchIntent("오늘 일정 뭐 있어?")?.dbHandler).toBe("schedule_today");
    expect(matchIntent("이번 주 일정 보여줘")?.dbHandler).toBe("schedule_upcoming");
  });

  it("체크리스트", () => {
    for (const input of ["3개월 전 할 일", "체크리스트 보여줘", "지금 뭐 해야 돼?"]) {
      const m = matchIntent(input);
      expect(m?.dbHandler, `input="${input}"`).toBe("checklist");
    }
  });

  it("AI 사용량 — broad 의도 (false positive 허용)", () => {
    for (const input of ["AI 몇 번 썼어?", "챗봇 몇 번", "AI 사용량 알려줘", "오늘 몇 번이나"]) {
      const m = matchIntent(input);
      expect(m?.intent, `input="${input}"`).toBe("ai_usage");
      expect(m?.dbHandler, `input="${input}"`).toBe("ai_usage");
    }
  });

  it("찜·장바구니·하트·포인트", () => {
    expect(matchIntent("찜 목록 보여줘")?.dbHandler).toBe("favorites");
    expect(matchIntent("장바구니")?.dbHandler).toBe("cart");
    expect(matchIntent("하트 잔액 얼마")?.dbHandler).toBe("hearts");
    expect(matchIntent("포인트 얼마 남았어")?.dbHandler).toBe("points");
  });

  it("찜 자연어 변형 — 카테고리 없으면 정적 favorites, 카테고리 있으면 동적", () => {
    // 카테고리 키워드 없음 → 정적 favorites (전체)
    expect(matchIntent("찜한 거 알려줘")?.dbHandler).toBe("favorites");
    expect(matchIntent("북마크 보여줘")?.dbHandler).toBe("favorites");
    expect(matchIntent("즐겨찾기 확인")?.dbHandler).toBe("favorites");

    // 카테고리 키워드 있음 → 동적 매칭으로 favorites_by_type/search
    // (정적 favorites 패턴이 카테고리 키워드 표현은 안 잡아야 동적으로 빠짐)
    const videoMatch = matchIntent("찜한 영상 보여줘");
    expect(videoMatch?.dbHandler).toBe("favorites_by_type");
    expect(videoMatch?.args?.itemType).toBe("tip_video");
  });

  it("결혼 정보 종합", () => {
    expect(matchIntent("내 결혼 정보 보여줘")?.dbHandler).toBe("wedding_info");
    expect(matchIntent("내 예식")?.dbHandler).toBe("wedding_info");
  });

  it("주문·결제·커뮤니티 활동", () => {
    expect(matchIntent("주문 내역 보여줘")?.dbHandler).toBe("orders");
    expect(matchIntent("결제 내역")?.dbHandler).toBe("payments");
    expect(matchIntent("내가 쓴 글")?.dbHandler).toBe("my_posts");
    expect(matchIntent("내 댓글")?.dbHandler).toBe("my_comments");
  });

  it("커플 연동·다이어리·투표", () => {
    expect(matchIntent("파트너 연결 상태")?.dbHandler).toBe("couple_status");
    expect(matchIntent("다이어리")?.dbHandler).toBe("diary");
    expect(matchIntent("진행 중 투표 알려줘")?.dbHandler).toBe("votes");
  });

  it("구독·드레스 피팅·하트 이력", () => {
    expect(matchIntent("구독 상태 확인")?.dbHandler).toBe("subscription_status");
    expect(matchIntent("드레스 피팅 기록")?.dbHandler).toBe("dress_fitting_history");
    expect(matchIntent("하트 이력 알려줘")?.dbHandler).toBe("heart_history");
  });

  it("활동 요약·이번 주", () => {
    expect(matchIntent("내 활동 요약 보여줘")?.dbHandler).toBe("activity_summary");
    expect(matchIntent("이번 주 활동")?.dbHandler).toBe("this_week");
  });

  it("진단 (예산·일정·계약·체크리스트)", () => {
    expect(matchIntent("예산 분석해줘")?.dbHandler).toBe("budget_diagnosis");
    expect(matchIntent("일정 점검해줘")?.dbHandler).toBe("schedule_diagnosis");
    expect(matchIntent("계약 진행 상황")?.dbHandler).toBe("contract_progress");
    expect(matchIntent("체크리스트 진척률")?.dbHandler).toBe("checklist_progress");
  });

  it("자유 검색·시세·인기 업체", () => {
    expect(matchIntent("강남 웨딩홀 추천")?.dbHandler).toBe("free_search");
    expect(matchIntent("웨딩홀 시세 어때")?.dbHandler).toBe("average_price");
    expect(matchIntent("인기 스튜디오")?.dbHandler).toBe("popular_places");
  });
});

describe("matchIntent — 정적 가이드 (guideKey)", () => {
  it("스드메 시기", () => {
    expect(matchIntent("스드메 언제 예약해야 돼?")?.guideKey).toBe("sdme_timing");
    expect(matchIntent("드레스 언제 예약")?.guideKey).toBe("sdme_timing");
  });

  it("청첩장 시기", () => {
    expect(matchIntent("청첩장 언제 보내")?.guideKey).toBe("invitation_timing");
  });

  it("메이크업 시연·신혼여행·계약·예단/예물·답례품·신혼집·식순", () => {
    expect(matchIntent("메이크업 시연 언제")?.guideKey).toBe("makeup_trial");
    expect(matchIntent("신혼여행 언제 예약")?.guideKey).toBe("honeymoon_timing");
    expect(matchIntent("계약할 때 체크 포인트")?.guideKey).toBe("contract_check");
    expect(matchIntent("예단 매너")?.guideKey).toBe("etiquette");
    expect(matchIntent("답례품 추천")?.guideKey).toBe("gift_etiquette");
    expect(matchIntent("신혼집 준비 체크")?.guideKey).toBe("new_home");
    expect(matchIntent("본식 식순 보여줘")?.guideKey).toBe("ceremony_progress");
  });
});

describe("matchIntent — 매칭 없음(LLM으로 폴백)", () => {
  it("일반적인 결혼 질문은 LLM으로", () => {
    // 어떤 정적 패턴에도 안 걸리는 자유 질문들.
    // 참고: "어떻게 써?" 같은 표현은 help 패턴(broad)에 잡힘 — 비용 절감 의도된 동작.
    for (const input of [
      "신부 입장곡 추천해줘",
      "신혼여행 어디가 좋아",
      "혼주 한복 색상 추천",
    ]) {
      const m = matchIntent(input);
      expect(m, `input="${input}"`).toBeNull();
    }
  });

  it("빈 입력", () => {
    expect(matchIntent("")).toBeNull();
    expect(matchIntent("   ")).toBeNull();
  });
});
