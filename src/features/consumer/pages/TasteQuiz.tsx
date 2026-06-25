import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, RotateCcw, Check } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { TASTE_QUIZ, scoreTaste, saveTasteTags, type MoodTag } from "@/lib/tasteQuiz";

/**
 * 초보용 취향 미니퀴즈(§4.1). 사진 없이 2~3문항으로 무드 태그를 도출 → localStorage 저장.
 * "아직 모르겠어요" 진입의 경량 버전(비전/임베딩 없이 Phase 0).
 */
const TasteQuiz = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [result, setResult] = useState<MoodTag[] | null>(null);

  const pick = (optionId: string) => {
    const next = [...answers];
    next[step] = optionId;
    setAnswers(next);
    if (step < TASTE_QUIZ.length - 1) {
      setStep(step + 1);
    } else {
      const tags = scoreTaste(next);
      saveTasteTags(tags);
      setResult(tags);
    }
  };

  const restart = () => { setStep(0); setAnswers([]); setResult(null); };

  if (result) {
    return (
      <div className="min-h-screen bg-background app-col mx-auto">
        <PageHeader title="취향 진단 결과" />
        <main className="px-5 py-8 space-y-6 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          {result.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground">고르신 분위기는</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {result.map((t) => (
                  <span key={t} className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold">
                    #{t}
                  </span>
                ))}
              </div>
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                이 분위기를 기준으로 업체를 추천해 드릴게요.<br />언제든 다시 진단할 수 있어요.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">결과가 없어요. 다시 진단해 주세요.</p>
          )}
          <div className="space-y-2 pt-2">
            <Button className="w-full h-11" onClick={() => navigate("/vendors/기타")}>
              <Check className="w-4 h-4 mr-1.5" /> 추천 업체 보러가기
            </Button>
            <Button variant="outline" className="w-full h-11" onClick={restart}>
              <RotateCcw className="w-4 h-4 mr-1.5" /> 다시 진단하기
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const q = TASTE_QUIZ[step];
  return (
    <div className="min-h-screen bg-background app-col mx-auto">
      <PageHeader title="취향 진단" />
      <main className="px-5 py-6 space-y-6">
        <div className="flex gap-1.5">
          {TASTE_QUIZ.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">{step + 1} / {TASTE_QUIZ.length}</p>
        <h2 className="text-lg font-bold text-foreground leading-snug">{q.question}</h2>
        <div className="space-y-2.5">
          {q.options.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => pick(o.id)}
              className="w-full p-4 rounded-2xl border border-border bg-card text-left text-sm font-medium text-foreground hover:border-primary/40 active:scale-[0.99] transition-all"
            >
              {o.label}
            </button>
          ))}
        </div>
      </main>
    </div>
  );
};

export default TasteQuiz;
