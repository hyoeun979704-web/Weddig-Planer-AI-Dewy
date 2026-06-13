import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Heart,
  Sparkles,
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
  MAKEUP_SCENES_BY_TYPE,
  MAKEUP_SCENE_TYPE_LABEL,
  MAKEUP_SCENE_TYPE_DESC,
  MakeupSceneType,
  MakeupSceneCode,
  buildRecommendMakeupPrompt,
} from "@/data/makeupScenes";
import { FittingProgress } from "@/components/fitting/FittingProgress";

/**
 * 메이크업 AI 추천 — 셀카만 입력. gpt-image-2 가 얼굴을 보고 어울리는
 * 메이크업을 직접 디자인해서 적용. (체형 같은 추가 입력 없음)
 */

const HEART_COST = 5;

type Step = "intro" | "photo" | "scene" | "tone" | "review";
const STEP_ORDER: Step[] = ["intro", "photo", "scene", "tone", "review"];

const MakeupRecommend = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [step, setStep] = useState<Step>("intro");
  const [hearts, setHearts] = useState<number | null>(null);
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [sceneType, setSceneType] = useState<MakeupSceneType | null>(null);
  const [sceneCode, setSceneCode] = useState<MakeupSceneCode | null>(null);
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

  const handleStart = () => {
    if (!user) {
      toast({ title: "로그인이 필요해요" });
      navigate("/auth");
      return;
    }
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

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;

    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "파일이 너무 커요 (최대 20MB)", variant: "destructive" });
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast({ title: "이미지 파일만 가능해요", variant: "destructive" });
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
    setStep("scene");
  };

  const handleGenerate = async () => {
    if (!photoPath || !sceneCode) return;
    setIsGenerating(true);
    try {
      const prompt = buildRecommendMakeupPrompt(sceneCode);

      const { data, error } = await supabase.functions.invoke(
        "dewy-makeup-recommend",
        {
          body: {
            source_image_path: photoPath,
            scene_code: sceneCode,
            prompt,
          },
        },
      );
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      const fittingId = (data as any)?.fitting_id;
      toast({ title: "생성 완료!" });
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
          description: "하트는 환불됐어요.",
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
    intro: 0, photo: 1, scene: 2, tone: 3, review: 4,
  };
  const stepLabel: Record<Step, string> = {
    intro: "시작",
    photo: "사진 업로드",
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
            메이크업 AI 추천
          </h1>
          {step !== "intro" && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                {stepNumber[step]}
              </span>
              /4
            </div>
          )}
        </div>
        {step !== "intro" && (
          <div className="px-4 pb-2 flex items-center gap-2 text-[12px] text-muted-foreground">
            <span>{stepLabel[step]}</span>
            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${(stepNumber[step] / 4) * 100}%` }}
              />
            </div>
          </div>
        )}
      </header>

      <main className="px-5 py-6">
        {step === "intro" && (
          <IntroSection hearts={hearts} onStart={handleStart} />
        )}
        {step === "photo" && (
          <PhotoStep
            photoUrl={photoUrl}
            onPickFile={() => fileInputRef.current?.click()}
            onNext={() => setStep("scene")}
          />
        )}
        {step === "scene" && (
          <SceneStep
            onPick={(t) => {
              setSceneType(t);
              setStep("tone");
            }}
          />
        )}
        {step === "tone" && sceneType && (
          <ToneStep
            sceneType={sceneType}
            onPick={(c) => {
              setSceneCode(c);
              setStep("review");
            }}
          />
        )}
        {step === "review" && (
          <ReviewSection
            photoUrl={photoUrl}
            sceneCode={sceneCode}
            hearts={hearts}
            isGenerating={isGenerating}
            onGenerate={handleGenerate}
            onEditPhoto={() => setStep("photo")}
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
}: {
  hearts: number | null;
  onStart: () => void;
}) => (
  <>
    <section className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">
          내 얼굴에 어울리는 메이크업을 AI가 추천
        </h2>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">
        셀카 한 장을 올리면 AI가 퍼스널컬러·얼굴형·눈매·입술·코를 분석해서
        가장 잘 어울리는 신부 메이크업을 직접 디자인해 적용해드려요.
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

    <section className="mb-6 p-3 bg-blue-50 rounded-lg flex gap-2">
      <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
      <p className="text-[12px] text-blue-900 leading-relaxed">
        <strong>정면 셀카</strong>가 가장 정확해요. 노메이크업 또는 옅은
        화장 사진을 권장해요 (두꺼운 화장 위에 덮여 보일 수 있음).
        분석은 사진 한 장 기반이라 참고용이에요.
      </p>
    </section>

    <Button onClick={onStart} className="w-full h-12 text-[15px] font-bold">
      <Sparkles className="w-5 h-5 mr-2" />
      AI 추천 시작
    </Button>
  </>
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
    <h2 className="text-lg font-bold text-foreground">셀카 업로드</h2>
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

const SceneStep = ({
  onPick,
}: {
  onPick: (t: MakeupSceneType) => void;
}) => (
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
  sceneCode,
  hearts,
  isGenerating,
  onGenerate,
  onEditPhoto,
  onEditScene,
}: {
  photoUrl: string | null;
  sceneCode: MakeupSceneCode | null;
  hearts: number | null;
  isGenerating: boolean;
  onGenerate: () => void;
  onEditPhoto: () => void;
  onEditScene: () => void;
}) => {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">선택 확인</h2>

      <SummaryRow
        label="셀카"
        right={
          photoUrl && (
            <img src={photoUrl} alt="" className="w-12 h-16 object-cover rounded" />
          )
        }
        onEdit={onEditPhoto}
      />
      <SummaryRow
        label="컷·조명"
        right={
          sceneCode && (
            <span className="text-[13px] text-foreground">{sceneCode}</span>
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
            AI 추천 생성
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

export default MakeupRecommend;
