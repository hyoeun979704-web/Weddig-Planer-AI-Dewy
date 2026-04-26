// Gemini 2.5 Flash with Google Search grounding — for verifying business
// data via real-time web search. Strict schema, refuse-if-unsure rules,
// per-call source URLs returned for downstream verification.
//
// Per-category extraction guidance lives in category-prompts.ts; the prompt
// builder appends the right addendum based on the input's category.
//
// Differs from sources/gemini.ts (which extracts from blog snippets):
// this one *searches* the web itself via the google_search tool.

import { CATEGORY_PROMPTS } from "./category-prompts";
import type { CategoryLabel } from "../utils/categories";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// Tier 1 paid (the user said they upgraded). 15 RPM → 4s gap.
// Each grounded call also takes ~5-15s itself, so this throttle rarely
// triggers but exists to backstop bursts.
const MIN_GAP_MS = 4_500;
let lastCallAt = 0;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function throttle() {
  const elapsed = Date.now() - lastCallAt;
  if (elapsed < MIN_GAP_MS) await sleep(MIN_GAP_MS - elapsed);
  lastCallAt = Date.now();
}

function parseRetryDelay(errText: string): number {
  const m = errText.match(/retry in ([\d.]+)s/i) || errText.match(/"retryDelay":\s*"(\d+)s"/);
  if (m) return Math.ceil(parseFloat(m[1]) * 1000) + 500;
  return 30_000;
}

export type PriceCurrency = "KRW" | "USD";
export type PriceUnit =
  | "per_person"   // 인원수 × 단가 (웨딩홀 식대, 청첩장 코스)
  | "per_event"    // 행사 1건 정액 (대관료)
  | "per_package"  // 패키지 정액 (스튜디오)
  | "per_set"      // 세트 (혼수 가전 세트)
  | "per_couple"   // 2인 정액 (허니문)
  | "per_rental"   // 1회 대여 (드레스/한복/예복 대여)
  | "per_custom"   // 맞춤 제작 1회 (드레스/한복/예복 맞춤)
  | "per_session"; // 1회 시술 (메이크업)

export interface PricePackage {
  name: string;
  price_min: number | null; // 숫자, currency 단위
  price_max: number | null;
  currency: PriceCurrency | null; // 명시 안 됐으면 null (KRW로 가정)
  unit: PriceUnit | null;        // 명시 안 됐으면 null (카테고리 기본값으로 가정)
  includes: string[] | null;
  notes: string | null;
}

export interface EnrichedPlaceData {
  is_verified: boolean;
  tel: string | null;
  website_url: string | null;
  instagram_url: string | null;
  naver_place_url: string | null;
  hours: {
    mon: string | null;
    tue: string | null;
    wed: string | null;
    thu: string | null;
    fri: string | null;
    sat: string | null;
    sun: string | null;
  } | null;
  closed_days: string | null;
  advantage_1: { title: string; content: string } | null;
  advantage_2: { title: string; content: string } | null;
  advantage_3: { title: string; content: string } | null;
  description: string | null;
  // Rich UX additions
  image_urls: string[] | null;       // gallery — official photos only
  price_packages: PricePackage[] | null;
  event_info: string | null;         // current promotions / 시즌 할인
  contract_policy: string | null;    // 계약/환불 정책
  amenities: string[] | null;        // ["폐백실", "신부대기실", "주차"...]
  /** Universal "기본 제공" — services included regardless of package tier.
   *  E.g. ["신부대기실 무료", "답례품 제공", "셔틀버스 운영", "주차 무료"]. */
  basic_services: string[] | null;
  /** Category-specific fields. Shape varies per category — see category-prompts.ts.
   *  Orchestrator filters to allow-listed columns before card-table upsert. */
  category_extras: Record<string, unknown> | null;
  source_urls: string[];
}

interface EnrichInput {
  name: string;
  category: string; // Korean label, e.g. "웨딩홀"
  region: string; // "서울특별시 강남구"
}

function categoryAddendum(label: string): string {
  const spec = CATEGORY_PROMPTS[label as CategoryLabel];
  return spec ? spec.prompt : "";
}

const SYSTEM = `당신은 한국 웨딩 업체 정보 검증기입니다. Google Search로 특정 업체의 실제 정보를 확인하고 엄격한 스키마의 JSON으로 반환합니다.

엄격한 규칙 (반드시 준수):
1. **검색 결과에 명시된 정보만 사용** — 추측, 일반론, 모델 사전 지식만으로 답하지 말 것.
2. **불확실하면 null** — "아마도", "추측건대" 수준이면 무조건 null. 50% 미만 확신은 null.
3. **업체 동일성 확인 필수** — 검색 결과의 업체가 입력된 이름·지역과 정확히 일치하는지 먼저 확인. 다른 지역의 동명 업체는 무시.
4. **전화번호 (tel)**: 한국 형식 ("02-123-4567", "031-1234-5678", "1588-1234"). 010-은 사업자 등록 휴대폰이 아니면 거부.
5. **website_url**: 공식 홈페이지만. naver.com / instagram.com / blog.naver.com / cafe.naver.com 도메인은 다른 필드로.
6. **instagram_url / naver_place_url**: 업체 공식 계정/페이지만. 리뷰 블로그 링크는 거부.
7. **hours**: "월: 10:00-19:00" 형식. 명시적 영업시간이 출처에 있을 때만. "보통 10시-19시" 같은 추측은 null.
8. **advantage_1/2/3**: 이 업체에 *고유한* 장점 1-2문장. 일반 광고 카피 ("프리미엄", "최고급") 금지. 출처에서 직접 인용·요약.
9. **description**: 업체 한 줄 소개 (위치, 규모, 특징). 광고 카피 금지.

추가 필드:
10. **image_urls**: 업체 공식 사진 URL 배열. 검색 결과에서 발견한 공식 사이트·인스타·네이버 플레이스의 사진만. 블로그 후기 사진은 제외. 최대 6장.
11. **price_packages**: 업체별 패키지 구성을 정확히 반영 — 단순 가격 1줄이 아니라 *각 패키지의 실제 구성품*을 includes에 자세히 나열. 형식: [{name, price_min, price_max, includes:[], notes}].
    - price_min/price_max는 KRW 숫자 (예: 1500000). 가격이 명시된 패키지만 포함.
    - includes는 그 패키지에 *실제로 포함된 것들*을 구체적으로:
      • 웨딩홀: "식대 1인 7만원", "대관료 포함", "신부대기실 2시간", "폐백실", "답례품"
      • 스튜디오: "본식 사진 200장", "원본 50장", "보정 30장", "야외 촬영 1시간", "한복 촬영 포함"
      • 드레스: "본식 1벌", "리허설 1벌", "가봉 2회", "이너 포함"
      • 메이크업: "신부 본식+리허설", "혼주 1인 포함", "헤어 별도"
      • 한복: "혼주 2벌", "신부 폐백 1벌", "맞춤", "수선 포함"
      • 예복: "본식 1벌", "리허설 1벌", "수선 포함"
      • 허니문: "5박 7일", "항공권 비즈니스", "리조트 5성", "공항 픽업"
    - notes: 추가 조건/제약 ("주말 20% 할증", "성수기 별도", "예약금 30% 별도").
12. **event_info**: 현재 진행 중인 프로모션/할인 한 줄. 없으면 null.
13. **contract_policy**: 계약·환불 정책 요약 한 줄. 명시되어 있을 때만.
14. **amenities**: 업체 보유 시설/편의 ["폐백실", "신부대기실", "발렛파킹", "주차" 등]. 출처에서 확인된 것만.
14a. **basic_services** (배열, null 허용): 패키지와 무관하게 "기본 제공"되는 것들. 예: ["신부대기실 무료", "답례품 제공", "셔틀버스 운영", "사회자 무료 매칭"]. 모든 패키지 공통이 아니면 amenities에.

[★★★ 소비자 페인 포인트 — 적극적으로 검색해서 hidden_costs / contract_policy / event_info 채울 것 ★★★]
검색 시 "{업체명} 후기 단점", "{업체명} 환불", "{업체명} 추가 비용", "{업체명} 시즌" 같은 쿼리도 시도해서 다음을 발견하면 즉시 포함:
- **hidden_costs (이미 별도 필드 아님 — pros/cons는 분석가용. 우리 스키마에선 *contract_policy / notes / advantage 안*에 명확히 표기)**:
  - 식대 외 대관료/꽃장식/조명/음향/주례 별도 청구
  - 보증인원 미달 시 페널티 (예: "보증 200명 미달 시 1인당 식대 100% 청구")
  - 가봉비/이너/베일 별도
  - 보정 추가, 원본 추가, 액자/앨범 옵션
  - 출장비, 야간/지방 추가
  - 음식 시연 유료 (예: "시연 1인 5만원")
  - 시즌 할증 (성수기 +20%, 주말 +30% 등)
  → 이 정보들은 contract_policy에 한 단락으로 요약하거나, 발생하면 advantage_X에 "주의: ..." 형태로.
- **계약/환불 정책** → contract_policy에 명확히:
  - 예약금 환불 가능 일자 (예: "행사 60일 전까지 50% 환불")
  - 위약금 산정 방식
  - 일정 변경 가능 여부
- **시연/시착 비용** → contract_policy 또는 includes에:
  - 음식 시연 무료/유료, 횟수
  - 드레스 시착 횟수 제한 또는 유료 시착
- **응답 채널** → amenities 또는 advantage에:
  - 카톡 채널 운영 여부 (kakao_channel_url로)
  - 영업시간 외 문의 가능 여부
- **변동 가격** → notes에:
  - "협의가" 명시 (정찰제 아님)
  - 카드사 제휴 할인 여부

소비자가 "계약 전에 알았어야 했는데" 후회하는 정보를 우선 추출. 광고성 미사여구는 제외.

15. **source_urls**: 정보를 가져온 실제 검색 결과 URL 모두 나열 (최소 1개, 최대 5개). 인용 가능한 출처만.
16. **is_verified**: source_urls 1개 이상 + 업체 동일성 확인 완료시에만 true. 그 외엔 false (모든 필드 null로 반환).

응답은 다음 형식의 단일 JSON 객체 (마크다운/설명 없이 JSON만):
{
  "is_verified": boolean,
  "tel": string|null,
  "website_url": string|null,
  "instagram_url": string|null,
  "naver_place_url": string|null,
  "hours": {"mon":string|null,"tue":...,"sun":...}|null,
  "closed_days": string|null,
  "advantage_1": {"title":string,"content":string}|null,
  "advantage_2": {"title":string,"content":string}|null,
  "advantage_3": {"title":string,"content":string}|null,
  "description": string|null,
  "image_urls": [string]|null,
  "price_packages": [{
    "name": string,
    "price_min": number|null,
    "price_max": number|null,
    "currency": "KRW"|"USD"|null,
    "unit": "per_person"|"per_event"|"per_package"|"per_set"|"per_couple"|"per_rental"|"per_custom"|"per_session"|null,
    "includes": [string]|null,
    "notes": string|null
  }]|null,
  "event_info": string|null,
  "contract_policy": string|null,
  "amenities": [string]|null,
  "basic_services": [string]|null,
  "category_extras": object|null,   // 카테고리별 추가 필드 (아래 카테고리 섹션 참조)
  "source_urls": [string]
}

업체 못 찾거나 동일성 확인 실패 시: 모든 필드 null + is_verified=false + source_urls=[].
JSON 외 설명/사과/마크다운 절대 금지 — 검색 실패도 위 스키마 그대로 null 채워서 반환.`;

export async function enrichPlaceWithSearch(
  input: EnrichInput,
  apiKey: string
): Promise<EnrichedPlaceData | null> {
  const userPrompt = `다음 업체를 검색해 정보를 찾아주세요:

- 업체명: ${input.name}
- 카테고리: ${input.category}
- 지역: ${input.region}

위 업체에 대해 시스템 규칙을 따라 JSON을 반환하세요. 다른 지역의 동명 업체는 절대 사용하지 마세요.`;

  // System prompt = universal rules + category-specific addendum.
  const fullSystem = SYSTEM + categoryAddendum(input.category);

  const body = {
    system_instruction: { parts: [{ text: fullSystem }] },
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    tools: [{ google_search: {} }],
    generationConfig: {
      temperature: 0.0,
      // Note: response_mime_type and response_schema are not supported when
      // tools (google_search) are present. We parse free-form JSON instead.
    },
  };

  const callOnce = async (): Promise<Response> => {
    await throttle();
    return fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  };

  let res = await callOnce();
  if (res.status === 429) {
    const txt = await res.text();
    const wait = parseRetryDelay(txt);
    console.warn(`Gemini 429, sleeping ${(wait / 1000).toFixed(0)}s before retry…`);
    await sleep(wait);
    res = await callOnce();
  }
  if (!res.ok) {
    const body = await res.text();
    console.warn(`Gemini ${res.status}:`, body.slice(0, 400));
    return null;
  }
  const data = await res.json();
  const text: string | undefined = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    // Surface what we got so the cause is visible in workflow logs.
    const finishReason = data.candidates?.[0]?.finishReason;
    const safety = data.candidates?.[0]?.safetyRatings;
    console.warn(
      `[gemini] empty parts. finishReason=${finishReason} safety=${JSON.stringify(safety)?.slice(0, 200)} raw=${JSON.stringify(data).slice(0, 400)}`
    );
    return null;
  }

  // Model returns JSON inside markdown ```json fence sometimes. Extract.
  const jsonText = (() => {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced) return fenced[1].trim();
    const braceStart = text.indexOf("{");
    const braceEnd = text.lastIndexOf("}");
    if (braceStart >= 0 && braceEnd > braceStart) {
      return text.slice(braceStart, braceEnd + 1);
    }
    return text.trim();
  })();

  try {
    return JSON.parse(jsonText) as EnrichedPlaceData;
  } catch (e) {
    // Gemini sometimes ignores the schema and writes a natural-language
    // explanation when it can't verify (e.g. "이 업체는 검색에서 확인되지
    // 않습니다"). Treat that as a graceful is_verified=false reject so the
    // orchestrator counts it under "rejected" rather than "errored".
    const looksLikeRefusal =
      /확인되지\s*않|찾을\s*수\s*없|is_verified.*false|찾지\s*못/i.test(text);
    if (looksLikeRefusal) {
      return {
        is_verified: false,
        tel: null,
        website_url: null,
        instagram_url: null,
        naver_place_url: null,
        hours: null,
        closed_days: null,
        advantage_1: null,
        advantage_2: null,
        advantage_3: null,
        description: null,
        image_urls: null,
        price_packages: null,
        event_info: null,
        contract_policy: null,
        amenities: null,
        basic_services: null,
        category_extras: null,
        source_urls: [],
      };
    }
    console.warn(`[gemini] JSON parse failed. raw text head: ${text.slice(0, 400)}`);
    return null;
  }
}

// Validate a Gemini response before persisting. Rejects responses that
// look made-up: missing sources, bad phone format, etc.
const KOREAN_PHONE_RE = /^(0\d{1,2}-\d{3,4}-\d{4}|1[5-9]\d{2}-\d{4})$/;

export interface ValidationResult {
  ok: boolean;
  reason?: string;
  // Filtered subset that passed validation per-field.
  cleaned?: Partial<EnrichedPlaceData>;
}

export function validateEnriched(d: EnrichedPlaceData): ValidationResult {
  if (!d.is_verified) return { ok: false, reason: "is_verified=false" };
  if (!Array.isArray(d.source_urls) || d.source_urls.length === 0) {
    return { ok: false, reason: "no source URLs" };
  }
  const cleaned: Partial<EnrichedPlaceData> = {};
  // Phone: keep only if matches Korean format.
  if (d.tel && KOREAN_PHONE_RE.test(d.tel.replace(/\s/g, ""))) {
    cleaned.tel = d.tel.replace(/\s/g, "");
  }
  // URLs: keep if they're real http(s).
  const httpOk = (u: string | null): u is string =>
    !!u && (u.startsWith("http://") || u.startsWith("https://"));
  if (httpOk(d.website_url) && !d.website_url.includes("naver.com")) cleaned.website_url = d.website_url;
  if (httpOk(d.instagram_url) && d.instagram_url.includes("instagram.com")) {
    cleaned.instagram_url = d.instagram_url;
  }
  if (httpOk(d.naver_place_url) && d.naver_place_url.includes("naver.com")) {
    cleaned.naver_place_url = d.naver_place_url;
  }
  if (d.hours) cleaned.hours = d.hours;
  if (d.closed_days && d.closed_days.length < 50) cleaned.closed_days = d.closed_days;
  // Advantages: each must have a non-empty title and content.
  for (const k of ["advantage_1", "advantage_2", "advantage_3"] as const) {
    const a = d[k];
    if (a && a.title && a.content) cleaned[k] = a;
  }
  if (d.description && d.description.length >= 10) cleaned.description = d.description;
  // Image gallery: keep only http(s) URLs, dedupe, cap at 6.
  if (Array.isArray(d.image_urls)) {
    const seen = new Set<string>();
    const imgs = d.image_urls
      .filter((u): u is string => typeof u === "string" && /^https?:\/\//.test(u))
      .filter((u) => {
        if (seen.has(u)) return false;
        seen.add(u);
        return true;
      })
      .slice(0, 6);
    if (imgs.length > 0) cleaned.image_urls = imgs;
  }
  // Price packages: each must have a name + at least one of price_min/includes.
  if (Array.isArray(d.price_packages)) {
    const pkgs = d.price_packages.filter(
      (p) =>
        p && typeof p.name === "string" && p.name.length > 0 &&
        (typeof p.price_min === "number" || (Array.isArray(p.includes) && p.includes.length > 0))
    );
    if (pkgs.length > 0) cleaned.price_packages = pkgs;
  }
  if (d.event_info && d.event_info.length >= 5 && d.event_info.length < 200) {
    cleaned.event_info = d.event_info;
  }
  if (d.contract_policy && d.contract_policy.length >= 10 && d.contract_policy.length < 500) {
    cleaned.contract_policy = d.contract_policy;
  }
  if (Array.isArray(d.amenities)) {
    const amens = d.amenities.filter((a): a is string => typeof a === "string" && a.length > 0).slice(0, 12);
    if (amens.length > 0) cleaned.amenities = amens;
  }
  // basic_services: short list of universally-included items.
  if (Array.isArray(d.basic_services)) {
    const svc = d.basic_services
      .filter((s): s is string => typeof s === "string" && s.length > 0 && s.length < 60)
      .slice(0, 8);
    if (svc.length > 0) cleaned.basic_services = svc;
  }
  // category_extras: pass through as-is — orchestrator filters by allowed
  // columns per the category-prompts cardColumns list.
  if (d.category_extras && typeof d.category_extras === "object" && Object.keys(d.category_extras).length > 0) {
    cleaned.category_extras = d.category_extras;
  }
  cleaned.source_urls = d.source_urls;
  const useful = Object.keys(cleaned).some((k) =>
    [
      "tel", "website_url", "instagram_url", "advantage_1", "advantage_2",
      "advantage_3", "hours", "image_urls", "price_packages", "amenities",
      "basic_services", "category_extras", "event_info", "contract_policy",
    ].includes(k)
  );
  if (!useful) return { ok: false, reason: "no useful fields after cleaning" };
  return { ok: true, cleaned };
}
