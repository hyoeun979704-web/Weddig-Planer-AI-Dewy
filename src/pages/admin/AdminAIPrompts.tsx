import { useMemo, useState } from "react";
import { Copy, Check, FileCode } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { toast } from "@/hooks/use-toast";
import {
  PROMPT_CATALOG, PROMPT_FEATURES, type PromptEntry, type PromptKind,
} from "@/data/promptCatalog";

/**
 * AI 프롬프트 검증 랩 (/admin/ai-prompts)
 * 모든 AI 생성 프롬프트를 배너 카드(좌: 예시 이미지 / 우: 프롬프트 텍스트, 경계=그라디언트)로
 * 모아 개인 검증(복사 → 모델에 붙여 테스트)할 수 있게 한다. 클라 빌더는 라이브 렌더(드리프트 없음).
 */
const KIND_BADGE: Record<PromptKind, { label: string; cls: string }> = {
  image: { label: "이미지 · 라이브", cls: "bg-emerald-100 text-emerald-700" },
  "image-snapshot": { label: "이미지 · 스냅샷", cls: "bg-amber-100 text-amber-700" },
  "text-ref": { label: "텍스트 · 파일참조", cls: "bg-slate-200 text-slate-700" },
};

const AdminAIPrompts = () => {
  const [feature, setFeature] = useState<string>("전체");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const visible = useMemo(
    () => (feature === "전체" ? PROMPT_CATALOG : PROMPT_CATALOG.filter((p) => p.feature === feature)),
    [feature],
  );

  const handleCopy = async (e: PromptEntry) => {
    if (!e.prompt) return;
    try {
      await navigator.clipboard.writeText(e.prompt);
      setCopiedId(e.id);
      toast({ title: "프롬프트를 복사했어요" });
      setTimeout(() => setCopiedId((c) => (c === e.id ? null : c)), 1500);
    } catch {
      toast({ title: "복사 실패", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background app-col mx-auto pb-24">
      <PageHeader title="AI 프롬프트 검증 랩" />
      <main className="px-4 py-5 space-y-4">
        <p className="text-[12px] text-muted-foreground leading-relaxed">
          앱이 실제로 보내는 프롬프트를 모았어요. <strong>라이브</strong>는 빌더를 그대로 호출해 렌더(드리프트 없음),
          <strong> 스냅샷</strong>은 엣지 함수 상수, <strong>파일참조</strong>는 출처만 표기합니다. 복사해서 모델에 붙여 검증하세요.
        </p>

        {/* 기능 필터 */}
        <div className="flex flex-wrap gap-1.5">
          {["전체", ...PROMPT_FEATURES].map((f) => (
            <button key={f} type="button" onClick={() => setFeature(f)}
              className={`px-3 h-8 rounded-full text-[12px] font-semibold border transition-colors ${feature === f ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"}`}>
              {f}
            </button>
          ))}
        </div>

        {/* 배너 카드 목록 */}
        <div className="space-y-3">
          {visible.map((e) => (
            <div key={e.id} className="rounded-2xl p-[2px] bg-gradient-to-r from-pink-400 via-fuchsia-400 to-indigo-400">
              <div className="rounded-[14px] bg-card overflow-hidden flex">
                {/* 좌: 예시 이미지 */}
                <div className="w-28 shrink-0 bg-muted self-stretch">
                  {e.exampleImage ? (
                    <img src={e.exampleImage} alt={e.title} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><FileCode className="w-6 h-6 text-muted-foreground" /></div>
                  )}
                </div>
                {/* 우: 텍스트 */}
                <div className="flex-1 min-w-0 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] text-muted-foreground">{e.feature}</p>
                      <h3 className="text-[14px] font-bold text-foreground leading-tight">{e.title}</h3>
                    </div>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${KIND_BADGE[e.kind].cls}`}>
                      {KIND_BADGE[e.kind].label}
                    </span>
                  </div>

                  {e.prompt ? (
                    <>
                      <pre className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap break-words text-[11px] leading-snug text-foreground/80 bg-muted/40 rounded-lg p-2">
                        {e.prompt}
                      </pre>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-muted-foreground truncate">{e.sourceFile}</span>
                        <button type="button" onClick={() => handleCopy(e)}
                          className="shrink-0 inline-flex items-center gap-1 px-2.5 h-7 rounded-lg bg-primary text-primary-foreground text-[12px] font-semibold">
                          {copiedId === e.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedId === e.id ? "복사됨" : "복사"}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="mt-2 text-[12px] text-muted-foreground">
                      {e.note}
                      <p className="text-[10px] mt-1 truncate">{e.sourceFile}</p>
                    </div>
                  )}
                  {e.prompt && e.note && (
                    <p className="text-[10px] text-amber-700 mt-1">⚠ {e.note}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default AdminAIPrompts;
