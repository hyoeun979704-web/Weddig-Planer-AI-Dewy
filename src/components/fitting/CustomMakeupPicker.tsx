/**
 * 맞춤 메이크업 피커 — 카탈로그 대신 사용자가 속성을 직접 골라 텍스트 전용 생성.
 *
 * 코드 어휘는 반드시 src/lib/makeupDescription.ts(describeMakeup)의 맵 키와 일치해야 한다.
 * "가장 편한 UX": 무드 프리셋 1탭 → 핵심 3개(베이스·립·아이) 노출 → 세부는 접기.
 */
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, Sparkles } from "lucide-react";
import type { MakeupMetadata } from "@/lib/makeupDescription";

type Opt = { value: string; label: string };

const BASE: Opt[] = [
  { value: "SATIN", label: "새틴(추천)" }, { value: "DEWY", label: "촉촉광" },
  { value: "GLOWY", label: "투명광" }, { value: "MATTE", label: "매트" },
  { value: "NATURAL_SKIN", label: "노메이크업" },
];
const LIP_COLOR: Opt[] = [
  { value: "MLBB", label: "MLBB" }, { value: "NUDE", label: "뉴드" }, { value: "PEACH", label: "피치" },
  { value: "CORAL", label: "코랄" }, { value: "ROSE", label: "로즈" }, { value: "RED", label: "레드" },
  { value: "BERRY", label: "베리" }, { value: "MAUVE", label: "모브" },
];
const EYE_STYLE: Opt[] = [
  { value: "NATURAL", label: "내추럴" }, { value: "KOREAN_INNER", label: "이너음영" },
  { value: "BARE", label: "베어" }, { value: "DOLL", label: "도리" },
  { value: "CAT_EYE", label: "캣아이" }, { value: "SMOKY", label: "스모키" },
  { value: "GLITTER", label: "글리터" },
];
const LIP_FINISH: Opt[] = [
  { value: "TINTED", label: "틴티드" }, { value: "GLOSSY", label: "글로시" }, { value: "SATIN", label: "새틴" },
  { value: "MATTE", label: "매트" }, { value: "BLURRED", label: "블러드" },
];
const EYE_COLOR: Opt[] = [
  { value: "NEUTRAL", label: "뉴트럴" }, { value: "PEACH", label: "피치" }, { value: "ROSE_BROWN", label: "로즈브라운" },
  { value: "BROWN", label: "브라운" }, { value: "BURGUNDY", label: "버건디" }, { value: "BRONZE", label: "브론즈" },
  { value: "PLUM", label: "플럼" },
];
const BLUSH_COLOR: Opt[] = [
  { value: "PEACH", label: "피치" }, { value: "PINK", label: "핑크" }, { value: "CORAL", label: "코랄" },
  { value: "ROSE", label: "로즈" }, { value: "NUDE", label: "뉴드" }, { value: "NONE", label: "없음" },
];
const BLUSH_PLACEMENT: Opt[] = [
  { value: "APPLE", label: "애플존" }, { value: "UNDER_EYE", label: "언더아이(애교살)" },
  { value: "OUTER_CHEEK", label: "아웃터" }, { value: "DRAPED", label: "드레이프" }, { value: "NONE", label: "없음" },
];
const BROW: Opt[] = [
  { value: "KOREAN_STRAIGHT", label: "일자" }, { value: "SOFT_ARCH", label: "소프트아치" },
  { value: "NATURAL_FLAT", label: "내추럴" }, { value: "FEATHERY", label: "페더리" }, { value: "DEFINED", label: "또렷" },
];
const CONTOUR: Opt[] = [
  { value: "NONE", label: "없음" }, { value: "SUBTLE", label: "약하게" },
  { value: "NATURAL", label: "자연스럽게" }, { value: "DEFINED", label: "또렷하게" },
];
const DETAIL: Opt[] = [
  { value: "HIGHLIGHT", label: "하이라이트" }, { value: "INNER_CORNER", label: "이너코너" },
  { value: "GLITTER_TEAR", label: "글리터" }, { value: "OMBRE_LIP", label: "옴브레립" },
  { value: "OVERLINE", label: "오버립" }, { value: "FAUX_FRECKLE", label: "주근깨" }, { value: "LASH_EXT", label: "래쉬" },
];

type Preset = { key: string; label: string; emoji: string; meta: MakeupMetadata };
const PRESETS: Preset[] = [
  { key: "NATURAL", label: "내추럴", emoji: "🌿", meta: { base_finish: "NATURAL_SKIN", lip_color: "MLBB", lip_finish: "TINTED", eye_style: "NATURAL", eye_color: "NEUTRAL", blush_color: "PEACH", blush_placement: "APPLE", brow_shape: "NATURAL_FLAT", contour_intensity: "SUBTLE", mood: ["FRESH_NATURAL"] } },
  { key: "ROMANTIC", label: "로맨틱", emoji: "🌸", meta: { base_finish: "GLOWY", lip_color: "ROSE", lip_finish: "SATIN", eye_style: "KOREAN_INNER", eye_color: "ROSE_BROWN", blush_color: "ROSE", blush_placement: "UNDER_EYE", brow_shape: "SOFT_ARCH", contour_intensity: "NATURAL", details: ["HIGHLIGHT"], mood: ["ROMANTIC"] } },
  { key: "GLAM", label: "글램", emoji: "💋", meta: { base_finish: "SATIN", lip_color: "RED", lip_finish: "SATIN", eye_style: "SMOKY", eye_color: "BROWN", blush_color: "NUDE", blush_placement: "OUTER_CHEEK", brow_shape: "DEFINED", contour_intensity: "DEFINED", details: ["OVERLINE", "LASH_EXT"], mood: ["GLAMOROUS"] } },
  { key: "CLASSIC", label: "클래식", emoji: "🤍", meta: { base_finish: "SATIN", lip_color: "ROSE", lip_finish: "SATIN", eye_style: "NATURAL", eye_color: "BROWN", blush_color: "PINK", blush_placement: "APPLE", brow_shape: "SOFT_ARCH", contour_intensity: "NATURAL", mood: ["CLASSIC"] } },
];

const AXES: Record<string, Opt[]> = {
  base_finish: BASE, lip_color: LIP_COLOR, eye_style: EYE_STYLE,
  lip_finish: LIP_FINISH, eye_color: EYE_COLOR, blush_color: BLUSH_COLOR,
  blush_placement: BLUSH_PLACEMENT, brow_shape: BROW, contour_intensity: CONTOUR,
};
const koLabel = (axis: string, val?: string | null): string | null =>
  val ? (AXES[axis]?.find((o) => o.value === val)?.label ?? val) : null;

/** 리뷰/배지용 한국어 요약(베이스·립·아이). */
export const summarizeMakeupKo = (m: MakeupMetadata): string => {
  const parts = [koLabel("base_finish", m.base_finish), koLabel("lip_color", m.lip_color), koLabel("eye_style", m.eye_style)]
    .filter(Boolean);
  return parts.length ? parts.join(" · ") : "맞춤 메이크업";
};

export function CustomMakeupPicker({
  value, onChange, onConfirm, recommended,
}: {
  value: MakeupMetadata;
  onChange: (m: MakeupMetadata) => void;
  onConfirm: () => void;
  /** 컨설팅 분석 기반 추천 기본값(Phase 4). */
  recommended?: { base_finish?: string; lip_color?: string; eye_color?: string } | null;
}) {
  const [advanced, setAdvanced] = useState(false);
  const set = (patch: Partial<MakeupMetadata>) => onChange({ ...value, ...patch });
  const toggleDetail = (v: string) => {
    const cur = value.details ?? [];
    set({ details: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] });
  };

  const Chip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) => (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"}`}
    >
      {children}
    </button>
  );
  const Row = ({ title, opts, sel, onSel }: { title: string; opts: Opt[]; sel?: string | null; onSel: (v: string) => void }) => (
    <div className="space-y-1.5">
      <p className="text-[12px] font-semibold text-foreground">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {opts.map((o) => <Chip key={o.value} active={sel === o.value} onClick={() => onSel(o.value)}>{o.label}</Chip>)}
      </div>
    </div>
  );

  const hasSelection = !!(value.base_finish || value.lip_color || value.eye_style);
  const hasReco = !!(recommended && (recommended.base_finish || recommended.lip_color || recommended.eye_color));

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">맞춤 메이크업</h2>
      <p className="text-[12px] text-muted-foreground">
        무드를 고르면 자동으로 채워져요. 원하는 항목만 바꿔도 됩니다.
      </p>

      <div className="space-y-1.5">
        <p className="text-[12px] font-semibold text-foreground">무드 프리셋</p>
        <div className="grid grid-cols-4 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => onChange({ ...p.meta })}
              className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card py-2.5 active:scale-[0.97] transition-transform"
            >
              <span className="text-xl">{p.emoji}</span>
              <span className="text-[11px] font-semibold text-foreground">{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      {hasReco && (
        <button
          type="button"
          onClick={() => set({
            base_finish: recommended?.base_finish ?? value.base_finish,
            lip_color: recommended?.lip_color ?? value.lip_color,
            eye_color: recommended?.eye_color ?? value.eye_color,
          })}
          className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-primary/40 bg-primary/5 px-3 py-2 text-[12px] font-semibold text-primary"
        >
          <Sparkles className="w-4 h-4" /> 당신께 어울리는 추천으로 채우기
        </button>
      )}

      <Row title="베이스 마감" opts={BASE} sel={value.base_finish} onSel={(v) => set({ base_finish: v })} />
      <Row title="립 컬러" opts={LIP_COLOR} sel={value.lip_color} onSel={(v) => set({ lip_color: v })} />
      <Row title="아이 스타일" opts={EYE_STYLE} sel={value.eye_style} onSel={(v) => set({ eye_style: v })} />

      <button
        type="button"
        onClick={() => setAdvanced((a) => !a)}
        className="flex items-center gap-1 text-[12px] font-semibold text-muted-foreground"
      >
        세부 조정 <ChevronDown className={`w-4 h-4 transition-transform ${advanced ? "rotate-180" : ""}`} />
      </button>
      {advanced && (
        <div className="space-y-3 rounded-xl border border-border p-3">
          <Row title="립 마감" opts={LIP_FINISH} sel={value.lip_finish} onSel={(v) => set({ lip_finish: v })} />
          <Row title="아이 컬러" opts={EYE_COLOR} sel={value.eye_color} onSel={(v) => set({ eye_color: v })} />
          <Row title="블러셔 컬러" opts={BLUSH_COLOR} sel={value.blush_color} onSel={(v) => set({ blush_color: v })} />
          <Row title="블러셔 위치" opts={BLUSH_PLACEMENT} sel={value.blush_placement} onSel={(v) => set({ blush_placement: v })} />
          <Row title="눈썹" opts={BROW} sel={value.brow_shape} onSel={(v) => set({ brow_shape: v })} />
          <Row title="컨투어" opts={CONTOUR} sel={value.contour_intensity} onSel={(v) => set({ contour_intensity: v })} />
          <div className="space-y-1.5">
            <p className="text-[12px] font-semibold text-foreground">디테일 (여러 개 가능)</p>
            <div className="flex flex-wrap gap-1.5">
              {DETAIL.map((o) => (
                <Chip key={o.value} active={(value.details ?? []).includes(o.value)} onClick={() => toggleDetail(o.value)}>
                  {o.label}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      )}

      <Button onClick={onConfirm} disabled={!hasSelection} className="w-full h-12 text-[15px] font-bold">
        {hasSelection ? "이 스타일로 다음" : "무드 또는 항목을 선택하세요"}
      </Button>
    </section>
  );
}
