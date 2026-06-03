import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate, useLocation, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  Heart,
  Save,
  Download,
  Image as ImageIcon,
  Type,
  Trash2,
  Share2,
  Sparkles,
  MapPin,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useInvitationFonts, type InvitationFont } from "@/hooks/useInvitationFonts";
import InvitationCanvas, {
  InvitationCanvasHandle,
} from "@/components/invitation/InvitationCanvas";
import AISuggestSheet from "@/components/invitation/AISuggestSheet";
import ShareCodeCard from "@/components/invitation/ShareCodeCard";
import type { ShareCodeStyle } from "@/lib/invitation/shareCode";
import {
  exportInvitationPdfPages,
  pixelRatioForPrint,
  type PdfPage,
} from "@/lib/invitation/exportPdf";
import {
  collectFontFamilies,
  getInvitationPages,
  getInvitationSlots,
  isSeamlessRoll,
  pageToLayout,
} from "@/lib/invitation/layout";
import {
  readFaceLayout,
  type InvitationFace,
  type InvitationLayout,
  type InvitationSlot,
  type InvitationUserData,
  type BgFill,
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

/** 한 면(전면/후면)의 편집 상태 */
interface FaceState {
  textOverrides: Record<string, string>;
  fontOverrides: Record<string, string>;
  positionOverrides: Record<string, { x: number; y: number }>;
  fontSizeOverrides: Record<string, number>;
  extraSlots: InvitationSlot[];
  hiddenSlots: string[];
  imagePaths: Record<string, string>; // DB 저장용 storage path
  imageUrls: Record<string, string>; // 화면 표시용 signed URL (저장 X)
  bgOverride?: BgFill; // 사용자가 바꾼 배경(단색/그라디언트). 없으면 템플릿 기본.
}
const emptyFace = (): FaceState => ({
  textOverrides: {},
  fontOverrides: {},
  positionOverrides: {},
  fontSizeOverrides: {},
  extraSlots: [],
  hiddenSlots: [],
  imagePaths: {},
  imageUrls: {},
});

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

  // 후면 템플릿 (없으면 단면 — 하위호환). template = 전면.
  const [backTemplate, setBackTemplate] = useState<Template | null>(null);
  const [backTemplateId, setBackTemplateId] = useState<string | null>(null);
  // 발행 상태 보존용 + 발행/공유
  const [loadedStatus, setLoadedStatus] = useState<string>("draft");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [shareCodeStyle, setShareCodeStyle] = useState<ShareCodeStyle>("basic");
  const [isGeneratingMap, setIsGeneratingMap] = useState(false);
  const [isStylizingMap, setIsStylizingMap] = useState(false);
  const [backTemplates, setBackTemplates] = useState<Template[]>([]);
  const [activeFace, setActiveFace] = useState<InvitationFace>("front");

  // 면별 편집 상태
  const [frontFace, setFrontFace] = useState<FaceState>(emptyFace);
  const [backFace, setBackFace] = useState<FaceState>(emptyFace);

  // 폰트: 피커엔 전체 목록(fonts), 로드는 현재 편집중 템플릿이 쓰는 것 + 사용자가 고른 것만.
  const usedFonts = useMemo(() => {
    const layouts = [template?.layout, backTemplate?.layout].filter(
      (l): l is InvitationLayout => !!l,
    );
    const ov = { ...frontFace.fontOverrides, ...backFace.fontOverrides };
    const extra = [...frontFace.extraSlots, ...backFace.extraSlots];
    return collectFontFamilies(layouts, ov, extra);
    // 폰트 무관 편집(위치/텍스트/크기)에는 재계산 안 하도록 폰트 관련 필드만 의존
  }, [
    template,
    backTemplate,
    frontFace.fontOverrides,
    frontFace.extraSlots,
    backFace.fontOverrides,
    backFace.extraSlots,
  ]);
  const { fonts, fontsReady } = useInvitationFonts(usedFonts);

  const [aiText, setAiText] = useState<Record<string, string>>({});
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  const [aiSheetOpen, setAiSheetOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  // 자동저장 — 편집 변경 후 디바운스 저장 + 상태 표시(사용자가 동작을 확인 가능하도록)
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [autoSavedAt, setAutoSavedAt] = useState<Date | null>(null);
  const autosaveHydratedRef = useRef(false);
  const dismissedSlots = useRef<Set<string>>(new Set());
  const idleTimerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<InvitationCanvasHandle>(null);
  const backCanvasRef = useRef<InvitationCanvasHandle>(null);
  const pageCanvasRefs = useRef<Record<string, InvitationCanvasHandle | null>>({});

  // 현재 활성 면 파생값
  const activeTemplate = activeFace === "front" ? template : backTemplate;
  const activeFaceState = activeFace === "front" ? frontFace : backFace;
  const setFace = activeFace === "front" ? setFrontFace : setBackFace;

  // 템플릿 슬롯 + 사용자가 추가한 요소
  const activeSlots: InvitationSlot[] = activeTemplate
    ? [...getInvitationSlots(activeTemplate.layout), ...activeFaceState.extraSlots]
    : [];
  const selectedSlot: InvitationSlot | undefined = activeSlots.find(
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

      // storage path → 표시용 signed URL (24h) 복원
      const hydrate = async (
        paths: Record<string, string> = {},
      ): Promise<Record<string, string>> => {
        const urls: Record<string, string> = {};
        await Promise.all(
          Object.entries(paths).map(async ([slotId, path]) => {
            const { data: s } = await supabase.storage
              .from("invitation-uploads")
              .createSignedUrl(path, 60 * 60 * 24);
            if (s?.signedUrl) urls[slotId] = s.signedUrl;
          }),
        );
        return urls;
      };

      const faces = readFaceLayout(data.layout);
      setFrontFace({
        textOverrides: faces.front.textOverrides ?? {},
        fontOverrides: faces.front.fontOverrides ?? {},
        positionOverrides: faces.front.positionOverrides ?? {},
        fontSizeOverrides: faces.front.fontSizeOverrides ?? {},
        extraSlots: faces.front.extraSlots ?? [],
        hiddenSlots: faces.front.hiddenSlots ?? [],
        imagePaths: faces.front.imagePaths ?? {},
        imageUrls: await hydrate(faces.front.imagePaths),
        bgOverride: faces.front.bgOverride,
      });

      // 후면 템플릿 (FK 미사용 → 별도 조회)
      if (data.back_template_id) {
        setBackTemplateId(data.back_template_id);
        const { data: bt } = await (supabase as any)
          .from("invitation_templates")
          .select("*")
          .eq("id", data.back_template_id)
          .maybeSingle();
        if (bt) setBackTemplate(bt as Template);
        setBackFace({
          textOverrides: faces.back.textOverrides ?? {},
          fontOverrides: faces.back.fontOverrides ?? {},
          positionOverrides: faces.back.positionOverrides ?? {},
          fontSizeOverrides: faces.back.fontSizeOverrides ?? {},
          extraSlots: faces.back.extraSlots ?? [],
          hiddenSlots: faces.back.hiddenSlots ?? [],
          imagePaths: faces.back.imagePaths ?? {},
          imageUrls: await hydrate(faces.back.imagePaths),
          bgOverride: faces.back.bgOverride,
        });
      }

      setAiText(data.ai_generated_text ?? {});
      setLoadedStatus(data.status ?? "draft");
      if (data.status === "published" && data.share_slug) {
        setShareUrl(`${window.location.origin}/i/${data.share_slug}`);
      }
      setStep("studio");
      // 로드로 인한 state 변경이 자동저장을 트리거하지 않도록, 복원 완료 후 hydrate 표시.
      autosaveHydratedRef.current = true;
    })();
  }, [params.id, user, navigate]);

  // 새로 만들기(저장된 id 없음)는 즉시 편집 가능 → 바로 hydrate.
  useEffect(() => {
    if (!params.id) autosaveHydratedRef.current = true;
  }, [params.id]);

  // ────────────────────────────────────────
  // 자동저장 — 편집 변경 2.5초 후 조용히 저장 (draft 레이아웃, 이미지 재업로드 없음)
  // ────────────────────────────────────────
  useEffect(() => {
    if (!autosaveHydratedRef.current) return;
    if (!user || !template) return;
    if (isSaving || isPublishing || isAutoSaving) return;
    // 내용이 없으면(빈 새 청첩장) 빈 draft 를 만들지 않음.
    const hasContent =
      Object.keys(userData).length > 0 ||
      Object.keys(frontFace.imagePaths).length > 0 ||
      Object.keys(frontFace.textOverrides).length > 0 ||
      frontFace.extraSlots.length > 0 ||
      Object.keys(aiText).length > 0;
    if (!invitationId && !hasContent) return;

    const timer = window.setTimeout(async () => {
      setIsAutoSaving(true);
      try {
        const layout = await buildLayout(loadedStatus === "published");
        if (invitationId) {
          const { error } = await (supabase as any)
            .from("invitations")
            .update({
              template_id: template.id,
              back_template_id: backTemplateId,
              user_data: userData,
              layout,
              ai_generated_text: aiText,
            })
            .eq("id", invitationId);
          if (error) throw error;
        } else {
          const { data, error } = await (supabase as any)
            .from("invitations")
            .insert({
              user_id: user.id,
              template_id: template.id,
              back_template_id: backTemplateId,
              user_data: userData,
              layout,
              ai_generated_text: aiText,
              status: "draft" as const,
            })
            .select("id")
            .single();
          if (error) throw error;
          setInvitationId(data.id);
        }
        setAutoSavedAt(new Date());
      } catch {
        // 조용히 실패 — 다음 변경 때 다시 시도. 명시적 저장 버튼은 그대로 동작.
      } finally {
        setIsAutoSaving(false);
      }
    }, 2500);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData, frontFace, backFace, aiText, backTemplateId]);

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
    const id = selectedSlot.id;
    setFace((p) => ({ ...p, textOverrides: { ...p.textOverrides, [id]: text } }));
    resetIdleTimer();
  };

  // 현재 면(전/후)의 캔버스 배경 변경. undefined → 템플릿 기본 배경으로 복귀.
  const handleBgChange = (bg: BgFill | undefined) => {
    setFace((p) => ({ ...p, bgOverride: bg }));
    resetIdleTimer();
  };

  // family === null → override 제거 (템플릿 기본 폰트로 복귀)
  const handleFontChange = (family: string | null) => {
    if (!selectedSlot) return;
    const id = selectedSlot.id;
    setFace((p) => {
      const next = { ...p.fontOverrides };
      if (!family) delete next[id];
      else next[id] = family;
      return { ...p, fontOverrides: next };
    });
  };

  // 슬롯 드래그 이동 → 활성 면의 위치 오버라이드 저장
  const handleMoveSlot = (id: string, x: number, y: number) => {
    setFace((p) => ({
      ...p,
      positionOverrides: { ...p.positionOverrides, [id]: { x, y } },
    }));
  };

  // 텍스트 요소 추가 (캔버스 중앙)
  const handleAddText = () => {
    if (!activeTemplate) return;
    const canvas = getInvitationPages(activeTemplate.layout)[0].canvas;
    const cw = canvas.w;
    const ch = canvas.h;
    const w = Math.min(600, cw - 80);
    const id = `extra-${crypto.randomUUID().slice(0, 8)}`;
    const newSlot: InvitationSlot = {
      id,
      type: "text",
      x: Math.round((cw - w) / 2),
      y: Math.round(ch / 2 - 40),
      w,
      h: 80,
      z: 50,
      text: "새 문구",
      font_size: 36,
      align: "center",
      color: "#1A1A1A",
      editable_font: true,
      movable: true,
    };
    setFace((p) => ({ ...p, extraSlots: [...p.extraSlots, newSlot] }));
    setSelectedSlotId(id);
  };

  // 약도 요소 추가 (캔버스 중앙) — 추가 후 선택하면 '약도 자동 생성' 패널이 열린다.
  // 식장 약도를 슬롯으로 가진 템플릿이 아니어도 사용자가 원하면 넣을 수 있게 한다.
  const handleAddMap = () => {
    if (!activeTemplate) return;
    const canvas = getInvitationPages(activeTemplate.layout)[0].canvas;
    const cw = canvas.w;
    const ch = canvas.h;
    const w = Math.min(640, cw - 80);
    // 네이버 Static Map 비율(640×420 ≈ 1.52)에 맞춰 높이 산출 — export 시 안 늘어남.
    const h = Math.round((w * 420) / 640);
    const id = `extra-${crypto.randomUUID().slice(0, 8)}`;
    const newSlot: InvitationSlot = {
      id,
      type: "map",
      x: Math.round((cw - w) / 2),
      y: Math.round(ch / 2 - h / 2),
      w,
      h,
      z: 50,
      fit: "cover",
      movable: true,
      resizable: true,
    };
    setFace((p) => ({ ...p, extraSlots: [...p.extraSlots, newSlot] }));
    setSelectedSlotId(id);
  };
  const handleDeleteSlot = () => {
    if (!selectedSlot) return;
    const id = selectedSlot.id;
    const isExtra = id.startsWith("extra-");
    setFace((p) => ({
      ...p,
      extraSlots: isExtra
        ? p.extraSlots.filter((s) => s.id !== id)
        : p.extraSlots,
      hiddenSlots: isExtra ? p.hiddenSlots : [...p.hiddenSlots, id],
    }));
    setSelectedSlotId(null);
  };

  // 숨긴 템플릿 슬롯 모두 복원
  const handleRestoreHidden = () => {
    setFace((p) => ({ ...p, hiddenSlots: [] }));
  };

  // 폰트 크기 조절 (텍스트 슬롯)
  const handleFontSizeChange = (delta: number) => {
    if (!selectedSlot || selectedSlot.type !== "text") return;
    const id = selectedSlot.id;
    const base =
      activeFaceState.fontSizeOverrides[id] ?? selectedSlot.font_size ?? 18;
    const next = Math.max(8, Math.min(200, base + delta));
    setFace((p) => ({
      ...p,
      fontSizeOverrides: { ...p.fontSizeOverrides, [id]: next },
    }));
  };

  const handlePhotoUpload = async (file: File) => {
    if (!selectedSlot || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "파일이 너무 커요 (최대 5MB)", variant: "destructive" });
      return;
    }
    const id = selectedSlot.id;
    const applyFace = setFace;
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
      .createSignedUrl(path, 60 * 60 * 24); // 화면 표시용 24h
    applyFace((p) => ({
      ...p,
      imagePaths: { ...p.imagePaths, [id]: path },
      imageUrls: signed?.signedUrl
        ? { ...p.imageUrls, [id]: signed.signedUrl }
        : p.imageUrls,
    }));
  };

  // 약도 자동 생성 (map 슬롯) — 식장 주소 → 네이버 지도 edge function
  const handleGenerateMap = async () => {
    if (!selectedSlot || selectedSlot.type !== "map") return;
    const address = userData.venue_address?.trim();
    if (!address) {
      toast({
        title: "식장 주소를 먼저 입력해주세요",
        description: "기본 정보에 주소를 넣으면 약도를 만들 수 있어요.",
        variant: "destructive",
      });
      return;
    }
    const id = selectedSlot.id;
    const applyFace = setFace;
    setIsGeneratingMap(true);
    try {
      const { data, error } = await (supabase as any).functions.invoke(
        "invitation-map",
        { body: { address } },
      );
      const path = data?.path as string | undefined;
      if (error || !path) {
        throw new Error(data?.error ?? error?.message ?? "약도 생성 실패");
      }
      const { data: signed } = await supabase.storage
        .from("invitation-uploads")
        .createSignedUrl(path, 60 * 60 * 24);
      applyFace((p) => ({
        ...p,
        imagePaths: { ...p.imagePaths, [id]: path },
        imageUrls: signed?.signedUrl
          ? { ...p.imageUrls, [id]: signed.signedUrl }
          : p.imageUrls,
      }));
      toast({ title: "약도를 생성했어요" });
    } catch (e) {
      toast({
        title: "약도 생성 실패",
        description: e instanceof Error ? e.message : "오류",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingMap(false);
    }
  };

  // 템플릿풍 약도 변환 (3하트) — 캡쳐/업로드된 지도 → gpt-image 일러스트 약도.
  const handleStylizeMap = async () => {
    if (!selectedSlot || selectedSlot.type !== "map") return;
    const id = selectedSlot.id;
    const sourcePath = activeFaceState.imagePaths[id];
    if (!sourcePath) {
      toast({
        title: "먼저 약도를 가져오세요",
        description: "‘약도 자동 생성’ 또는 직접 업로드 후 템플릿풍으로 변환할 수 있어요.",
        variant: "destructive",
      });
      return;
    }
    // 비용 사전 확인 — 3하트는 환불이 어려우니 진행 전 한 번 더 묻는다.
    if (
      !window.confirm(
        "템플릿풍 약도 변환에 3하트가 차감됩니다. 진행할까요?",
      )
    ) {
      return;
    }
    const applyFace = setFace;
    setIsStylizingMap(true);
    try {
      const { data, error } = await (supabase as any).functions.invoke(
        "invitation-illustration",
        { body: { source_paths: [sourcePath], style: "map" } },
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
          // 에디터를 벗어나면 편집 맥락을 잃으니 이탈하지 않고 액션 버튼으로 유도.
          toast({
            title: "하트가 부족해요",
            description: "약도 일러스트 변환은 3하트가 필요해요.",
            variant: "destructive",
            action: { label: "충전하기", onClick: () => navigate("/points") },
          });
          return;
        }
        throw new Error(code ?? error.message ?? "변환 실패");
      }
      if (data?.error) throw new Error(data.error);
      const newPath = data?.illustration_paths?.[sourcePath] as
        | string
        | undefined;
      const newUrl = data?.illustration_urls?.[sourcePath] as
        | string
        | undefined;
      if (!newPath) throw new Error("변환 결과가 없어요");
      applyFace((p) => ({
        ...p,
        imagePaths: { ...p.imagePaths, [id]: newPath },
        imageUrls: newUrl ? { ...p.imageUrls, [id]: newUrl } : p.imageUrls,
      }));
      toast({ title: "템플릿풍 약도로 변환했어요 (3하트 사용)" });
    } catch (e) {
      toast({
        title: "약도 변환 실패",
        description: e instanceof Error ? e.message : "오류",
        variant: "destructive",
      });
    } finally {
      setIsStylizingMap(false);
    }
  };

  // 면 전환 (선택 슬롯 초기화)
  const handleSwitchFace = (f: InvitationFace) => {
    setActiveFace(f);
    setSelectedSlotId(null);
  };

  // 후면 템플릿 목록 로드 (face in back/both)
  const loadBackTemplates = useCallback(async () => {
    if (backTemplates.length > 0) return;
    // 후면은 종이 카드 전용 — 모바일(세로 긴 캔버스) 템플릿 제외
    const { data } = await (supabase as any)
      .from("invitation_templates")
      .select("id, name, thumbnail_url, format, tone, price_hearts, layout, text_prompt_hint")
      .eq("is_active", true)
      .eq("format", "paper")
      .in("face", ["back", "both"])
      .order("display_order", { ascending: false });
    setBackTemplates((data ?? []) as Template[]);
  }, [backTemplates.length]);

  // 후면 템플릿 교체
  const handleChangeBackTemplate = (t: Template) => {
    setBackTemplate(t);
    setBackTemplateId(t.id);
    // 새 후면은 슬롯 id 가 달라 기존 오버라이드는 무의미 → 초기화
    setBackFace(emptyFace());
    setActiveFace("back");
    setSelectedSlotId(null);
  };

  // ────────────────────────────────────────
  // 저장
  // ────────────────────────────────────────
  // 면별 layout 직렬화. forViewer=true 면 익명 뷰어용 long-lived signed URL 동봉.
  const buildFaceLayout = async (f: FaceState, forViewer: boolean) => {
    // signed URL(화면용 imageUrls)은 만료되니 저장 X — storage path 만 영구 보존
    const base = {
      textOverrides: f.textOverrides,
      imagePaths: f.imagePaths,
      fontOverrides: f.fontOverrides,
      positionOverrides: f.positionOverrides,
      fontSizeOverrides: f.fontSizeOverrides,
      extraSlots: f.extraSlots,
      hiddenSlots: f.hiddenSlots,
      bgOverride: f.bgOverride,
    };
    if (!forViewer) return base;
    const imageUrlsForViewer: Record<string, string> = {};
    await Promise.all(
      Object.entries(f.imagePaths).map(async ([slotId, path]) => {
        const { data: s } = await supabase.storage
          .from("invitation-uploads")
          .createSignedUrl(path, 60 * 60 * 24 * 365); // 1년
        if (s?.signedUrl) imageUrlsForViewer[slotId] = s.signedUrl;
      }),
    );
    return { ...base, imageUrlsForViewer };
  };

  const buildLayout = async (forViewer: boolean) => ({
    front: await buildFaceLayout(frontFace, forViewer),
    back: await buildFaceLayout(backFace, forViewer),
  });

  const handleSave = async () => {
    if (!user || !template) return;
    setIsSaving(true);
    try {
      const isPublished = loadedStatus === "published";
      const layout = await buildLayout(isPublished);
      if (invitationId) {
        // status 는 보존(미포함) — 발행본을 편집 저장해도 draft 로 강등되지 않음
        const { error } = await (supabase as any)
          .from("invitations")
          .update({
            template_id: template.id,
            back_template_id: backTemplateId,
            user_data: userData,
            layout,
            ai_generated_text: aiText,
          })
          .eq("id", invitationId);
        if (error) throw error;
      } else {
        const { data, error } = await (supabase as any)
          .from("invitations")
          .insert({
            user_id: user.id,
            template_id: template.id,
            back_template_id: backTemplateId,
            user_data: userData,
            layout,
            ai_generated_text: aiText,
            status: "draft" as const,
          })
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

  // 발행 & 공유 — 현재 편집 내용을 저장(뷰어 URL 포함)한 뒤 slug 발급
  const handlePublish = async () => {
    if (!user || !template) return;
    setIsPublishing(true);
    try {
      const layout = await buildLayout(true);
      let id = invitationId;
      if (id) {
        const { error } = await (supabase as any)
          .from("invitations")
          .update({
            template_id: template.id,
            back_template_id: backTemplateId,
            user_data: userData,
            layout,
            ai_generated_text: aiText,
          })
          .eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await (supabase as any)
          .from("invitations")
          .insert({
            user_id: user.id,
            template_id: template.id,
            back_template_id: backTemplateId,
            user_data: userData,
            layout,
            ai_generated_text: aiText,
            status: "draft" as const,
          })
          .select("id")
          .single();
        if (error) throw error;
        id = data.id as string;
        setInvitationId(id);
      }
      const { data: pub, error: pubErr } = await (supabase as any).rpc(
        "publish_invitation",
        { p_invitation_id: id },
      );
      if (pubErr) throw pubErr;
      const row = Array.isArray(pub) ? pub[0] : pub;
      if (!row?.share_slug) throw new Error("공유 링크 발급 실패");
      setShareUrl(`${window.location.origin}/i/${row.share_slug}`);
      setLoadedStatus("published");
      toast({ title: "공유 링크가 발급됐어요" });
    } catch (err) {
      toast({
        title: "발행 실패",
        description: err instanceof Error ? err.message : "오류",
        variant: "destructive",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  // ────────────────────────────────────────
  // PDF 다운로드
  // ────────────────────────────────────────
  const handleExportPdf = async () => {
    if (!template) return;
    setIsExporting(true);
    try {
      const pages: PdfPage[] = [];
      const appendTemplatePages = (
        targetTemplate: Template,
        scope: "front" | "back",
        fallbackRef: React.RefObject<InvitationCanvasHandle>,
      ) => {
        getInvitationPages(targetTemplate.layout).forEach((page, index) => {
          const pageRef =
            pageCanvasRefs.current[`${scope}:${page.id}`] ??
            (index === 0 ? fallbackRef.current : null);
          const dataUrl = pageRef?.toDataUrl(
            pixelRatioForPrint(340, page.print?.wMm),
          );
          if (!dataUrl) return;
          pages.push({
            dataUrl,
            w: page.canvas.w,
            h: page.canvas.h,
            printWmm: page.print?.wMm,
            printHmm: page.print?.hMm,
          });
        });
      };
      appendTemplatePages(template, "front", canvasRef);
      if (pages.length === 0) throw new Error("캔버스 추출 실패");
      if (backTemplate) {
        appendTemplatePages(backTemplate, "back", backCanvasRef);
      }
      const filename = `dewy-invitation-${invitationId ?? "draft"}.pdf`;
      exportInvitationPdfPages(pages, filename);
      toast({
        title: "PDF 다운로드 시작",
        description: pages.length > 1 ? `${pages.length}페이지 인쇄용 PDF` : undefined,
      });
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
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {isAutoSaving
                ? "저장 중…"
                : autoSavedAt
                  ? `자동저장됨 ${autoSavedAt.toLocaleTimeString("ko-KR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`
                  : ""}
            </span>
          )}
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
          backCanvasRef={backCanvasRef}
          pageCanvasRefs={pageCanvasRefs}
          template={template}
          backTemplate={backTemplate}
          userData={userData}
          frontFace={frontFace}
          backFace={backFace}
          activeFace={activeFace}
          onSwitchFace={handleSwitchFace}
          aiText={aiText}
          fonts={fonts}
          fontsReady={fontsReady}
          selectedSlot={selectedSlot ?? null}
          selectedSlotId={selectedSlotId}
          onSelectSlot={setSelectedSlotId}
          onTextChange={handleTextChange}
          onFontChange={handleFontChange}
          onOpenAi={() => setAiSheetOpen(true)}
          onGenerateMap={handleGenerateMap}
          isGeneratingMap={isGeneratingMap}
          onStylizeMap={handleStylizeMap}
          isStylizingMap={isStylizingMap}
          onMoveSlot={handleMoveSlot}
          onAddText={handleAddText}
          onAddMap={handleAddMap}
          onDeleteSlot={handleDeleteSlot}
          onRestoreHidden={handleRestoreHidden}
          onFontSizeChange={handleFontSizeChange}
          onPickPhoto={() => fileInputRef.current?.click()}
          onExportPdf={handleExportPdf}
          isExporting={isExporting}
          backTemplates={backTemplates}
          onLoadBackTemplates={loadBackTemplates}
          onChangeBackTemplate={handleChangeBackTemplate}
          shareUrl={shareUrl}
          isPublishing={isPublishing}
          onPublish={handlePublish}
          shareCodeStyle={shareCodeStyle}
          onShareCodeStyleChange={setShareCodeStyle}
          onBgChange={handleBgChange}
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
            setFace((p) => {
              const next = { ...p.textOverrides };
              delete next[selectedSlot.id];
              return { ...p, textOverrides: next };
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
          {formatFilter === "paper" ? "종이 청첩장" : "모바일 청첩장"}
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
const BG_SWATCHES = [
  "#FFFFFF", "#F4ECDB", "#F6F1E7", "#EAE6DF",
  "#2F3A26", "#1B2A4A", "#9E2B25", "#3A3A3A",
];
const GRAD_PRESETS: { label: string; a: string; b: string }[] = [
  { label: "크림", a: "#FBF7EE", b: "#ECE0CC" },
  { label: "블러시", a: "#FDEEF0", b: "#F3D7DE" },
  { label: "세이지", a: "#EEF3EA", b: "#CBD8C0" },
  { label: "나이트", a: "#2B3A55", b: "#10182B" },
];

/** 캔버스 배경(단색/그라디언트) 편집 — 면(전/후)별 적용. */
const BgControl = ({
  value,
  defaultBg,
  onChange,
}: {
  value?: BgFill;
  defaultBg: string;
  onChange: (bg: BgFill | undefined) => void;
}) => {
  const isGrad = !!value?.gradient;
  const solid = value?.color ?? (isGrad ? "" : defaultBg);
  const c0 = value?.gradient?.stops?.[0]?.color ?? defaultBg;
  const c1 =
    value?.gradient?.stops?.[value.gradient.stops.length - 1]?.color ?? "#FFFFFF";
  const angle = value?.gradient?.angle ?? 0;
  const gtype = value?.gradient?.type ?? "linear";

  const setGrad = (
    patch: Partial<{ c0: string; c1: string; angle: number; type: "linear" | "radial" }>,
  ) =>
    onChange({
      gradient: {
        type: patch.type ?? gtype,
        angle: patch.angle ?? angle,
        stops: [
          { offset: 0, color: patch.c0 ?? c0 },
          { offset: 1, color: patch.c1 ?? c1 },
        ],
      },
    });

  return (
    <section className="p-4 bg-card rounded-2xl border border-border space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">배경</h3>
        {value && (
          <button
            type="button"
            className="text-[11px] text-muted-foreground underline"
            onClick={() => onChange(undefined)}
          >
            기본값으로
          </button>
        )}
      </div>

      {/* 단색 */}
      <div className="flex flex-wrap items-center gap-1.5">
        {BG_SWATCHES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange({ color: c })}
            className={`w-7 h-7 rounded-full border ${
              !isGrad && solid?.toUpperCase() === c ? "ring-2 ring-primary" : "border-border"
            }`}
            style={{ background: c }}
            aria-label={c}
          />
        ))}
        <label className="w-7 h-7 rounded-full border border-border overflow-hidden relative cursor-pointer">
          <span
            className="absolute inset-0"
            style={{
              background:
                "conic-gradient(red,orange,yellow,lime,cyan,blue,magenta,red)",
            }}
          />
          <input
            type="color"
            value={!isGrad && solid ? solid : defaultBg}
            onChange={(e) => onChange({ color: e.target.value })}
            className="absolute inset-0 w-[250%] h-[250%] -left-3/4 -top-3/4 opacity-0 cursor-pointer"
          />
        </label>
      </div>

      {/* 그라디언트 프리셋 + 편집 */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {GRAD_PRESETS.map((g) => (
            <button
              key={g.label}
              type="button"
              onClick={() =>
                onChange({
                  gradient: {
                    type: "linear",
                    angle: 0,
                    stops: [
                      { offset: 0, color: g.a },
                      { offset: 1, color: g.b },
                    ],
                  },
                })
              }
              className="h-7 px-2.5 rounded-full border border-border text-[11px] text-foreground/80"
              style={{ background: `linear-gradient(180deg, ${g.a}, ${g.b})` }}
            >
              {g.label}
            </button>
          ))}
        </div>
        {isGrad && (
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={c0}
              onChange={(e) => setGrad({ c0: e.target.value })}
              className="w-8 h-8 rounded cursor-pointer border border-border"
              aria-label="시작 색"
            />
            <input
              type="color"
              value={c1}
              onChange={(e) => setGrad({ c1: e.target.value })}
              className="w-8 h-8 rounded cursor-pointer border border-border"
              aria-label="끝 색"
            />
            <div className="flex gap-1 ml-auto">
              {[
                { a: 0, l: "↓" },
                { a: 45, l: "↘" },
                { a: 90, l: "→" },
              ].map((d) => (
                <button
                  key={d.a}
                  type="button"
                  onClick={() => setGrad({ type: "linear", angle: d.a })}
                  className={`w-7 h-7 rounded border text-xs ${
                    gtype === "linear" && angle === d.a
                      ? "border-primary text-primary"
                      : "border-border text-foreground/70"
                  }`}
                >
                  {d.l}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setGrad({ type: "radial" })}
                className={`w-7 h-7 rounded border text-xs ${
                  gtype === "radial"
                    ? "border-primary text-primary"
                    : "border-border text-foreground/70"
                }`}
              >
                ◎
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

const StudioView = ({
  canvasRef,
  backCanvasRef,
  pageCanvasRefs,
  template,
  backTemplate,
  userData,
  frontFace,
  backFace,
  activeFace,
  onSwitchFace,
  aiText,
  fonts,
  fontsReady,
  selectedSlot,
  selectedSlotId,
  onSelectSlot,
  onTextChange,
  onFontChange,
  onOpenAi,
  onGenerateMap,
  isGeneratingMap,
  onStylizeMap,
  isStylizingMap,
  onMoveSlot,
  onAddText,
  onAddMap,
  onDeleteSlot,
  onRestoreHidden,
  onFontSizeChange,
  onPickPhoto,
  onExportPdf,
  isExporting,
  backTemplates,
  onLoadBackTemplates,
  onChangeBackTemplate,
  shareUrl,
  isPublishing,
  onPublish,
  shareCodeStyle,
  onShareCodeStyleChange,
  onBgChange,
}: {
  canvasRef: React.MutableRefObject<InvitationCanvasHandle | null>;
  backCanvasRef: React.MutableRefObject<InvitationCanvasHandle | null>;
  pageCanvasRefs: React.MutableRefObject<Record<string, InvitationCanvasHandle | null>>;
  template: Template;
  backTemplate: Template | null;
  userData: InvitationUserData;
  frontFace: FaceState;
  backFace: FaceState;
  activeFace: InvitationFace;
  onSwitchFace: (f: InvitationFace) => void;
  aiText: Record<string, string>;
  fonts: InvitationFont[];
  fontsReady: boolean;
  selectedSlot: InvitationSlot | null;
  selectedSlotId: string | null;
  onSelectSlot: (id: string | null) => void;
  onTextChange: (text: string) => void;
  onFontChange: (family: string | null) => void;
  onOpenAi: () => void;
  onGenerateMap: () => void;
  isGeneratingMap: boolean;
  onStylizeMap: () => void;
  isStylizingMap: boolean;
  onMoveSlot: (id: string, x: number, y: number) => void;
  onAddText: () => void;
  onAddMap: () => void;
  onDeleteSlot: () => void;
  onRestoreHidden: () => void;
  onFontSizeChange: (delta: number) => void;
  onPickPhoto: () => void;
  onExportPdf: () => void;
  isExporting: boolean;
  backTemplates: Template[];
  onLoadBackTemplates: () => void;
  onChangeBackTemplate: (t: Template) => void;
  shareUrl: string | null;
  isPublishing: boolean;
  onPublish: () => void;
  shareCodeStyle: ShareCodeStyle;
  onShareCodeStyleChange: (s: ShareCodeStyle) => void;
  onBgChange: (bg: BgFill | undefined) => void;
}) => {
  const [showBackPicker, setShowBackPicker] = useState(false);
  const aFace = activeFace === "front" ? frontFace : backFace;
  // 모바일 청첩장은 단면 — 전면/후면 개념 없음
  const allowBack = template.format !== "mobile";
  // 배경 컨트롤 기준값 — 현재 면 템플릿의 기본 배경색
  const activeTpl = activeFace === "front" ? template : backTemplate;
  const defaultBg =
    activeTpl?.layout?.pages?.[0]?.canvas?.bg ??
    activeTpl?.layout?.canvas?.bg ??
    "#FFFFFF";

  const currentText =
    selectedSlot?.type === "text"
      ? aFace.textOverrides[selectedSlot.id] !== undefined
        ? aFace.textOverrides[selectedSlot.id]
        : aiText[selectedSlot.id] !== undefined
          ? aiText[selectedSlot.id]
          : selectedSlot.field && userData[selectedSlot.field]
            ? userData[selectedSlot.field]!
            : selectedSlot.text ?? selectedSlot.placeholder ?? ""
      : "";

  // 전면/후면 캔버스를 모두 마운트(내보내기용 ref 확보)하고, 비활성 면은
  // 화면 밖으로 보내 숨긴다. (display:none 대신 off-screen — Konva 렌더 보존)
  const renderFaceCanvas = (f: InvitationFace) => {
    const isFront = f === "front";
    const tmpl = isFront ? template : backTemplate;
    if (!tmpl) return null;
    const fd = isFront ? frontFace : backFace;
    const ref = isFront ? canvasRef : backCanvasRef;
    const visible = activeFace === f;
    const pages = getInvitationPages(tmpl.layout);
    const seamless = isSeamlessRoll(tmpl.layout);
    return (
      <div
        className={`flex flex-col items-center ${seamless ? "gap-0" : "gap-4"}`}
        style={
          visible
            ? undefined
            : { position: "absolute", left: -100000, top: 0, opacity: 0, pointerEvents: "none" }
        }
      >
        {pages.map((page, index) => (
          <div
            key={page.id}
            className={`flex flex-col items-center ${seamless ? "gap-0" : "gap-2"}`}
          >
            {!seamless && pages.length > 1 && (
              <span className="text-[11px] font-bold text-muted-foreground">
                {page.label ?? `${index + 1}P`}
              </span>
            )}
            <InvitationCanvas
              ref={(node) => {
                pageCanvasRefs.current[`${f}:${page.id}`] = node;
                if (index === 0) ref.current = node;
              }}
              layout={pageToLayout(page)}
              userData={userData}
              aiText={aiText}
              textOverrides={fd.textOverrides}
              fontOverrides={fd.fontOverrides}
              positionOverrides={fd.positionOverrides}
              fontSizeOverrides={fd.fontSizeOverrides}
              extraSlots={index === 0 ? fd.extraSlots : []}
              hiddenSlots={fd.hiddenSlots}
              fontsReady={fontsReady}
              imageUrls={fd.imageUrls}
              bgOverride={fd.bgOverride}
              selectedSlotId={visible ? selectedSlotId : null}
              onSelectSlot={visible ? onSelectSlot : () => {}}
              editable={visible}
              onMoveSlot={onMoveSlot}
              shareUrl={shareUrl ?? undefined}
              displayWidth={340}
            />
          </div>
        ))}
      </div>
    );
  };

  return (
    <main className="px-4 py-5 space-y-4">
      {/* 전면/후면 탭 (모바일은 단면이라 숨김) */}
      {allowBack && (
      <div className="flex gap-2">
        {(["front", "back"] as const).map((f) => {
          const isActive = activeFace === f;
          const label =
            f === "front" ? "전면" : backTemplate ? "후면" : "후면 추가";
          return (
            <button
              key={f}
              type="button"
              onClick={() => {
                onSwitchFace(f);
                if (f === "back" && !backTemplate) {
                  onLoadBackTemplates();
                  setShowBackPicker(true);
                }
              }}
              className={`flex-1 h-10 rounded-xl text-sm font-bold border transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
      )}

      {/* 캔버스 (전면+후면 모두 마운트, 비활성은 숨김) */}
      <div className="relative flex justify-center bg-muted/30 rounded-2xl py-5 min-h-[200px]">
        {renderFaceCanvas("front")}
        {renderFaceCanvas("back")}
        {activeFace === "back" && !backTemplate && (
          <div className="text-center px-6 py-10">
            <p className="text-sm text-muted-foreground mb-3">
              후면 디자인을 선택하면 2장(전면·후면)으로 만들어져요.
            </p>
            <Button
              onClick={() => {
                onLoadBackTemplates();
                setShowBackPicker(true);
              }}
            >
              후면 템플릿 고르기
            </Button>
          </div>
        )}
      </div>

      {/* 후면 템플릿 변경 (후면 탭에서) */}
      {activeFace === "back" && (
        <div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              onLoadBackTemplates();
              setShowBackPicker((v) => !v);
            }}
          >
            {backTemplate ? "후면 템플릿 변경" : "후면 템플릿 선택"}
          </Button>
          {showBackPicker && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              {backTemplates.length === 0 ? (
                <p className="col-span-2 text-center text-[12px] text-muted-foreground py-6">
                  후면 템플릿을 불러오는 중…
                </p>
              ) : (
                backTemplates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      onChangeBackTemplate(t);
                      setShowBackPicker(false);
                    }}
                    className={`bg-card rounded-xl overflow-hidden border text-left active:scale-[0.98] transition-transform ${
                      backTemplate?.id === t.id
                        ? "border-primary"
                        : "border-border"
                    }`}
                  >
                    <div className="aspect-[3/4] bg-muted flex items-center justify-center">
                      {t.thumbnail_url ? (
                        <img
                          src={t.thumbnail_url}
                          alt={t.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-[11px] text-muted-foreground px-2 text-center">
                          {t.name}
                        </span>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-[11px] font-semibold text-foreground truncate">
                        {t.name}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* 배경색 / 그라디언트 */}
      {(activeFace === "front" || backTemplate) && (
        <BgControl
          value={aFace.bgOverride}
          defaultBg={defaultBg}
          onChange={onBgChange}
        />
      )}

      {/* 요소 추가 / 숨김 복원 */}
      {(activeFace === "front" || backTemplate) && (
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onAddText}>
            <Type className="w-4 h-4 mr-1.5" />
            텍스트 추가
          </Button>
          <Button variant="outline" className="flex-1" onClick={onAddMap}>
            <MapPin className="w-4 h-4 mr-1.5" />
            약도 추가
          </Button>
          {aFace.hiddenSlots.length > 0 && (
            <Button variant="ghost" onClick={onRestoreHidden}>
              숨긴 {aFace.hiddenSlots.length}개 복원
            </Button>
          )}
        </div>
      )}

      {/* 슬롯 선택 안내 */}
      {!selectedSlot && (activeFace === "front" || backTemplate) && (
        <div className="p-4 bg-blue-50 rounded-lg text-[12px] text-blue-900 leading-relaxed">
          편집할 영역(텍스트·사진)을 캔버스에서 탭하면 아래에 편집 패널이 열려요.
          선택한 요소는 끌어서 위치를 옮길 수 있어요. 빈 텍스트 영역에서 8초간
          입력이 없으면 AI 추천 문구 시트가 떠요.
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

          {/* AI 인삿말 추천 — ai_promptable 슬롯 (호출당 1하트) */}
          {selectedSlot.ai_promptable && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={onOpenAi}
            >
              <Sparkles className="w-4 h-4 mr-1.5 text-primary" />
              AI 인삿말 추천
              <span className="ml-1 text-[10px] text-muted-foreground">1하트</span>
            </Button>
          )}

          {/* 폰트 선택 — locked / editable_font:false 슬롯은 숨김 */}
          {!selectedSlot.locked && selectedSlot.editable_font !== false && (
            <FontPicker
              fonts={fonts}
              value={aFace.fontOverrides[selectedSlot.id] ?? null}
              defaultFamily={selectedSlot.font_family ?? null}
              onChange={onFontChange}
            />
          )}

          {/* 크기 조절 + 삭제 */}
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <span className="text-[12px] text-muted-foreground">크기</span>
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => onFontSizeChange(-2)}
            >
              −
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => onFontSizeChange(2)}
            >
              +
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto text-destructive hover:text-destructive"
              onClick={onDeleteSlot}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              삭제
            </Button>
          </div>
        </section>
      )}

      {/* 이미지 슬롯 편집 */}
      {(selectedSlot?.type === "image" || selectedSlot?.type === "map") && (
        <section className="p-4 bg-card rounded-2xl border border-border space-y-3">
          <div className="flex items-center gap-2">
            {selectedSlot.type === "map" ? (
              <MapPin className="w-4 h-4 text-primary" />
            ) : (
              <ImageIcon className="w-4 h-4 text-primary" />
            )}
            <h3 className="text-sm font-bold text-foreground">
              {selectedSlot.type === "map" ? "약도" : "사진 교체"}
            </h3>
          </div>
          {aFace.imageUrls[selectedSlot.id] && (
            <img
              src={aFace.imageUrls[selectedSlot.id]}
              alt=""
              className="w-full max-h-40 object-contain rounded-lg bg-muted"
            />
          )}
          {selectedSlot.type === "map" && (
            <div className="space-y-2">
              <Button
                onClick={onGenerateMap}
                disabled={isGeneratingMap || isStylizingMap}
                variant="outline"
                className="w-full"
              >
                {isGeneratingMap ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <MapPin className="w-4 h-4 mr-2" />
                )}
                약도 자동 생성 (무료)
              </Button>
              <Button
                onClick={onStylizeMap}
                disabled={isGeneratingMap || isStylizingMap}
                className="w-full"
              >
                {isStylizingMap ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                템플릿풍 약도 만들기
                <span className="ml-1 text-[11px] opacity-80">3하트</span>
              </Button>
              <p className="text-[11px] text-muted-foreground">
                먼저 ‘약도 자동 생성(무료)’으로 지도를 불러온 뒤, 템플릿에 어울리는
                약도로 변환할 수 있어요.
              </p>
            </div>
          )}
          <Button onClick={onPickPhoto} variant="outline" className="w-full">
            <ImageIcon className="w-4 h-4 mr-2" />
            {aFace.imageUrls[selectedSlot.id]
              ? "다른 이미지"
              : selectedSlot.type === "map"
                ? "약도 직접 업로드"
                : "사진 업로드"}
          </Button>
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">JPG/PNG, 최대 5MB</p>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={onDeleteSlot}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              삭제
            </Button>
          </div>
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

      {/* 발행 & 공유 (QR·바코드) */}
      <section className="space-y-2">
        {shareUrl ? (
          <ShareCodeCard
            url={shareUrl}
            style={shareCodeStyle}
            onStyleChange={onShareCodeStyleChange}
          />
        ) : (
          <Button
            variant="outline"
            onClick={onPublish}
            disabled={isPublishing}
            className="w-full h-12"
          >
            {isPublishing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Share2 className="w-4 h-4 mr-2" />
            )}
            공유 링크·QR 발급하기
          </Button>
        )}
      </section>

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

// ════════════════════════════════════════════════════════════════
// Font Picker — 등록된 invitation_fonts 중 선택 (카테고리별 그룹)
// ════════════════════════════════════════════════════════════════
const DEFAULT_VALUE = "__default__";

const FONT_CATEGORY_LABELS: Record<string, string> = {
  SERIF: "명조 / 세리프",
  SANS_SERIF: "고딕 / 산세리프",
  SCRIPT: "필기체",
  DISPLAY: "장식체",
  HANDWRITING: "손글씨",
};

const FontPicker = ({
  fonts,
  value,
  defaultFamily,
  onChange,
}: {
  fonts: InvitationFont[];
  /** 현재 override (null = 템플릿 기본 사용) */
  value: string | null;
  /** 템플릿이 지정한 기본 폰트 family (없으면 null) */
  defaultFamily: string | null;
  onChange: (family: string | null) => void;
}) => {
  // 카테고리별 그룹핑 (display_order 정렬은 이미 fetch 시 적용됨)
  const grouped = fonts.reduce<Record<string, InvitationFont[]>>((acc, f) => {
    (acc[f.category] ??= []).push(f);
    return acc;
  }, {});

  const effectiveFamily = value ?? defaultFamily ?? "Pretendard, sans-serif";

  return (
    <div className="pt-2 border-t border-border space-y-1.5">
      <Label className="text-[12px] text-muted-foreground">폰트</Label>
      <Select
        value={value ?? DEFAULT_VALUE}
        onValueChange={(v) => onChange(v === DEFAULT_VALUE ? null : v)}
      >
        <SelectTrigger className="h-9 text-sm">
          <SelectValue placeholder="폰트 선택" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={DEFAULT_VALUE}>
            기본{defaultFamily ? ` (${defaultFamily})` : ""}
          </SelectItem>
          {fonts.length === 0 && (
            <div className="px-2 py-3 text-[11px] text-muted-foreground">
              등록된 폰트가 없어요. 관리자 폰트 등록 후 표시됩니다.
            </div>
          )}
          {Object.entries(grouped).map(([category, list]) => (
            <SelectGroup key={category}>
              <SelectLabel>
                {FONT_CATEGORY_LABELS[category] ?? category}
              </SelectLabel>
              {list.map((f) => (
                <SelectItem key={f.id} value={f.family}>
                  <span style={{ fontFamily: `'${f.family}'` }}>{f.name}</span>
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
      {/* 선택 폰트 미리보기 */}
      <p
        className="text-[15px] text-foreground/90 leading-snug px-1 pt-1"
        style={{ fontFamily: `'${effectiveFamily}'` }}
      >
        평생을 함께할 두 사람이 결혼합니다
      </p>
    </div>
  );
};

export default InvitationStudio;
