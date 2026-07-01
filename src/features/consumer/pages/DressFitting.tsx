import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
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
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { uploadDressSource, fetchActiveDresses, generateDressFitting } from "@/features/consumer/data/dressFitting";
import { fetchHeartBalance } from "@/features/consumer/data/hearts";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import { bumpSignal, SIGNAL_KEYS } from "@/lib/behavioralSignals";
import {
  FITTING_SCENES,
  SCENES_BY_TYPE,
  SCENE_TYPE_LABEL,
  SCENE_TYPE_DESC,
  SceneType,
  SceneCode,
} from "@/data/fittingScenes";
import { type DressMetadata } from "@/lib/dressDescription";
import { SHOT_TYPES, type ShotType } from "@/data/shotTypes";
import { type RetouchLevel } from "@/data/retouch";
import { RetouchLevelPicker } from "@/components/fitting/RetouchLevelPicker";
import { CustomDressPicker, summarizeDressKo } from "@/components/fitting/CustomDressPicker";
import { FittingProgress } from "@/components/fitting/FittingProgress";
import { labelOf } from "@/data/dressFilters";
import { addPendingJob } from "@/lib/pendingJobs";

/**
 * 방구석 드레스 투어 — AI 드레스 피팅 메인 페이지 (b-3).
 *
 * 흐름:
 *   0. 인트로 + 하트 잔액 → "시작"
 *   1. 사진 업로드 (consent → upload to dress-uploads)
 *   2. 드레스 선택 (active dress_samples 그리드)
 *   3. Scene 선택 (본식 / 웨딩촬영)
 *   4. Tone 선택 (어두운 / 밝은 / 가든)
 *   5. 생성 (5하트 차감 + Edge Function 호출) → 결과 페이지
 */

const HEART_COST = 5;

interface DressSample {
  id: string;
  name: string;
  image_url: string;
  silhouette: string | null;
  neckline: string | null;
  sleeve: string | null;
  color: string | null;
  /** none/light/full — P18(임신) 페르소나에서 임산부 호환 정도. */
  pregnancy_supported: "none" | "light" | "full" | null;
}

// "tone" 단계는 scene 안에 통합되어 별도 단계 아님.
type Step = "intro" | "photo" | "dress" | "scene" | "review";

const STEP_ORDER: Step[] = ["intro", "photo", "dress", "scene", "review"];

const DressFitting = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { weddingSettings } = useWeddingSchedule();
  // 임신 페르소나(P18) — 본식 시점 차수와 무관하게, pregnant=true 이면 임산부
  // 호환 드레스(pregnancy_supported != 'none')만 활성으로 표시하고 사용자가
  // 명시적으로 "전체 보기" 토글을 켜면 비호환 드레스도 노출.
  const [showAllDressesEvenIfPregnant, setShowAllDressesEvenIfPregnant] = useState(false);
  const isPregnant = weddingSettings.pregnant;

  const [step, setStep] = useState<Step>("intro");
  const [hearts, setHearts] = useState<number | null>(null);
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [dresses, setDresses] = useState<DressSample[]>([]);
  const [loadingDresses, setLoadingDresses] = useState(false);
  const [selectedDress, setSelectedDress] = useState<DressSample | null>(null);
  const [dressMode, setDressMode] = useState<"catalog" | "custom">("catalog");
  const [customDress, setCustomDress] = useState<DressMetadata>({});
  // 성별 — 예복(신랑)은 AI 스튜디오의 별도 진입점(?gender=groom)으로만 들어온다(진입점 분리).
  // 드레스 도구 자체는 신부 전용(인라인 토글 제거). 신랑이면 카탈로그 대신 예복 텍스트로 생성.
  const [searchParams] = useSearchParams();
  const gender: "bride" | "groom" = searchParams.get("gender") === "groom" ? "groom" : "bride";
  const [groomSuit, setGroomSuit] = useState("");
  const [selectedSceneType, setSelectedSceneType] = useState<SceneType | null>(
    null,
  );
  const [selectedSceneCode, setSelectedSceneCode] = useState<SceneCode | null>(
    null,
  );
  const [shotType, setShotType] = useState<ShotType>("full");
  // 보정 강도 — 웨딩 당일은 전문 보정이 기본이라 "화보 보정"을 기본값으로.
  const [retouchLevel, setRetouchLevel] = useState<RetouchLevel>("studio");
  const [consentOpen, setConsentOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ──────────────────────────────────────────────
  // 하트 잔액 로드
  // ──────────────────────────────────────────────
  const fetchHearts = useCallback(async () => {
    if (!user) return;
    setHearts(await fetchHeartBalance(user.id));
  }, [user]);

  useEffect(() => {
    fetchHearts();
  }, [fetchHearts]);

  // ──────────────────────────────────────────────
  // 드레스 로드 (step=dress 진입 시)
  // ──────────────────────────────────────────────
  useEffect(() => {
    if (step !== "dress" || dresses.length > 0) return;
    setLoadingDresses(true);
    (async () => {
      try {
        setDresses((await fetchActiveDresses()) as unknown as DressSample[]);
      } catch {
        toast({
          title: "드레스 목록을 불러올 수 없어요",
          variant: "destructive",
        });
      }
      setLoadingDresses(false);
    })();
  }, [step, dresses.length]);

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
    setStep("dress");
  };

  // L1 행동 신호 — 임산부 호환 드레스를 선택한 사용자는 임신 가이드 후보.
  // pregnant 가 이미 true 이면 신호 누적 무의미 — 이미 임신 모드.
  // F#15 — bumpSignal 은 1세션 1회 가드 필요 (lib 주석 명시). 같은 세션에 여러
  // 임산부 호환 드레스를 빠르게 훑기만 해도 임계값에 도달해 §5 sensitive-cliff
  // 위험. sessionStorage 로 한 세션에 한 번만 카운트 증가.
  const handlePickDress = (d: DressSample) => {
    if (
      !isPregnant &&
      d.pregnancy_supported &&
      d.pregnancy_supported !== "none"
    ) {
      const SESSION_KEY = "dewy:dress-pregnancy-signal-bumped";
      try {
        if (!sessionStorage.getItem(SESSION_KEY)) {
          bumpSignal(SIGNAL_KEYS.pregnancyInterest);
          sessionStorage.setItem(SESSION_KEY, "1");
        }
      } catch {
        // sessionStorage 실패해도 신호 증분 자체는 건너뛰는 게 안전 (false positive 회피).
      }
    }
    setSelectedDress(d);
    setStep("scene");
  };

  // scene/tone 통합: 같은 화면에서 type 토글 → tone 선택까지. 단계 분기 제거로
  // 피로 한 단계 줄임. (5단계 → 4단계 효과)
  const handlePickSceneType = (t: SceneType) => {
    setSelectedSceneType(t);
    // step 전환 없음 — 같은 scene 단계에서 tone 그리드가 같이 보임.
  };

  const handlePickTone = (code: SceneCode) => {
    setSelectedSceneCode(code);
    setStep("review");
  };

  const handleGenerate = async () => {
    if (!photoPath || !selectedSceneCode) return;
    if (gender === "bride" && dressMode === "catalog" && !selectedDress) return;
    setIsGenerating(true);
    try {
      // 프롬프트는 서버(dewy-fitting)가 조립한다(신뢰 경계) — 구조화 파라미터만 전달.
      const base = {
        source_image_path: photoPath,
        scene_code: selectedSceneCode,
        shot_type: shotType,
        gender,
        retouch_level: retouchLevel,
      };
      let requestBody: Record<string, unknown>;
      if (gender === "groom") {
        // 신랑: 예복(수트) 텍스트로 커스텀 생성(수트 카탈로그 데이터 없음). 참조 이미지 없음.
        requestBody = { ...base, suit_text: groomSuit.trim() };
      } else if (dressMode === "custom") {
        // 맞춤: 사용자가 고른 enum 속성 객체 그대로 — 서버가 사전 기반으로 직렬화.
        requestBody = { ...base, custom_dress: customDress };
      } else {
        // 카탈로그: 드레스 메타는 서버가 직접 조회해 프롬프트에 주입.
        requestBody = { ...base, dress_sample_id: selectedDress!.id };
      }

      const fittingId = await generateDressFitting(requestBody);
      // 백그라운드 생성 시작 — 완료 알림을 위해 진행중 잡 등록 후 결과 페이지로.
      addPendingJob({ id: fittingId, type: "dress" });
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
    dress: 2,
    scene: 3,
    review: 4,
  };
  const stepLabel: Record<Step, string> = {
    intro: "시작",
    photo: "사진 업로드",
    dress: gender === "groom" ? "예복 입력" : "드레스 선택",
    scene: "컷·배경 선택",
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
            {gender === "groom" ? "방구석 예복 투어" : "방구석 드레스 투어"}
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
            isGroom={gender === "groom"}
            onStart={handleStart}
            onRecommend={() =>
              navigate(
                gender === "groom"
                  ? "/ai-studio/dress-tour/recommend?gender=groom"
                  : "/ai-studio/dress-tour/recommend",
              )
            }
            onGallery={() => navigate("/ai-studio/dress-tour/gallery")}
          />
        )}

        {step === "photo" && (
          <PhotoStep
            photoUrl={photoUrl}
            shotType={shotType}
            onPickShot={setShotType}
            onPickFile={() => fileInputRef.current?.click()}
            onNext={() => setStep("dress")}
          />
        )}

        {step === "dress" && (
          <div className="space-y-3">
            {gender === "groom" ? (
              <div className="space-y-2">
                <p className="text-[13px] text-muted-foreground">
                  원하는 예복(수트)을 적어주세요. 비워두면 기본 클래식 수트로 생성돼요.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {["네이비 슬림핏", "블랙 턱시도", "그레이 쓰리피스", "노치라펠", "피크라펠", "아이보리 재킷", "보타이"].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setGroomSuit((cur) => (cur.trim() ? `${cur.trim()}, ${c}` : c))}
                      className="px-2.5 py-1 rounded-full border border-border text-[12px] text-foreground bg-card"
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <textarea
                  value={groomSuit}
                  onChange={(e) => setGroomSuit(e.target.value)}
                  maxLength={200}
                  placeholder="예: 네이비 슬림핏, 노치라펠, 쓰리피스"
                  className="w-full h-20 p-3 rounded-xl border border-input bg-background text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <button
                  type="button"
                  onClick={() => { setSelectedDress(null); setStep("scene"); }}
                  className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-bold text-sm"
                >
                  다음
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDressMode("catalog")}
                    className={`h-10 rounded-xl text-[13px] font-bold border transition-colors ${dressMode === "catalog" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"}`}
                  >
                    카탈로그에서 선택
                  </button>
                  <button
                    type="button"
                    onClick={() => setDressMode("custom")}
                    className={`h-10 rounded-xl text-[13px] font-bold border transition-colors ${dressMode === "custom" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"}`}
                  >
                    맞춤 생성
                  </button>
                </div>
                {dressMode === "catalog" ? (
                  <DressStep
                    dresses={dresses}
                    loading={loadingDresses}
                    onPick={handlePickDress}
                    isPregnant={isPregnant}
                    showAll={showAllDressesEvenIfPregnant}
                    onToggleShowAll={() => setShowAllDressesEvenIfPregnant((v) => !v)}
                  />
                ) : (
                  <CustomDressPicker
                    value={customDress}
                    onChange={setCustomDress}
                    onConfirm={() => {
                      setSelectedDress(null);
                      setStep("scene");
                    }}
                  />
                )}
              </>
            )}
          </div>
        )}

        {step === "scene" && (
          <SceneToneStep
            sceneType={selectedSceneType}
            onPickType={handlePickSceneType}
            onPickTone={handlePickTone}
          />
        )}

        {step === "review" && (
          <RetouchLevelPicker value={retouchLevel} onChange={setRetouchLevel} className="mb-4" />
        )}

        {step === "review" && (
          <ReviewSection
            photoUrl={photoUrl}
            dress={selectedDress}
            customSummary={
              gender === "groom"
                ? (groomSuit.trim() || "기본 클래식 수트")
                : dressMode === "custom" ? summarizeDressKo(customDress) : null
            }
            sceneCode={selectedSceneCode}
            hearts={hearts}
            isGenerating={isGenerating}
            onGenerate={handleGenerate}
            onEditPhoto={() => setStep("photo")}
            onEditDress={() => setStep("dress")}
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

// ════════════════════════════════════════════════
// Step 0: INTRO
// ════════════════════════════════════════════════
const IntroSection = ({
  hearts,
  isGroom,
  onStart,
  onRecommend,
  onGallery,
}: {
  hearts: number | null;
  isGroom: boolean;
  onStart: () => void;
  onRecommend: () => void;
  onGallery: () => void;
}) => (
  <>
    <section className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">
          {isGroom ? "내 사진으로 예복 핏 미리보기" : "내 사진으로 드레스 핏 미리보기"}
        </h2>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {isGroom
          ? "본인 사진 한 장만 있으면 원하는 예복(수트)을 입어본 모습을 AI가 자연스럽게 생성해드려요."
          : "본인 사진 한 장만 있으면 다양한 드레스를 입어본 모습을 AI가 자연스럽게 생성해드려요."}
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
        <StepRow n={1}>본인 사진 업로드 (얼굴/전신, 최대 20MB)</StepRow>
        <StepRow n={2}>{isGroom ? "원하는 예복(수트) 입력" : "마음에 드는 드레스 선택"}</StepRow>
        <StepRow n={3}>본식 / 웨딩촬영 컷 선택</StepRow>
        <StepRow n={4}>배경 분위기 선택 (어두운/밝은/가든)</StepRow>
        <StepRow n={5}>AI 생성 대기 (약 15~30초)</StepRow>
      </ol>
    </section>

    <section className="mb-6 p-3 bg-blue-50 rounded-lg flex gap-2">
      <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
      <p className="text-[12px] text-blue-900 leading-relaxed">
        <strong>전신 사진</strong>을 올리면 본인의 실제 체형이 반영되어 더
        현실적인 핏을 확인할 수 있어요. 셀카도 가능하지만 체형은 AI가
        추정해요.
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
        AI 추천받기 (체형 입력)
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
          {isGroom ? "내 예복 갤러리" : "내 드레스 갤러리"}
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

// ════════════════════════════════════════════════
// Step 1: PHOTO
// ════════════════════════════════════════════════
const PhotoStep = ({
  photoUrl,
  shotType,
  onPickShot,
  onPickFile,
  onNext,
}: {
  photoUrl: string | null;
  shotType: ShotType;
  onPickShot: (s: ShotType) => void;
  onPickFile: () => void;
  onNext: () => void;
}) => (
  <section className="space-y-4">
    <h2 className="text-lg font-bold text-foreground">컷 & 사진</h2>
    <div>
      <p className="text-[12px] font-semibold text-foreground mb-1.5">어떤 컷으로 만들까요?</p>
      <div className="grid grid-cols-3 gap-2">
        {SHOT_TYPES.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => onPickShot(s.value)}
            className={`rounded-xl border p-2 text-center transition-colors ${shotType === s.value ? "bg-primary/10 border-primary" : "bg-card border-border"}`}
          >
            <p className={`text-[13px] font-bold ${shotType === s.value ? "text-primary" : "text-foreground"}`}>{s.ko}</p>
            <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{s.desc}</p>
          </button>
        ))}
      </div>
    </div>
    <p className="text-[12px] text-muted-foreground leading-relaxed">
      {SHOT_TYPES.find((s) => s.value === shotType)?.uploadHint}
    </p>
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

// ════════════════════════════════════════════════
// Step 2: DRESS
// ════════════════════════════════════════════════
const DressStep = ({
  dresses,
  loading,
  onPick,
  isPregnant,
  showAll,
  onToggleShowAll,
}: {
  dresses: DressSample[];
  loading: boolean;
  onPick: (d: DressSample) => void;
  isPregnant: boolean;
  showAll: boolean;
  onToggleShowAll: () => void;
}) => {
  // 임산부면 임산부 호환 드레스만(default), "전체 보기" 토글로 비호환 포함.
  // 호환 정렬: full > light > none. 호환이 0개면 토글 자동 비활성 + 안내.
  const visible = isPregnant && !showAll
    ? dresses.filter((d) => d.pregnancy_supported && d.pregnancy_supported !== "none")
    : dresses;
  const sorted = isPregnant
    ? [...visible].sort((a, b) => {
        const rank = (v: string | null) => (v === "full" ? 0 : v === "light" ? 1 : 2);
        return rank(a.pregnancy_supported) - rank(b.pregnancy_supported);
      })
    : visible;
  const compatibleCount = dresses.filter(
    (d) => d.pregnancy_supported && d.pregnancy_supported !== "none",
  ).length;
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-foreground">드레스 선택</h2>
      <p className="text-[12px] text-muted-foreground">
        마음에 드는 드레스를 하나 골라주세요.
      </p>
      {isPregnant && (
        <div className="rounded-xl bg-pink-50 border border-pink-100 p-3">
          <p className="text-[12px] font-semibold text-pink-800">
            임신 모드 — 임산부 호환 드레스 우선
          </p>
          <p className="text-[11px] text-pink-700 leading-snug mt-0.5">
            엠파이어·A 라인 등 배 부분 여유가 있는 옵션을 먼저 보여드려요.
            {compatibleCount === 0 && " 현재 호환 옵션이 없어 전체 드레스를 표시합니다."}
          </p>
          {compatibleCount > 0 && (
            <button
              type="button"
              onClick={onToggleShowAll}
              className="mt-1.5 text-[11px] font-semibold text-pink-800 underline"
            >
              {showAll ? "호환 옵션만 보기" : "전체 드레스 보기"}
            </button>
          )}
        </div>
      )}
      {loading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          등록된 드레스가 없어요.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {sorted.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => onPick(d)}
              className="bg-card rounded-xl overflow-hidden border border-border text-left active:scale-[0.98] transition-transform relative"
            >
              <div className="aspect-[3/4] bg-muted">
                <img
                  src={d.image_url}
                  alt={d.name}
                  className="w-full h-full object-cover"
                />
              </div>
              {isPregnant && d.pregnancy_supported && d.pregnancy_supported !== "none" && (
                <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-pink-200 text-pink-800">
                  {d.pregnancy_supported === "full" ? "마타니티" : "임산부 호환"}
                </span>
              )}
              <div className="p-2">
                <p className="text-[12px] font-semibold text-foreground truncate">
                  {d.name}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {[
                    labelOf("silhouette", d.silhouette),
                    labelOf("neckline", d.neckline),
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
};

// ════════════════════════════════════════════════
// Step 3: SCENE TYPE + TONE — 한 화면에서 type 토글 + tone 선택까지 끝냄.
// 기존 5단계 (scene 별도, tone 별도) 를 4단계로 줄여 피로 감소.
// type 미선택 상태에서는 type 카드 2개만 보이고, type 누르면 그 type 의 tone 옵션이 같은 화면 하단에 펼쳐짐.
// ════════════════════════════════════════════════
const SceneToneStep = ({
  sceneType,
  onPickType,
  onPickTone,
}: {
  sceneType: SceneType | null;
  onPickType: (t: SceneType) => void;
  onPickTone: (code: SceneCode) => void;
}) => {
  const toneList = sceneType ? SCENES_BY_TYPE[sceneType] : [];
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-foreground mb-2">어떤 컷이 좋으세요?</h2>
        <div className="grid grid-cols-2 gap-2">
          {(["CEREMONY", "STUDIO"] as SceneType[]).map((t) => {
            const active = sceneType === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => onPickType(t)}
                className={`rounded-2xl border p-3 text-left active:scale-[0.98] transition-all ${
                  active
                    ? "bg-primary/10 border-primary"
                    : "bg-card border-border hover:border-primary/30"
                }`}
              >
                <p className={`text-sm font-bold mb-0.5 ${active ? "text-primary" : "text-foreground"}`}>
                  {SCENE_TYPE_LABEL[t]}
                </p>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  {SCENE_TYPE_DESC[t]}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {sceneType && (
        <div className="animate-fade-in">
          <h3 className="text-sm font-bold text-foreground mb-2">
            배경 분위기 골라주세요
          </h3>
          <div className="grid grid-cols-1 gap-2">
            {toneList.map((s) => (
              <button
                key={s.code}
                type="button"
                onClick={() => onPickTone(s.code)}
                className="bg-card rounded-xl border border-border p-3 text-left active:scale-[0.98] transition-transform"
              >
                <p className="text-sm font-bold text-foreground mb-0.5">
                  {s.shortLabel}
                </p>
                <p className="text-[11px] text-muted-foreground leading-snug">{s.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

// ════════════════════════════════════════════════
// Step 5: REVIEW
// ════════════════════════════════════════════════
const ReviewSection = ({
  photoUrl,
  dress,
  customSummary,
  sceneCode,
  hearts,
  isGenerating,
  onGenerate,
  onEditPhoto,
  onEditDress,
  onEditScene,
}: {
  photoUrl: string | null;
  dress: DressSample | null;
  customSummary?: string | null;
  sceneCode: SceneCode | null;
  hearts: number | null;
  isGenerating: boolean;
  onGenerate: () => void;
  onEditPhoto: () => void;
  onEditDress: () => void;
  onEditScene: () => void;
}) => {
  const scene = FITTING_SCENES.find((s) => s.code === sceneCode);
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
        label="드레스"
        right={
          dress ? (
            <div className="flex items-center gap-2">
              <img
                src={dress.image_url}
                alt={dress.name}
                className="w-12 h-16 object-cover rounded"
              />
              <span className="text-[12px] text-foreground truncate max-w-[120px]">
                {dress.name}
              </span>
            </div>
          ) : customSummary ? (
            <span className="text-[12px] text-foreground text-right max-w-[160px]">
              맞춤 · {customSummary}
            </span>
          ) : null
        }
        onEdit={onEditDress}
      />
      <SummaryRow
        label="컷·배경"
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

export default DressFitting;
