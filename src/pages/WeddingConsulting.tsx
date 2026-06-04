import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import { Loader2, Upload, Download, Sparkles } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// 2026 웨딩컨설팅 — 신부 사진 분석 → 퍼스널컬러/헤어/메이크업/드레스 A4 리포트.
// 가격: 섹션당 10하트, 4섹션(종합) 30하트. 계정당 첫 1회 50% 할인(반올림).

type SectionKey = "personal_color" | "hair" | "makeup" | "dress";
const SECTION_META: { key: SectionKey; label: string }[] = [
  { key: "personal_color", label: "퍼스널컬러" },
  { key: "hair", label: "헤어" },
  { key: "makeup", label: "메이크업" },
  { key: "dress", label: "드레스+부케" },
];

interface ColorItem {
  name?: string;
  hex?: string;
}
interface Analysis {
  summary?: string;
  personal_color?: {
    season?: string;
    undertone?: string;
    best_colors?: ColorItem[];
    worst_colors?: ColorItem[];
    best_hair_color?: ColorItem;
    best_lens_color?: ColorItem;
    best_makeup?: { lip?: ColorItem; cheek?: ColorItem; eye?: ColorItem };
    best_dress?: ColorItem;
  };
  hair?: {
    analysis?: string;
    recommendations?: { style?: string; why?: string }[];
    color?: ColorItem;
    extension_zones?: string;
  };
  makeup?: {
    by_venue?: { venue?: string; look?: string; colors?: ColorItem[] }[];
    by_area?: { area?: string; desc?: string; colors?: ColorItem[] }[];
  };
  dress?: {
    by_venue?: {
      venue?: string;
      silhouette?: string;
      fabric?: string;
      why?: string;
    }[];
    by_material?: { material?: string; desc?: string }[];
    bouquet?: { venue?: string; flowers?: string; colors?: ColorItem[] }[];
  };
}

const costOf = (n: number) => (n >= 4 ? 30 : n * 10);

// ── 작은 표시 컴포넌트들 ──
const Swatch = ({ c, size = 40 }: { c?: ColorItem; size?: number }) => (
  <div className="flex flex-col items-center gap-1" style={{ width: size + 14 }}>
    <span
      className="rounded-full border border-black/10 shadow-sm"
      style={{ width: size, height: size, background: c?.hex || "#eee" }}
    />
    <span className="text-[9px] text-neutral-600 text-center leading-tight">
      {c?.name || ""}
      <br />
      <span className="text-neutral-400">{c?.hex}</span>
    </span>
  </div>
);

// 베스트 컬러 도넛 차트 (정확한 색·라벨, 생성형 아님)
const ColorWheel = ({ colors }: { colors: ColorItem[] }) => {
  const list = colors.slice(0, 6);
  const n = Math.max(list.length, 1);
  const R = 70;
  const r = 38;
  const cx = 80;
  const cy = 80;
  const seg = (360 / n) * (Math.PI / 180);
  const arc = (i: number) => {
    const a0 = -Math.PI / 2 + i * seg;
    const a1 = a0 + seg;
    const p = (rad: number, ang: number) => [cx + rad * Math.cos(ang), cy + rad * Math.sin(ang)];
    const [x0, y0] = p(R, a0);
    const [x1, y1] = p(R, a1);
    const [x2, y2] = p(r, a1);
    const [x3, y3] = p(r, a0);
    const large = seg > Math.PI ? 1 : 0;
    return `M${x0} ${y0} A${R} ${R} 0 ${large} 1 ${x1} ${y1} L${x2} ${y2} A${r} ${r} 0 ${large} 0 ${x3} ${y3} Z`;
  };
  return (
    <svg width={160} height={160} viewBox="0 0 160 160">
      {list.map((c, i) => (
        <path key={i} d={arc(i)} fill={c.hex || "#eee"} stroke="#fff" strokeWidth={2} />
      ))}
      <circle cx={cx} cy={cy} r={r - 2} fill="#fff" />
      <text x={cx} y={cy - 4} textAnchor="middle" className="fill-neutral-700" style={{ fontSize: 11, fontWeight: 700 }}>
        BEST
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" className="fill-neutral-400" style={{ fontSize: 8 }}>
        Personal Color
      </text>
    </svg>
  );
};

const ChipRow = ({ colors }: { colors?: ColorItem[] }) => (
  <div className="flex flex-wrap gap-1.5">
    {(colors ?? []).map((c, i) => (
      <span
        key={i}
        className="inline-flex items-center gap-1 rounded-full border border-neutral-200 pl-1 pr-2 py-0.5 text-[10px] text-neutral-700"
      >
        <span className="w-3 h-3 rounded-full" style={{ background: c.hex || "#eee" }} />
        {c.name}
      </span>
    ))}
  </div>
);

// A4 페이지 래퍼 (210:297). 다운로드용 ref.
const A4Page = ({
  title,
  pageRef,
  children,
}: {
  title: string;
  pageRef: (el: HTMLDivElement | null) => void;
  children: React.ReactNode;
}) => (
  <div
    ref={pageRef}
    className="bg-white text-neutral-800 mx-auto"
    style={{ width: 760, minHeight: 1075, padding: 36 }}
  >
    <div className="flex items-end justify-between border-b-2 border-rose-300 pb-2">
      <h2 className="text-[22px] font-bold text-neutral-900">{title}</h2>
      <span className="text-[11px] tracking-widest text-rose-400">DEWY · 2026 WEDDING</span>
    </div>
    <div className="pt-4 space-y-4">{children}</div>
  </div>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-[14px] font-bold text-neutral-900 border-l-4 border-rose-300 pl-2">
    {children}
  </h3>
);

const WeddingConsulting = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pick, setPick] = useState<{ file: File; url: string } | null>(null);
  const [sel, setSel] = useState<Set<SectionKey>>(new Set(SECTION_META.map((s) => s.key)));
  const [discounted, setDiscounted] = useState<boolean | null>(null);
  const [processing, setProcessing] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [doneSections, setDoneSections] = useState<SectionKey[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const pageRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("wedding_consulting_usage")
        .select("used_count")
        .eq("user_id", user.id)
        .maybeSingle();
      setDiscounted((data?.used_count ?? 0) === 0);
    })();
  }, [user]);

  const toggle = (k: SectionKey) =>
    setSel((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });

  const selected = SECTION_META.filter((s) => sel.has(s.key)).map((s) => s.key);
  const base = costOf(selected.length);
  const finalCost = discounted ? Math.round(base / 2) : base;

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) return;
    if (f.size > 5 * 1024 * 1024) {
      toast({ title: "사진이 너무 커요 (5MB 초과)" });
      return;
    }
    if (pick) URL.revokeObjectURL(pick.url);
    setPick({ file: f, url: URL.createObjectURL(f) });
  };

  const handleStart = async () => {
    if (!user) return navigate("/auth");
    if (!pick) return toast({ title: "신부 사진을 올려주세요" });
    if (selected.length === 0) return toast({ title: "섹션을 1개 이상 선택해주세요" });
    if (
      !window.confirm(
        `${selected.length === 4 ? "종합(4장)" : `${selected.length}개 섹션`} 컨설팅에 ${finalCost}하트가 차감돼요${discounted ? " (첫 1회 50% 할인)" : ""}. 진행할까요?`,
      )
    )
      return;
    setProcessing(true);
    setAnalysis(null);
    try {
      const ext = pick.file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/consulting/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage
        .from("invitation-uploads")
        .upload(path, pick.file, { contentType: pick.file.type, upsert: false });
      if (up.error) throw new Error(`업로드 실패: ${up.error.message}`);

      const { data, error } = await (supabase as any).functions.invoke(
        "wedding-consulting",
        { body: { source_path: path, sections: selected } },
      );
      if (error) {
        let code: string | undefined;
        try {
          const ctx = (error as { context?: { json?: () => Promise<any> } }).context;
          if (ctx?.json) code = (await ctx.json())?.error;
        } catch {
          /* ignore */
        }
        if (code === "insufficient_hearts") {
          toast({
            title: "하트가 부족해요",
            description: `이 컨설팅에 ${finalCost}하트가 필요해요.`,
            variant: "destructive",
            action: { label: "충전하기", onClick: () => navigate("/points") },
          });
          return;
        }
        throw new Error(code ?? error.message ?? "분석 실패");
      }
      if (data?.error) throw new Error(data.error);
      setAnalysis(data.analysis as Analysis);
      setDoneSections(selected);
      setDiscounted(false);
      toast({ title: "컨설팅 완료", description: `${data?.charged ?? finalCost}하트 사용` });
    } catch (e) {
      toast({
        title: "컨설팅 실패",
        description: e instanceof Error ? e.message : "오류",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const download = async (key: string, label: string) => {
    const el = pageRefs.current[key];
    if (!el) return;
    try {
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `dewy-consulting-${label}.png`;
      a.click();
    } catch {
      toast({ title: "저장 실패", description: "다시 시도해주세요", variant: "destructive" });
    }
  };

  const pc = analysis?.personal_color;
  const hair = analysis?.hair;
  const mk = analysis?.makeup;
  const dr = analysis?.dress;

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto pb-28">
      <PageHeader title="2026 웨딩컨설팅" />
      <main className="px-4 py-5 space-y-5">
        {!analysis && (
          <>
            <section className="rounded-2xl bg-pink-50 p-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-bold text-foreground">맞춤 스타일링 A4 리포트</h2>
              </div>
              <p className="mt-1 text-[12px] text-muted-foreground leading-relaxed">
                신부님 사진을 분석해 퍼스널컬러·헤어·메이크업·드레스를 A4로 제안해요.
                전문 진단이 아닌 프리미엄 스타일링 제안이에요.
              </p>
              <p className="mt-2 text-[12px] text-foreground">
                섹션당 10하트 · 종합 4장 30하트
                {discounted && <span className="ml-1 text-primary font-semibold">· 첫 1회 50% 할인</span>}
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-bold text-foreground">신부 사진</h3>
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
                    <span className="text-[12px] text-muted-foreground">정면·자연광 사진 권장</span>
                  </>
                )}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-bold text-foreground">받을 섹션</h3>
              <div className="grid grid-cols-2 gap-2">
                {SECTION_META.map((s) => {
                  const on = sel.has(s.key);
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => toggle(s.key)}
                      className={`h-11 rounded-xl border text-[13px] font-medium ${
                        on
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-foreground"
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground">
                4개 모두 선택하면 종합가(30하트)로 적용돼요.
              </p>
            </section>
          </>
        )}

        {/* 결과 리포트 */}
        {analysis && (
          <section className="space-y-3">
            {analysis.summary && (
              <p className="text-[12px] text-muted-foreground bg-muted/40 rounded-lg p-3">
                {analysis.summary}
              </p>
            )}

            {doneSections.includes("personal_color") && pc && (
              <ReportCard
                label="퍼스널컬러"
                onDownload={() => download("personal_color", "퍼스널컬러")}
              >
                <A4Page title="퍼스널컬러" pageRef={(el) => (pageRefs.current.personal_color = el)}>
                  <div className="flex items-center gap-4">
                    <ColorWheel colors={pc.best_colors ?? []} />
                    <div className="space-y-1">
                      <p className="text-[13px]">
                        <b>시즌</b> · {pc.season}
                      </p>
                      <p className="text-[13px]">
                        <b>언더톤</b> · {pc.undertone}
                      </p>
                    </div>
                  </div>
                  <SectionTitle>베스트 컬러</SectionTitle>
                  <div className="flex flex-wrap gap-2">
                    {(pc.best_colors ?? []).map((c, i) => <Swatch key={i} c={c} />)}
                  </div>
                  <SectionTitle>워스트 컬러</SectionTitle>
                  <div className="flex flex-wrap gap-2">
                    {(pc.worst_colors ?? []).map((c, i) => <Swatch key={i} c={c} size={32} />)}
                  </div>
                  <SectionTitle>베스트 매치</SectionTitle>
                  <div className="grid grid-cols-2 gap-3">
                    <KV k="헤어 컬러" c={pc.best_hair_color} />
                    <KV k="렌즈 컬러" c={pc.best_lens_color} />
                    <KV k="립" c={pc.best_makeup?.lip} />
                    <KV k="치크" c={pc.best_makeup?.cheek} />
                    <KV k="아이" c={pc.best_makeup?.eye} />
                    <KV k="드레스 톤" c={pc.best_dress} />
                  </div>
                </A4Page>
              </ReportCard>
            )}

            {doneSections.includes("hair") && hair && (
              <ReportCard label="헤어" onDownload={() => download("hair", "헤어")}>
                <A4Page title="헤어 스타일링" pageRef={(el) => (pageRefs.current.hair = el)}>
                  <SectionTitle>현재 헤어 분석</SectionTitle>
                  <p className="text-[12px] leading-relaxed">{hair.analysis}</p>
                  {hair.color && (
                    <div className="flex items-center gap-2">
                      <SectionTitle>추천 컬러</SectionTitle>
                      <Swatch c={hair.color} size={28} />
                    </div>
                  )}
                  <SectionTitle>추천 스타일</SectionTitle>
                  <div className="space-y-2">
                    {(hair.recommendations ?? []).map((r, i) => (
                      <div key={i} className="rounded-lg border border-neutral-200 p-2.5">
                        <p className="text-[13px] font-semibold">{r.style}</p>
                        <p className="text-[11px] text-neutral-600">{r.why}</p>
                      </div>
                    ))}
                  </div>
                  <SectionTitle>붙임머리·부분가발 커버 구간</SectionTitle>
                  <p className="text-[12px] leading-relaxed">{hair.extension_zones}</p>
                </A4Page>
              </ReportCard>
            )}

            {doneSections.includes("makeup") && mk && (
              <ReportCard label="메이크업" onDownload={() => download("makeup", "메이크업")}>
                <A4Page title="메이크업" pageRef={(el) => (pageRefs.current.makeup = el)}>
                  <SectionTitle>장소별 룩</SectionTitle>
                  <div className="space-y-2">
                    {(mk.by_venue ?? []).map((v, i) => (
                      <div key={i} className="rounded-lg border border-neutral-200 p-2.5 space-y-1">
                        <p className="text-[13px] font-semibold">{v.venue}</p>
                        <p className="text-[11px] text-neutral-600">{v.look}</p>
                        <ChipRow colors={v.colors} />
                      </div>
                    ))}
                  </div>
                  <SectionTitle>부위별 컬러</SectionTitle>
                  <div className="grid grid-cols-2 gap-2">
                    {(mk.by_area ?? []).map((a, i) => (
                      <div key={i} className="rounded-lg border border-neutral-200 p-2.5 space-y-1">
                        <p className="text-[13px] font-semibold">{a.area}</p>
                        <p className="text-[11px] text-neutral-600">{a.desc}</p>
                        <ChipRow colors={a.colors} />
                      </div>
                    ))}
                  </div>
                </A4Page>
              </ReportCard>
            )}

            {doneSections.includes("dress") && dr && (
              <ReportCard label="드레스+부케" onDownload={() => download("dress", "드레스부케")}>
                <A4Page title="드레스 & 부케" pageRef={(el) => (pageRefs.current.dress = el)}>
                  <SectionTitle>장소별 드레스</SectionTitle>
                  <div className="space-y-2">
                    {(dr.by_venue ?? []).map((v, i) => (
                      <div key={i} className="rounded-lg border border-neutral-200 p-2.5">
                        <p className="text-[13px] font-semibold">
                          {v.venue} · {v.silhouette}
                        </p>
                        <p className="text-[11px] text-neutral-600">
                          소재 {v.fabric} — {v.why}
                        </p>
                      </div>
                    ))}
                  </div>
                  <SectionTitle>소재별 제안</SectionTitle>
                  <div className="space-y-1.5">
                    {(dr.by_material ?? []).map((m, i) => (
                      <p key={i} className="text-[12px]">
                        <b>{m.material}</b> · {m.desc}
                      </p>
                    ))}
                  </div>
                  <SectionTitle>부케</SectionTitle>
                  <div className="space-y-2">
                    {(dr.bouquet ?? []).map((b, i) => (
                      <div key={i} className="rounded-lg border border-neutral-200 p-2.5 space-y-1">
                        <p className="text-[13px] font-semibold">{b.venue}</p>
                        <p className="text-[11px] text-neutral-600">{b.flowers}</p>
                        <ChipRow colors={b.colors} />
                      </div>
                    ))}
                  </div>
                </A4Page>
              </ReportCard>
            )}

            <Button variant="outline" className="w-full" onClick={() => setAnalysis(null)}>
              새 컨설팅 받기
            </Button>
          </section>
        )}
      </main>

      {!analysis && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-4 pb-[calc(var(--safe-bottom)+12px)] pt-3 bg-background/95 backdrop-blur border-t border-border">
          <Button className="w-full h-12" disabled={!pick || processing || selected.length === 0} onClick={handleStart}>
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                분석 중… 수십 초 걸릴 수 있어요
              </>
            ) : (
              `컨설팅 받기 · ${finalCost}하트`
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

// 키-색 한 칸
const KV = ({ k, c }: { k: string; c?: ColorItem }) => (
  <div className="flex items-center gap-2 rounded-lg border border-neutral-200 p-2">
    <span className="w-6 h-6 rounded-full border border-black/10" style={{ background: c?.hex || "#eee" }} />
    <div className="leading-tight">
      <p className="text-[11px] text-neutral-500">{k}</p>
      <p className="text-[12px] font-medium">
        {c?.name} <span className="text-neutral-400">{c?.hex}</span>
      </p>
    </div>
  </div>
);

// 화면 표시용: A4 를 축소해 보여주고 다운로드 버튼 제공
const ReportCard = ({
  label,
  onDownload,
  children,
}: {
  label: string;
  onDownload: () => void;
  children: React.ReactNode;
}) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between">
      <span className="text-sm font-bold text-foreground">{label}</span>
      <button
        type="button"
        onClick={onDownload}
        className="flex items-center gap-1 text-[12px] text-primary"
      >
        <Download className="w-3.5 h-3.5" />
        이미지 저장
      </button>
    </div>
    {/* 760px A4 를 카드 폭에 맞춰 축소 표시 (다운로드는 원본 해상도로 캡처) */}
    <div
      className="overflow-hidden rounded-xl border border-border bg-white"
      style={{ height: 1075 * 0.5 }}
    >
      <div style={{ width: 760, transform: "scale(0.5)", transformOrigin: "top left" }}>
        {children}
      </div>
    </div>
  </div>
);

export default WeddingConsulting;
