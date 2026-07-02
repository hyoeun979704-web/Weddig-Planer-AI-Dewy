import { useState, useEffect, useRef } from "react";
import { confirm } from "@/components/ui/confirm-dialog";
import { useNavigate } from "react-router-dom";
import { Loader2, Upload, Sparkles, ChevronRight } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import { toast } from "@/hooks/use-toast";
import { studioErrorMessage } from "@/lib/studioErrors";
import { addPendingJob } from "@/lib/pendingJobs";
import { cn } from "@/lib/utils";
import {
  fetchHairSamples,
  fetchHairUsageCount,
  fetchHairJobs,
  uploadHairSource,
  invokeHairPreview,
} from "@/features/consumer/data/hairPreview";

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

// 신랑 단일 헤어 프리셋(남성). 신부용 STYLES 와 대칭. 어드민 hair_samples 는 신부 카탈로그라
// 신랑 모드에선 노출하지 않고 이 텍스트 프리셋을 쓴다.
const GROOM_STYLES: { label: string; prompt: string }[] = [
  { label: "클린 사이드파트", prompt: "clean side part, neat classic men's cut" },
  { label: "내추럴 다운펌", prompt: "natural down perm, soft men's fringe" },
  { label: "슬릭백", prompt: "slicked-back undercut" },
  { label: "쉼표머리", prompt: "comma-shaped fringe (Korean comma hair)" },
  { label: "투블럭", prompt: "two-block cut, neat sides" },
  { label: "포마드", prompt: "pompadour with volume" },
  { label: "가르마펌", prompt: "middle or side part perm, natural volume" },
  { label: "짧은 크롭", prompt: "textured short crop" },
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

interface HairSample {
  id: string;
  name: string;
  image_url: string;
  prompt: string | null;
}

const HairPreview = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  // 성별(신부/신랑) — 기본은 내 role, 수동 토글 가능. 신랑이면 남성 헤어 어휘로 생성(백엔드 분기).
  const { weddingSettings } = useWeddingSchedule();
  const [genderOverride, setGenderOverride] = useState<"bride" | "groom" | null>(null);
  const gender: "bride" | "groom" =
    genderOverride ?? (weddingSettings.role === "groom" ? "groom" : "bride");
  // 신랑은 어드민 신부 샘플 대신 남성 텍스트 프리셋. 신부는 기존대로 샘플>STYLES.
  const stylePresets = gender === "groom" ? GROOM_STYLES : STYLES;
  const [pick, setPick] = useState<{ file: File; url: string } | null>(null);
  const [opts, setOpts] = useState<Set<Kind>>(new Set<Kind>(["style"]));
  const [style, setStyle] = useState<{ label: string; prompt: string }>(STYLES[0]);
  const [samples, setSamples] = useState<HairSample[]>([]);
  const [discounted, setDiscounted] = useState<boolean | null>(null);
  const [processing, setProcessing] = useState(false);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // 단일 헤어 선택지(이미지). 어드민이 등록한 hair_samples(신부 카탈로그). 없으면 텍스트 폴백.
  useEffect(() => {
    (async () => {
      const list = (await fetchHairSamples()) as unknown as HairSample[];
      setSamples(list);
      if (list.length > 0) setStyle({ label: list[0].name, prompt: list[0].prompt ?? list[0].name });
    })();
  }, []);

  // 성별 전환 시 단일 헤어 선택을 그 성별 기본값으로 리셋(반대 성별 스타일 잔존 방지).
  // 신랑=남성 프리셋, 신부=신부 샘플>STYLES. 위 샘플 로드 효과 뒤에 선언돼 신랑일 때 우선한다.
  useEffect(() => {
    if (gender === "groom") setStyle(GROOM_STYLES[0]);
    else if (samples.length > 0) setStyle({ label: samples[0].name, prompt: samples[0].prompt ?? samples[0].name });
    else setStyle(STYLES[0]);
  }, [gender, samples]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const usedCount = await fetchHairUsageCount(user.id);
      setDiscounted(usedCount === 0);
    })();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const rows = (await fetchHairJobs(user.id)) as unknown as JobRow[];
      setJobs(rows);
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
    if (!(await confirm({
      title: "헤어 미리보기 생성",
      description: `${selected.length}종에 ${finalCost}하트가 차감돼요${discounted ? " (첫 1회 50% 할인)" : ""}. 진행할까요?`,
      confirmText: "진행",
    }))) return;

    setProcessing(true);
    try {
      const ext = pick.file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/hair/${crypto.randomUUID()}.${ext}`;
      try {
        await uploadHairSource(path, pick.file);
      } catch (upErr) {
        throw new Error(`업로드 실패: ${upErr instanceof Error ? upErr.message : "오류"}`);
      }

      const { data, error } = await invokeHairPreview({
        source_path: path, options: selected, single_style: opts.has("single") ? style.prompt : "",
        gender,
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
      const msg = e instanceof Error ? e.message : "오류";
      // 결제 전 게이트(no_face 등)·중복 제출 코드를 한국어 안내로 매핑.
      const known = studioErrorMessage(msg);
      if (known) toast({ title: known.title, description: known.description, variant: "destructive" });
      else toast({ title: "헤어 미리보기 요청 실패", description: msg, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background app-col mx-auto pb-28">
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
          <h3 className="text-sm font-bold text-foreground">누구의 헤어인가요?</h3>
          <div className="grid grid-cols-2 gap-2">
            {(["bride", "groom"] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGenderOverride(g)}
                aria-pressed={gender === g}
                className={cn(
                  "h-11 rounded-xl border text-sm font-semibold transition-colors",
                  gender === g
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border text-muted-foreground",
                )}
              >
                {g === "bride" ? "신부" : "신랑"}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {gender === "groom" ? "신랑에게 어울리는 남성 헤어로 생성해요." : "신부에게 어울리는 헤어로 생성해요."}
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
            <h3 className="text-sm font-bold text-foreground">
              단일 헤어 선택{" "}
              <span className="text-[11px] text-muted-foreground font-normal">
                (정면·측면·후면으로 생성)
              </span>
            </h3>
            {gender === "bride" && samples.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {samples.map((s) => {
                  const on = style.label === s.name;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setStyle({ label: s.name, prompt: s.prompt ?? s.name })}
                      className={`rounded-xl overflow-hidden border text-left ${on ? "border-primary ring-2 ring-primary" : "border-border"}`}
                    >
                      <div className="aspect-square bg-muted">
                        <img src={s.image_url} alt={s.name} className="w-full h-full object-cover" />
                      </div>
                      <p className={`px-1.5 py-1 text-[11px] truncate ${on ? "text-primary font-medium" : "text-foreground"}`}>{s.name}</p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {stylePresets.map((s) => {
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
            )}
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

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full app-col px-4 pb-[calc(var(--safe-bottom)+12px)] pt-3 bg-background/95 backdrop-blur border-t border-border">
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
