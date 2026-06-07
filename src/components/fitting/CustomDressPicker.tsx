/**
 * 맞춤 드레스 피커 — 카탈로그 대신 사용자가 속성을 직접 골라 텍스트 전용 생성.
 *
 * 코드 어휘는 반드시 src/lib/dressDescription.ts(describeDress)의 맵 키와 일치해야 한다.
 * (dressFilters.ts 는 카탈로그 필터용으로 코드 체계가 다름 — 여기서 쓰면 lookup 누락)
 * "가장 편한 UX": 무드 프리셋 1탭으로 전부 채움 → 핵심 3개만 노출 → 세부는 접기.
 */
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, Sparkles } from "lucide-react";
import type { DressMetadata } from "@/lib/dressDescription";

type Opt = { value: string; label: string };

const SILHOUETTE: Opt[] = [
  { value: "A_LINE", label: "A라인" }, { value: "BALL", label: "볼가운" },
  { value: "MERMAID", label: "머메이드" }, { value: "TRUMPET", label: "트럼펫" },
  { value: "SHEATH", label: "시스" }, { value: "EMPIRE", label: "엠파이어" },
  { value: "COLUMN", label: "컬럼" },
];
const NECKLINE: Opt[] = [
  { value: "SWEETHEART", label: "스위트하트" }, { value: "OFF_SHOULDER", label: "오프숄더" },
  { value: "V_NECK", label: "V넥" }, { value: "DEEP_V", label: "딥V" },
  { value: "BOAT", label: "보트넥" }, { value: "HALTER", label: "홀터" },
  { value: "STRAPLESS", label: "스트랩리스" }, { value: "HIGH_NECK", label: "하이넥" },
  { value: "SQUARE", label: "스퀘어" }, { value: "ILLUSION", label: "일루전" },
  { value: "ONE_SHOULDER", label: "원숄더" },
];
const COLOR: Opt[] = [
  { value: "PURE_WHITE", label: "순백" }, { value: "IVORY", label: "아이보리" },
  { value: "OFF_WHITE", label: "오프화이트" }, { value: "CHAMPAGNE", label: "샴페인" },
  { value: "BLUSH", label: "블러쉬" }, { value: "NUDE", label: "누드" },
  { value: "SILVER", label: "실버" },
];
const SLEEVE: Opt[] = [
  { value: "SLEEVELESS", label: "민소매" }, { value: "SPAGHETTI", label: "스파게티끈" },
  { value: "CAP", label: "캡" }, { value: "SHORT", label: "짧은소매" },
  { value: "THREE_QUARTER", label: "7부" }, { value: "LONG", label: "긴소매" },
  { value: "OFF_SHOULDER", label: "오프숄더" }, { value: "PUFF", label: "퍼프" },
  { value: "BISHOP", label: "비숍" },
];
const LENGTH: Opt[] = [
  { value: "FLOOR", label: "플로어(노트레인)" }, { value: "SHORT_TRAIN", label: "숏트레인" },
  { value: "CHAPEL_TRAIN", label: "채플트레인" }, { value: "CATHEDRAL_TRAIN", label: "카테드럴" },
  { value: "TEA", label: "티렝스" }, { value: "MIDI", label: "미디" }, { value: "MINI", label: "미니" },
];
const FABRIC: Opt[] = [
  { value: "SATIN", label: "새틴" }, { value: "SILK", label: "실크" }, { value: "TULLE", label: "튤" },
  { value: "LACE", label: "레이스" }, { value: "CHIFFON", label: "시폰" }, { value: "ORGANZA", label: "오간자" },
  { value: "TAFFETA", label: "태피터" }, { value: "MIKADO", label: "미카도" }, { value: "CREPE", label: "크레이프" },
  { value: "VELVET", label: "벨벳" },
];
const DETAIL: Opt[] = [
  { value: "MINIMAL", label: "미니멀" }, { value: "BEADING", label: "비즈" }, { value: "LACE", label: "레이스" },
  { value: "EMBROIDERY", label: "자수" }, { value: "SEQUINS", label: "시퀸" }, { value: "PEARLS", label: "펄" },
  { value: "CRYSTAL", label: "크리스탈" }, { value: "FLORAL_APPLIQUE", label: "플라워" }, { value: "RUFFLES", label: "러플" },
  { value: "BOWS", label: "보우" }, { value: "FEATHERS", label: "페더" }, { value: "HANDWORK", label: "핸드워크" },
];
const BACK: Opt[] = [
  { value: "CORSET", label: "코르셋" }, { value: "ZIPPER", label: "지퍼" }, { value: "BUTTONS", label: "버튼" },
  { value: "LOW_BACK", label: "로우백" }, { value: "KEYHOLE", label: "키홀" }, { value: "ILLUSION_BACK", label: "일루전백" },
  { value: "V_BACK", label: "V백" }, { value: "COWL_BACK", label: "카울백" },
];
const WAIST: Opt[] = [
  { value: "NATURAL", label: "내추럴" }, { value: "EMPIRE", label: "엠파이어" }, { value: "DROP", label: "드롭" },
];

type Preset = { key: string; label: string; emoji: string; meta: DressMetadata };
const PRESETS: Preset[] = [
  { key: "CLASSIC", label: "클래식", emoji: "👑", meta: { silhouette: "BALL", neckline: "SWEETHEART", sleeve: "SLEEVELESS", length: "CHAPEL_TRAIN", fabric: "MIKADO", color: "IVORY", waist: "NATURAL", details: ["MINIMAL"], back_design: "CORSET", mood: ["CLASSIC"] } },
  { key: "ROMANTIC", label: "로맨틱", emoji: "🌸", meta: { silhouette: "A_LINE", neckline: "OFF_SHOULDER", sleeve: "OFF_SHOULDER", length: "CHAPEL_TRAIN", fabric: "LACE", color: "BLUSH", waist: "NATURAL", details: ["LACE", "FLORAL_APPLIQUE"], back_design: "ILLUSION_BACK", mood: ["ROMANTIC"] } },
  { key: "MODERN", label: "모던", emoji: "🤍", meta: { silhouette: "MERMAID", neckline: "V_NECK", sleeve: "SLEEVELESS", length: "CHAPEL_TRAIN", fabric: "CREPE", color: "PURE_WHITE", waist: "NATURAL", details: ["MINIMAL"], back_design: "LOW_BACK", mood: ["MODERN"] } },
  { key: "MINIMAL", label: "미니멀", emoji: "✨", meta: { silhouette: "SHEATH", neckline: "SQUARE", sleeve: "SLEEVELESS", length: "FLOOR", fabric: "SATIN", color: "OFF_WHITE", waist: "NATURAL", details: ["MINIMAL"], back_design: "ZIPPER", mood: ["MINIMAL"] } },
];

const AXES: Record<string, Opt[]> = {
  silhouette: SILHOUETTE, neckline: NECKLINE, color: COLOR,
  sleeve: SLEEVE, length: LENGTH, fabric: FABRIC, back_design: BACK, waist: WAIST,
};
const koLabel = (axis: string, val?: string | null): string | null =>
  val ? (AXES[axis]?.find((o) => o.value === val)?.label ?? val) : null;

/** 리뷰/배지용 한국어 요약(실루엣·네크라인·컬러). */
export const summarizeDressKo = (m: DressMetadata): string => {
  const parts = [koLabel("silhouette", m.silhouette), koLabel("neckline", m.neckline), koLabel("color", m.color)]
    .filter(Boolean);
  return parts.length ? parts.join(" · ") : "맞춤 드레스";
};

export function CustomDressPicker({
  value, onChange, onConfirm, recommended,
}: {
  value: DressMetadata;
  onChange: (m: DressMetadata) => void;
  onConfirm: () => void;
  /** 컨설팅 분석 기반 추천 기본값(Phase 4). 있으면 "추천으로 채우기" 노출. */
  recommended?: { silhouette?: string; neckline?: string; color?: string } | null;
}) {
  const [advanced, setAdvanced] = useState(false);
  const set = (patch: Partial<DressMetadata>) => onChange({ ...value, ...patch });
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

  const hasSelection = !!(value.silhouette || value.neckline || value.color);
  const hasReco = !!(recommended && (recommended.silhouette || recommended.neckline || recommended.color));

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">맞춤 드레스</h2>
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
            silhouette: recommended?.silhouette ?? value.silhouette,
            neckline: recommended?.neckline ?? value.neckline,
            color: recommended?.color ?? value.color,
          })}
          className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-primary/40 bg-primary/5 px-3 py-2 text-[12px] font-semibold text-primary"
        >
          <Sparkles className="w-4 h-4" /> 당신께 어울리는 추천으로 채우기
        </button>
      )}

      <Row title="실루엣" opts={SILHOUETTE} sel={value.silhouette} onSel={(v) => set({ silhouette: v })} />
      <Row title="네크라인" opts={NECKLINE} sel={value.neckline} onSel={(v) => set({ neckline: v })} />
      <Row title="컬러" opts={COLOR} sel={value.color} onSel={(v) => set({ color: v })} />

      <button
        type="button"
        onClick={() => setAdvanced((a) => !a)}
        className="flex items-center gap-1 text-[12px] font-semibold text-muted-foreground"
      >
        세부 조정 <ChevronDown className={`w-4 h-4 transition-transform ${advanced ? "rotate-180" : ""}`} />
      </button>
      {advanced && (
        <div className="space-y-3 rounded-xl border border-border p-3">
          <Row title="슬리브" opts={SLEEVE} sel={value.sleeve} onSel={(v) => set({ sleeve: v })} />
          <Row title="길이·트레인" opts={LENGTH} sel={value.length} onSel={(v) => set({ length: v })} />
          <Row title="소재" opts={FABRIC} sel={value.fabric} onSel={(v) => set({ fabric: v })} />
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
          <Row title="백 디자인" opts={BACK} sel={value.back_design} onSel={(v) => set({ back_design: v })} />
          <Row title="웨이스트" opts={WAIST} sel={value.waist} onSel={(v) => set({ waist: v })} />
        </div>
      )}

      <Button onClick={onConfirm} disabled={!hasSelection} className="w-full h-12 text-[15px] font-bold">
        {hasSelection ? "이 스타일로 다음" : "무드 또는 항목을 선택하세요"}
      </Button>
    </section>
  );
}
