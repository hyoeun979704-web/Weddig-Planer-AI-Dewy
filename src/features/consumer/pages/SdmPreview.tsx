import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Heart, Sparkles, Upload, Loader2, Info } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import PhotoUploadConsent from "@/components/PhotoUploadConsent";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { fetchHeartBalance } from "@/features/consumer/data/hearts";
import {
  uploadSdmSource, fetchActiveDresses, fetchDressMeta, generateSdmPreview,
} from "@/features/consumer/data/sdmPreview";
import {
  SCENES_BY_TYPE, SCENE_TYPE_LABEL, SCENE_TYPE_DESC, SceneType, SceneCode,
} from "@/data/fittingScenes";
import { describeDress, type DressMetadata } from "@/lib/dressDescription";
import { describeMakeup, type MakeupMetadata } from "@/lib/makeupDescription";
import { CustomDressPicker, summarizeDressKo } from "@/components/fitting/CustomDressPicker";
import { CustomMakeupPicker, summarizeMakeupKo } from "@/components/fitting/CustomMakeupPicker";
import { sdmHairStyles, sdmHairKo, buildSdmPrompt, type SdmReferenceMode } from "@/data/sdmPrompt";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import { SHOT_TYPES, shotTypeKo, type ShotType } from "@/data/shotTypes";
import { addPendingJob } from "@/lib/pendingJobs";

/**
 * 스드메 미리보기 — 장소+메이크업+헤어+드레스를 한 번에 합성한 "완성본" 1장.
 * 개별 도구(드레스/메이크업/헤어)는 그대로 유지하고, 수렴형 합본 경로를 추가.
 *
 * 흐름: intro → photo → scene → makeup → hair → dress → review → generate.
 * 메이크업/헤어 카탈로그가 아직 비어있어 텍스트(속성/스타일) 기반으로 시작한다.
 */
const HEART_COST = 10;

interface DressSample {
  id: string; name: string; image_url: string;
  silhouette: string | null; neckline: string | null; length: string | null;
}

type Step = "intro" | "photo" | "scene" | "makeup" | "hair" | "dress" | "review";
const STEP_ORDER: Step[] = ["intro", "photo", "scene", "makeup", "hair", "dress", "review"];

const SdmPreview = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [step, setStep] = useState<Step>("intro");
  const [hearts, setHearts] = useState<number | null>(null);
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const [sceneType, setSceneType] = useState<SceneType | null>(null);
  const [sceneCode, setSceneCode] = useState<SceneCode | null>(null);
  const [makeup, setMakeup] = useState<MakeupMetadata>({});
  const [hairStyle, setHairStyle] = useState<string | null>(null);
  // 성별(신부/신랑) — 기본 role. 신랑은 메이크업 스텝 스킵(그루밍 자동)·남성 헤어·예복 텍스트.
  const { weddingSettings } = useWeddingSchedule();
  const [genderOverride, setGenderOverride] = useState<"bride" | "groom" | null>(null);
  const gender: "bride" | "groom" =
    genderOverride ?? (weddingSettings.role === "groom" ? "groom" : "bride");
  const [groomSuit, setGroomSuit] = useState("");

  const [dresses, setDresses] = useState<DressSample[]>([]);
  const [loadingDresses, setLoadingDresses] = useState(false);
  const [dressMode, setDressMode] = useState<"catalog" | "custom">("catalog");
  const [selectedDress, setSelectedDress] = useState<DressSample | null>(null);
  const [customDress, setCustomDress] = useState<DressMetadata>({});

  const [shotType, setShotType] = useState<ShotType>("full");
  const [referenceMode, setReferenceMode] = useState<SdmReferenceMode>("image");
  const [consentOpen, setConsentOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchHearts = useCallback(async () => {
    if (!user) return;
    setHearts(await fetchHeartBalance(user.id));
  }, [user]);
  useEffect(() => { fetchHearts(); }, [fetchHearts]);

  useEffect(() => {
    if (step !== "dress" || dresses.length > 0) return;
    setLoadingDresses(true);
    (async () => {
      try {
        setDresses(await fetchActiveDresses() as DressSample[]);
      } catch {
        toast({ title: "드레스 목록을 불러올 수 없어요", variant: "destructive" });
      }
      setLoadingDresses(false);
    })();
  }, [step, dresses.length]);

  const requireAuth = (): boolean => {
    if (!user) { toast({ title: "로그인이 필요해요" }); navigate("/auth"); return false; }
    return true;
  };

  const handleStart = () => {
    if (!requireAuth()) return;
    if ((hearts ?? 0) < HEART_COST) {
      toast({ title: "하트가 부족해요", description: `완성본 1장에 ${HEART_COST}하트가 필요해요.` });
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
    if (file.size > 20 * 1024 * 1024) { toast({ title: "파일이 너무 커요 (최대 20MB)", variant: "destructive" }); return; }
    if (!file.type.startsWith("image/")) { toast({ title: "이미지 파일만 업로드 가능해요", variant: "destructive" }); return; }

    try {
      const { path, signedUrl } = await uploadSdmSource(user.id, file);
      setPhotoPath(path);
      setPhotoUrl(signedUrl);
      setStep("scene");
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "알 수 없는 오류";
      toast({ title: "업로드 실패", description: message, variant: "destructive" });
    }
  };

  const handleGenerate = async () => {
    if (!photoPath || !sceneCode || !hairStyle) return;
    if (gender === "bride" && dressMode === "catalog" && !selectedDress) return;
    setIsGenerating(true);
    try {
      let dressDescription = "";
      let dressLength: string | null = null;
      let dressSampleId: string | undefined;
      if (gender === "groom") {
        // 신랑: 예복 텍스트로 커스텀. 수트 카탈로그·레퍼런스 이미지 없음.
        dressDescription = groomSuit.trim() || "a classic well-fitted wedding suit, notch lapel, navy or black";
      } else if (dressMode === "custom") {
        dressDescription = describeDress(customDress);
        dressLength = customDress.length ?? null;
      } else {
        const meta = await fetchDressMeta(selectedDress!.id);
        dressDescription = meta ? describeDress(meta as DressMetadata) : "";
        dressLength = (meta?.length as string | undefined) ?? selectedDress!.length ?? null;
        dressSampleId = selectedDress!.id;
      }

      const prompt = buildSdmPrompt({
        sceneCode,
        makeupDescription: gender === "groom" ? "" : describeMakeup(makeup),
        hairStyle,
        dressDescription,
        dressCustom: gender === "groom" || dressMode === "custom",
        dressLength,
        shotType,
        referenceMode: gender === "groom" ? "text" : referenceMode,
        gender,
      });

      const previewId = await generateSdmPreview({
        source_image_path: photoPath,
        scene_code: sceneCode,
        hair_style: hairStyle,
        makeup_summary: gender === "groom" ? "그루밍(자동)" : summarizeMakeupKo(makeup),
        dress_sample_id: dressSampleId,
        shot_type: shotType,
        reference_mode: referenceMode,
        prompt,
      });
      addPendingJob({ id: previewId, type: "sdm" });
      await fetchHearts();
      navigate(`/ai-studio/sdm-preview/result/${previewId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "알 수 없는 오류";
      if (msg.includes("insufficient_hearts")) { toast({ title: "하트가 부족해요", variant: "destructive" }); navigate("/points"); }
      else toast({ title: "오류", description: msg, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  // 신랑은 메이크업 스텝을 건너뛴다(그루밍 자동). 진행바·뒤로가기가 이 순서를 따른다.
  const steps: Step[] = gender === "groom" ? STEP_ORDER.filter((s) => s !== "makeup") : STEP_ORDER;
  const stepIdx = Math.max(0, steps.indexOf(step));
  const stepTotal = steps.length - 1; // intro 제외 카운트 기준
  const goBack = () => {
    const idx = steps.indexOf(step);
    setStep(idx > 0 ? steps[idx - 1] : "intro");
  };

  return (
    <div className="min-h-screen bg-background app-col mx-auto relative pb-32">
      <header className="sticky safe-sticky-header z-40 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3 px-4 h-14">
          <button onClick={() => (step === "intro" ? navigate(-1) : goBack())} className="p-1" aria-label="뒤로">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-base font-bold text-foreground flex-1">스드메 미리보기</h1>
          {step !== "intro" && (
            <div className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{stepIdx}</span>/{stepTotal}
            </div>
          )}
        </div>
        {step !== "intro" && (
          <div className="px-4 pb-2">
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${(stepIdx / stepTotal) * 100}%` }} />
            </div>
          </div>
        )}
      </header>

      <main className="px-5 py-6">
        {step === "intro" && (
          <>
            <section className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">장소·메이크업·헤어·드레스 한 번에</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                선택한 장소·메이크업·헤어·드레스를 모두 반영한 <strong>웨딩촬영 완성본 한 장</strong>을 AI가 합성해드려요.
                개별로 보던 걸 하나로 합쳐 "실제 촬영 모습"에 가깝게 확인할 수 있어요.
              </p>
            </section>
            <section className="mb-6 p-4 bg-pink-50 rounded-xl border border-pink-100 flex items-center justify-between">
              <div>
                <p className="text-[13px] text-muted-foreground mb-1">완성본 1장</p>
                <div className="flex items-center gap-1">
                  <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                  <span className="text-lg font-bold text-foreground">{HEART_COST}</span>
                  <span className="text-sm text-muted-foreground">하트</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-muted-foreground">내 잔액</p>
                <p className="text-base font-bold text-foreground">{hearts === null ? "—" : hearts}</p>
              </div>
            </section>
            <section className="mb-6 p-3 bg-blue-50 rounded-lg flex gap-2">
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-[12px] text-blue-900 leading-relaxed">
                <strong>전신 사진</strong>일수록 체형·드레스 핏·비율이 자연스러워요. 셀카도 가능하지만 체형은 AI가 추정해요.
              </p>
            </section>
            <button type="button" onClick={handleStart}
              className="w-full bg-primary text-primary-foreground rounded-xl py-4 font-bold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
              <Sparkles className="w-5 h-5" /> 시작하기
            </button>
          </>
        )}

        {step === "photo" && (
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">컷 & 사진</h2>
            <div>
              <p className="text-[12px] font-semibold text-foreground mb-1.5">어떤 컷으로 만들까요?</p>
              <div className="grid grid-cols-3 gap-2">
                {SHOT_TYPES.map((s) => (
                  <button key={s.value} type="button" onClick={() => setShotType(s.value)}
                    className={`rounded-xl border p-2 text-center transition-colors ${shotType === s.value ? "bg-primary/10 border-primary" : "bg-card border-border"}`}>
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
                <img src={photoUrl} alt="업로드된 사진" className="w-full aspect-[3/4] object-cover rounded-2xl border border-border" />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="flex-1">다른 사진</Button>
                  <Button onClick={() => setStep("scene")} className="flex-1">다음 →</Button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-[3/4] rounded-2xl border-2 border-dashed border-border bg-muted/30 flex flex-col items-center justify-center gap-2">
                <Upload className="w-8 h-8 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">사진 선택</p>
                <p className="text-[11px] text-muted-foreground">JPG/PNG, 최대 20MB</p>
              </button>
            )}
          </section>
        )}

        {step === "scene" && (
          <section className="space-y-4">
            {/* 성별 — 신랑은 드레스 대신 예복, 메이크업 스텝 스킵 */}
            <div className="grid grid-cols-2 gap-2">
              {(["bride", "groom"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGenderOverride(g)}
                  aria-pressed={gender === g}
                  className={`h-10 rounded-xl text-[13px] font-bold border transition-colors ${gender === g ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"}`}
                >
                  {g === "bride" ? "신부" : "신랑"}
                </button>
              ))}
            </div>
            <h2 className="text-lg font-bold text-foreground">어떤 장소·컷이 좋으세요?</h2>
            <div className="grid grid-cols-2 gap-2">
              {(["CEREMONY", "STUDIO"] as SceneType[]).map((t) => {
                const active = sceneType === t;
                return (
                  <button key={t} type="button" onClick={() => setSceneType(t)}
                    className={`rounded-2xl border p-3 text-left transition-all ${active ? "bg-primary/10 border-primary" : "bg-card border-border"}`}>
                    <p className={`text-sm font-bold mb-0.5 ${active ? "text-primary" : "text-foreground"}`}>{SCENE_TYPE_LABEL[t]}</p>
                    <p className="text-[11px] text-muted-foreground leading-snug">{SCENE_TYPE_DESC[t]}</p>
                  </button>
                );
              })}
            </div>
            {sceneType && (
              <div className="grid grid-cols-1 gap-2">
                {SCENES_BY_TYPE[sceneType].map((s) => (
                  <button key={s.code} type="button" onClick={() => { setSceneCode(s.code); setStep(gender === "groom" ? "hair" : "makeup"); }}
                    className="bg-card rounded-xl border border-border p-3 text-left">
                    <p className="text-sm font-bold text-foreground mb-0.5">{s.shortLabel}</p>
                    <p className="text-[11px] text-muted-foreground leading-snug">{s.description}</p>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {step === "makeup" && (
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">메이크업</h2>
            <p className="text-[12px] text-muted-foreground">원하는 메이크업 분위기를 골라주세요.</p>
            <CustomMakeupPicker value={makeup} onChange={setMakeup} onConfirm={() => setStep("hair")} />
          </section>
        )}

        {step === "hair" && (
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">헤어 스타일</h2>
            <p className="text-[12px] text-muted-foreground">합성에 반영할 헤어를 하나 골라주세요.</p>
            <div className="grid grid-cols-2 gap-2">
              {sdmHairStyles(gender).map((h) => (
                <button key={h.value} type="button" onClick={() => { setHairStyle(h.value); setStep("dress"); }}
                  className={`rounded-xl border p-3 text-left transition-colors ${hairStyle === h.value ? "bg-primary/10 border-primary" : "bg-card border-border"}`}>
                  <p className="text-sm font-bold text-foreground">{h.ko}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        {step === "dress" && gender === "groom" && (
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">예복(수트)</h2>
            <p className="text-[13px] text-muted-foreground">원하는 예복을 적어주세요. 비워두면 기본 클래식 수트로 생성돼요.</p>
            <div className="flex flex-wrap gap-1.5">
              {["네이비 슬림핏", "블랙 턱시도", "그레이 쓰리피스", "노치라펠", "피크라펠", "아이보리 재킷", "보타이"].map((c) => (
                <button key={c} type="button" onClick={() => setGroomSuit((cur) => (cur.trim() ? `${cur.trim()}, ${c}` : c))}
                  className="px-2.5 py-1 rounded-full border border-border text-[12px] text-foreground bg-card">{c}</button>
              ))}
            </div>
            <textarea value={groomSuit} onChange={(e) => setGroomSuit(e.target.value)} maxLength={200}
              placeholder="예: 네이비 슬림핏, 노치라펠, 쓰리피스"
              className="w-full h-20 p-3 rounded-xl border border-input bg-background text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            <button type="button" onClick={() => { setSelectedDress(null); setStep("review"); }}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-bold text-sm">다음</button>
          </section>
        )}

        {step === "dress" && gender === "bride" && (
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">드레스</h2>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setDressMode("catalog")}
                className={`h-10 rounded-xl text-[13px] font-bold border ${dressMode === "catalog" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"}`}>
                카탈로그에서 선택
              </button>
              <button type="button" onClick={() => setDressMode("custom")}
                className={`h-10 rounded-xl text-[13px] font-bold border ${dressMode === "custom" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"}`}>
                맞춤 생성
              </button>
            </div>
            {dressMode === "catalog" ? (
              loadingDresses ? (
                <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : dresses.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">등록된 드레스가 없어요.</div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {dresses.map((d) => (
                    <button key={d.id} type="button" onClick={() => { setSelectedDress(d); setStep("review"); }}
                      className="bg-card rounded-xl overflow-hidden border border-border text-left">
                      <div className="aspect-[3/4] bg-muted">
                        <img src={d.image_url} alt={d.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="p-2"><p className="text-[12px] font-semibold text-foreground truncate">{d.name}</p></div>
                    </button>
                  ))}
                </div>
              )
            ) : (
              <CustomDressPicker value={customDress} onChange={setCustomDress}
                onConfirm={() => { setSelectedDress(null); setStep("review"); }} />
            )}
          </section>
        )}

        {step === "review" && (
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">선택 확인</h2>
            <ReviewRow label="컷·사진" value={`${shotTypeKo(shotType)} · ${photoUrl ? "업로드됨" : "-"}`} onEdit={() => setStep("photo")} />
            <ReviewRow label="장소·컷" value={sceneCode ?? "-"} onEdit={() => setStep("scene")} />
            {gender === "bride" && (
              <ReviewRow label="메이크업" value={summarizeMakeupKo(makeup) || "내추럴"} onEdit={() => setStep("makeup")} />
            )}
            <ReviewRow label="헤어" value={hairStyle ? sdmHairKo(hairStyle) : "-"} onEdit={() => setStep("hair")} />
            <ReviewRow
              label={gender === "groom" ? "예복" : "드레스"}
              value={
                gender === "groom"
                  ? (groomSuit.trim() || "기본 클래식 수트")
                  : dressMode === "custom" ? `맞춤 · ${summarizeDressKo(customDress)}` : (selectedDress?.name ?? "-")
              }
              onEdit={() => setStep("dress")} />

            <div className="rounded-xl border border-border p-3">
              <p className="text-[12px] font-semibold text-foreground mb-2">합성 방식 (A/B 테스트)</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setReferenceMode("image")}
                  className={`h-9 rounded-lg text-[12px] font-bold border ${referenceMode === "image" ? "bg-primary/10 border-primary text-primary" : "bg-card border-border text-foreground"}`}>
                  이미지 우선
                </button>
                <button type="button" onClick={() => setReferenceMode("text")}
                  className={`h-9 rounded-lg text-[12px] font-bold border ${referenceMode === "text" ? "bg-primary/10 border-primary text-primary" : "bg-card border-border text-foreground"}`}>
                  텍스트 우선
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">
                이미지 우선: 카탈로그 드레스 사진을 참조로 첨부. 텍스트 우선: 속성 설명만으로 생성. (같은 선택으로 두 방식 결과를 비교해보세요.)
              </p>
            </div>

            <div className="p-3 bg-pink-50 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-1 text-[13px]">
                <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                <span className="font-bold text-foreground">{HEART_COST}</span>
                <span className="text-muted-foreground">하트 차감</span>
              </div>
              <span className="text-[12px] text-muted-foreground">잔액 {hearts ?? 0}</span>
            </div>

            <Button onClick={handleGenerate} disabled={isGenerating || (hearts ?? 0) < HEART_COST} className="w-full h-12 text-[15px] font-bold">
              {isGenerating ? (<><Loader2 className="w-5 h-5 mr-2 animate-spin" /> 생성 중... (약 30초)</>) : (<><Sparkles className="w-5 h-5 mr-2" /> 완성본 생성</>)}
            </Button>
          </section>
        )}

        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelected} />
      </main>

      <Dialog open={consentOpen} onOpenChange={setConsentOpen}>
        <DialogContent className="max-w-md p-0 bg-transparent border-0 shadow-none">
          <DialogHeader className="sr-only"><DialogTitle>사진 업로드 동의</DialogTitle></DialogHeader>
          <PhotoUploadConsent onConsent={handleConsentAgreed} onCancel={() => setConsentOpen(false)} />
        </DialogContent>
      </Dialog>

      <BottomNav activeTab={location.pathname} onTabChange={(href) => navigate(href)} />
    </div>
  );
};

const ReviewRow = ({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) => (
  <div className="flex items-center justify-between p-3 bg-card rounded-xl border border-border">
    <span className="text-sm text-muted-foreground">{label}</span>
    <div className="flex items-center gap-2">
      <span className="text-[12px] text-foreground text-right max-w-[160px] truncate">{value}</span>
      <button type="button" onClick={onEdit} className="text-[11px] text-primary font-medium underline">변경</button>
    </div>
  </div>
);

export default SdmPreview;
