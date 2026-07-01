// 보정 강도 선택 — AI 스튜디오 공용(드레스 투어·추천·메이크업·스드메).
//
// 웨딩촬영·본식 당일은 전문 헤어·메이크업·조명·작가 후보정이 들어간 "외모 최고점"
// 이므로, 미리보기도 그 보정 수준을 고를 수 있게 한다(기본 = 화보 보정).
// 어느 레벨에서도 얼굴 이목구비·비율·정체성은 변형되지 않는다(서버 프롬프트 보장).
// 레벨 정의 단일 소스: supabase/functions/_shared/studio/retouch.ts (@/data/retouch 심).

import { RETOUCH_LEVELS, type RetouchLevel } from "@/data/retouch";
import { cn } from "@/lib/utils";

interface Props {
  value: RetouchLevel;
  onChange: (v: RetouchLevel) => void;
  className?: string;
}

export function RetouchLevelPicker({ value, onChange, className }: Props) {
  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-sm font-medium text-foreground">보정 강도</p>
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="보정 강도">
        {RETOUCH_LEVELS.map((level) => {
          const selected = value === level.value;
          return (
            <button
              key={level.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(level.value)}
              className={cn(
                "min-h-[44px] rounded-xl border px-2 py-2 text-center transition-colors",
                selected
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground",
              )}
            >
              <span className="block text-sm font-semibold">{level.ko}</span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        {RETOUCH_LEVELS.find((l) => l.value === value)?.desc}
        {" · "}얼굴 생김새는 어떤 강도에서도 바뀌지 않아요.
      </p>
    </div>
  );
}
