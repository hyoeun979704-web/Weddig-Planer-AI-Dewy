import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
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
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { uploadDressSource, generateDressRecommend } from "@/features/consumer/data/dressFitting";
import { fetchHeartBalance } from "@/features/consumer/data/hearts";
import {
  SCENES_BY_TYPE,
  SCENE_TYPE_LABEL,
  SCENE_TYPE_DESC,
  SceneType,
  SceneCode,
  buildRecommendDressPrompt,
} from "@/data/fittingScenes";
import {
  BODY_SHAPES,
  BODY_SHAPE_BY_VALUE,
  BodyShape,
  bodyShapeShortDescription,
  bodyShapeIdentify,
  bodyShapeGuide,
} from "@/data/bodyShapes";
import { FittingProgress } from "@/components/fitting/FittingProgress";
import { PersonalizationChips } from "@/components/PersonalizationChips";
import { useWeddingContext } from "@/hooks/useWeddingContext";
import { buildDressPromptAddendum } from "@/lib/weddingContext";

/**
 * 드레스 AI 추천 — 사진 + 체형 → gpt-image-2 가 직접 어울리는 드레스
 * 디자인 + 합성.
 */

const HEART_COST = 5;

type Step = "intro" | "photo" | "shape" | "scene" | "tone" | "review";
const STEP_ORDER: Step[] = ["intro", "photo", "shape", "scene", "tone", "review"];

const DressRecommend = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  // 성별 — 예복(신랑)은 예복 투어의 "AI 추천받기"가 ?gender=groom 을 달고 진입한다(진입점 분리).
  const gender: "bride" | "groom" = searchParams.get("gender") === "groom" ? "groom" : "bride";
  const isGroom = gender === "groom";
  const { user } = useAuth();
  const { context: personalization } = useWeddingContext();

  const [step, setStep] = useState<Step>("intro");
  const [hearts, setHearts] = useState<number | null>(null);
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [bodyShape, setBodyShape] = useState<BodyShape | null>(null);
  const [sceneType, setSceneType] = useState<SceneType | null>(null);
  const [sceneCode, setSceneCode] = useState<SceneCode | null>(null);
  const [consentOpen, setConsentOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchHearts = useCallback(async () => {
    if (!user) return;
    setHearts(await fetchHeartBalance(user.id));
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

    let uploaded: { path: string; signedUrl: string | null };
    try {
      uploaded = await uploadDressSource(user.id, file);
    } catch (err) {
      toast({
        title: "업로드 실패",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
      return;
    }
    setPhotoPath(uploaded.path);
    setPhotoUrl(uploaded.signedUrl);
    setStep("shape");
  };

  const handleGenerate = async () => {
    if (!photoPath || !bodyShape || !sceneCode) return;
    const shape = BODY_SHAPE_BY_VALUE[bodyShape];
    setIsGenerating(true);
    try {
      const prompt =
        buildRecommendDressPrompt(
          sceneCode,
          shape.label,
          bodyShapeGuide(shape, gender),
          gender,
        ) + buildDressPromptAddendum(personalization);

      const fittingId = await generateDressRecommend({
        source_image_path: photoPath,
        body_shape: bodyShape,
        scene_code: sceneCode,
        prompt,
      });
      // 생성은 비동기(결과 페이지에서 폴링) — "완료"가 아니라 "요청됨"으로 안내.
      toast({ title: "생성 요청을 보냈어요", description: "결과가 준비되면 화면에 표시돼요." });
      await fetchHearts();
      navigate(`/ai-studio/dress-tour/result/${fittingId}`);
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
    intro: 0, photo: 1, shape: 2, scene: 3, tone: 4, review: 5,
  };
  const stepLabel: Record<Step, string> = {
    intro: "시작",
    photo: "사진 업로드",
    shape: "체형 선택",
    scene: "촬영 컷 선택",
    tone: "배경 선택",
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
            {isGroom ? "예복 AI 추천" : "드레스 AI 추천"}
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
          <>
            <PersonalizationChips chips={personalization.summaryChips} />
            <IntroSection hearts={hearts} onStart={handleStart} isGroom={isGroom} />
          </>
        )}
        {step === "photo" && (
          <PhotoStep
            photoUrl={photoUrl}
            onPickFile={() => fileInputRef.current?.click()}
            onNext={() => setStep("shape")}
          />
        )}
        {step === "shape" && (
          <ShapeStep
            selected={bodyShape}
            gender={gender}
            onPick={(v) => {
              setBodyShape(v);
              setStep("scene");
            }}
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
            bodyShape={bodyShape}
            sceneCode={sceneCode}
            hearts={hearts}
            isGenerating={isGenerating}
            onGenerate={handleGenerate}
            onEditPhoto={() => setStep("photo")}
            onEditShape={() => setStep("shape")}
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
  isGroom,
}: {
  hearts: number | null;
  onStart: () => void;
  isGroom: boolean;
}) => (
  <>
    <section className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">
          {isGroom
            ? "내 체형에 어울리는 예복을 AI가 추천"
            : "내 체형에 어울리는 드레스를 AI가 추천"}
        </h2>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {isGroom
          ? "체형(어깨·허리 비율)을 알려주시면 AI가 가장 잘 어울리는 예복(핏·라펠·컬러)을 직접 골라 입혀드려요. 원하는 수트가 딱히 없어도 괜찮아요."
          : "체형(스트레이트·웨이브·다이아몬드 등)을 알려주시면 AI가 가장 잘 어울리는 드레스를 직접 디자인해서 입혀드려요. 카탈로그에 없는 조합도 가능해요."}
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
        전신 사진을 올리면 실제 체형이 반영되어 더 정확해요. 셀카만으로도
        가능하지만 체형은 AI가 추정해요.
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

const ShapeStep = ({
  selected,
  gender,
  onPick,
}: {
  selected: BodyShape | null;
  gender: "bride" | "groom";
  onPick: (v: BodyShape) => void;
}) => (
  <section className="space-y-3">
    <h2 className="text-lg font-bold text-foreground">체형 선택</h2>
    <p className="text-[12px] text-muted-foreground">
      가장 가까운 체형을 골라주세요. 정확히 모르면 설명을 참고해서 선택.
    </p>
    <div className="grid grid-cols-1 gap-2.5">
      {BODY_SHAPES.map((b) => (
        <button
          key={b.value}
          type="button"
          onClick={() => onPick(b.value)}
          className={`bg-card rounded-2xl border p-4 text-left active:scale-[0.99] transition-transform ${
            selected === b.value
              ? "border-primary ring-2 ring-primary/20"
              : "border-border"
          }`}
        >
          <p className="text-base font-bold text-foreground mb-1">{b.label}</p>
          <p className="text-[12px] text-muted-foreground mb-1.5">
            {bodyShapeShortDescription(b, gender)}
          </p>
          <p className="text-[11px] text-foreground/60">
            {bodyShapeIdentify(b, gender)}
          </p>
        </button>
      ))}
    </div>
  </section>
);

const SceneStep = ({ onPick }: { onPick: (t: SceneType) => void }) => (
  <section className="space-y-3">
    <h2 className="text-lg font-bold text-foreground">어떤 컷이 좋으세요?</h2>
    <div className="grid grid-cols-1 gap-3">
      {(["CEREMONY", "STUDIO"] as SceneType[]).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onPick(t)}
          className="bg-card rounded-2xl border border-border p-4 text-left active:scale-[0.98] transition-transform"
        >
          <p className="text-base font-bold text-foreground mb-1">
            {SCENE_TYPE_LABEL[t]}
          </p>
          <p className="text-[12px] text-muted-foreground">
            {SCENE_TYPE_DESC[t]}
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
  sceneType: SceneType;
  onPick: (code: SceneCode) => void;
}) => {
  const list = SCENES_BY_TYPE[sceneType];
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-foreground">
        {SCENE_TYPE_LABEL[sceneType]} · 배경 분위기
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
  bodyShape,
  sceneCode,
  hearts,
  isGenerating,
  onGenerate,
  onEditPhoto,
  onEditShape,
  onEditScene,
}: {
  photoUrl: string | null;
  bodyShape: BodyShape | null;
  sceneCode: SceneCode | null;
  hearts: number | null;
  isGenerating: boolean;
  onGenerate: () => void;
  onEditPhoto: () => void;
  onEditShape: () => void;
  onEditScene: () => void;
}) => {
  const shape = bodyShape ? BODY_SHAPE_BY_VALUE[bodyShape] : null;
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">선택 확인</h2>

      <SummaryRow
        label="사진"
        right={
          photoUrl && (
            <img src={photoUrl} alt="" className="w-12 h-16 object-cover rounded" />
          )
        }
        onEdit={onEditPhoto}
      />
      <SummaryRow
        label="체형"
        right={
          shape && (
            <span className="text-[13px] text-foreground">{shape.label}</span>
          )
        }
        onEdit={onEditShape}
      />
      <SummaryRow
        label="컷·배경"
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

export default DressRecommend;
