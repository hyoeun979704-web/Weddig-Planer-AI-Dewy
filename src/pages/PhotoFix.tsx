import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Upload, X, Download, Sparkles } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// 초간단 사진보정 — 1회 최대 8장 일괄 화질 개선.
// 가격: 장당 5하트, n장 = min(n*5, 35). 계정당 첫 1회 50% 할인(반올림).
const PER = 5;
const CAP = 35;
const MAX_PHOTOS = 8;
const baseCost = (n: number) => Math.min(n * PER, CAP);

interface Pick {
  file: File;
  url: string; // 미리보기 objectURL
}
interface ResultItem {
  source: string;
  path: string;
  url: string | null;
}

const PhotoFix = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [picks, setPicks] = useState<Pick[]>([]);
  const [discounted, setDiscounted] = useState<boolean | null>(null); // 첫 1회 여부
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<ResultItem[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // 첫 1회 할인 여부(계정당) 조회
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("photo_retouch_usage")
        .select("used_count")
        .eq("user_id", user.id)
        .maybeSingle();
      setDiscounted((data?.used_count ?? 0) === 0);
    })();
  }, [user]);

  const onPick = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      e.target.value = "";
      setPicks((prev) => {
        const next = [...prev];
        for (const f of files) {
          if (next.length >= MAX_PHOTOS) {
            toast({ title: `최대 ${MAX_PHOTOS}장까지 가능해요` });
            break;
          }
          if (!f.type.startsWith("image/")) continue;
          if (f.size > 5 * 1024 * 1024) {
            toast({ title: `${f.name} 이 너무 커요 (5MB 초과)` });
            continue;
          }
          next.push({ file: f, url: URL.createObjectURL(f) });
        }
        return next;
      });
    },
    [],
  );

  const removePick = (i: number) =>
    setPicks((p) => {
      URL.revokeObjectURL(p[i]?.url);
      return p.filter((_, idx) => idx !== i);
    });

  const base = baseCost(picks.length);
  const finalCost = discounted ? Math.round(base / 2) : base;

  const handleStart = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (picks.length === 0) return;
    if (
      !window.confirm(
        `사진 ${picks.length}장 화질 보정에 ${finalCost}하트가 차감돼요${discounted ? " (첫 1회 50% 할인 적용)" : ""}. 진행할까요?`,
      )
    )
      return;

    setProcessing(true);
    setResults(null);
    try {
      // 1) 업로드 → 본인 폴더 경로 수집
      const sourcePaths: string[] = [];
      for (const p of picks) {
        const ext = p.file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${user.id}/photofix/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage
          .from("invitation-uploads")
          .upload(path, p.file, { contentType: p.file.type, upsert: false });
        if (error) throw new Error(`업로드 실패: ${error.message}`);
        sourcePaths.push(path);
      }

      // 2) 일괄 보정 호출
      const { data, error } = await (supabase as any).functions.invoke(
        "photo-enhance-batch",
        { body: { source_paths: sourcePaths } },
      );
      if (error) {
        let code: string | undefined;
        try {
          const ctx = (error as { context?: { json?: () => Promise<any> } })
            .context;
          if (ctx?.json) code = (await ctx.json())?.error;
        } catch {
          /* ignore */
        }
        if (code === "insufficient_hearts") {
          toast({
            title: "하트가 부족해요",
            description: `이 보정에 ${finalCost}하트가 필요해요.`,
            variant: "destructive",
            action: { label: "충전하기", onClick: () => navigate("/points") },
          });
          return;
        }
        throw new Error(code ?? error.message ?? "보정 실패");
      }
      if (data?.error) throw new Error(data.error);
      setResults((data?.results ?? []) as ResultItem[]);
      setDiscounted(false); // 첫 할인 소진
      toast({
        title: "보정 완료",
        description: `${data?.results?.length ?? 0}장 · ${data?.charged ?? finalCost}하트 사용`,
      });
    } catch (e) {
      toast({
        title: "보정 실패",
        description: e instanceof Error ? e.message : "오류",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto pb-24">
      <PageHeader title="초간단 사진보정" />
      <main className="px-4 py-5 space-y-5">
        <section className="rounded-2xl bg-pink-50 p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">
              흐린 사진을 또렷하게
            </h2>
          </div>
          <p className="mt-1 text-[12px] text-muted-foreground leading-relaxed">
            저화질·흔들린 웨딩 사진의 해상도와 선명도를 AI가 올려드려요. 얼굴·구도는
            그대로 유지돼요. (몸매 보정은 별도 기능)
          </p>
          <p className="mt-2 text-[12px] text-foreground">
            장당 {PER}하트 · 최대 {MAX_PHOTOS}장(묶음 {CAP}하트)
            {discounted && (
              <span className="ml-1 text-primary font-semibold">
                · 첫 1회 50% 할인
              </span>
            )}
          </p>
        </section>

        {/* 선택 사진 그리드 */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">
              사진 선택{" "}
              <span className="text-[11px] text-muted-foreground font-normal">
                ({picks.length} / {MAX_PHOTOS})
              </span>
            </h3>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {picks.map((p, i) => (
              <div
                key={i}
                className="relative aspect-square rounded-lg overflow-hidden bg-muted"
              >
                <img src={p.url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePick(i)}
                  className="absolute top-1 right-1 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center"
                  aria-label="제거"
                >
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            ))}
            {picks.length < MAX_PHOTOS && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="aspect-square rounded-lg border-2 border-dashed border-border bg-muted/30 flex flex-col items-center justify-center gap-1 active:scale-[0.98]"
              >
                <Upload className="w-5 h-5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">사진 추가</span>
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={onPick}
          />
        </section>

        {/* 결과 */}
        {results && results.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-foreground">보정 결과</h3>
            <div className="grid grid-cols-2 gap-2">
              {results.map((r, i) =>
                r.url ? (
                  <a
                    key={i}
                    href={r.url}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="relative aspect-square rounded-lg overflow-hidden bg-muted block"
                  >
                    <img
                      src={r.url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-1 right-1 bg-black/60 text-white rounded-full p-1.5">
                      <Download className="w-3.5 h-3.5" />
                    </span>
                  </a>
                ) : null,
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              이미지를 탭하면 저장돼요. 다운로드 링크는 7일간 유효해요.
            </p>
          </section>
        )}
      </main>

      {/* 하단 고정 실행 버튼 */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-4 pb-[calc(var(--safe-bottom)+12px)] pt-3 bg-background/95 backdrop-blur border-t border-border">
        <Button
          className="w-full h-12"
          disabled={picks.length === 0 || processing}
          onClick={handleStart}
        >
          {processing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              보정 중… 수십 초 걸릴 수 있어요
            </>
          ) : picks.length === 0 ? (
            "사진을 선택해주세요"
          ) : (
            `${picks.length}장 보정 시작 · ${finalCost}하트`
          )}
        </Button>
      </div>
    </div>
  );
};

export default PhotoFix;
