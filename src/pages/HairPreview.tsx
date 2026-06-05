import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Upload, Sparkles, ChevronRight } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { addPendingJob } from "@/lib/pendingJobs";

// 헤어 변형 미리보기 — 셀카 1장으로 (단일 / 스타일 9그리드 / 컬러 9그리드) 선택 생성.
// 옵션당 5하트, 첫 1회 50% 할인. 동일 인물(이목구비 고정).
const PER = 5;

type Kind = "single" | "style" | "color";
const OPTIONS: { key: Kind; label: string; desc: string }[] = [
  { key: "single", label: "단일 헤어", desc: "원하는 1개 미리보기" },
  { key: "style", label: "추천 스타일 9", desc: "9가지 헤어 한눈에" },
  { key: "color", label: "헤어 컬러 9", desc: "9가지 컬러 한눈에" },
];

// 단일 헤어 선택지 (영문 프롬프트 조각 포함)
const STYLES: { label: string; prompt: string }[] = [
  { label: "내추럴 웨이브", prompt: "soft natural waves, long hair" },
  { label: "C컬 단발", prompt: "C-curl bob, shoulder length" },
  { label: "긴 생머리", prompt: "sleek long straight hair" },
  { label: "로우 번", prompt: "elegant low bun updo" },
  { label: "하프업", prompt: "half-up half-down style" },
  { label: "포니테일", prompt: "clean high ponytail" },
  { label: "사이드 땋기", prompt: "soft side braid" },
  { label: "시뇽 업스타일", prompt: "romantic chignon updo with loose strands" },
];

interface JobRow {
  id: string;
  status: "processing" | "completed" | "failed";
  options: string[];
  created_at: string;
}
const STATUS_LABEL: Record<string, string> = {
  processing: "생성 중",
  completed: "완료",
  failed: "실패",
};

const HairPreview = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pick, setPick] = useState<{ file: File; url: string } | null>(null);
  const [opts, setOpts] = useState<Set<Kind>>(new Set<Kind>(["style"]));
  const [style, setStyle] = useState(STYLES[0]);
  const [discounted, setDiscounted] = useState<boolean | null>(null);
  const [processing, setProcessing] = useState(false);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("hair_preview_usage").select("used_count").eq("user_id", user.id).maybeSingle();
      setDiscounted((data?.used_count ?? 0) === 0);
    })();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("hair_preview_jobs")
        .select("id, status, options, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      setJobs((data ?? []) as JobRow[]);
    })();
  }, [user]);

  const toggle = (k: Kind) =>
    setOpts((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) return;
    if (f.size > 20 * 1024 * 1024) {
      toast({ title: "사진이 너무 커요 (20MB 초과)" });
      return;
    }
    if (pick) URL.revokeObjectURL(pick.url);
    setPick({ file: f, url: URL.createObjectURL(f) });
  };

  const selected = Array.from(opts);
  const base = selected.length * PER;
  const finalCost = discounted ? Math.round(base / 2) : base;

  const handleStart = async () => {
    if (!user) return navigate("/auth");
    if (!pick) return toast({ title: "셀카(정면) 사진을 올려주세요" });
    if (selected.length === 0) return toast({ title: "옵션을 1개 이상 선택해주세요" });
    if (!window.confirm(`헤어 미리보기 ${selected.length}종에 ${finalCost}하트가 차감돼요${discounted ? " (첫 1회 50% 할인)" : ""}. 진행할까요?`))
      return;

    setProcessing(true);
    try {
      const ext = pick.file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/hair/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage
        .from("invitation-uploads")
        .upload(path, pick.file, { contentType: pick.file.type, upsert: false });
      if (up.error) throw new Error(`업로드 실패: ${up.error.message}`);

      const { data, error } = await (supabase as any).functions.invoke("dewy-hair-preview", {
        body: { source_path: path, options: selected, single_style: opts.has("single") ? style.prompt : "" },
      });
      if (error) {
        let code: string | undefined;
        try {
          const ctx = (error as { context?: { json?: () => Promise<any> } }).context;
          if (ctx?.json) code = (await ctx.json())?.error;
        } catch { /* ignore */ }
        if (code === "insufficient_hearts") {
          toast({ title: "하트가 부족해요", description: `이 미리보기에 ${finalCost}하트가 필요해요.`, variant: "destructive", action: { label: "충전하기", onClick: () => navigate("/points") } });
          return;
        }
        throw new Error(code ?? error.message ?? "요청 실패");
      }
      if (data?.error) throw new Error(data.error);
      const jobId = data?.job_id as string | undefined;
      if (!jobId) throw new Error("요청 실패");
      addPendingJob({ id: jobId, type: "hair" });
      setDiscounted(false);
      navigate(`/ai-studio/hair-room/result/${jobId}`);
    } catch (e) {
      toast({ title: "헤어 미리보기 요청 실패", description: e instanceof Error ? e.message : "오류", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto pb-28">
      <PageHeader title="헤어 변형 미리보기" />
      <main className="px-4 py-5 space-y-5">
        <section className="rounded-2xl bg-pink-50 p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">내 얼굴 그대로, 헤어만 바꿔보기</h2>
          </div>
          <p className="mt-1 text-[12px] text-muted-foreground leading-relaxed">
            셀카 1장으로 다양한 헤어스타일·컬러를 한눈에. 이목구비는 그대로 유지돼요.
            정면·이마가 보이는 사진을 권장해요.
          </p>
          <p className="mt-2 text-[12px] text-foreground">
            옵션당 {PER}하트
            {discounted && <span className="ml-1 text-primary font-semibold">· 첫 1회 50% 할인</span>}
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-bold text-foreground">셀카</h3>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full aspect-[3/4] max-h-64 rounded-xl border-2 border-dashed border-border bg-muted/30 flex flex-col items-center justify-center gap-2 overflow-hidden"
          >
            {pick ? (
              <img src={pick.url} alt="" className="w-full h-full object-cover" />
            ) : (
              <>
                <Upload className="w-6 h-6 text-muted-foreground" />
                <span className="text-[12px] text-muted-foreground">정면·이마 보이는 사진 권장</span>
              </>
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-bold text-foreground">
            옵션 <span className="text-[11px] text-muted-foreground font-normal">(중복 선택)</span>
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {OPTIONS.map((o) => {
              const on = opts.has(o.key);
              return (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => toggle(o.key)}
                  className={`rounded-xl border px-1 py-2 text-center ${on ? "border-primary bg-primary/10" : "border-border bg-background"}`}
                >
                  <span className={`block text-[12px] font-medium ${on ? "text-primary" : "text-foreground"}`}>{o.label}</span>
                  <span className="block text-[10px] text-muted-foreground mt-0.5">{o.desc}</span>
                </button>
              );
            })}
          </div>
        </section>

        {opts.has("single") && (
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-foreground">단일 헤어 선택</h3>
            <div className="grid grid-cols-2 gap-2">
              {STYLES.map((s) => {
                const on = style.label === s.label;
                return (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => setStyle(s)}
                    className={`h-10 rounded-xl border text-[13px] font-medium ${on ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-foreground"}`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {jobs.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-foreground">내 헤어 미리보기 기록</h3>
            <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
              {jobs.map((j) => (
                <button
                  key={j.id}
                  type="button"
                  onClick={() => navigate(`/ai-studio/hair-room/result/${j.id}`)}
                  className="w-full flex items-center justify-between px-3 py-3 bg-background active:bg-muted/40"
                >
                  <div className="text-left">
                    <p className="text-[13px] font-medium text-foreground">
                      {j.options.map((o) => OPTIONS.find((x) => x.key === o)?.label ?? o).join(" · ")}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(j.created_at).toLocaleString("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[11px] font-semibold ${j.status === "completed" ? "text-primary" : j.status === "failed" ? "text-destructive" : "text-muted-foreground"}`}>
                      {j.status === "processing" && <Loader2 className="inline w-3 h-3 mr-0.5 animate-spin" />}
                      {STATUS_LABEL[j.status] ?? j.status}
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-4 pb-[calc(var(--safe-bottom)+12px)] pt-3 bg-background/95 backdrop-blur border-t border-border">
        <Button className="w-full h-12" disabled={!pick || processing || selected.length === 0} onClick={handleStart}>
          {processing ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />요청 중…</>
          ) : (
            `헤어 미리보기 · ${finalCost}하트`
          )}
        </Button>
      </div>
    </div>
  );
};

export default HairPreview;
