import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  Heart,
  Save,
  Download,
  Image as ImageIcon,
  Type,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import InvitationCanvas, {
  InvitationCanvasHandle,
} from "@/components/invitation/InvitationCanvas";
import AISuggestSheet from "@/components/invitation/AISuggestSheet";
import { exportInvitationPdf } from "@/lib/invitation/exportPdf";
import type {
  InvitationLayout,
  InvitationSlot,
  InvitationUserData,
} from "@/lib/invitation/types";

/**
 * 청첩장 스튜디오 — wizard → template 선택 → studio 편집.
 *
 * URL 진입점:
 *   /invitation/new         (?format=paper|mobile)  → 새로 만들기
 *   /invitation/:id/edit                            → 저장된 청첩장 편집
 *
 * V1 범위:
 *   · 종이 무료 템플릿 (format=paper, price_hearts=0) 만 선택 가능
 *   · 슬롯 편집: 텍스트 (textarea) + 이미지 (업로드 교체)
 *   · 8초 미입력 → AI 추천 시트
 *   · PDF 다운로드 (300dpi 추출 → jsPDF)
 *   · draft 저장 (invitations 테이블)
 *
 * 향후 (3-B+): 누끼 슬롯, 모바일, 일러스트 변환, 폰트·위치 자유 편집
 */

interface Template {
  id: string;
  name: string;
  thumbnail_url: string;
  format: string;
  tone: string;
  price_hearts: number;
  layout: InvitationLayout;
  text_prompt_hint: string | null;
}

type Step = "wizard" | "template" | "studio";

const IDLE_MS = 8000;

const InvitationStudio = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const formatFilter = (searchParams.get("format") ?? "paper") as
    | "paper"
    | "mobile";

  const [step, setStep] = useState<Step>(params.id ? "studio" : "wizard");
  const [invitationId, setInvitationId] = useState<string | null>(
    params.id ?? null,
  );

  const [userData, setUserData] = useState<InvitationUserData>({});
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [template, setTemplate] = useState<Template | null>(null);

  const [textOverrides, setTextOverrides] = useState<Record<string, string>>({});
  // storage path 만 DB 에 저장 (signed URL 은 만료되니까).
  const [imagePaths, setImagePaths] = useState<Record<string, string>>({});
  // 화면 표시용 signed URL — load / upload 시점에 refresh, DB 에는 저장 X.
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [aiText, setAiText] = useState<Record<string, string>>({});
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  const [aiSheetOpen, setAiSheetOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const dismissedSlots = useRef<Set<string>>(new Set());
  const idleTimerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<InvitationCanvasHandle>(null);

  const selectedSlot: InvitationSlot | undefined = template?.layout.slots.find(
    (s) => s.id === selectedSlotId,
  );

  // ────────────────────────────────────────
  // 저장된 청첩장 로드 (id 모드)
  // ────────────────────────────────────────
  useEffect(() => {
    if (!params.id || !user) return;
    (async () => {
      const { data, error } = await (supabase as any)
        .from("invitations")
        .select("*, invitation_templates(*)")
        .eq("id", params.id)
        .eq("user_id", user.id)
        .single();
      if (error || !data) {
        toast({ title: "청첩장을 불러올 수 없어요", variant: "destructive" });
        navigate("/invitation/my");
        return;
      }
      setUserData(data.user_data ?? {});
      const tpl = data.invitation_templates as Template;
      setTemplate(tpl);
      const ld = data.layout ?? {};
      setTextOverrides(ld.textOverrides ?? {});
      const paths: Record<string, string> = ld.imagePaths ?? {};
      setImagePaths(paths);
      // 저장된 storage path 들을 다시 signed URL 로 변환 (24h 유효)
      const urls: Record<string, string> = {};
      await Promise.all(
        Object.entries(paths).map(async ([slotId, path]) => {
          const { data: s } = await supabase.storage
            .from("invitation-uploads")
            .createSignedUrl(path, 60 * 60 * 24);
          if (s?.signedUrl) urls[slotId] = s.signedUrl;
        }),
      );
      setImageUrls(urls);
      setAiText(data.ai_generated_text ?? {});
      setStep("studio");
    })();
  }, [params.id, user, navigate]);

  // ────────────────────────────────────────
  // 템플릿 로드 (template 단계 진입 시)
  // ────────────────────────────────────────
  useEffect(() => {
    if (step !== "template" || templates.length > 0) return;
    setLoadingTemplates(true);
    (async () => {
      const { data, error } = await (supabase as any)
        .from("invitation_templates")
        .select("id, name, thumbnail_url, format, tone, price_hearts, layout, text_prompt_hint")
        .eq("is_active", true)
        .eq("format", formatFilter)
        .eq("price_hearts", 0)  // V1: 무료 등급만
        .order("display_order", { ascending: false });
      if (error) {
        toast({
          title: "템플릿을 불러올 수 없어요",
          variant: "destructive",
        });
      } else {
        setTemplates(data ?? []);
      }
      setLoadingTemplates(false);
    })();
  }, [step, templates.length, formatFilter]);

  // ────────────────────────────────────────
  // 8초 idle 타이머 → AI 추천 시트 트리거
  // ────────────────────────────────────────
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (!selectedSlot) return;
    if (selectedSlot.type !== "text") return;
    if (!selectedSlot.ai_promptable) return;
    if (dismissedSlots.current.has(selectedSlot.id)) return;
    idleTimerRef.current = window.setTimeout(() => {
      setAiSheetOpen(true);
    }, IDLE_MS);
  }, [selectedSlot]);

  useEffect(() => {
    resetIdleTimer();
    return () => {
      if (idleTimerRef.current) {
        window.clearTimeout(idleTimerRef.current);
      }
    };
  }, [resetIdleTimer]);

  const handleTextChange = (text: string) => {
    if (!selectedSlot) return;
    setTextOverrides((p) => ({ ...p, [selectedSlot.id]: text }));
    resetIdleTimer();
  };

  const handlePhotoUpload = async (file: File) => {
    if (!selectedSlot || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "파일이 너무 커요 (최대 5MB)", variant: "destructive" });
      return;
    }
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const filename = `${crypto.randomUUID()}.${ext}`;
    const path = `${user.id}/${filename}`;
    const { error } = await supabase.storage
      .from("invitation-uploads")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) {
      toast({
        title: "업로드 실패",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    const { data: signed } = await supabase.storage
      .from("invitation-uploads")
      .createSignedUrl(path, 60 * 60 * 24);  // 화면 표시용 24h
    setImagePaths((p) => ({ ...p, [selectedSlot.id]: path }));
    if (signed?.signedUrl) {
      setImageUrls((p) => ({ ...p, [selectedSlot.id]: signed.signedUrl }));
    }
  };

  // ────────────────────────────────────────
  // 저장
  // ────────────────────────────────────────
  const handleSave = async () => {
    if (!user || !template) return;
    setIsSaving(true);
    try {
      const payload = {
        user_id: user.id,
        template_id: template.id,
        user_data: userData,
        // signed URL 은 만료되니까 저장 X — storage path 만 영구 보존
        layout: { textOverrides, imagePaths },
        ai_generated_text: aiText,
        status: "draft" as const,
      };
      if (invitationId) {
        const { error } = await (supabase as any)
          .from("invitations")
          .update(payload)
          .eq("id", invitationId);
        if (error) throw error;
      } else {
        const { data, error } = await (supabase as any)
          .from("invitations")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        setInvitationId(data.id);
      }
      toast({ title: "저장 완료" });
    } catch (err) {
      toast({
        title: "저장 실패",
        description: err instanceof Error ? err.message : "오류",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // ────────────────────────────────────────
  // PDF 다운로드
  // ────────────────────────────────────────
  const handleExportPdf = async () => {
    if (!template) return;
    setIsExporting(true);
    try {
      const dataUrl = canvasRef.current?.toDataUrl(3);
      if (!dataUrl) throw new Error("캔버스 추출 실패");
      const filename = `dewy-invitation-${invitationId ?? "draft"}.pdf`;
      exportInvitationPdf(
        dataUrl,
        template.layout.canvas.w,
        template.layout.canvas.h,
        filename,
      );
      toast({ title: "PDF 다운로드 시작" });
    } catch (err) {
      toast({
        title: "PDF 생성 실패",
        description: err instanceof Error ? err.message : "오류",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // ────────────────────────────────────────
  // 렌더링
  // ────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto pb-32">
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3 px-4 h-14">
          <button
            onClick={() => {
              if (step === "wizard") navigate(-1);
              else if (step === "template") setStep("wizard");
              else setStep("template");
            }}
            className="p-1"
            aria-label="뒤로"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-base font-bold text-foreground flex-1">
            청첩장 만들기
          </h1>
          {step === "studio" && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
            </Button>
          )}
        </div>
      </header>

      {step === "wizard" && (
        <WizardForm
          formatFilter={formatFilter}
          userData={userData}
          onChange={setUserData}
          onNext={() => setStep("template")}
        />
      )}

      {step === "template" && (
        <TemplatePicker
          templates={templates}
          loading={loadingTemplates}
          onPick={(t) => {
            setTemplate(t);
            setStep("studio");
          }}
        />
      )}

      {step === "studio" && template && (
        <StudioView
          canvasRef={canvasRef}
          template={template}
          userData={userData}
          textOverrides={textOverrides}
          imageUrls={imageUrls}
          aiText={aiText}
          selectedSlot={selectedSlot ?? null}
          selectedSlotId={selectedSlotId}
          onSelectSlot={setSelectedSlotId}
          onTextChange={handleTextChange}
          onPickPhoto={() => fileInputRef.current?.click()}
          onExportPdf={handleExportPdf}
          isExporting={isExporting}
        />
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) handlePhotoUpload(f);
        }}
      />

      {aiSheetOpen && selectedSlot && template && (
        <AISuggestSheet
          slot={selectedSlot}
          tone={template.tone}
          templateHint={template.text_prompt_hint}
          userData={userData}
          onAccept={(text) => {
            setAiText((p) => ({ ...p, [selectedSlot.id]: text }));
            setTextOverrides((p) => {
              const next = { ...p };
              delete next[selectedSlot.id];
              return next;
            });
          }}
          onClose={() => {
            setAiSheetOpen(false);
            if (selectedSlot) dismissedSlots.current.add(selectedSlot.id);
          }}
        />
      )}

      <BottomNav
        activeTab={location.pathname}
        onTabChange={(href) => navigate(href)}
      />
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// Wizard — 데이터 입력
// ════════════════════════════════════════════════════════════════
const WizardForm = ({
  formatFilter,
  userData,
  onChange,
  onNext,
}: {
  formatFilter: "paper" | "mobile";
  userData: InvitationUserData;
  onChange: (d: InvitationUserData) => void;
  onNext: () => void;
}) => {
  const canProceed =
    !!userData.groom_name?.trim() &&
    !!userData.bride_name?.trim() &&
    !!userData.wedding_date?.trim();

  return (
    <main className="px-5 py-6 space-y-5">
      <section>
        <h2 className="text-lg font-bold text-foreground mb-1">
          {formatFilter === "paper" ? "📄 종이 청첩장" : "📱 모바일 청첩장"}
        </h2>
        <p className="text-sm text-muted-foreground">
          기본 정보를 입력하면 템플릿에 자동으로 채워져요.
        </p>
      </section>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Field
            label="신랑 이름"
            value={userData.groom_name ?? ""}
            onChange={(v) => onChange({ ...userData, groom_name: v })}
            placeholder="홍길동"
          />
          <Field
            label="신부 이름"
            value={userData.bride_name ?? ""}
            onChange={(v) => onChange({ ...userData, bride_name: v })}
            placeholder="김영희"
          />
        </div>

        <Field
          label="결혼 날짜"
          type="date"
          value={userData.wedding_date ?? ""}
          onChange={(v) => onChange({ ...userData, wedding_date: v })}
        />

        <Field
          label="결혼 시간"
          type="time"
          value={userData.wedding_time ?? ""}
          onChange={(v) => onChange({ ...userData, wedding_time: v })}
        />

        <Field
          label="식장 이름"
          value={userData.venue_name ?? ""}
          onChange={(v) => onChange({ ...userData, venue_name: v })}
          placeholder="OO웨딩홀"
        />

        <Field
          label="식장 주소"
          value={userData.venue_address ?? ""}
          onChange={(v) => onChange({ ...userData, venue_address: v })}
          placeholder="서울시 OO구 OO동 ..."
        />

        <Field
          label="신랑 부모님"
          value={userData.groom_parents ?? ""}
          onChange={(v) => onChange({ ...userData, groom_parents: v })}
          placeholder="홍OO · 박OO의 아들"
        />

        <Field
          label="신부 부모님"
          value={userData.bride_parents ?? ""}
          onChange={(v) => onChange({ ...userData, bride_parents: v })}
          placeholder="김OO · 이OO의 딸"
        />
      </div>

      <Button
        onClick={onNext}
        disabled={!canProceed}
        className="w-full h-12 text-[15px] font-bold"
      >
        템플릿 고르기 →
      </Button>
    </main>
  );
};

const Field = ({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) => (
  <div>
    <Label className="text-[12px] text-muted-foreground">{label}</Label>
    <Input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="mt-1"
    />
  </div>
);

// ════════════════════════════════════════════════════════════════
// Template Picker
// ════════════════════════════════════════════════════════════════
const TemplatePicker = ({
  templates,
  loading,
  onPick,
}: {
  templates: Template[];
  loading: boolean;
  onPick: (t: Template) => void;
}) => (
  <main className="px-4 py-5">
    <h2 className="text-lg font-bold text-foreground mb-1 px-1">
      템플릿 선택
    </h2>
    <p className="text-[12px] text-muted-foreground mb-4 px-1">
      무료 디자인부터 시작해보세요. 유료 디자인은 곧 추가돼요.
    </p>
    {loading ? (
      <div className="py-16 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    ) : templates.length === 0 ? (
      <p className="text-center text-sm text-muted-foreground py-16">
        등록된 무료 템플릿이 없어요. 관리자가 추가하면 여기에 표시됩니다.
      </p>
    ) : (
      <div className="grid grid-cols-2 gap-3">
        {templates.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onPick(t)}
            className="bg-card rounded-xl overflow-hidden border border-border text-left active:scale-[0.98] transition-transform"
          >
            <div className="aspect-[3/4] bg-muted">
              <img
                src={t.thumbnail_url}
                alt={t.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-2.5">
              <p className="text-[12px] font-semibold text-foreground truncate">
                {t.name}
              </p>
              <p className="text-[10px] text-emerald-600 font-bold">무료</p>
            </div>
          </button>
        ))}
      </div>
    )}
  </main>
);

// ════════════════════════════════════════════════════════════════
// Studio — 캔버스 + 슬롯 편집
// ════════════════════════════════════════════════════════════════
const StudioView = ({
  canvasRef,
  template,
  userData,
  textOverrides,
  imageUrls,
  aiText,
  selectedSlot,
  selectedSlotId,
  onSelectSlot,
  onTextChange,
  onPickPhoto,
  onExportPdf,
  isExporting,
}: {
  canvasRef: React.RefObject<InvitationCanvasHandle>;
  template: Template;
  userData: InvitationUserData;
  textOverrides: Record<string, string>;
  imageUrls: Record<string, string>;
  aiText: Record<string, string>;
  selectedSlot: InvitationSlot | null;
  selectedSlotId: string | null;
  onSelectSlot: (id: string | null) => void;
  onTextChange: (text: string) => void;
  onPickPhoto: () => void;
  onExportPdf: () => void;
  isExporting: boolean;
}) => {
  const currentText =
    selectedSlot?.type === "text"
      ? textOverrides[selectedSlot.id] !== undefined
        ? textOverrides[selectedSlot.id]
        : aiText[selectedSlot.id] !== undefined
          ? aiText[selectedSlot.id]
          : selectedSlot.field && userData[selectedSlot.field]
            ? userData[selectedSlot.field]!
            : selectedSlot.text ?? selectedSlot.placeholder ?? ""
      : "";

  return (
    <main className="px-4 py-5 space-y-4">
      {/* 캔버스 */}
      <div className="flex justify-center bg-muted/30 rounded-2xl py-5">
        <InvitationCanvas
          ref={canvasRef}
          layout={template.layout}
          userData={userData}
          aiText={aiText}
          textOverrides={textOverrides}
          imageUrls={imageUrls}
          selectedSlotId={selectedSlotId}
          onSelectSlot={onSelectSlot}
          displayWidth={340}
        />
      </div>

      {/* 슬롯 선택 안내 */}
      {!selectedSlot && (
        <div className="p-4 bg-blue-50 rounded-lg text-[12px] text-blue-900 leading-relaxed">
          편집하고 싶은 영역(텍스트·사진)을 캔버스에서 탭하세요. 빈 텍스트
          영역에서 8초간 입력이 없으면 AI 추천 문구 시트가 떠요.
        </div>
      )}

      {/* 텍스트 슬롯 편집 */}
      {selectedSlot?.type === "text" && (
        <section className="p-4 bg-card rounded-2xl border border-border space-y-2">
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">텍스트 편집</h3>
            {selectedSlot.ai_promptable && (
              <span className="ml-auto text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                AI 추천 가능
              </span>
            )}
          </div>
          <Textarea
            value={currentText}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder={selectedSlot.placeholder ?? "여기에 문구를 입력하세요"}
            rows={4}
            className="text-sm"
          />
          <p className="text-[10px] text-muted-foreground">
            {selectedSlot.field
              ? `자동 매핑 필드: ${selectedSlot.field}`
              : "자유 텍스트"}
          </p>
        </section>
      )}

      {/* 이미지 슬롯 편집 */}
      {(selectedSlot?.type === "image" || selectedSlot?.type === "map") && (
        <section className="p-4 bg-card rounded-2xl border border-border space-y-3">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">사진 교체</h3>
          </div>
          {imageUrls[selectedSlot.id] && (
            <img
              src={imageUrls[selectedSlot.id]}
              alt=""
              className="w-full max-h-40 object-contain rounded-lg bg-muted"
            />
          )}
          <Button onClick={onPickPhoto} variant="outline" className="w-full">
            <ImageIcon className="w-4 h-4 mr-2" />
            {imageUrls[selectedSlot.id] ? "다른 사진" : "사진 업로드"}
          </Button>
          <p className="text-[10px] text-muted-foreground">JPG/PNG, 최대 5MB</p>
        </section>
      )}

      {/* 캘린더 슬롯 안내 */}
      {selectedSlot?.type === "calendar" && (
        <section className="p-4 bg-card rounded-2xl border border-border">
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            캘린더는 위에서 입력한 <strong>결혼 날짜</strong>에 맞춰 자동으로
            렌더링돼요. 날짜를 변경하려면 뒤로 가서 정보를 수정해주세요.
          </p>
        </section>
      )}

      {/* PDF 다운로드 */}
      <Button
        onClick={onExportPdf}
        disabled={isExporting}
        className="w-full h-12 text-[15px] font-bold"
      >
        {isExporting ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            PDF 생성 중...
          </>
        ) : (
          <>
            <Download className="w-5 h-5 mr-2" />
            PDF 다운로드
          </>
        )}
      </Button>

      {/* 무료 안내 */}
      <div className="p-3 bg-emerald-50 rounded-lg flex items-center justify-between">
        <div className="flex items-center gap-1 text-[13px]">
          <Heart className="w-4 h-4 text-emerald-600" />
          <span className="font-bold text-emerald-900">무료 템플릿</span>
        </div>
        <span className="text-[11px] text-emerald-700">
          AI 추천 문구만 1하트씩 차감
        </span>
      </div>
    </main>
  );
};

export default InvitationStudio;
