import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Heart,
  Sparkles,
  Camera,
  Upload,
  Loader2,
  Info,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import PhotoUploadConsent from "@/components/PhotoUploadConsent";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  MAKEUP_SCENES,
  MAKEUP_SCENES_BY_TYPE,
  MAKEUP_SCENE_TYPE_LABEL,
  MAKEUP_SCENE_TYPE_DESC,
  MakeupSceneType,
  MakeupSceneCode,
  buildMakeupPrompt,
} from "@/data/makeupScenes";
import { describeMakeup, type MakeupMetadata } from "@/lib/makeupDescription";
import { CustomMakeupPicker, summarizeMakeupKo } from "@/components/fitting/CustomMakeupPicker";
import { FittingProgress } from "@/components/fitting/FittingProgress";
import { labelOfMakeup } from "@/data/makeupFilters";
import { addPendingJob } from "@/lib/pendingJobs";

/**
 * 메이크업 시뮬레이션 — 드레스 피팅과 동일 구조.
 *
 * 흐름:
 *   0. 인트로 + 하트 잔액 → "시작"
 *   1. 셀카·얼굴 사진 업로드 (consent → makeup-uploads)
 *   2. 메이크업 룩 선택 (active makeup_samples 그리드)
 *   3. Scene 선택 (본식 / 촬영)
 *   4. Lighting 선택 (식장 조명 / 자연광 / 골든아워)
 *   5. 생성 (5하트 + dewy-makeup Edge Function) → 결과 페이지
 */

const HEART_COST = 5;

interface MakeupSample {
  id: string;
  name: string;
  image_url: string;
  base_finish: string | null;
  lip_color: string | null;
  eye_style: string | null;
}

type Step = "intro" | "photo" | "makeup" | "scene" | "tone" | "review";

const STEP_ORDER: Step[] = [
  "intro",
  "photo",
  "makeup",
  "scene",
  "tone",
  "review",
];

const MakeupFitting = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [step, setStep] = useState<Step>("intro");
  const [hearts, setHearts] = useState<number | null>(null);
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [makeups, setMakeups] = useState<MakeupSample[]>([]);
  const [loadingMakeups, setLoadingMakeups] = useState(false);
  const [makeupMode, setMakeupMode] = useState<"catalog" | "custom">("catalog");
  const [customMakeup, setCustomMakeup] = useState<MakeupMetadata>({});
  const [selectedMakeup, setSelectedMakeup] = useState<MakeupSample | null>(
    null,
  );
  const [selectedSceneType, setSelectedSceneType] =
    useState<MakeupSceneType | null>(null);
  const [selectedSceneCode, setSelectedSceneCode] =
    useState<MakeupSceneCode | null>(null);
  const [consentOpen, setConsentOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchHearts = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("user_hearts")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();
    setHearts(data?.balance ?? 0);
  }, [user]);

  useEffect(() => {
    fetchHearts();
  }, [fetchHearts]);

  useEffect(() => {
    if (step !== "makeup" || makeups.length > 0) return;
    setLoadingMakeups(true);
    (async () => {
      const { data, error } = await (supabase as any)
        .from("makeup_samples")
        .select("id, name, image_url, base_finish, lip_color, eye_style")
        .eq("is_active", true)
        .order("display_order", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) {
        toast({
          title: "메이크업 목록을 불러올 수 없어요",
          variant: "destructive",
        });
      } else {
        setMakeups(data ?? []);
      }
      setLoadingMakeups(false);
    })();
  }, [step, makeups.length]);

  const requireAuth = (): boolean => {
    if (!user) {
      toast({ title: "로그인이 필요해요", description: "먼저 로그인해주세요." });
      navigate("/auth");
      return false;
    }
    return true;
  };

  const handleStart = () => {
    if (!requireAuth()) return;
    if ((hearts ?? 0) < HEART_COST) {
      toast({
        title: "하트가 부족해요",
        description: `한 장 생성에 ${HEART_COST}하트가 필요해요.`,
      });
      navigate("/points");
      return;
    }
    setConsentOpen(true);
  };

  const handleConsentAgreed = () => {
    setConsentOpen(false);
    setStep("photo");
    setTimeout(() => fileInputRef.current?.click(), 200);
  };

  const handleFileSelected = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;

    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "파일이 너무 커요 (최대 20MB)", variant: "destructive" });
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast({ title: "이미지 파일만 업로드 가능해요", variant: "destructive" });
      return;
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const filename = `${crypto.randomUUID()}.${ext}`;
    const path = `${user.id}/${filename}`;

    const { error: uploadError } = await supabase.storage
      .from("makeup-uploads")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) {
      toast({
        title: "업로드 실패",
        description: uploadError.message,
        variant: "destructive",
      });
      return;
    }

    const { data: signed } = await supabase.storage
      .from("makeup-uploads")
      .createSignedUrl(path, 60 * 60 * 2);
    setPhotoPath(path);
    setPhotoUrl(signed?.signedUrl ?? null);
    setStep("makeup");
  };

  const handlePickMakeup = (m: MakeupSample) => {
    setSelectedMakeup(m);
    setStep("scene");
  };

  const handlePickSceneType = (t: MakeupSceneType) => {
    setSelectedSceneType(t);
    setStep("tone");
  };

  const handlePickTone = (code: MakeupSceneCode) => {
    setSelectedSceneCode(code);
    setStep("review");
  };

  const handleGenerate = async () => {
    if (!photoPath || !selectedSceneCode) return;
    if (makeupMode === "catalog" && !selectedMakeup) return;
    setIsGenerating(true);
    try {
      let prompt: string;
      let requestBody: Record<string, unknown>;

      if (makeupMode === "custom") {
        // 맞춤: 고른 속성을 SCHEMA 텍스트로 직렬화 → 레퍼런스 이미지 없이 생성.
        prompt = buildMakeupPrompt(selectedSceneCode, describeMakeup(customMakeup), { custom: true });
        requestBody = {
          source_image_path: photoPath,
          scene_code: selectedSceneCode,
          prompt,
        };
      } else {
        const { data: meta } = await (supabase as any)
          .from("makeup_samples")
          .select(
            "name, base_finish, lip_color, lip_finish, eye_style, eye_color, blush_color, blush_placement, brow_shape, contour_intensity, details, mood",
          )
          .eq("id", selectedMakeup!.id)
          .maybeSingle();

        const description = meta ? describeMakeup(meta) : "";
        prompt = buildMakeupPrompt(selectedSceneCode, description);
        requestBody = {
          source_image_path: photoPath,
          makeup_sample_id: selectedMakeup!.id,
          scene_code: selectedSceneCode,
          prompt,
        };
      }

      const { data, error } = await supabase.functions.invoke("dewy-makeup", {
        body: requestBody,
      });
      if (error) throw error;
      if ((data as any)?.error) {
        throw new Error((data as any).error);
      }

      const fittingId = (data as any)?.fitting_id;
      if (!fittingId) throw new Error("생성 요청 실패");
      // 백그라운드 생성 시작 — 완료 알림을 위해 진행중 잡 등록 후 결과 페이지로.
      addPendingJob({ id: fittingId, type: "makeup" });
      await fetchHearts();
      navigate(`/ai-studio/makeup-room/result/${fittingId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "알 수 없는 오류";
      if (msg.includes("insufficient_hearts")) {
        toast({ title: "하트가 부족해요", variant: "destructive" });
        navigate("/points");
      } else if (msg.includes("generation_failed")) {
        toast({
          title: "생성에 실패했어요",
          description: "하트는 환불됐어요. 다시 시도해주세요.",
          variant: "destructive",
        });
        await fetchHearts();
      } else {
        toast({ title: "오류", description: msg, variant: "destructive" });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const stepNumber: Record<Step, number> = {
    intro: 0,
    photo: 1,
    makeup: 2,
    scene: 3,
    tone: 4,
    review: 5,
  };
  const stepLabel: Record<Step, string> = {
    intro: "시작",
    photo: "사진 업로드",
    makeup: "메이크업 선택",
    scene: "촬영 컷 선택",
    tone: "조명 선택",
    review: "확인",
  };

  const goBack = () => {
    const idx = STEP_ORDER.indexOf(step);
    setStep(idx > 0 ? STEP_ORDER[idx - 1] : "intro");
  };

  return (
    <div className="min-h-screen bg-background app-col mx-auto relative pb-32">
      <header className="sticky safe-sticky-header z-40 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3 px-4 h-14">
          <button
            onClick={() => (step === "intro" ? navigate(-1) : goBack())}
            className="p-1"
            aria-label="뒤로"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-base font-bold text-foreground flex-1">
            방구석 메이크업 룸
          </h1>
          {step !== "intro" && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                {stepNumber[step]}
              </span>
              /5
            </div>
          )}
        </div>
        {step !== "intro" && (
          <div className="px-4 pb-2 flex items-center gap-2 text-[12px] text-muted-foreground">
            <span>{stepLabel[step]}</span>
            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${(stepNumber[step] / 5) * 100}%` }}
              />
            </div>
          </div>
        )}
      </header>

      <main className="px-5 py-6">
        {step === "intro" && (
          <IntroSection
            hearts={hearts}
            onStart={handleStart}
            onRecommend={() => navigate("/ai-studio/makeup-room/recommend")}
            onGallery={() => navigate("/ai-studio/makeup-room/gallery")}
          />
        )}

        {step === "photo" && (
          <PhotoStep
            photoUrl={photoUrl}
            onPickFile={() => fileInputRef.current?.click()}
            onNext={() => setStep("makeup")}
          />
        )}

        {step === "makeup" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMakeupMode("catalog")}
                className={`h-10 rounded-xl text-[13px] font-bold border transition-colors ${makeupMode === "catalog" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"}`}
              >
                카탈로그에서 선택
              </button>
              <button
                type="button"
                onClick={() => setMakeupMode("custom")}
                className={`h-10 rounded-xl text-[13px] font-bold border transition-colors ${makeupMode === "custom" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"}`}
              >
                맞춤 생성
              </button>
            </div>
            {makeupMode === "catalog" ? (
              <MakeupStep
                makeups={makeups}
                loading={loadingMakeups}
                onPick={handlePickMakeup}
              />
            ) : (
              <CustomMakeupPicker
                value={customMakeup}
                onChange={setCustomMakeup}
                onConfirm={() => {
                  setSelectedMakeup(null);
                  setStep("scene");
                }}
              />
            )}
          </div>
        )}

        {step === "scene" && <SceneStep onPick={handlePickSceneType} />}

        {step === "tone" && selectedSceneType && (
          <ToneStep sceneType={selectedSceneType} onPick={handlePickTone} />
        )}

        {step === "review" && (
          <ReviewSection
            photoUrl={photoUrl}
            makeup={selectedMakeup}
            customSummary={makeupMode === "custom" ? summarizeMakeupKo(customMakeup) : null}
            sceneCode={selectedSceneCode}
            hearts={hearts}
            isGenerating={isGenerating}
            onGenerate={handleGenerate}
            onEditPhoto={() => setStep("photo")}
            onEditMakeup={() => setStep("makeup")}
            onEditScene={() => setStep("scene")}
          />
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelected}
        />
      </main>

      <Dialog open={consentOpen} onOpenChange={setConsentOpen}>
        <DialogContent className="max-w-md p-0 bg-transparent border-0 shadow-none">
          <DialogHeader className="sr-only">
            <DialogTitle>사진 업로드 동의</DialogTitle>
          </DialogHeader>
          <PhotoUploadConsent
            onConsent={handleConsentAgreed}
            onCancel={() => setConsentOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <BottomNav
        activeTab={location.pathname}
        onTabChange={(href) => navigate(href)}
      />
    </div>
  );
};

const IntroSection = ({
  hearts,
  onStart,
  onRecommend,
  onGallery,
}: {
  hearts: number | null;
  onStart: () => void;
  onRecommend: () => void;
  onGallery: () => void;
}) => (
  <>
    <section className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">
          내 얼굴로 신부 메이크업 미리보기
        </h2>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">
        내 셀카 한 장이면 다양한 신부 메이크업 룩을 얼굴에 입혀본 모습을
        AI가 자연스럽게 생성해드려요.
      </p>
    </section>

    <section className="mb-6 p-4 bg-pink-50 rounded-xl border border-pink-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] text-muted-foreground mb-1">한 장 생성</p>
          <div className="flex items-center gap-1">
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
            <span className="text-lg font-bold text-foreground">{HEART_COST}</span>
            <span className="text-sm text-muted-foreground">하트</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-muted-foreground">내 잔액</p>
          <p className="text-base font-bold text-foreground">
            {hearts === null ? "—" : `${hearts} `}
          </p>
        </div>
      </div>
    </section>

    <section className="mb-6">
      <h3 className="text-sm font-bold text-foreground mb-3">진행 순서</h3>
      <ol className="space-y-2 text-sm text-foreground/85">
        <StepRow n={1}>얼굴이 또렷한 사진 업로드 (정면, 최대 20MB)</StepRow>
        <StepRow n={2}>마음에 드는 메이크업 룩 선택</StepRow>
        <StepRow n={3}>본식 / 촬영 컷 선택</StepRow>
        <StepRow n={4}>조명 선택 (식장 조명/자연광/골든아워)</StepRow>
        <StepRow n={5}>AI 생성 대기 (약 15~30초)</StepRow>
      </ol>
    </section>

    <section className="mb-6 p-3 bg-blue-50 rounded-lg flex gap-2">
      <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
      <p className="text-[12px] text-blue-900 leading-relaxed">
        <strong>정면 사진</strong>이 가장 정확해요. 두꺼운 화장 위에 메이크업이
        덮여 보일 수 있어요 — 노메이크업 또는 옅은 화장 사진을 권장해요.
      </p>
    </section>

    <section className="mb-6 space-y-2">
      <button
        type="button"
        onClick={onStart}
        className="w-full bg-primary text-primary-foreground rounded-xl py-4 font-bold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
      >
        <Camera className="w-5 h-5" />
        직접 골라서 시작
      </button>
      <button
        type="button"
        onClick={onRecommend}
        className="w-full bg-card border border-primary/40 text-primary rounded-xl py-4 font-bold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
      >
        <Sparkles className="w-5 h-5" />
        AI 추천받기 (얼굴 분석)
      </button>
      <p className="mt-2 text-[11px] text-center text-muted-foreground">
        시작 시{" "}
        <a href="/terms" className="underline">
          이용약관
        </a>
        과{" "}
        <a href="/privacy" className="underline">
          개인정보처리방침
        </a>
        에 동의한 것으로 간주돼요.
      </p>
    </section>

    <section className="border-t border-border pt-6">
      <button
        type="button"
        onClick={onGallery}
        className="w-full flex items-center justify-between text-left"
      >
        <span className="text-sm font-medium text-foreground">
          내 메이크업 갤러리
        </span>
        <span className="text-[13px] text-muted-foreground">→</span>
      </button>
    </section>
  </>
);

const StepRow = ({
  n,
  children,
}: {
  n: number;
  children: React.ReactNode;
}) => (
  <li className="flex gap-3">
    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center mt-0.5">
      {n}
    </span>
    <span className="leading-relaxed">{children}</span>
  </li>
);

const PhotoStep = ({
  photoUrl,
  onPickFile,
  onNext,
}: {
  photoUrl: string | null;
  onPickFile: () => void;
  onNext: () => void;
}) => (
  <section className="space-y-4">
    <h2 className="text-lg font-bold text-foreground">사진 업로드</h2>
    {photoUrl ? (
      <div className="space-y-3">
        <img
          src={photoUrl}
          alt="업로드된 사진"
          className="w-full aspect-[3/4] object-cover rounded-2xl border border-border"
        />
        <div className="flex gap-2">
          <Button variant="outline" onClick={onPickFile} className="flex-1">
            다른 사진
          </Button>
          <Button onClick={onNext} className="flex-1">
            다음 →
          </Button>
        </div>
      </div>
    ) : (
      <button
        type="button"
        onClick={onPickFile}
        className="w-full aspect-[3/4] rounded-2xl border-2 border-dashed border-border bg-muted/30 flex flex-col items-center justify-center gap-2 active:scale-[0.99] transition-transform"
      >
        <Upload className="w-8 h-8 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">사진 선택</p>
        <p className="text-[11px] text-muted-foreground">JPG/PNG, 최대 20MB</p>
      </button>
    )}
  </section>
);

const MakeupStep = ({
  makeups,
  loading,
  onPick,
}: {
  makeups: MakeupSample[];
  loading: boolean;
  onPick: (m: MakeupSample) => void;
}) => (
  <section className="space-y-3">
    <h2 className="text-lg font-bold text-foreground">메이크업 선택</h2>
    <p className="text-[12px] text-muted-foreground">
      마음에 드는 메이크업 룩을 하나 골라주세요.
    </p>
    {loading ? (
      <div className="py-12 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    ) : makeups.length === 0 ? (
      <div className="py-12 text-center text-sm text-muted-foreground">
        등록된 메이크업이 없어요.
      </div>
    ) : (
      <div className="grid grid-cols-2 gap-3">
        {makeups.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onPick(m)}
            className="bg-card rounded-xl overflow-hidden border border-border text-left active:scale-[0.98] transition-transform"
          >
            <div className="aspect-[3/4] bg-muted">
              <img
                src={m.image_url}
                alt={m.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-2">
              <p className="text-[12px] font-semibold text-foreground truncate">
                {m.name}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                {[
                  labelOfMakeup("base_finish", m.base_finish),
                  labelOfMakeup("lip_color", m.lip_color),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          </button>
        ))}
      </div>
    )}
  </section>
);

const SceneStep = ({ onPick }: { onPick: (t: MakeupSceneType) => void }) => (
  <section className="space-y-3">
    <h2 className="text-lg font-bold text-foreground">어떤 컷이 좋으세요?</h2>
    <div className="grid grid-cols-1 gap-3">
      {(["CEREMONY", "STUDIO"] as MakeupSceneType[]).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onPick(t)}
          className="bg-card rounded-2xl border border-border p-4 text-left active:scale-[0.98] transition-transform"
        >
          <p className="text-base font-bold text-foreground mb-1">
            {MAKEUP_SCENE_TYPE_LABEL[t]}
          </p>
          <p className="text-[12px] text-muted-foreground">
            {MAKEUP_SCENE_TYPE_DESC[t]}
          </p>
        </button>
      ))}
    </div>
  </section>
);

const ToneStep = ({
  sceneType,
  onPick,
}: {
  sceneType: MakeupSceneType;
  onPick: (code: MakeupSceneCode) => void;
}) => {
  const list = MAKEUP_SCENES_BY_TYPE[sceneType];
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-foreground">
        {MAKEUP_SCENE_TYPE_LABEL[sceneType]} · 조명
      </h2>
      <div className="grid grid-cols-1 gap-3">
        {list.map((s) => (
          <button
            key={s.code}
            type="button"
            onClick={() => onPick(s.code)}
            className="bg-card rounded-2xl border border-border p-4 text-left active:scale-[0.98] transition-transform"
          >
            <p className="text-base font-bold text-foreground mb-1">
              {s.shortLabel}
            </p>
            <p className="text-[12px] text-muted-foreground">{s.description}</p>
          </button>
        ))}
      </div>
    </section>
  );
};

const ReviewSection = ({
  photoUrl,
  makeup,
  customSummary,
  sceneCode,
  hearts,
  isGenerating,
  onGenerate,
  onEditPhoto,
  onEditMakeup,
  onEditScene,
}: {
  photoUrl: string | null;
  makeup: MakeupSample | null;
  customSummary?: string | null;
  sceneCode: MakeupSceneCode | null;
  hearts: number | null;
  isGenerating: boolean;
  onGenerate: () => void;
  onEditPhoto: () => void;
  onEditMakeup: () => void;
  onEditScene: () => void;
}) => {
  const scene = MAKEUP_SCENES.find((s) => s.code === sceneCode);
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">선택 확인</h2>

      <SummaryRow
        label="사진"
        right={
          photoUrl && (
            <img
              src={photoUrl}
              alt=""
              className="w-12 h-16 object-cover rounded"
            />
          )
        }
        onEdit={onEditPhoto}
      />
      <SummaryRow
        label="메이크업"
        right={
          makeup ? (
            <div className="flex items-center gap-2">
              <img
                src={makeup.image_url}
                alt={makeup.name}
                className="w-12 h-16 object-cover rounded"
              />
              <span className="text-[12px] text-foreground truncate max-w-[120px]">
                {makeup.name}
              </span>
            </div>
          ) : customSummary ? (
            <span className="text-[12px] text-foreground text-right max-w-[160px]">
              맞춤 · {customSummary}
            </span>
          ) : null
        }
        onEdit={onEditMakeup}
      />
      <SummaryRow
        label="컷·조명"
        right={
          scene && (
            <span className="text-[13px] text-foreground">{scene.label}</span>
          )
        }
        onEdit={onEditScene}
      />

      <div className="p-3 bg-pink-50 rounded-lg flex items-center justify-between">
        <div className="flex items-center gap-1 text-[13px]">
          <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
          <span className="font-bold text-foreground">{HEART_COST}</span>
          <span className="text-muted-foreground">하트 차감</span>
        </div>
        <span className="text-[12px] text-muted-foreground">
          잔액 {hearts ?? 0}
        </span>
      </div>

      <Button
        onClick={onGenerate}
        disabled={isGenerating || (hearts ?? 0) < HEART_COST}
        className="w-full h-12 text-[15px] font-bold"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            생성 중... (약 30초)
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5 mr-2" />
            생성하기
          </>
        )}
      </Button>
      <FittingProgress active={isGenerating} />
    </section>
  );
};

const SummaryRow = ({
  label,
  right,
  onEdit,
}: {
  label: string;
  right: React.ReactNode;
  onEdit: () => void;
}) => (
  <div className="flex items-center justify-between p-3 bg-card rounded-xl border border-border">
    <span className="text-sm text-muted-foreground">{label}</span>
    <div className="flex items-center gap-2">
      {right}
      <button
        type="button"
        onClick={onEdit}
        className="text-[11px] text-primary font-medium underline"
      >
        변경
      </button>
    </div>
  </div>
);

export default MakeupFitting;
