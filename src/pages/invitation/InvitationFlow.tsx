import { useState, useEffect, useRef, useCallback } from "react";
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
import { exportInvitationPdf } from "@/lib/invitation/exportPdf";
import type {
  InvitationLayout,
  InvitationUserData,
  SlotRole,
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<InvitationCanvasHandle>(null);

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
  // 템플릿 로드 (step=template 일 때)
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (templates.length > 0) return;
    setLoadingTemplates(true);
    (async () => {
      const { data, error } = await (supabase as any)
        .from("invitation_templates")
        .select(
          "id, name, thumbnail_url, format, tone, price_hearts, layout, text_prompt_hint",
        )
        .eq("is_active", true)
        .eq("format", formatFilter)
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

      const imageSlots = tpl.layout.slots.filter(
        (s) => s.type === "image" || s.type === "map",
      );

      // 1) image_order 의 unique 한 값을 오름차순 정렬
      const uniqueOrders = Array.from(
        new Set(imageSlots.map((s) => s.image_order ?? 999)),
      ).sort((a, b) => a - b);

      // 2) 각 order 에 photo[i] 할당
      const orderToPhotoIdx = new Map<number, number>();
      uniqueOrders.forEach((order, i) => {
        if (i < uploadedPhotos.length) {
          orderToPhotoIdx.set(order, i);
        }
      });

      // 3) 슬롯 별로 매핑 (같은 order 슬롯은 같은 사진)
      imageSlots.forEach((slot) => {
        const order = slot.image_order ?? 999;
        const photoIdx = orderToPhotoIdx.get(order);
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
      const cutoutSlots = tpl.layout.slots.filter(
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

    // 발행 총 비용 미리 검증 — 템플릿 가격 + AI 인사말 옵션
    const aiSlots = template.layout.slots.filter(
      (s) => s.type === "text" && s.ai_promptable,
    );
    const aiCost = aiAuto ? aiSlots.length : 0;
    const totalCost = template.price_hearts + aiCost;
    if ((hearts ?? 0) < totalCost) {
      toast({
        title: "하트가 부족해요",
        description: `발행에 ${totalCost} 하트가 필요해요 (템플릿 ${template.price_hearts} + AI ${aiCost}). 현재 ${hearts ?? 0}하트.`,
        variant: "destructive",
      });
      navigate("/points");
      return;
    }

    setIsGenerating(true);
    try {
      // 0) wizard 의 자유 텍스트 입력(slot.id 키) 을 textOverrides 로 분리.
      //    invitations.user_data 에 slot.id 가 섞여있으면 분석·통계에 잡음이
      //    되니까 textOverrides 로 옮긴 뒤 user_data 에선 제거.
      const aiSlotIds = new Set(
        template.layout.slots
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
      const hasCutoutSlot = template.layout.slots.some((s) => s.auto_cutout);
      if (hasCutoutSlot) {
        const cutoutResult = await applyCutoutToSlots(template, paths, urls);
        paths = cutoutResult.paths;
        urls = cutoutResult.urls;
      }
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

      // 4) 템플릿 가격 차감 (price_hearts > 0 시)
      let publishOk = true;
      if (template.price_hearts > 0) {
        const { data: spendData, error: spendError } = await (supabase as any).rpc(
          "spend_hearts",
          {
            p_user_id: user.id,
            p_amount: template.price_hearts,
            p_reason: "invitation_publish",
            p_ref_id: null,
          },
        );
        if (spendError) {
          publishOk = false;
          toast({
            title: "하트 차감 실패",
            description: spendError.message,
            variant: "destructive",
          });
        } else {
          const row = Array.isArray(spendData) ? spendData[0] : spendData;
          if (!row?.success) {
            publishOk = false;
            toast({
              title: "하트가 부족해요",
              description: row?.message ?? "",
              variant: "destructive",
            });
          }
        }
      }
      if (!publishOk) {
        setIsGenerating(false);
        return;
      }

      await fetchHearts();
      setStep("result");

      // 5) draft 자동 저장
      const payload = {
        user_id: user.id,
        template_id: template.id,
        user_data: cleanedUserData,
        layout: { textOverrides: directOverrides, imagePaths: paths },
        ai_generated_text: generatedAi,
        status: "draft" as const,
      };
      const { data: row } = await (supabase as any)
        .from("invitations")
        .insert(payload)
        .select("id")
        .single();
      if (row?.id) setInvitationId(row.id);
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
      const dataUrl = canvasRef.current?.toDataUrl(3);
      if (!dataUrl) throw new Error("캔버스 추출 실패");
      const filename = `dewy-invitation-${invitationId ?? "draft"}.pdf`;
      exportInvitationPdf(
        dataUrl,
        template.layout.canvas.w,
        template.layout.canvas.h,
        filename,
      );
      toast({
        title: "PDF 다운로드 시작",
        description:
          "130×190mm 비율로 출력됐어요. 인쇄소 사양에 맞춰 크기를 조정해주세요.",
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
      // 1) 사진 슬롯의 long-lived signed URL 을 layout 에 저장
      //    (익명 viewer 가 storage 권한 없이 사진 볼 수 있게)
      const imageUrlsForViewer: Record<string, string> = {};
      for (const [slotId, path] of Object.entries(imagePaths)) {
        const { data: signed } = await supabase.storage
          .from("invitation-uploads")
          .createSignedUrl(path, 60 * 60 * 24 * 365); // 1년
        if (signed?.signedUrl) {
          imageUrlsForViewer[slotId] = signed.signedUrl;
        }
      }
      // 누낀 사진들도 동일 처리는 imagePaths 안에 포함되어 있음 (cutouts/ prefix)

      // 2) invitations layout 에 imageUrlsForViewer 추가 저장
      await (supabase as any)
        .from("invitations")
        .update({
          layout: { textOverrides, imagePaths, imageUrlsForViewer },
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
          onPick={(t) => {
            setTemplate(t);
            setStep("wizard");
          }}
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
        />
      )}

      {step === "result" && template && (
        <ResultView
          canvasRef={canvasRef}
          template={template}
          userData={userData}
          textOverrides={textOverrides}
          imageUrls={imageUrls}
          aiText={aiText}
          isExporting={isExporting}
          onExportPdf={handleExportPdf}
          onShare={handleShare}
          onOpenStudio={handleOpenStudio}
          shareUrl={shareUrl}
          isPublishing={isPublishing}
          onPublish={handlePublish}
          onShareSlug={handleShareSlug}
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
          const photoSlots = t.layout.slots.filter(
            (s) => s.type === "image" || s.type === "map",
          ).length;
          // image_order 가 같은 것은 같은 사진 → unique 수만 카운트
          const uniquePhotoOrders = new Set(
            t.layout.slots
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
}) => {
  const photoSlotCount = template.layout.slots.filter(
    (s) => s.type === "image" || s.type === "map",
  ).length;
  const aiSlotCount = template.layout.slots.filter(
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
        <Field
          label="식장 주소"
          value={userData.venue_address ?? ""}
          onChange={(v) =>
            onUserDataChange({ ...userData, venue_address: v })
          }
          placeholder="서울시 OO구 ..."
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
              {template.layout.slots
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
        const hasCutout = template.layout.slots.some((s) => s.auto_cutout);
        const total = template.price_hearts + (aiAuto ? aiSlotCount : 0);
        if (template.price_hearts === 0 && total === 0) {
          return (
            <section className="p-3 bg-emerald-50 rounded-lg flex items-center justify-between">
              <span className="text-[13px] font-bold text-emerald-900">
                🎉 무료 발행
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
                  {hasCutout && " (누끼 효과 포함)"}
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

// ════════════════════════════════════════════════════════════════
// 3) Result — 큰 미리보기 + 액션
// ════════════════════════════════════════════════════════════════
const ResultView = ({
  canvasRef,
  template,
  userData,
  textOverrides,
  imageUrls,
  aiText,
  isExporting,
  onExportPdf,
  onShare,
  onOpenStudio,
  shareUrl,
  isPublishing,
  onPublish,
  onShareSlug,
}: {
  canvasRef: React.RefObject<InvitationCanvasHandle>;
  template: Template;
  userData: InvitationUserData;
  textOverrides: Record<string, string>;
  imageUrls: Record<string, string>;
  aiText: Record<string, string>;
  isExporting: boolean;
  onExportPdf: () => void;
  onShare: () => void;
  onOpenStudio: () => void;
  shareUrl: string | null;
  isPublishing: boolean;
  onPublish: () => void;
  onShareSlug: () => void;
}) => {
  const isMobile = template.format === "mobile";

  return (
    <main className="px-4 py-5 space-y-4">
      <div className="flex justify-center bg-muted/30 rounded-2xl py-5">
        <InvitationCanvas
          ref={canvasRef}
          layout={template.layout}
          userData={userData}
          aiText={aiText}
          textOverrides={textOverrides}
          imageUrls={imageUrls}
          selectedSlotId={null}
          onSelectSlot={() => {}}
          displayWidth={360}
          shareUrl={shareUrl ?? undefined}
        />
      </div>

      {isMobile ? (
        // 모바일 청첩장 — 공유 발행 메인 액션
        <>
          {shareUrl ? (
            <section className="space-y-2">
              <div className="p-3 bg-emerald-50 rounded-lg">
                <p className="text-[11px] text-emerald-700 mb-1">
                  ✅ 공유 링크가 발급됐어요
                </p>
                <p className="text-[12px] font-mono text-emerald-900 break-all">
                  {shareUrl}
                </p>
              </div>
              <Button onClick={onShareSlug} className="w-full h-12">
                <Share2 className="w-4 h-4 mr-2" />
                카카오·인스타·문자로 공유
              </Button>
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
        // 종이 청첩장 — PDF 다운로드 메인 액션
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
      )}

      <button
        type="button"
        onClick={onOpenStudio}
        className="w-full flex items-center justify-center gap-2 text-[13px] text-muted-foreground py-3 underline"
      >
        <Pencil className="w-3.5 h-3.5" />
        텍스트·사진 위치 직접 편집
      </button>
    </main>
  );
};

export default InvitationFlow;
