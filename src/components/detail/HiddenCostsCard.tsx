// 추가금 함정 사전 차단 카드 — P3(절약 분석형) 핵심, P1/P13/P14/P18 광범위 영향.
// place.hidden_costs (업체별 등록값) 외에 카테고리 표준 추가금 체크리스트를 함께
// 보여줘서 "이 항목들 견적에 포함됐는지 확인하세요" 가이드를 제공한다.

import { AlertCircle } from "lucide-react";

const CATEGORY_HIDDEN_COSTS: Record<string, { items: { label: string; range: string }[]; tip: string }> = {
  wedding_hall: {
    items: [
      { label: "원본 데이터 파일", range: "30~50만" },
      { label: "헬퍼 이모님(메이크업/드레스 출장)", range: "20~40만" },
      { label: "얼리스타트(아침 식)", range: "20~50만" },
      { label: "보증인원 미달 식대", range: "보증×식대" },
      { label: "추가 시간 비용", range: "시간당 20~50만" },
      { label: "우천 시 야외 대안 사용료", range: "20~80만" },
    ],
    tip: "견적서에 위 항목이 명시돼 있는지 계약 전 점검. '포함'·'불포함'·'옵션' 으로 구분 요청.",
  },
  studio: {
    items: [
      { label: "원본 데이터 추가 비용", range: "30~80만" },
      { label: "보정 컷 추가", range: "장당 3~10만" },
      { label: "앨범 업그레이드", range: "20~150만" },
      { label: "촬영 시간 초과", range: "시간당 10~30만" },
      { label: "추가 의상", range: "벌당 10~30만" },
    ],
    tip: "원본 파일 포함 여부가 가장 큰 변수. 보정 컷 수와 앨범 종류는 견적 받기 전 합의.",
  },
  dress_shop: {
    items: [
      { label: "피팅 추가 횟수", range: "회당 5~15만" },
      { label: "클리닝비", range: "10~30만" },
      { label: "훼손 시 배상금 상한", range: "계약서 확인" },
      { label: "당일 변경 가능 여부", range: "패키지별" },
      { label: "액세서리(베일·티아라)", range: "5~30만" },
    ],
    tip: "피팅 횟수 + 액세서리 포함 여부가 가격 차이의 핵심. 훼손 상한이 무제한인 곳은 피해야.",
  },
  makeup_shop: {
    items: [
      { label: "리허설 메이크업 포함 여부", range: "10~30만" },
      { label: "본식 당일 얼리스타트", range: "5~20만" },
      { label: "동행인 메이크업(혼주)", range: "1인 10~25만" },
      { label: "출장 비용", range: "거리별 5~20만" },
    ],
    tip: "리허설 포함 여부 + 혼주 메이크업 인원이 비용 변수.",
  },
  honeymoon: {
    items: [
      { label: "공항 라운지/패스트트랙", range: "1인 5~15만" },
      { label: "현지 가이드/투어", range: "30~150만" },
      { label: "취소 환불 수수료", range: "출발일 기준" },
      { label: "보험 포함 여부", range: "1인 5~20만" },
      { label: "리조트 부대시설(스파)", range: "옵션" },
    ],
    tip: "취소·환불 규정과 보험 포함 여부가 결정적. 패키지 외 옵션은 따로 견적.",
  },
};

export interface HiddenCostsCardProps {
  category: string;
  hiddenCostsByPlace: string[];
}

export default function HiddenCostsCard({ category, hiddenCostsByPlace }: HiddenCostsCardProps) {
  const std = CATEGORY_HIDDEN_COSTS[category];
  if (!std && hiddenCostsByPlace.length === 0) return null;

  return (
    <section className="px-4 pt-3 pb-2">
      <h3 className="font-bold text-sm mb-2 flex items-center gap-1.5">
        <AlertCircle className="w-4 h-4 text-amber-600" />
        <span className="text-amber-700">계약 전 확인 — 추가금 함정</span>
      </h3>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2.5">
        {/* 업체별 등록 추가금 항목 — DB 등록값. 가장 신뢰 높음 */}
        {hiddenCostsByPlace.length > 0 && (
          <div>
            <p className="text-[11px] font-bold text-amber-800 mb-1">이 업체 특이 사항</p>
            <ul className="text-xs text-amber-900 space-y-1">
              {hiddenCostsByPlace.map((c, i) => (
                <li key={i} className="flex gap-1.5">
                  <span></span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {/* 카테고리 표준 체크리스트 — 견적서에 명시됐는지 검증 가이드 */}
        {std && (
          <div>
            {hiddenCostsByPlace.length > 0 && (
              <div className="border-t border-amber-200 my-2" />
            )}
            <p className="text-[11px] font-bold text-amber-800 mb-1.5">
              {category === "wedding_hall" ? "웨딩홀" : category === "studio" ? "스튜디오" : category === "dress_shop" ? "드레스" : category === "makeup_shop" ? "메이크업" : "허니문"} 표준 추가금 체크리스트
            </p>
            <ul className="text-[11px] text-amber-900 space-y-1">
              {std.items.map((item, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span className="flex-1">{item.label}</span>
                  <span className="text-amber-700 font-medium shrink-0">{item.range}</span>
                </li>
              ))}
            </ul>
            <p className="text-[10px] text-amber-800 mt-2 leading-snug border-t border-amber-200 pt-1.5">
              {std.tip}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
