import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  Sparkles,
  Download,
  Share2,
  Save,
  Pencil,
  Upload,
  X,
  Heart,
  Printer,
  Smartphone,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import InvitationCanvas, {
  InvitationCanvasHandle,
} from "@/components/invitation/InvitationCanvas";
import ShareCodeCard from "@/components/invitation/ShareCodeCard";
import { useInvitationFonts } from "@/hooks/useInvitationFonts";
import type { ShareCodeStyle } from "@/lib/invitation/shareCode";
import {
  exportInvitationPdfPages,
  pixelRatioForPrint,
  type PdfPage,
} from "@/lib/invitation/exportPdf";
import { computeInvitationPrice } from "@/lib/invitation/computePrice";
import {
  collectFontFamilies,
  getInvitationPages,
  getInvitationSlots,
  getPhotoSlotGroups,
  isSeamlessRoll,
  pageToLayout,
  photoGroupKey,
  requiredPhotoCount,
} from "@/lib/invitation/layout";
import {
  readFaceLayout,
  type InvitationLayout,
  type InvitationUserData,
  type SlotRole,
} from "@/lib/invitation/types";

/**
 * 청첩장 메인 흐름 — One-page UX.
 *
 *   /invitation/new?format=paper
 *
 *   step 1. template — 디자인 카드 그리드
 *   step 2. wizard   — 정보·사진 다중 첨부·AI 토글 한 페이지
 *   step 3. result   — 큰 미리보기 + PDF/공유/저장/세부 조정
 *
 * 세부 조정이 필요하면 InvitationStudio 로 이동 (/invitation/:id/edit).
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
  default_back_template_id?: string | null;
}

type Step = "template" | "wizard" | "result";

const InvitationFlow = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const formatFilter = (searchParams.get("format") ?? "paper") as
    | "paper"
    | "mobile";

  const [step, setStep] = useState<Step>("template");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [template, setTemplate] = useState<Template | null>(null);
  const [hearts, setHearts] = useState<number | null>(null);

  const [userData, setUserData] = useState<InvitationUserData>({});
  const [photos, setPhotos] = useState<{ path: string; url: string }[]>([]);
  // QR 슬롯에 직접 첨부하는 이미지 (slot.id → storage path / signed url)
  const [qrPaths, setQrPaths] = useState<Record<string, string>>({});
  const [qrUrls, setQrUrls] = useState<Record<string, string>>({});
  const [aiAuto, setAiAuto] = useState(true);
  const [consentOpen, setConsentOpen] = useState(false);
  const [pendingPhotoSelect, setPendingPhotoSelect] = useState(false);

  const [imagePaths, setImagePaths] = useState<Record<string, string>>({});
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [textOverrides, setTextOverrides] = useState<Record<string, string>>(
    {},
  );
  const [aiText, setAiText] = useState<Record<string, string>>({});

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [invitationId, setInvitationId] = useState<string | null>(null);

  // 후면 템플릿 (전면의 default_back 으로 자동 적용 — 세트). 없으면 단면.
  const [backTemplate, setBackTemplate] = useState<Template | null>(null);
  const [backTemplateId, setBackTemplateId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<InvitationCanvasHandle>(null);
  const backCanvasRef = useRef<InvitationCanvasHandle>(null);
  const pageCanvasRefs = useRef<Record<string, InvitationCanvasHandle | null>>({});

  // 등록된 청첩장 폰트 @font-face 주입 + 로드 완료 신호 (미리보기 폰트 렌더)
  // 활성 폰트 전체가 아니라 현재 템플릿(전/후면)이 쓰는 폰트만 on-demand 로드.
  const usedFonts = useMemo(
    () =>
      collectFontFamilies(
        [template?.layout, backTemplate?.layout].filter(
          (l): l is InvitationLayout => !!l,
        ),
      ),
    [template, backTemplate],
  );
  const { fontsReady } = useInvitationFonts(usedFonts);

  // 전면 선택 시 짝꿍 기본 후면 자동 로드 (세트). default_back 없으면 단면.
  const latestPickRef = useRef<string | null>(null);
  const pickTemplate = async (t: Template) => {
    latestPickRef.current = t.id;
    setTemplate(t);
    setStep("wizard");
    setBackTemplate(null);
    setBackTemplateId(null);
    if (t.default_back_template_id) {
      const { data: bt } = await (supabase as any)
        .from("invitation_templates")
        .select("id, name, thumbnail_url, format, tone, price_hearts, layout, text_prompt_hint")
        .eq("id", t.default_back_template_id)
        .maybeSingle();
      // 연타 레이스 방지 — 그 사이 다른 템플릿을 골랐으면 무시
      if (bt && latestPickRef.current === t.id) {
        setBackTemplate(bt as Template);
        setBackTemplateId(bt.id);
      }
    }
  };

  // ─────────────────────────────────────────────
  // 하트 잔액
  // ─────────────────────────────────────────────
  // ─────────────────────────────────────────────
  // AuthGuard — 비로그인 진입 차단
  //   AuthContext 가 user 를 fetch 하는 동안 user 가 잠시 null 일 수 있어,
  //   user 값이 변할 때마다 다시 평가. null 상태가 확정되면 /auth 로.
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (user === null) {
      // AuthContext 가 로딩 중이라 진짜 null 인지 모를 수 있음 → 짧게 기다림
      const t = window.setTimeout(() => {
        if (user === null) {
          toast({
            title: "로그인이 필요해요",
            description: "청첩장은 로그인 후 사용 가능해요.",
          });
          navigate("/auth", { replace: true });
        }
      }, 500);
      return () => window.clearTimeout(t);
    }
  }, [user, navigate]);

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

  // ─────────────────────────────────────────────
  // 새 진입 = 처음부터.
  //   React Router 는 같은 경로(/invitation/new)로 다시 이동해도 컴포넌트를
  //   remount 하지 않아, 이전에 만들고 남은 step="result"/invitationId 가 그대로
  //   보였다(결과의 '다른 형식으로 만들기' 등으로 재진입 시). location.key 가
  //   바뀌면(= 새 내비게이션) 위저드 상태를 초기화해 템플릿 선택부터 다시 시작.
  // ─────────────────────────────────────────────
  const prefillTriedRef = useRef(false);
  const autoPickedRef = useRef<string | null>(null);
  const flowKeyRef = useRef(location.key);
  useEffect(() => {
    if (flowKeyRef.current === location.key) return; // 최초 마운트는 그대로
    flowKeyRef.current = location.key;
    setStep("template");
    setTemplate(null);
    setBackTemplate(null);
    setBackTemplateId(null);
    setInvitationId(null);
    setUserData({});
    setPhotos([]);
    setQrPaths({});
    setQrUrls({});
    setImagePaths({});
    setImageUrls({});
    setTextOverrides({});
    setAiText({});
    prefillTriedRef.current = false; // 새 진입에서 prefill 재허용
    autoPickedRef.current = null; // 새 진입에서 template 파라미터 재선택 허용
  }, [location.key]);

  // ─────────────────────────────────────────────
  // 입력정보 자동 불러오기 — 가장 최근 청첩장의 개인정보 필드를 prefill.
  //   매번 다시 입력하는 번거로움 제거. 새 청첩장 진입 시 1회만, 아직 아무것도
  //   입력하지 않았고 편집 중(invitationId)도 아닐 때만 채움.
  //   user_data(JSONB)에서 "정해진 개인 필드"만 가져옴 — 템플릿별 슬롯 텍스트는
  //   다른 디자인에 섞이면 안 되므로 제외. (user_wedding_settings 의 venue_* 컬럼은
  //   DB 미존재 가능성이 있어 사용하지 않음 — 422 회귀 방지)
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!user || prefillTriedRef.current) return;
    if (invitationId) return; // 편집 모드면 건드리지 않음
    if (Object.keys(userData).length > 0) return; // 이미 입력 시작했으면 보존
    prefillTriedRef.current = true;
    (async () => {
      const { data } = await (supabase as any)
        .from("invitations")
        .select("user_data")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const prev = data?.user_data as InvitationUserData | undefined;
      if (!prev) return;
      const PERSONAL_FIELDS = [
        "groom_name",
        "bride_name",
        "groom_parents",
        "bride_parents",
        "wedding_date",
        "wedding_time",
        "venue_name",
        "venue_address",
        "contact_groom",
        "contact_bride",
        "account_groom",
        "account_bride",
      ] as const;
      const prefilled: InvitationUserData = {};
      for (const k of PERSONAL_FIELDS) {
        const v = prev[k];
        if (typeof v === "string" && v.trim() !== "") prefilled[k] = v;
      }
      if (Object.keys(prefilled).length === 0) return;
      // 그 사이 사용자가 입력을 시작했으면 덮어쓰지 않음
      setUserData((cur) =>
        Object.keys(cur).length > 0 ? cur : prefilled,
      );
      toast({
        title: "이전에 입력한 정보를 불러왔어요",
        description: "필요하면 수정해서 쓰세요.",
      });
    })();
  }, [user, invitationId, userData]);

  // ─────────────────────────────────────────────
  // 템플릿 로드 (step=template 일 때)
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (templates.length > 0) return;
    setLoadingTemplates(true);
    (async () => {
      const { data, error } = await (supabase as any)
        .from("invitation_templates")
        .select(
          "id, name, thumbnail_url, format, tone, price_hearts, layout, text_prompt_hint, default_back_template_id",
        )
        .eq("is_active", true)
        .eq("format", formatFilter)
        .in("face", ["front", "both"]) // 전면으로 쓸 수 있는 템플릿만
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
  }, [formatFilter, templates.length]);

  // ─────────────────────────────────────────────
  // 홈피드 카드 등에서 ?template=<id> 로 들어오면 그 템플릿을 자동 선택.
  // ─────────────────────────────────────────────
  useEffect(() => {
    const tid = searchParams.get("template");
    if (!tid || step !== "template" || templates.length === 0) return;
    if (autoPickedRef.current === tid) return;
    const t = templates.find((x) => x.id === tid);
    if (t) {
      autoPickedRef.current = tid;
      void pickTemplate(t);
    }
  }, [searchParams, templates, step]);

  // ─────────────────────────────────────────────
  // 사진 첨부
  // ─────────────────────────────────────────────
  const handleStartPhotoUpload = () => {
    if (!user) {
      toast({ title: "로그인이 필요해요" });
      navigate("/auth");
      return;
    }
    setPendingPhotoSelect(true);
    setConsentOpen(true);
  };

  const handleConsentAgreed = () => {
    setConsentOpen(false);
    if (pendingPhotoSelect) {
      setTimeout(() => fileInputRef.current?.click(), 200);
      setPendingPhotoSelect(false);
    }
  };

  const handleFilesSelected = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length || !user) return;

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: `${file.name} 이 너무 커요 (5MB 초과)` });
        continue;
      }
      if (!file.type.startsWith("image/")) continue;

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
        continue;
      }
      const { data: signed } = await supabase.storage
        .from("invitation-uploads")
        .createSignedUrl(path, 60 * 60 * 24);
      if (signed?.signedUrl) {
        setPhotos((p) => [...p, { path, url: signed.signedUrl }]);
      }
    }
  };

  const removePhoto = (idx: number) => {
    setPhotos((p) => p.filter((_, i) => i !== idx));
  };

  // ─────────────────────────────────────────────
  // QR 이미지 첨부 — QR 슬롯에 직접 올리는 외부 QR(모바일 청첩장 링크 등)
  // ─────────────────────────────────────────────
  const qrFileInputRef = useRef<HTMLInputElement>(null);
  const qrTargetSlotRef = useRef<string | null>(null);
  const onAttachQr = (slotId: string) => {
    if (!user) {
      toast({ title: "로그인이 필요해요" });
      navigate("/auth");
      return;
    }
    qrTargetSlotRef.current = slotId;
    qrFileInputRef.current?.click();
  };
  const handleQrSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    const slotId = qrTargetSlotRef.current;
    if (!file || !user || !slotId) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "QR 이미지가 너무 커요 (5MB 초과)" });
      return;
    }
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${user.id}/qr-${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("invitation-uploads")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) {
      toast({ title: "QR 업로드 실패", description: error.message, variant: "destructive" });
      return;
    }
    const { data: signed } = await supabase.storage
      .from("invitation-uploads")
      .createSignedUrl(path, 60 * 60 * 24);
    setQrPaths((p) => ({ ...p, [slotId]: path }));
    if (signed?.signedUrl)
      setQrUrls((u) => ({ ...u, [slotId]: signed.signedUrl }));
  };
  const removeQr = (slotId: string) => {
    setQrPaths((p) => {
      const next = { ...p };
      delete next[slotId];
      return next;
    });
    setQrUrls((u) => {
      const next = { ...u };
      delete next[slotId];
      return next;
    });
  };

  // ─────────────────────────────────────────────
  // 사진 슬롯 자동 분배 — image_order 그룹 기반
  //   같은 image_order 를 가진 슬롯들은 같은 사진을 공유한다
  //   (원본 슬롯 + 누낀 슬롯이 image_order=1 로 매칭되면 둘 다 첫 사진 사용).
  // ─────────────────────────────────────────────
  const distributePhotos = useCallback(
    (
      tpl: Template,
      uploadedPhotos: { path: string; url: string }[],
    ): { paths: Record<string, string>; urls: Record<string, string> } => {
      const paths: Record<string, string> = {};
      const urls: Record<string, string> = {};

      // map 슬롯(약도)은 사용자 사진이 아니므로 분배 대상에서 제외 — 표시 수와 일치.
      const imageSlots = getInvitationSlots(tpl.layout).filter(
        (s) => s.type === "image",
      );

      // 사진 그룹 목록(순서 유지) → i번째 그룹에 photo[i] 할당.
      //   image_order 가 같은 슬롯은 한 그룹(같은 사진), null 이면 각자 독립 그룹.
      const groups = getPhotoSlotGroups(tpl.layout);
      const groupToPhotoIdx = new Map<string, number>();
      groups.forEach((g, i) => {
        if (i < uploadedPhotos.length) groupToPhotoIdx.set(g, i);
      });

      // 슬롯 별로 자기 그룹의 사진을 매핑.
      imageSlots.forEach((slot) => {
        const photoIdx = groupToPhotoIdx.get(photoGroupKey(slot));
        if (photoIdx !== undefined) {
          const photo = uploadedPhotos[photoIdx];
          paths[slot.id] = photo.path;
          urls[slot.id] = photo.url;
        }
      });

      return { paths, urls };
    },
    [],
  );

  // ─────────────────────────────────────────────
  // 임시저장(자동저장) — 위저드 입력을 2.5초 후 draft 로 저장.
  //   생성 전에 나가도 작업이 보존되고(내 청첩장에 draft 로 보임), 같은 세션은
  //   하나의 draft 를 갱신(invitationId 재사용). 생성 시 이 draft 를 그대로 사용.
  // ─────────────────────────────────────────────
  const [isFlowSaving, setIsFlowSaving] = useState(false);
  const [flowSavedAt, setFlowSavedAt] = useState<Date | null>(null);
  useEffect(() => {
    if (step !== "wizard" || !user || !template) return;
    if (isGenerating || isFlowSaving) return;
    const hasContent =
      Object.keys(userData).length > 0 ||
      photos.length > 0 ||
      Object.keys(qrPaths).length > 0;
    if (!hasContent) return;
    const timer = window.setTimeout(async () => {
      setIsFlowSaving(true);
      try {
        const { paths } = distributePhotos(template, photos);
        const layout = {
          textOverrides,
          imagePaths: { ...paths, ...qrPaths },
        };
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
          if (data?.id) setInvitationId(data.id);
        }
        setFlowSavedAt(new Date());
      } catch {
        // 조용히 실패 — 다음 변경 때 재시도. 생성 버튼은 그대로 동작.
      } finally {
        setIsFlowSaving(false);
      }
    }, 2500);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, userData, photos, qrPaths, textOverrides, aiText, template, backTemplateId]);

  // ─────────────────────────────────────────────
  // 누끼 처리 — auto_cutout 슬롯의 사진을 remove.bg 로 변환
  //   같은 source_path 는 한 번만 호출되어 결과 재사용됨 (Edge function 측 dedup).
  // ─────────────────────────────────────────────
  const applyCutoutToSlots = useCallback(
    async (
      tpl: Template,
      currentPaths: Record<string, string>,
      currentUrls: Record<string, string>,
    ): Promise<{
      paths: Record<string, string>;
      urls: Record<string, string>;
    }> => {
      const cutoutSlots = getInvitationSlots(tpl.layout).filter(
        (s) => s.auto_cutout && (s.type === "image" || s.type === "map"),
      );
      if (cutoutSlots.length === 0) {
        return { paths: currentPaths, urls: currentUrls };
      }

      // 누낄 source path 수집
      const sourcePaths = Array.from(
        new Set(
          cutoutSlots.map((s) => currentPaths[s.id]).filter(Boolean) as string[],
        ),
      );
      if (sourcePaths.length === 0) {
        // 첨부된 사진 없음 — 누끼 안 함
        return { paths: currentPaths, urls: currentUrls };
      }

      const { data, error } = await supabase.functions.invoke(
        "invitation-cutout",
        { body: { source_paths: sourcePaths } },
      );
      if (error) throw error;
      const result = data as {
        cutout_paths?: Record<string, string>;
        cutout_urls?: Record<string, string>;
        error?: string;
      };
      if (result.error) throw new Error(result.error);

      // auto_cutout 슬롯들의 path/url 을 누낀 결과로 덮어쓰기
      // (원본 슬롯들은 그대로 유지)
      const nextPaths = { ...currentPaths };
      const nextUrls = { ...currentUrls };
      cutoutSlots.forEach((slot) => {
        const src = currentPaths[slot.id];
        if (src && result.cutout_paths?.[src]) {
          nextPaths[slot.id] = result.cutout_paths[src];
          if (result.cutout_urls?.[src]) {
            nextUrls[slot.id] = result.cutout_urls[src];
          }
        }
      });
      return { paths: nextPaths, urls: nextUrls };
    },
    [],
  );

  // ─────────────────────────────────────────────
  // 일러스트 변환 — auto_illustration 슬롯의 사진을 gpt-image-2 로 변환
  //   누끼와 동일 구조 (Edge function 측 dedup, 발행 시 일괄 가격 차감).
  // ─────────────────────────────────────────────
  const applyIllustrationToSlots = useCallback(
    async (
      tpl: Template,
      currentPaths: Record<string, string>,
      currentUrls: Record<string, string>,
    ): Promise<{
      paths: Record<string, string>;
      urls: Record<string, string>;
    }> => {
      const illustSlots = getInvitationSlots(tpl.layout).filter(
        (s) => s.auto_illustration && (s.type === "image" || s.type === "map"),
      );
      if (illustSlots.length === 0) {
        return { paths: currentPaths, urls: currentUrls };
      }

      const sourcePaths = Array.from(
        new Set(
          illustSlots.map((s) => currentPaths[s.id]).filter(Boolean) as string[],
        ),
      );
      if (sourcePaths.length === 0) {
        return { paths: currentPaths, urls: currentUrls };
      }

      const { data, error } = await supabase.functions.invoke(
        "invitation-illustration",
        { body: { source_paths: sourcePaths } },
      );
      if (error) throw error;
      const result = data as {
        illustration_paths?: Record<string, string>;
        illustration_urls?: Record<string, string>;
        error?: string;
      };
      if (result.error) throw new Error(result.error);

      const nextPaths = { ...currentPaths };
      const nextUrls = { ...currentUrls };
      illustSlots.forEach((slot) => {
        const src = currentPaths[slot.id];
        if (src && result.illustration_paths?.[src]) {
          nextPaths[slot.id] = result.illustration_paths[src];
          if (result.illustration_urls?.[src]) {
            nextUrls[slot.id] = result.illustration_urls[src];
          }
        }
      });
      return { paths: nextPaths, urls: nextUrls };
    },
    [],
  );

  // ─────────────────────────────────────────────
  // 생성하기 (제출) — wizard → result 전이
  // ─────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!template) {
      toast({
        title: "템플릿이 선택되지 않았어요",
        description: "다시 템플릿을 선택해주세요.",
        variant: "destructive",
      });
      return;
    }
    if (!user) {
      toast({
        title: "로그인이 필요해요",
        description: "세션이 만료됐을 수 있어요. 다시 로그인해주세요.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }
    if (!userData.groom_name?.trim() || !userData.bride_name?.trim()) {
      toast({ title: "신랑·신부 이름을 입력해주세요" });
      return;
    }
    if (!userData.wedding_date?.trim()) {
      toast({ title: "결혼 날짜를 입력해주세요" });
      return;
    }

    // 첫 사용(첫 청첩장) 반값 — 검증·차감 동일 기준
    const { count: priorCount } = await (supabase as any)
      .from("invitations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    const isFirstUse = (priorCount ?? 0) === 0;
    const templateCharge = computeInvitationPrice(template.price_hearts, {
      firstUse: isFirstUse,
    });

    // 발행 총 비용 미리 검증 — 템플릿 가격(첫사용 반값) + AI 인사말 옵션
    const aiSlots = getInvitationSlots(template.layout).filter(
      (s) => s.type === "text" && s.ai_promptable,
    );
    const aiCost = aiAuto ? aiSlots.length : 0;
    const totalCost = templateCharge + aiCost;
    if ((hearts ?? 0) < totalCost) {
      const firstNote =
        isFirstUse && template.price_hearts > 0 ? " (첫 사용 반값)" : "";
      // 입력을 잃지 않도록 페이지를 떠나지 않는다(이전엔 마이페이지로 튕겼음).
      // 충전이 필요하면 사용자가 직접 충전 페이지로 이동.
      toast({
        title: "하트가 부족해요",
        description: `발행에 ${totalCost} 하트가 필요해요 (템플릿 ${templateCharge}${firstNote} + AI ${aiCost}). 현재 ${hearts ?? 0}하트. 충전 후 다시 시도해주세요.`,
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      // 0) wizard 의 자유 텍스트 입력(slot.id 키) 을 textOverrides 로 분리.
      //    invitations.user_data 에 slot.id 가 섞여있으면 분석·통계에 잡음이
      //    되니까 textOverrides 로 옮긴 뒤 user_data 에선 제거.
      const aiSlotIds = new Set(
        getInvitationSlots(template.layout)
          .filter((s) => s.type === "text" && s.ai_promptable)
          .map((s) => s.id),
      );
      const cleanedUserData: InvitationUserData = {};
      const directOverrides: Record<string, string> = { ...textOverrides };
      for (const [k, v] of Object.entries(userData)) {
        if (aiSlotIds.has(k) && typeof v === "string" && v.trim()) {
          directOverrides[k] = v;
        } else if (!aiSlotIds.has(k)) {
          cleanedUserData[k] = v;
        }
      }
      setTextOverrides(directOverrides);

      // 1) 사진 자동 분배
      let paths = distributePhotos(template, photos).paths;
      let urls = distributePhotos(template, photos).urls;

      // 2) 누끼 처리 (auto_cutout 슬롯이 있고 매핑된 사진이 있으면)
      const hasCutoutSlot = getInvitationSlots(template.layout).some((s) => s.auto_cutout);
      if (hasCutoutSlot) {
        const cutoutResult = await applyCutoutToSlots(template, paths, urls);
        paths = cutoutResult.paths;
        urls = cutoutResult.urls;
      }

      // 2.5) 일러스트 변환 (auto_illustration 슬롯이 있고 매핑된 사진이 있으면)
      const hasIllustSlot = getInvitationSlots(template.layout).some(
        (s) => s.auto_illustration,
      );
      if (hasIllustSlot) {
        const illustResult = await applyIllustrationToSlots(template, paths, urls);
        paths = illustResult.paths;
        urls = illustResult.urls;
      }
      // QR 슬롯에 직접 첨부한 이미지를 합쳐 렌더/저장에 반영.
      paths = { ...paths, ...qrPaths };
      urls = { ...urls, ...qrUrls };
      setImagePaths(paths);
      setImageUrls(urls);

      // 3) AI 인사말 (토글 ON 일 때)
      const generatedAi: Record<string, string> = {};
      if (aiAuto && aiSlots.length > 0) {
        for (const slot of aiSlots) {
          try {
            const { data, error } = await supabase.functions.invoke(
              "invitation-text-suggest",
              {
                body: {
                  slot_id: slot.id,
                  slot_role: (slot.role ?? "free") as SlotRole,
                  slot_placeholder: slot.placeholder,
                  tone: template.tone,
                  template_hint: template.text_prompt_hint,
                  user_data: {
                    groom_name: userData.groom_name,
                    bride_name: userData.bride_name,
                    wedding_date: userData.wedding_date,
                    wedding_time: userData.wedding_time,
                    venue_name: userData.venue_name,
                  },
                },
              },
            );
            if (error) throw error;
            const result = data as { suggestions?: string[]; error?: string };
            if (result.error) throw new Error(result.error);
            const first = result.suggestions?.[0];
            if (first) generatedAi[slot.id] = first;
          } catch (e) {
            console.error("AI 추천 실패", slot.id, e);
          }
        }
        setAiText(generatedAi);
      }

      // 4) draft 저장을 먼저 — 하트 차감 후 저장이 실패하면 하트만 날아간다.
      //    환불 earn_hearts 는 service_role 전용이라 클라에서 못 하므로, 순서를
      //    뒤집어 저장 성공 후 차감하고 차감 실패 시 방금 만든 draft 를 삭제한다.
      const payload = {
        user_id: user.id,
        template_id: template.id,
        back_template_id: backTemplateId,
        user_data: cleanedUserData,
        layout: { textOverrides: directOverrides, imagePaths: paths },
        ai_generated_text: generatedAi,
      };
      // 자동저장으로 이미 draft 가 있으면 그걸 갱신, 없으면 새로 만든다.
      let rowId = invitationId;
      let createdNew = false;
      if (rowId) {
        const { error: updErr } = await (supabase as any)
          .from("invitations")
          .update(payload)
          .eq("id", rowId);
        if (updErr) {
          toast({
            title: "청첩장 저장에 실패했어요",
            description: "다시 시도해주세요",
            variant: "destructive",
          });
          setIsGenerating(false);
          return;
        }
      } else {
        const { data: row, error: insertError } = await (supabase as any)
          .from("invitations")
          .insert({ ...payload, status: "draft" as const })
          .select("id")
          .single();
        if (insertError || !row?.id) {
          toast({
            title: "청첩장 저장에 실패했어요",
            description: "다시 시도해주세요",
            variant: "destructive",
          });
          setIsGenerating(false);
          return;
        }
        rowId = row.id;
        createdNew = true;
      }

      // 5) 템플릿 가격 차감 (첫 사용 반값 적용). 실패 시 방금 만든 draft 삭제(보상).
      if (templateCharge > 0) {
        const { data: spendData, error: spendError } = await (supabase as any).rpc(
          "spend_hearts",
          {
            p_user_id: user.id,
            p_amount: templateCharge,
            p_reason: "invitation_publish",
            p_ref_id: rowId,
          },
        );
        const spendRow = Array.isArray(spendData) ? spendData[0] : spendData;
        if (spendError || !spendRow?.success) {
          // 보상 삭제는 방금 새로 만든 경우에만 — 자동저장 draft 는 보존.
          if (createdNew) {
            await (supabase as any).from("invitations").delete().eq("id", rowId);
          }
          toast({
            title: spendError ? "하트 차감 실패" : "하트가 부족해요",
            description: spendError ? spendError.message : (spendRow?.message ?? ""),
            variant: "destructive",
          });
          setIsGenerating(false);
          return;
        }
        await fetchHearts();
      }

      setInvitationId(rowId);
      setStep("result");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "오류";
      toast({
        title: "생성 실패",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // ─────────────────────────────────────────────
  // PDF / 공유 / 세부 조정
  // ─────────────────────────────────────────────
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
            pixelRatioForPrint(360, page.print?.wMm),
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
        description:
          pages.length > 1
            ? `${pages.length}페이지 인쇄용 PDF를 만들었어요.`
            : "130×190mm 비율로 출력됐어요. 인쇄소 사양에 맞춰 크기를 조정해주세요.",
      });
    } catch (e) {
      toast({
        title: "PDF 실패",
        description: e instanceof Error ? e.message : "오류",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = async () => {
    const dataUrl = canvasRef.current?.toDataUrl(2);
    if (!dataUrl) return;
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `invitation.png`, { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "청첩장" });
      } else {
        // fallback — 클립보드에 이미지 복사 또는 URL 공유
        await navigator.clipboard.writeText(window.location.href);
        toast({ title: "현재 페이지 주소를 복사했어요" });
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        toast({ title: "공유 실패", variant: "destructive" });
      }
    }
  };

  const handleSaveExplicit = async () => {
    if (!user || !template) return;
    setIsSaving(true);
    try {
      const payload = {
        user_id: user.id,
        template_id: template.id,
        back_template_id: backTemplateId,
        user_data: userData,
        layout: { textOverrides, imagePaths },
        ai_generated_text: aiText,
        status: "draft" as const,
      };
      if (invitationId) {
        await (supabase as any)
          .from("invitations")
          .update(payload)
          .eq("id", invitationId);
      } else {
        const { data: row } = await (supabase as any)
          .from("invitations")
          .insert(payload)
          .select("id")
          .single();
        if (row?.id) setInvitationId(row.id);
      }
      toast({ title: "저장 완료" });
    } catch (e) {
      toast({
        title: "저장 실패",
        description: e instanceof Error ? e.message : "오류",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenStudio = () => {
    if (invitationId) navigate(`/invitation/${invitationId}/edit`);
    else
      toast({
        title: "저장 후 세부 조정 가능합니다",
        description: "먼저 저장 버튼을 눌러주세요.",
      });
  };

  // ─────────────────────────────────────────────
  // 모바일 공유 발행 — publish_invitation RPC
  // ─────────────────────────────────────────────
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  const handlePublish = async () => {
    if (!invitationId) {
      toast({
        title: "먼저 저장해주세요",
        description: "저장 버튼을 누른 뒤 다시 시도해주세요.",
      });
      return;
    }
    setIsPublishing(true);
    try {
      // 1) 기존 layout 을 읽어 면별 구조를 보존하고, 발행은 익명 viewer 용
      //    long-lived signed URL 만 가산적으로 추가한다.
      //    (Studio 에서 편집한 전/후면 오버라이드·위치·추가요소를 유실하지 않도록)
      const { data: cur } = await (supabase as any)
        .from("invitations")
        .select("layout")
        .eq("id", invitationId)
        .single();
      const faces = readFaceLayout(cur?.layout);
      const signFace = async (f: {
        imagePaths?: Record<string, string>;
      }): Promise<Record<string, string>> => {
        const v: Record<string, string> = {};
        for (const [slotId, path] of Object.entries(f.imagePaths ?? {})) {
          const { data: signed } = await supabase.storage
            .from("invitation-uploads")
            .createSignedUrl(path, 60 * 60 * 24 * 365); // 1년
          if (signed?.signedUrl) v[slotId] = signed.signedUrl;
        }
        return v;
      };

      // 2) invitations layout 에 면별 imageUrlsForViewer 추가 저장 (기존 필드 보존)
      await (supabase as any)
        .from("invitations")
        .update({
          layout: {
            front: { ...faces.front, imageUrlsForViewer: await signFace(faces.front) },
            back: { ...faces.back, imageUrlsForViewer: await signFace(faces.back) },
          },
        })
        .eq("id", invitationId);

      // 3) publish_invitation RPC 호출 (slug 자동 발급)
      const { data, error } = await (supabase as any).rpc(
        "publish_invitation",
        { p_invitation_id: invitationId },
      );
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.share_slug) throw new Error("slug 발급 실패");

      const url = `${window.location.origin}/i/${row.share_slug}`;
      setShareUrl(url);
      toast({ title: "공유 링크 발급 완료" });
    } catch (e) {
      toast({
        title: "발행 실패",
        description: e instanceof Error ? e.message : "오류",
        variant: "destructive",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleShareSlug = async () => {
    if (!shareUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({ url: shareUrl, title: "청첩장" });
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          await navigator.clipboard.writeText(shareUrl);
          toast({ title: "URL 복사됨" });
        }
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: "URL 복사됨" });
    }
  };

  // ─────────────────────────────────────────────
  // 렌더
  // ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto pb-32 relative">
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3 px-4 h-14">
          <button
            onClick={() => {
              if (step === "template") navigate(-1);
              else if (step === "wizard") setStep("template");
              else setStep("wizard");
            }}
            className="p-1"
            aria-label="뒤로"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-base font-bold text-foreground flex-1">
            {step === "template" && "템플릿 선택"}
            {step === "wizard" && "정보 입력"}
            {step === "result" && "완성됐어요"}
          </h1>
          {step === "wizard" && (
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {isFlowSaving
                ? "임시저장 중…"
                : flowSavedAt
                  ? `임시저장됨 ${flowSavedAt.toLocaleTimeString("ko-KR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`
                  : ""}
            </span>
          )}
          {step === "result" && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleSaveExplicit}
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

      {step === "template" && (
        <TemplatePicker
          templates={templates}
          loading={loadingTemplates}
          onPick={pickTemplate}
        />
      )}

      {step === "wizard" && template && (
        <WizardCombined
          template={template}
          userData={userData}
          onUserDataChange={setUserData}
          photos={photos}
          onAddPhoto={handleStartPhotoUpload}
          onRemovePhoto={removePhoto}
          aiAuto={aiAuto}
          onAiAutoChange={setAiAuto}
          hearts={hearts}
          isGenerating={isGenerating}
          onGenerate={handleGenerate}
          qrUrls={qrUrls}
          onAttachQr={onAttachQr}
          onRemoveQr={removeQr}
        />
      )}

      {step === "result" && template && (
        <ResultView
          canvasRef={canvasRef}
          backCanvasRef={backCanvasRef}
          pageCanvasRefs={pageCanvasRefs}
          template={template}
          backTemplate={backTemplate}
          userData={userData}
          textOverrides={textOverrides}
          imageUrls={imageUrls}
          aiText={aiText}
          fontsReady={fontsReady}
          isExporting={isExporting}
          onExportPdf={handleExportPdf}
          onShare={handleShare}
          onOpenStudio={handleOpenStudio}
          shareUrl={shareUrl}
          isPublishing={isPublishing}
          onPublish={handlePublish}
          onShareSlug={handleShareSlug}
          onMakeOther={() =>
            navigate(
              `/invitation/new?format=${template.format === "mobile" ? "paper" : "mobile"}`,
            )
          }
        />
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFilesSelected}
      />
      <input
        ref={qrFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleQrSelected}
      />

      <Dialog open={consentOpen} onOpenChange={setConsentOpen}>
        <DialogContent className="max-w-md p-0 bg-transparent border-0 shadow-none">
          <DialogHeader className="sr-only">
            <DialogTitle>사진 업로드 동의</DialogTitle>
          </DialogHeader>
          <PhotoUploadConsent
            onConsent={handleConsentAgreed}
            onCancel={() => {
              setConsentOpen(false);
              setPendingPhotoSelect(false);
            }}
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

// ════════════════════════════════════════════════════════════════
// 1) Template Picker
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
    <p className="text-[12px] text-muted-foreground mb-4 px-1">
      마음에 드는 디자인을 골라주세요. 무료 디자인부터 시작해보세요.
    </p>
    {loading ? (
      <div className="py-16 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    ) : templates.length === 0 ? (
      <p className="text-center text-sm text-muted-foreground py-16">
        등록된 템플릿이 없어요. 관리자에게 문의해주세요.
      </p>
    ) : (
      <div className="grid grid-cols-2 gap-3">
        {templates.map((t) => {
          const photoSlots = getInvitationSlots(t.layout).filter(
            (s) => s.type === "image" || s.type === "map",
          ).length;
          // image_order 가 같은 것은 같은 사진 → unique 수만 카운트
          const uniquePhotoOrders = new Set(
            getInvitationSlots(t.layout)
              .filter((s) => s.type === "image" || s.type === "map")
              .map((s) => s.image_order ?? 999),
          ).size;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onPick(t)}
              className="bg-card rounded-xl overflow-hidden border border-border text-left active:scale-[0.98] transition-transform"
            >
              <div className="aspect-[3/4] bg-muted relative">
                {t.thumbnail_url ? (
                  <img
                    src={t.thumbnail_url}
                    alt={t.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">
                    미리보기 준비중
                  </div>
                )}
              </div>
              <div className="p-2.5">
                <p className="text-[12px] font-semibold text-foreground truncate">
                  {t.name}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-[10px] font-bold">
                    {t.price_hearts > 0 ? (
                      <span className="text-rose-500">{t.price_hearts}하트</span>
                    ) : (
                      <span className="text-emerald-600">무료</span>
                    )}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {photoSlots === 0
                      ? "사진 없음"
                      : `사진 ${uniquePhotoOrders}장`}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    )}
  </main>
);

// ════════════════════════════════════════════════════════════════
// 2) Wizard Combined — 정보·사진·AI 토글 한 페이지
// ════════════════════════════════════════════════════════════════
const WizardCombined = ({
  template,
  userData,
  onUserDataChange,
  photos,
  onAddPhoto,
  onRemovePhoto,
  aiAuto,
  onAiAutoChange,
  hearts,
  isGenerating,
  onGenerate,
  qrUrls,
  onAttachQr,
  onRemoveQr,
}: {
  template: Template;
  userData: InvitationUserData;
  onUserDataChange: (d: InvitationUserData) => void;
  photos: { path: string; url: string }[];
  onAddPhoto: () => void;
  onRemovePhoto: (i: number) => void;
  aiAuto: boolean;
  onAiAutoChange: (v: boolean) => void;
  hearts: number | null;
  isGenerating: boolean;
  onGenerate: () => void;
  qrUrls: Record<string, string>;
  onAttachQr: (slotId: string) => void;
  onRemoveQr: (slotId: string) => void;
}) => {
  const photoSlotCount = requiredPhotoCount(template.layout);
  const qrSlots = getInvitationSlots(template.layout).filter(
    (s) => s.type === "qr",
  );
  const aiSlotCount = getInvitationSlots(template.layout).filter(
    (s) => s.type === "text" && s.ai_promptable,
  ).length;
  const aiCost = aiSlotCount;

  return (
    <main className="px-5 py-5 space-y-5">
      <section>
        <p className="text-[12px] text-muted-foreground mb-1">선택한 디자인</p>
        <p className="text-sm font-semibold text-foreground">{template.name}</p>
      </section>

      {/* 기본 정보 */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-foreground">기본 정보</h2>
        <div className="grid grid-cols-2 gap-2">
          <Field
            label="신랑 이름"
            value={userData.groom_name ?? ""}
            onChange={(v) =>
              onUserDataChange({ ...userData, groom_name: v })
            }
            placeholder="홍길동"
          />
          <Field
            label="신부 이름"
            value={userData.bride_name ?? ""}
            onChange={(v) =>
              onUserDataChange({ ...userData, bride_name: v })
            }
            placeholder="김영희"
          />
        </div>
        <Field
          label="결혼 날짜"
          type="date"
          value={userData.wedding_date ?? ""}
          onChange={(v) => onUserDataChange({ ...userData, wedding_date: v })}
        />
        <Field
          label="결혼 시간"
          type="time"
          value={userData.wedding_time ?? ""}
          onChange={(v) => onUserDataChange({ ...userData, wedding_time: v })}
        />
        <Field
          label="식장 이름"
          value={userData.venue_name ?? ""}
          onChange={(v) => onUserDataChange({ ...userData, venue_name: v })}
          placeholder="OO웨딩홀"
        />
        <VenueAddressField
          value={userData.venue_address ?? ""}
          onChange={(v) =>
            onUserDataChange({ ...userData, venue_address: v })
          }
        />
        <Field
          label="신랑 부모님 (선택)"
          value={userData.groom_parents ?? ""}
          onChange={(v) =>
            onUserDataChange({ ...userData, groom_parents: v })
          }
          placeholder="홍OO · 박OO의 아들"
        />
        <Field
          label="신부 부모님 (선택)"
          value={userData.bride_parents ?? ""}
          onChange={(v) =>
            onUserDataChange({ ...userData, bride_parents: v })
          }
          placeholder="김OO · 이OO의 딸"
        />
      </section>

      {/* 사진 첨부 — 슬롯 0개면 안내만 */}
      {photoSlotCount === 0 && (
        <section className="p-3 bg-blue-50 rounded-lg text-[12px] text-blue-900 leading-relaxed">
          이 디자인은 텍스트·캘린더 중심이라 사진 없이 진행돼요.
          사진 들어간 디자인을 원하시면 뒤로 가서 다른 템플릿을 선택해주세요.
        </section>
      )}

      {photoSlotCount > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-foreground">
            사진 첨부{" "}
            <span className="text-[11px] text-muted-foreground font-normal">
              ({photos.length} / {photoSlotCount} 슬롯)
            </span>
          </h2>
          <p className="text-[11px] text-muted-foreground">
            첨부한 순서대로 디자인에 자동 배치돼요. 디자인에 사진 슬롯이{" "}
            {photoSlotCount}개 있어요.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p, i) => (
              <div
                key={p.path}
                className="aspect-square bg-muted rounded-lg overflow-hidden relative"
              >
                <img
                  src={p.url}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => onRemovePhoto(i)}
                  className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center"
                  aria-label="제거"
                >
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
                <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">
                  {i + 1}
                </span>
              </div>
            ))}
            {photos.length < photoSlotCount && (
              <button
                type="button"
                onClick={onAddPhoto}
                className="aspect-square rounded-lg border-2 border-dashed border-border bg-muted/30 flex flex-col items-center justify-center gap-1 active:scale-[0.98]"
              >
                <Upload className="w-5 h-5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">
                  사진 추가
                </span>
              </button>
            )}
          </div>
        </section>
      )}

      {/* QR 이미지 첨부 — 종이 청첩장의 모바일 청첩장 링크 QR 등 */}
      {qrSlots.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-foreground">QR 이미지</h2>
          <p className="text-[11px] text-muted-foreground">
            모바일 청첩장 링크 등 QR 이미지를 첨부하세요. 안 올리면 QR 자리는
            표시되지 않아요.
          </p>
          <div className="flex flex-wrap gap-2">
            {qrSlots.map((slot) => {
              const url = qrUrls[slot.id];
              return (
                <div key={slot.id} className="relative">
                  {url ? (
                    <div className="w-24 h-24 rounded-lg overflow-hidden border border-border bg-white">
                      <img src={url} alt="QR" className="w-full h-full object-contain" />
                      <button
                        type="button"
                        onClick={() => onRemoveQr(slot.id)}
                        className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center"
                        aria-label="QR 제거"
                      >
                        <X className="w-3.5 h-3.5 text-white" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onAttachQr(slot.id)}
                      className="w-24 h-24 rounded-lg border-2 border-dashed border-border bg-muted/30 flex flex-col items-center justify-center gap-1 active:scale-[0.98]"
                    >
                      <Upload className="w-5 h-5 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">
                        QR 첨부
                      </span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* AI 인사말 토글 */}
      {aiSlotCount > 0 && (
        <section className="p-4 bg-card rounded-2xl border border-border space-y-3">
          <div className="flex items-start gap-3">
            <Checkbox
              id="ai_auto"
              checked={aiAuto}
              onCheckedChange={(c) => onAiAutoChange(!!c)}
              className="mt-0.5"
            />
            <div className="flex-1">
              <Label
                htmlFor="ai_auto"
                className="text-sm font-semibold cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                AI 인사말 자동 추천
              </Label>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                선택한 디자인 톤과 입력 정보에 맞춰 AI가 인사말을 자동으로
                채워줘요. 결과 화면에서 직접 수정도 가능해요.
              </p>
              <div className="mt-2 flex items-center gap-1 text-[11px]">
                <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
                <span className="font-bold text-foreground">{aiCost}</span>
                <span className="text-muted-foreground">하트 차감 (옵션)</span>
              </div>
            </div>
          </div>

          {/* AI OFF 일 때 인사말 직접 입력 UI */}
          {!aiAuto && (
            <div className="space-y-2 pt-2 border-t border-border">
              <p className="text-[11px] text-muted-foreground">
                AI 추천을 끄셨어요. 인사말을 직접 입력하시려면 ↓
              </p>
              {getInvitationSlots(template.layout)
                .filter((s) => s.type === "text" && s.ai_promptable)
                .map((slot) => (
                  <div key={slot.id}>
                    <Label className="text-[12px] text-muted-foreground">
                      {slot.role
                        ? slot.role === "intro"
                          ? "인사말"
                          : slot.role === "greeting"
                            ? "인사"
                            : slot.role === "love_message"
                              ? "사랑의 약속"
                              : "자유 문구"
                        : "자유 문구"}
                    </Label>
                    <Textarea
                      value={userData[slot.id] ?? ""}
                      onChange={(e) =>
                        onUserDataChange({
                          ...userData,
                          [slot.id]: e.target.value,
                        })
                      }
                      placeholder={slot.placeholder ?? "직접 입력하세요"}
                      rows={3}
                      className="mt-1 text-sm"
                    />
                  </div>
                ))}
            </div>
          )}
        </section>
      )}

      {/* 가격 안내 */}
      {(() => {
        const hasCutout = getInvitationSlots(template.layout).some((s) => s.auto_cutout);
        const hasIllust = getInvitationSlots(template.layout).some((s) => s.auto_illustration);
        const total = template.price_hearts + (aiAuto ? aiSlotCount : 0);
        if (template.price_hearts === 0 && total === 0) {
          return (
            <section className="p-3 bg-emerald-50 rounded-lg flex items-center justify-between">
              <span className="text-[13px] font-bold text-emerald-900">
                무료 발행
              </span>
              <span className="text-[11px] text-emerald-700">
                잔액 {hearts ?? 0} 하트
              </span>
            </section>
          );
        }
        return (
          <section className="p-3 bg-pink-50 rounded-lg border border-pink-100 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold text-foreground">
                발행 시 차감
              </span>
              <div className="flex items-center gap-1 text-[14px]">
                <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                <span className="font-bold text-foreground">{total}</span>
                <span className="text-muted-foreground text-[12px]">하트</span>
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground space-y-0.5">
              {template.price_hearts > 0 && (
                <p>
                  · 템플릿 발행 {template.price_hearts}하트
                  {hasCutout && hasIllust
                    ? " (누끼·일러스트 효과 포함)"
                    : hasCutout
                      ? " (누끼 효과 포함)"
                      : hasIllust
                        ? " (일러스트 효과 포함)"
                        : ""}
                </p>
              )}
              {aiAuto && aiSlotCount > 0 && (
                <p>· AI 인사말 {aiSlotCount}하트 (토글로 끌 수 있음)</p>
              )}
              <p>잔액 {hearts ?? 0} 하트</p>
            </div>
          </section>
        );
      })()}

      {/* 생성 버튼 */}
      <Button
        onClick={onGenerate}
        disabled={isGenerating}
        className="w-full h-12 text-[15px] font-bold"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            만드는 중...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5 mr-2" />
            청첩장 만들기
          </>
        )}
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

// 식장 주소 — 네이버 주소 검색(NCP Geocoding)으로 정확한 주소를 채운다.
interface AddrResult {
  roadAddress: string;
  jibunAddress: string;
  lng: string;
  lat: string;
}
const VenueAddressField = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) => {
  const [results, setResults] = useState<AddrResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = async () => {
    const q = value.trim();
    if (q.length < 2) {
      toast({ title: "식장명이나 주소를 2자 이상 입력해주세요" });
      return;
    }
    setSearching(true);
    try {
      const { data, error } = await (supabase as any).functions.invoke(
        "invitation-address-search",
        { body: { query: q } },
      );
      if (error || data?.error) {
        throw new Error(data?.error ?? error?.message ?? "검색 실패");
      }
      setResults(data?.results ?? []);
      setSearched(true);
    } catch (e) {
      toast({
        title: "주소 검색 실패",
        description: e instanceof Error ? e.message : "오류",
        variant: "destructive",
      });
    } finally {
      setSearching(false);
    }
  };

  return (
    <div>
      <Label className="text-[12px] text-muted-foreground">식장 주소</Label>
      <div className="mt-1 flex gap-2">
        <Input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setSearched(false);
          }}
          placeholder="식장명 또는 주소 입력 후 검색"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              search();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          onClick={search}
          disabled={searching}
          className="shrink-0"
        >
          {searching ? "검색…" : "주소 검색"}
        </Button>
      </div>
      {searched && results.length > 0 && (
        <ul className="mt-2 rounded-lg border border-border divide-y divide-border overflow-hidden">
          {results.map((r, i) => (
            <li key={i}>
              <button
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-muted/50"
                onClick={() => {
                  onChange(r.roadAddress || r.jibunAddress);
                  setSearched(false);
                }}
              >
                <span className="text-[13px] text-foreground">
                  {r.roadAddress || r.jibunAddress}
                </span>
                {r.jibunAddress && r.roadAddress && (
                  <span className="block text-[11px] text-muted-foreground">
                    {r.jibunAddress}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      {searched && results.length === 0 && (
        <p className="mt-2 text-[12px] text-muted-foreground">
          검색 결과가 없어요. 직접 입력해도 돼요.
        </p>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// 3) Result — 큰 미리보기 + 액션
// ════════════════════════════════════════════════════════════════
const ResultView = ({
  canvasRef,
  backCanvasRef,
  pageCanvasRefs,
  template,
  backTemplate,
  userData,
  textOverrides,
  imageUrls,
  aiText,
  fontsReady,
  isExporting,
  onExportPdf,
  onShare,
  onOpenStudio,
  shareUrl,
  isPublishing,
  onPublish,
  onShareSlug,
  onMakeOther,
}: {
  canvasRef: React.MutableRefObject<InvitationCanvasHandle | null>;
  backCanvasRef: React.MutableRefObject<InvitationCanvasHandle | null>;
  pageCanvasRefs: React.MutableRefObject<Record<string, InvitationCanvasHandle | null>>;
  template: Template;
  backTemplate: Template | null;
  userData: InvitationUserData;
  textOverrides: Record<string, string>;
  imageUrls: Record<string, string>;
  aiText: Record<string, string>;
  fontsReady: boolean;
  isExporting: boolean;
  onExportPdf: () => void;
  onShare: () => void;
  onOpenStudio: () => void;
  shareUrl: string | null;
  isPublishing: boolean;
  onPublish: () => void;
  onShareSlug: () => void;
  onMakeOther: () => void;
}) => {
  const isMobile = template.format === "mobile";
  const seamlessRoll = isSeamlessRoll(template.layout);
  // 공유 코드 스타일 — 카드와 캔버스 QR 슬롯이 같은 값을 공유(스타일 통일).
  const [shareCodeStyle, setShareCodeStyle] = useState<ShareCodeStyle>("basic");
  const renderTemplatePages = (
    targetTemplate: Template,
    scope: "front" | "back",
    fallbackRef: React.MutableRefObject<InvitationCanvasHandle | null>,
    overrides: Record<string, string>,
    urls: Record<string, string>,
  ) => {
    const pages = getInvitationPages(targetTemplate.layout);
    const seamless = isSeamlessRoll(targetTemplate.layout);
    return pages.map((page, index) => (
      <div
        key={`${scope}:${page.id}`}
        className={`flex flex-col items-center ${seamless ? "gap-0" : "gap-2"}`}
      >
        {!seamless && (pages.length > 1 || backTemplate) && (
          <span className="text-[11px] font-bold text-muted-foreground mt-3">
            {page.label ?? `${index + 1}P`}
          </span>
        )}
        <InvitationCanvas
          ref={(node) => {
            pageCanvasRefs.current[`${scope}:${page.id}`] = node;
            if (index === 0) fallbackRef.current = node;
          }}
          layout={pageToLayout(page)}
          userData={userData}
          aiText={aiText}
          textOverrides={overrides}
          imageUrls={urls}
          fontsReady={fontsReady}
          selectedSlotId={null}
          onSelectSlot={() => {}}
          displayWidth={360}
          shareUrl={shareUrl ?? undefined}
          qrStyle={shareCodeStyle}
        />
      </div>
    ));
  };

  return (
    <main className="px-4 py-5 space-y-4">
      <div
        className={`flex flex-col items-center bg-muted/30 rounded-2xl ${
          seamlessRoll ? "py-0 gap-0 overflow-hidden" : "py-5 gap-2"
        }`}
      >
        {renderTemplatePages(template, "front", canvasRef, textOverrides, imageUrls)}
        {/* 후면 (세트 기본 후면) */}
        {backTemplate &&
          renderTemplatePages(backTemplate, "back", backCanvasRef, {}, {})}
      </div>

      {isMobile ? (
        // 모바일 청첩장 — 공유 발행 메인 액션
        <>
          {shareUrl ? (
            <section className="space-y-2">
              <div className="p-3 bg-emerald-50 rounded-lg">
                <p className="text-[11px] text-emerald-700 mb-1">
                  공유 링크가 발급됐어요
                </p>
                <p className="text-[12px] font-mono text-emerald-900 break-all">
                  {shareUrl}
                </p>
              </div>
              <Button onClick={onShareSlug} className="w-full h-12">
                <Share2 className="w-4 h-4 mr-2" />
                카카오·인스타·문자로 공유
              </Button>
              <ShareCodeCard
                url={shareUrl}
                style={shareCodeStyle}
                onStyleChange={setShareCodeStyle}
              />
            </section>
          ) : (
            <Button
              onClick={onPublish}
              disabled={isPublishing}
              className="w-full h-12 text-[15px] font-bold"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  공유 링크 만드는 중...
                </>
              ) : (
                <>
                  <Share2 className="w-5 h-5 mr-2" />
                  공유 링크 발급하기
                </>
              )}
            </Button>
          )}
        </>
      ) : (
        // 종이 청첩장 — PDF 다운로드 메인 액션 + 온라인 공유 코드(선택)
        <>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={onExportPdf} disabled={isExporting} className="h-12">
              {isExporting ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-1" />
              )}
              PDF
            </Button>
            <Button variant="outline" onClick={onShare} className="h-12">
              <Share2 className="w-4 h-4 mr-1" />
              이미지 공유
            </Button>
          </div>

          {shareUrl ? (
            <ShareCodeCard
              url={shareUrl}
              style={shareCodeStyle}
              onStyleChange={setShareCodeStyle}
            />
          ) : (
            <Button
              variant="outline"
              onClick={onPublish}
              disabled={isPublishing}
              className="w-full h-11"
            >
              {isPublishing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Share2 className="w-4 h-4 mr-2" />
              )}
              온라인 공유 링크·QR 발급 (종이에 인쇄용)
            </Button>
          )}
        </>
      )}

      <button
        type="button"
        onClick={onOpenStudio}
        className="w-full flex items-center justify-center gap-2 text-[13px] text-muted-foreground py-3 underline"
      >
        <Pencil className="w-3.5 h-3.5" />
        텍스트·사진 위치 직접 편집
      </button>

      {/* 크로스셀 — 다른 형식으로도 만들기 */}
      <button
        type="button"
        onClick={onMakeOther}
        className="w-full flex items-center justify-center gap-2 h-12 rounded-xl border border-dashed border-border text-[13px] font-semibold text-foreground active:scale-[0.99] transition-transform"
      >
        {isMobile ? (
          <>
            <Printer className="w-4 h-4" />
            종이 청첩장도 만들기
          </>
        ) : (
          <>
            <Smartphone className="w-4 h-4" />
            모바일 청첩장도 만들기
          </>
        )}
      </button>
    </main>
  );
};

export default InvitationFlow;
