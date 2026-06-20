import { Sparkles } from "lucide-react";

/**
 * 생성형 AI 결과물 **표시 의무** 고지.
 *
 * 「인공지능 발전과 신뢰 기반 조성 등에 관한 기본법」(2026-01-22 시행)은 생성형 AI 결과물이
 * AI 에 의해 생성되었다는 사실을 이용자가 인지할 수 있도록 표시하도록 한다. Dewy 는 이미지 위
 * 워터마크 대신 **결과 페이지 안내 문구**로 이 의무를 충족한다(드레스·메이크업·헤어·SDM·
 * 포토리터치·컨설팅 등 AI 결과 화면에 공통 배치).
 */
export default function AiDisclosureNotice({ className = "" }: { className?: string }) {
  return (
    <p
      className={`flex items-center justify-center gap-1 text-[11px] leading-[16px] text-muted-foreground ${className}`}
      role="note"
    >
      <Sparkles className="w-3 h-3 shrink-0" aria-hidden />
      이 결과물은 AI로 생성된 것으로, 실제와 다를 수 있습니다.
    </p>
  );
}
