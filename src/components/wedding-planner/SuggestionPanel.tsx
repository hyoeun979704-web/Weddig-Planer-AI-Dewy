import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { SuggestedQuestion } from "@/data/chatbotSuggestions";

interface SuggestionPanelProps {
  suggestions: SuggestedQuestion[];
  isVisible: boolean;
  isInputEmpty: boolean;
  onSelect: (text: string) => void;
}

/**
 * 챗봇 입력창 위에 떠 있는 추천 질문 패널.
 *
 * - 빈 입력: 인기 질문 5개 표시 (헤더: "이런 질문은 어떠세요?")
 * - 타이핑 중: 키워드 매칭 결과 표시 (헤더: "추천")
 * - 매칭 결과 없음: 패널 자체 숨김
 */
const SuggestionPanel = ({
  suggestions,
  isVisible,
  isInputEmpty,
  onSelect,
}: SuggestionPanelProps) => {
  if (suggestions.length === 0) return null;

  const headerText = isInputEmpty ? "이런 질문은 어떠세요?" : "추천 질문";

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.15 }}
          className="bg-card border border-border rounded-2xl shadow-lg overflow-hidden"
        >
          <div className="px-3 pt-2.5 pb-1.5 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-primary" />
            <span className="text-[11px] font-semibold text-muted-foreground">
              {headerText}
            </span>
          </div>
          <ul className="divide-y divide-border/50">
            {suggestions.map((s, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => onSelect(s.text)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted/50 active:bg-muted transition-colors text-left"
                >
                  <span className="text-base">{s.emoji}</span>
                  <span className="text-[13px] text-foreground flex-1">{s.text}</span>
                </button>
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SuggestionPanel;
