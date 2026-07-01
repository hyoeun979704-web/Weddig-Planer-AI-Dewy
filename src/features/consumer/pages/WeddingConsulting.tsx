import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Upload, Sparkles, ChevronRight } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import {
  uploadConsultingSource,
  requestConsulting,
  fetchConsultingDiscounted,
  fetchConsultingReports,
  consultingSectionLabel,
  CONSULTING_SECTION_KEYS,
  type ConsultingSectionKey,
} from "@/features/consumer/data/weddingConsulting";
import { toast } from "@/hooks/use-toast";
import { confirm } from "@/components/ui/confirm-dialog";
import { addPendingJob } from "@/lib/pendingJobs";

// 2026 웨딩컨설팅 — 신부/신랑 사진 분석 → 매거진급 A4 보드(gpt-image-2 생성) 4종.
// 가격: 섹션당 10하트, 4섹션(종합) 30하트. 계정당 첫 1회 50% 할인(반올림).
// 성별은 역할(role)로 자동 판별(+ ?gender=groom 오버라이드). 신랑판은 예복·그루밍으로 재구성.

type SectionKey = ConsultingSectionKey;
const SECTION_KEYS = CONSULTING_SECTION_KEYS;

interface ReportRow {
  id: string;
  status: "processing" | "completed" | "failed";
  sections: string[];
  created_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  processing: "생성 중",
  completed: "완료",
  failed: "실패",
};

const costOf = (n: number) => (n >= 4 ? 30 : n * 10);

const WeddingConsulting = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { weddingSettings } = useWeddingSchedule();
  const [searchParams] = useSearchParams();
  // 성별 — ?gender=groom 오버라이드 우선, 없으면 역할(role)로 자동 판별(기본=신부).
  const gender: "bride" | "groom" =
    searchParams.get("gender") === "groom" || weddingSettings.role === "groom" ? "groom" : "bride";
  const isGroom = gender === "groom";
  const [pick, setPick] = useState<{ file: File; url: string } | null>(null);
  const [sel, setSel] = useState<Set<SectionKey>>(new Set(SECTION_KEYS));
  const [discounted, setDiscounted] = useState<boolean | null>(null);
  const [processing, setProcessing] = useState(false);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setDiscounted(await fetchConsultingDiscounted(user.id));
    })();
  }, [user]);

  // 내 컨설팅 기록 — 진행중/완료 결과를 여기서 다시 확인.
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        setReports((await fetchConsultingReports(user.id, 20)) as unknown as ReportRow[]);
      } catch {
        setReports([]);
      }
    })();
  }, [user]);

  const toggle = (k: SectionKey) =>
    setSel((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  const selected = SECTION_KEYS.filter((k) => sel.has(k));
  const base = costOf(selected.length);
  const finalCost = discounted ? Math.round(base / 2) : base;

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

  const handleStart = async () => {
    if (!user) return navigate("/auth");
    if (!pick) return toast({ title: `${isGroom ? "신랑" : "신부"} 사진을 올려주세요` });
    if (selected.length === 0)
      return toast({ title: "섹션을 1개 이상 선택해주세요" });
    if (
      !(await confirm({
        title: `${selected.length === 4 ? "종합(4장)" : `${selected.length}개 섹션`} 컨설팅에 ${finalCost}하트가 차감돼요${discounted ? " (첫 1회 50% 할인)" : ""}`,
        description: "진행할까요? (AI 생성이라 1~2분 걸릴 수 있어요.)",
        confirmText: "진행",
      }))
    )
      return;
    setProcessing(true);
    try {
      // 업로드 후 잡 생성만 하고 즉시 report_id 를 받는다(생성은 서버 백그라운드).
      const path = await uploadConsultingSource(user.id, pick.file);
      let reportId: string;
      try {
        reportId = await requestConsulting(path, selected, gender);
      } catch (e) {
        // 하트 부족은 전용 안내(충전 CTA)로 분기 — 일반 실패 토스트로 흘리지 않음.
        if (e instanceof Error && e.message === "insufficient_hearts") {
          toast({
            title: "하트가 부족해요",
            description: `이 컨설팅에 ${finalCost}하트가 필요해요.`,
            variant: "destructive",
            action: { label: "충전하기", onClick: () => navigate("/points") },
          });
          return;
        }
        throw e;
      }

      // 완료 알림을 위해 진행중 잡 등록 → 결과 페이지로 이동(거기서 폴링).
      addPendingJob({ id: reportId, type: "consulting" });
      setDiscounted(false);
      navigate(`/ai-studio/consulting/result/${reportId}`);
    } catch (e) {
      toast({
        title: "컨설팅 요청 실패",
        description: e instanceof Error ? e.message : "오류",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background app-col mx-auto pb-28">
      <PageHeader title="2026 웨딩컨설팅" />
      <main className="px-4 py-5 space-y-5">
        <section className="rounded-2xl bg-pink-50 p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">
              맞춤 스타일링 A4 리포트
            </h2>
          </div>
          <p className="mt-1 text-[12px] text-muted-foreground leading-relaxed">
            {isGroom
              ? "신랑님 사진을 분석해 퍼스널컬러·헤어·그루밍·예복을 매거진풍 A4로 만들어 드려요. 전문 진단이 아닌 프리미엄 스타일링 제안이에요."
              : "신부님 사진을 분석해 퍼스널컬러·헤어·메이크업·드레스를 매거진풍 A4로 만들어 드려요. 전문 진단이 아닌 프리미엄 스타일링 제안이에요."}
          </p>
          <p className="mt-2 text-[12px] text-foreground">
            섹션당 10하트 · 종합 4장 30하트
            {discounted && (
              <span className="ml-1 text-primary font-semibold">
                · 첫 1회 50% 할인
              </span>
            )}
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-bold text-foreground">{isGroom ? "신랑 사진" : "신부 사진"}</h3>
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            얼굴이 잘 보이는 정면·자연광 사진을 올려주세요.{" "}
            <span className="font-semibold text-foreground">전신이 함께 나오면</span>{" "}
            {isGroom
              ? "골격·수트 핏·라펠 추천이 더 정확해져요."
              : "체형·드레스 실루엣·넥라인 추천이 더 정확해져요."}
          </p>
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
                <span className="text-[12px] text-muted-foreground">
                  정면·자연광 사진 권장
                </span>
              </>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPick}
          />
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-bold text-foreground">받을 섹션</h3>
          <div className="grid grid-cols-2 gap-2">
            {SECTION_KEYS.map((k) => {
              const on = sel.has(k);
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => toggle(k)}
                  className={`h-11 rounded-xl border text-[13px] font-medium ${
                    on
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-foreground"
                  }`}
                >
                  {consultingSectionLabel(k, gender)}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground">
            4개 모두 선택하면 종합가(30하트)로 적용돼요.
          </p>
        </section>

        {/* 내 컨설팅 기록 — 진행중/완료 결과를 다시 확인 */}
        {reports.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-foreground">내 컨설팅 기록</h3>
            <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
              {reports.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() =>
                    navigate(`/ai-studio/consulting/result/${r.id}`)
                  }
                  className="w-full flex items-center justify-between px-3 py-3 bg-background active:bg-muted/40"
                >
                  <div className="text-left">
                    <p className="text-[13px] font-medium text-foreground">
                      {r.sections.map((s) => consultingSectionLabel(s, gender)).join(" · ")}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("ko-KR", {
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[11px] font-semibold ${
                        r.status === "completed"
                          ? "text-primary"
                          : r.status === "failed"
                            ? "text-destructive"
                            : "text-muted-foreground"
                      }`}
                    >
                      {r.status === "processing" && (
                        <Loader2 className="inline w-3 h-3 mr-0.5 animate-spin" />
                      )}
                      {STATUS_LABEL[r.status] ?? r.status}
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
        <Button
          className="w-full h-12"
          disabled={!pick || processing || selected.length === 0}
          onClick={handleStart}
        >
          {processing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              요청 중…
            </>
          ) : (
              `컨설팅 받기 · ${finalCost}하트`
            )}
          </Button>
        </div>
    </div>
  );
};

export default WeddingConsulting;
