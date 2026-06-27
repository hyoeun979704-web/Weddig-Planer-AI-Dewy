import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  type CSSProperties,
} from "react";
import {
  Plus,
  Loader2,
  Trash2,
  Eye,
  EyeOff,
  Pencil,
  Copy,
  FileJson,
  Images,
  Rows3,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AdminGuard from "@/features/console/components/AdminGuard";
import AdminLayout from "@/features/console/components/AdminLayout";
import ImageUploader from "@/components/ImageUploader";
import InvitationCanvas from "@/components/invitation/InvitationCanvas";
import { useInvitationFonts } from "@/hooks/useInvitationFonts";
import AdminTemplateEditor, {
  type EditorTemplate,
} from "./AdminTemplateEditor";
import {
  fetchTemplatesAndFonts,
  saveTemplate,
  setTemplateActive,
  deleteTemplate,
  uploadTemplateBlob,
  type Font,
  type Template,
} from "@/features/console/data/invitationTemplates";
import { toast } from "@/hooks/use-toast";
import {
  createMobileRollLayout,
  createPaperPagesLayout,
  getInvitationPages,
  isSeamlessRoll,
  MOBILE_ROLL_FRAME_HEIGHT,
  MOBILE_ROLL_MAX_FRAMES,
  MOBILE_ROLL_MAX_HEIGHT,
  MOBILE_ROLL_WIDTH,
  PAPER_MAX_PAGES,
  pageToLayout,
  type PaperPageInput,
  validateMobileRollLayout,
} from "@/lib/invitation/layout";
import type { InvitationLayout } from "@/lib/invitation/types";

// Font·Template 타입은 features/console/data/invitationTemplates 에서 import(Task #3).

type Form = Omit<Template, "id" | "created_at">;

const emptyForm: Form = {
  slug: "",
  name: "",
  thumbnail_url: "",
  preview_url: null,
  format: "mobile",
  tone: "ROMANTIC",
  price_hearts: 0,
  layout: {},
  default_font_id: null,
  text_prompt_hint: null,
  display_order: 0,
  is_active: true,
};

const FORMAT_OPTIONS = [
  { value: "mobile", label: "모바일", priceGuide: "0 (무료) / 10 (누끼·복합) / 20 (일러스트)" },
  { value: "paper", label: "종이", priceGuide: "0 (무료) / 5 (누끼·복합) / 15 (일러스트)" },
];

const TONE_OPTIONS = [
  { value: "ROMANTIC", label: "로맨틱" },
  { value: "MODERN", label: "모던" },
  { value: "CLASSIC", label: "클래식" },
  { value: "MINIMAL", label: "미니멀" },
  { value: "CUTE", label: "큐트" },
  { value: "LUXURY", label: "럭셔리" },
];

type UploadedRollFrame = {
  backgroundUrl: string;
  h: number;
};

const readLayoutJson = (json: string): InvitationLayout | null => {
  try {
    return JSON.parse(json || "{}") as InvitationLayout;
  } catch {
    return null;
  }
};

const attachMobileRollBackgrounds = (
  json: string,
  frames: UploadedRollFrame[],
): InvitationLayout => {
  const fallback = createMobileRollLayout(frames);
  const current = readLayoutJson(json);
  const source =
    current &&
    isSeamlessRoll(current) &&
    current.pages?.length === frames.length &&
    current.pages.every((page) => page.canvas && Array.isArray(page.slots))
      ? current
      : fallback;
  const pages = (source.pages ?? []).map((page, index) => ({
    ...page,
    canvas: {
      ...page.canvas,
      w: MOBILE_ROLL_WIDTH,
      h: frames[index].h,
      background_url: frames[index].backgroundUrl,
    },
  }));
  return {
    ...source,
    product_kind: "mobile_roll",
    presentation: "seamless_roll",
    canvas: {
      ...source.canvas,
      w: MOBILE_ROLL_WIDTH,
      h: pages.reduce((total, page) => total + page.canvas.h, 0),
      bg: source.canvas.bg ?? "#FFFFFF",
      background_url: frames[0]?.backgroundUrl,
    },
    slots: source.slots ?? [],
    pages,
  };
};

const preserveMobileRollBackgrounds = (
  json: string,
  nextLayout: InvitationLayout,
): InvitationLayout => {
  const current = readLayoutJson(json);
  if (
    !current ||
    !isSeamlessRoll(current) ||
    !isSeamlessRoll(nextLayout) ||
    current.pages?.length !== nextLayout.pages?.length
  ) {
    return nextLayout;
  }
  const pages = (nextLayout.pages ?? []).map((page, index) => {
    const backgroundUrl =
      page.canvas.background_url || current.pages?.[index]?.canvas.background_url;
    return {
      ...page,
      canvas: {
        ...page.canvas,
        ...(backgroundUrl ? { background_url: backgroundUrl } : {}),
      },
    };
  });
  return {
    ...nextLayout,
    canvas: {
      ...nextLayout.canvas,
      ...(pages[0]?.canvas.background_url
        ? { background_url: pages[0].canvas.background_url }
        : {}),
    },
    pages,
  };
};

type UploadedPaperPage = { w: number; h: number; backgroundUrl: string };

// 종이 페이지 이미지 일괄 등록 — 이미 같은 개수의 페이지가 있으면 slots 를 보존한 채
// 배경/크기만 갱신, 아니면 새 종이 레이아웃 생성.
const attachPaperPageBackgrounds = (
  json: string,
  pages: UploadedPaperPage[],
): InvitationLayout => {
  const fallback = createPaperPagesLayout(pages as PaperPageInput[]);
  const current = readLayoutJson(json);
  const reusable =
    current &&
    !isSeamlessRoll(current) &&
    Array.isArray(current.pages) &&
    current.pages.length === pages.length &&
    current.pages.every((page) => page.canvas && Array.isArray(page.slots));
  if (!current || !reusable) return fallback;
  const nextPages = (current.pages ?? []).map((page, index) => ({
    ...page,
    canvas: {
      ...page.canvas,
      w: pages[index].w,
      h: pages[index].h,
      background_url: pages[index].backgroundUrl,
    },
  }));
  return {
    ...current,
    canvas: { ...current.canvas, ...nextPages[0].canvas },
    pages: nextPages,
  };
};

const canvasToPngBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (value) =>
        value ? resolve(value) : reject(new Error("이미지 변환에 실패했어요.")),
      "image/png",
    ),
  );

const normalizeMobileRollFrame = async (file: File) => {
  const bitmap = await createImageBitmap(file);
  try {
    if (
      bitmap.width === MOBILE_ROLL_WIDTH &&
      bitmap.height === MOBILE_ROLL_FRAME_HEIGHT
    ) {
      return { blob: file as Blob, normalized: false };
    }
    const canvas = document.createElement("canvas");
    canvas.width = MOBILE_ROLL_WIDTH;
    canvas.height = MOBILE_ROLL_FRAME_HEIGHT;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("이미지 변환을 시작하지 못했어요.");

    const scale = Math.min(
      MOBILE_ROLL_WIDTH / bitmap.width,
      MOBILE_ROLL_FRAME_HEIGHT / bitmap.height,
    );
    const width = bitmap.width * scale;
    const height = bitmap.height * scale;
    context.fillStyle = "#FFFFFF";
    context.fillRect(0, 0, MOBILE_ROLL_WIDTH, MOBILE_ROLL_FRAME_HEIGHT);
    context.drawImage(
      bitmap,
      (MOBILE_ROLL_WIDTH - width) / 2,
      (MOBILE_ROLL_FRAME_HEIGHT - height) / 2,
      width,
      height,
    );
    return { blob: await canvasToPngBlob(canvas), normalized: true };
  } finally {
    bitmap.close();
  }
};

// 편집기 "새로 만들기" 시작 레이아웃 (종이 카드 1페이지 + 사진/이름 슬롯)
const STARTER_LAYOUT: InvitationLayout = {
  product_kind: "card",
  presentation: "paged",
  canvas: { w: 1491, h: 1055, bg: "#666666" },
  slots: [],
  pages: [
    {
      id: "page-01",
      label: "1P 앞면",
      order: 1,
      canvas: { w: 1491, h: 1055, bg: "#666666" },
      slots: [
        {
          id: "bg-photo",
          type: "image",
          role: "free",
          x: 0,
          y: 0,
          w: 1491,
          h: 1055,
          fit: "cover",
          placeholder: "사진",
        },
        {
          id: "names",
          type: "text",
          text: "이름",
          x: 60,
          y: 850,
          w: 1000,
          h: 130,
          z: 2,
          font_size: 90,
          color: "#FFFFFF",
          align: "left",
        },
      ],
    },
  ],
};

// 미리보기용 샘플 데이터 — 슬롯 field 가 채워져 실제 모습에 가깝게 렌더된다.
const PREVIEW_SAMPLE: Record<string, string> = {
  groom_name: "민준",
  bride_name: "서연",
  couple_names: "민준 · 서연",
  wedding_date: "2026. 10. 17",
  wedding_time: "오후 1시",
  venue_name: "그랜드 웨딩홀",
  venue_address: "서울 강남구 테헤란로 123",
  intro_text: "두 사람이 사랑으로 하나가 됩니다. 귀한 걸음으로 축복해 주세요.",
  groom_parents: "홍길동 · 박영자 의 아들 민준",
  bride_parents: "이순신 · 최영희 의 딸 서연",
  account_info: "마음 전하실 곳",
};

/** 레이아웃 JSON 을 실제 캔버스로 렌더하는 읽기전용 미리보기 — 썸네일 없이도 내용 확인. */
function LayoutPreview({ json }: { json: string }) {
  const { fontsReady } = useInvitationFonts();
  const layout = useMemo<InvitationLayout | null>(() => {
    try {
      const l = JSON.parse(json || "{}") as InvitationLayout;
      return l?.canvas?.w && l?.canvas?.h ? l : null;
    } catch {
      return null;
    }
  }, [json]);
  if (!layout) {
    return (
      <div className="h-28 rounded-md border border-dashed border-border flex items-center justify-center text-[11px] text-muted-foreground">
        유효한 레이아웃 JSON 을 입력하면 미리보기가 표시돼요
      </div>
    );
  }
  const pages = getInvitationPages(layout);
  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {pages.map((p) => {
        const w = Math.min(200, p.canvas.w);
        return (
          <div key={p.id} className="shrink-0">
            <div className="rounded-md overflow-hidden border border-border bg-white" style={{ width: w }}>
              <InvitationCanvas
                layout={pageToLayout(p)}
                userData={PREVIEW_SAMPLE}
                aiText={{}}
                textOverrides={{}}
                imageUrls={{}}
                fontsReady={fontsReady}
                selectedSlotId={null}
                onSelectSlot={() => {}}
                displayWidth={w}
                background="#ffffff"
              />
            </div>
            {p.label && (
              <p className="text-[10px] text-center text-muted-foreground mt-1 truncate" style={{ width: w }}>
                {p.label}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** 목록 카드/선택 화면용 미리보기 이미지 소스 — 썸네일 → 캔버스 배경 → 첫 페이지 배경 순. */
function resolvePreviewImage(t: { thumbnail_url: string; layout: Record<string, unknown> }): string | null {
  if (t.thumbnail_url) return t.thumbnail_url;
  const layout = t.layout as {
    canvas?: { background_url?: string };
    pages?: Array<{ canvas?: { background_url?: string } }>;
  } | null;
  return layout?.canvas?.background_url || layout?.pages?.[0]?.canvas?.background_url || null;
}

const AdminInvitationTemplates = () => {
  const [items, setItems] = useState<Template[]>([]);
  const [fonts, setFonts] = useState<Font[]>([]);
  const [editorTpl, setEditorTpl] = useState<EditorTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<Form>(emptyForm);
  const [layoutJson, setLayoutJson] = useState("{}");
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rollFrameCount, setRollFrameCount] = useState(MOBILE_ROLL_MAX_FRAMES);
  const [isRollUploading, setIsRollUploading] = useState(false);
  const [paperPageCount, setPaperPageCount] = useState(2);
  const [isPaperUploading, setIsPaperUploading] = useState(false);
  const layoutPages = useMemo(() => {
    try {
      const parsed = JSON.parse(layoutJson || "{}") as {
        pages?: Array<{
          id?: string;
          label?: string;
          canvas?: { background_url?: string };
        }>;
      };
      return Array.isArray(parsed.pages) ? parsed.pages : [];
    } catch {
      return [];
    }
  }, [layoutJson]);
  const isMobileRoll = useMemo(() => {
    try {
      return isSeamlessRoll(JSON.parse(layoutJson || "{}") as InvitationLayout);
    } catch {
      return false;
    }
  }, [layoutJson]);
  // 단일 캔버스(종이 단면 등) 배경 이미지 — pages 배열이 없는 템플릿용
  const canvasBackgroundUrl = useMemo(() => {
    try {
      const parsed = JSON.parse(layoutJson || "{}") as {
        canvas?: { background_url?: string };
      };
      return parsed.canvas?.background_url;
    } catch {
      return undefined;
    }
  }, [layoutJson]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const r = await fetchTemplatesAndFonts();
      if (r.templatesError) {
        toast({ title: "불러오기 실패", description: "템플릿을 불러오지 못했어요.", variant: "destructive" });
      } else {
        setItems(r.templates);
      }
      if (!r.fontsError) setFonts(r.fonts);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 폰트 미리보기용 @font-face 주입 (템플릿 등록 화면에서 폰트 모양 확인)
  useEffect(() => {
    if (typeof document === "undefined" || fonts.length === 0) return;
    const id = "admin-template-fontfaces";
    let el = document.getElementById(id) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = fonts
      .filter((f) => f.file_url && f.family)
      .map(
        (f) =>
          `@font-face{font-family:'${f.family.replace(/'/g, "")}';src:url('${f.file_url}');font-weight:${f.weight || "400"};font-style:${f.style || "normal"};font-display:swap;}`,
      )
      .join("\n");
  }, [fonts]);

  const selectedFont = fonts.find((f) => f.id === form.default_font_id) ?? null;
  const fontStyleOf = (f: Font): CSSProperties => ({
    fontFamily: `'${f.family.replace(/'/g, "")}', sans-serif`,
    fontWeight: (f.weight as CSSProperties["fontWeight"]) || 400,
    fontStyle: f.style || "normal",
  });

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "이름을 입력해주세요", variant: "destructive" });
      return;
    }
    // 썸네일은 선택 — 없으면 목록/선택 화면이 레이아웃 미리보기로 폴백한다(아래 LayoutPreview).
    if (!form.thumbnail_url) {
      toast({ title: "썸네일 없이 저장합니다", description: "미리보기는 레이아웃으로 표시돼요." });
    }
    let layout: Record<string, unknown> = {};
    try {
      layout = JSON.parse(layoutJson || "{}");
    } catch {
      toast({
        title: "레이아웃 JSON 형식이 잘못됐어요",
        variant: "destructive",
      });
      return;
    }
    // 최소 검증: 사용자 측 캔버스가 정상 렌더되려면 canvas.w / canvas.h 필수
    const canvas = (layout as { canvas?: { w?: unknown; h?: unknown } }).canvas;
    if (
      !canvas ||
      typeof canvas.w !== "number" ||
      typeof canvas.h !== "number" ||
      canvas.w <= 0 ||
      canvas.h <= 0
    ) {
      toast({
        title: "layout.canvas.w / canvas.h 가 필요해요",
        description:
          '예: {"canvas": {"w": 800, "h": 1200}, "slots": [...]}',
        variant: "destructive",
      });
      return;
    }
    if (!Array.isArray((layout as { slots?: unknown }).slots)) {
      toast({
        title: "layout.slots 배열이 필요해요",
        description: "빈 배열도 가능: \"slots\": []",
        variant: "destructive",
      });
      return;
    }

    const pages = (layout as {
      pages?: Array<{
        id?: unknown;
        canvas?: { w?: unknown; h?: unknown };
        slots?: unknown;
      }>;
    }).pages;
    if (pages !== undefined) {
      const hasInvalidPage =
        !Array.isArray(pages) ||
        pages.length === 0 ||
        pages.some(
          (page) =>
            typeof page.id !== "string" ||
            !page.id.trim() ||
            !page.canvas ||
            typeof page.canvas.w !== "number" ||
            typeof page.canvas.h !== "number" ||
            page.canvas.w <= 0 ||
            page.canvas.h <= 0 ||
            !Array.isArray(page.slots),
        );
      if (hasInvalidPage) {
        toast({
          title: "layout.pages 형식을 확인해주세요",
          description: "각 페이지에는 id, canvas.w, canvas.h, slots 배열이 필요해요.",
          variant: "destructive",
        });
        return;
      }
    }
    const mobileRollError = validateMobileRollLayout(
      layout as unknown as InvitationLayout,
    );
    if (mobileRollError) {
      toast({
        title: "모바일 롤페이지 규격을 확인해주세요",
        description: mobileRollError,
        variant: "destructive",
      });
      return;
    }

    // 인쇄 규격(print) 비율 = 캔버스 비율 검증 (CLAUDE.md: 안 맞으면 export 시 늘어남/레터박스)
    const checkPrintRatio = (
      cv?: { w?: unknown; h?: unknown },
      pr?: { wMm?: unknown; hMm?: unknown },
    ): string | null => {
      if (!pr) return null;
      const { wMm, hMm } = pr;
      if (
        typeof wMm !== "number" ||
        typeof hMm !== "number" ||
        wMm <= 0 ||
        hMm <= 0
      )
        return "print.wMm / print.hMm 은 0보다 큰 숫자여야 해요.";
      if (
        !cv ||
        typeof cv.w !== "number" ||
        typeof cv.h !== "number" ||
        cv.w <= 0 ||
        cv.h <= 0
      )
        return null; // 캔버스는 위에서 이미 검증됨
      const cr = cv.w / cv.h;
      const prr = wMm / hMm;
      if (Math.abs(cr - prr) / prr > 0.01)
        return `캔버스 비율(${cr.toFixed(3)})과 인쇄 비율(${prr.toFixed(3)})이 달라요. export 시 늘어나거나 여백이 생겨요. canvas.w/h 또는 print.wMm/hMm 을 맞춰주세요.`;
      return null;
    };
    let printErr = checkPrintRatio(
      canvas,
      (layout as { print?: { wMm?: unknown; hMm?: unknown } }).print,
    );
    if (!printErr && Array.isArray(pages)) {
      for (const page of pages as Array<{
        canvas?: { w?: unknown; h?: unknown };
        print?: { wMm?: unknown; hMm?: unknown };
      }>) {
        printErr = checkPrintRatio(page.canvas, page.print);
        if (printErr) break;
      }
    }
    if (printErr) {
      toast({
        title: "인쇄 규격(비율)을 확인해주세요",
        description: printErr,
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    const payload = { ...form, slug: form.slug?.trim() || null, layout };
    let saveError: Error | null = null;
    try {
      await saveTemplate(editingId, payload);
    } catch (e) {
      saveError = e instanceof Error ? e : new Error("오류");
    }
    if (saveError) {
      toast({
        title: "저장 실패",
        description: saveError.message,
        variant: "destructive",
      });
    } else {
      toast({ title: editingId ? "수정 완료" : "저장 완료" });
      setForm(emptyForm);
      setLayoutJson("{}");
      setEditingId(null);
      setIsOpen(false);
      fetchData();
    }
    setIsSaving(false);
  };

  const handleEdit = (t: Template) => {
    setEditingId(t.id);
    setForm({
      slug: t.slug,
      name: t.name,
      thumbnail_url: t.thumbnail_url,
      preview_url: t.preview_url,
      format: t.format ?? "mobile",
      tone: t.tone,
      price_hearts: t.price_hearts ?? 0,
      layout: t.layout ?? {},
      default_font_id: t.default_font_id,
      text_prompt_hint: t.text_prompt_hint,
      display_order: t.display_order,
      is_active: t.is_active,
    });
    setLayoutJson(JSON.stringify(t.layout ?? {}, null, 2));
    setIsOpen(true);
  };

  // 복제: 기존 템플릿을 바탕으로 새 항목 폼을 연다(이미지·JSON 재입력 불필요).
  const handleDuplicate = (t: Template) => {
    setEditingId(null); // 새 row 로 저장(insert)
    setForm({
      slug: null, // slug 는 고유해야 하므로 비움
      name: `${t.name} (복사)`,
      thumbnail_url: t.thumbnail_url,
      preview_url: t.preview_url,
      format: t.format ?? "mobile",
      tone: t.tone,
      price_hearts: t.price_hearts ?? 0,
      layout: t.layout ?? {},
      default_font_id: t.default_font_id,
      text_prompt_hint: t.text_prompt_hint,
      display_order: t.display_order,
      is_active: false, // 복사본은 숨김으로 시작 → 검수 후 노출
    });
    setLayoutJson(JSON.stringify(t.layout ?? {}, null, 2));
    setIsOpen(true);
    toast({
      title: "복제 폼을 열었어요",
      description: "이름·내용을 다듬고 저장하면 새 템플릿으로 등록됩니다.",
    });
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setEditingId(null);
      setForm(emptyForm);
      setLayoutJson("{}");
    }
  };

  const updatePageBackgroundUrl = (pageIndex: number, url: string) => {
    try {
      const layout = JSON.parse(layoutJson || "{}") as {
        canvas?: Record<string, unknown>;
        pages?: Array<{
          canvas?: Record<string, unknown>;
          [key: string]: unknown;
        }>;
        [key: string]: unknown;
      };
      if (!Array.isArray(layout.pages) || !layout.pages[pageIndex]) return;
      layout.pages[pageIndex] = {
        ...layout.pages[pageIndex],
        canvas: {
          ...layout.pages[pageIndex].canvas,
          background_url: url,
        },
      };
      if (pageIndex === 0) {
        layout.canvas = {
          ...layout.canvas,
          background_url: url,
        };
      }
      setLayoutJson(JSON.stringify(layout, null, 2));
    } catch {
      toast({
        title: "페이지 배경 반영 실패",
        description: "레이아웃 JSON 형식을 먼저 확인해주세요.",
        variant: "destructive",
      });
    }
  };

  const updateCanvasBackgroundUrl = (url: string) => {
    try {
      const layout = JSON.parse(layoutJson || "{}") as {
        canvas?: Record<string, unknown>;
        [key: string]: unknown;
      };
      layout.canvas = { ...(layout.canvas ?? {}), background_url: url };
      setLayoutJson(JSON.stringify(layout, null, 2));
    } catch {
      toast({
        title: "배경 이미지 반영 실패",
        description: "레이아웃 JSON 형식을 먼저 확인해주세요.",
        variant: "destructive",
      });
    }
  };

  const handleLayoutFileSelected = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const parsed = preserveMobileRollBackgrounds(
        layoutJson,
        JSON.parse(await file.text()) as InvitationLayout,
      );
      setLayoutJson(JSON.stringify(parsed, null, 2));
      toast({ title: "레이아웃 JSON을 불러왔어요" });
    } catch {
      toast({
        title: "JSON 파일을 읽지 못했어요",
        description: "올바른 JSON 파일인지 확인해주세요.",
        variant: "destructive",
      });
    }
  };

  // uploadTemplateBlob 은 features/console/data/invitationTemplates 에서 import(Task #3).

  const prepareMobileRoll = () => {
    setForm((current) => ({ ...current, format: "mobile" }));
    setLayoutJson(
      JSON.stringify(createMobileRollLayout(rollFrameCount), null, 2),
    );
    toast({
      title: `${rollFrameCount}개 프레임 등록 칸을 만들었어요`,
      description: "프레임별 배경 이미지를 올리거나 일괄 등록을 사용해주세요.",
    });
  };

  const preparePaperPages = () => {
    setForm((current) => ({ ...current, format: "paper" }));
    setLayoutJson(
      JSON.stringify(createPaperPagesLayout(paperPageCount), null, 2),
    );
    toast({
      title: `${paperPageCount}개 페이지 등록 칸을 만들었어요`,
      description: "페이지별 배경 이미지를 올리거나 일괄 등록을 사용해주세요.",
    });
  };

  // 종이 페이지 이미지 일괄 등록 — 각 이미지의 실제 크기를 읽어 페이지 캔버스에 반영.
  const handlePaperPagesSelected = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    if (files.length > PAPER_MAX_PAGES) {
      toast({
        title: `페이지는 최대 ${PAPER_MAX_PAGES}장까지 등록할 수 있어요`,
        variant: "destructive",
      });
      return;
    }
    setIsPaperUploading(true);
    try {
      const pages: UploadedPaperPage[] = [];
      for (const file of files) {
        const bitmap = await createImageBitmap(file);
        const w = bitmap.width;
        const h = bitmap.height;
        bitmap.close();
        const extension = file.name.split(".").pop()?.toLowerCase() || "png";
        pages.push({
          w,
          h,
          backgroundUrl: await uploadTemplateBlob(file, extension),
        });
      }
      setForm((current) => ({ ...current, format: "paper" }));
      setLayoutJson(
        JSON.stringify(attachPaperPageBackgrounds(layoutJson, pages), null, 2),
      );
      setPaperPageCount(pages.length);
      toast({
        title: `${pages.length}개 페이지를 연결했어요`,
        description: "각 이미지의 원본 크기로 페이지 캔버스를 맞췄어요.",
      });
    } catch (error) {
      toast({
        title: "페이지 일괄 등록 실패",
        description: error instanceof Error ? error.message : "업로드 오류",
        variant: "destructive",
      });
    } finally {
      setIsPaperUploading(false);
    }
  };

  const handleMobileFramesSelected = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    if (files.length > MOBILE_ROLL_MAX_FRAMES) {
      toast({
        title: "프레임은 최대 10장까지 등록할 수 있어요",
        variant: "destructive",
      });
      return;
    }
    setIsRollUploading(true);
    try {
      const normalizedFiles = await Promise.all(
        files.map((file) => normalizeMobileRollFrame(file)),
      );
      const frames: UploadedRollFrame[] = [];
      for (const [index, file] of files.entries()) {
        const normalized = normalizedFiles[index];
        const extension = normalized.normalized
          ? "png"
          : file.name.split(".").pop()?.toLowerCase() || "png";
        frames.push({
          backgroundUrl: await uploadTemplateBlob(normalized.blob, extension),
          h: MOBILE_ROLL_FRAME_HEIGHT,
        });
      }
      setForm((current) => ({ ...current, format: "mobile" }));
      setLayoutJson(
        JSON.stringify(attachMobileRollBackgrounds(layoutJson, frames), null, 2),
      );
      setRollFrameCount(frames.length);
      const normalizedCount = normalizedFiles.filter(
        (file) => file.normalized,
      ).length;
      toast({
        title: `${frames.length}개 프레임을 연결했어요`,
        description:
          normalizedCount > 0
            ? `${normalizedCount}장은 1080×1920px로 자동 맞춤했어요.`
            : undefined,
      });
    } catch (error) {
      toast({
        title: "프레임 일괄 등록 실패",
        description: error instanceof Error ? error.message : "업로드 오류",
        variant: "destructive",
      });
    } finally {
      setIsRollUploading(false);
    }
  };

  const handleMobileRollSelected = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setIsRollUploading(true);
    try {
      const bitmap = await createImageBitmap(file);
      const frames: UploadedRollFrame[] = [];
      try {
        const scale = MOBILE_ROLL_WIDTH / bitmap.width;
        const normalizedHeight = Math.round(bitmap.height * scale);
        if (normalizedHeight > MOBILE_ROLL_MAX_HEIGHT) {
          throw new Error(`긴 이미지는 최대 ${MOBILE_ROLL_MAX_HEIGHT}px까지 등록할 수 있어요.`);
        }
        for (let y = 0; y < normalizedHeight; y += MOBILE_ROLL_FRAME_HEIGHT) {
          const h = Math.min(MOBILE_ROLL_FRAME_HEIGHT, normalizedHeight - y);
          const canvas = document.createElement("canvas");
          canvas.width = MOBILE_ROLL_WIDTH;
          canvas.height = h;
          const context = canvas.getContext("2d");
          if (!context) throw new Error("이미지 분할을 시작하지 못했어요.");
          context.fillStyle = "#FFFFFF";
          context.fillRect(0, 0, MOBILE_ROLL_WIDTH, h);
          context.drawImage(
            bitmap,
            0,
            y / scale,
            bitmap.width,
            h / scale,
            0,
            0,
            MOBILE_ROLL_WIDTH,
            h,
          );
          frames.push({
            backgroundUrl: await uploadTemplateBlob(await canvasToPngBlob(canvas)),
            h,
          });
        }
      } finally {
        bitmap.close();
      }
      setForm((current) => ({ ...current, format: "mobile" }));
      setLayoutJson(
        JSON.stringify(attachMobileRollBackgrounds(layoutJson, frames), null, 2),
      );
      setRollFrameCount(frames.length);
      toast({
        title: `${frames.length}개 프레임으로 자동 분할했어요`,
        description: `폭 ${MOBILE_ROLL_WIDTH}px · 전체 높이 ${frames.reduce((total, frame) => total + frame.h, 0)}px로 자동 맞춤했어요.`,
      });
    } catch (error) {
      toast({
        title: "긴 롤 이미지 등록 실패",
        description: error instanceof Error ? error.message : "업로드 오류",
        variant: "destructive",
      });
    } finally {
      setIsRollUploading(false);
    }
  };

  const handleToggleActive = async (t: Template) => {
    try {
      await setTemplateActive(t.id, !t.is_active);
      fetchData();
    } catch (e) {
      toast({
        title: "변경 실패",
        description: e instanceof Error ? e.message : "오류",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (t: Template) => {
    if (!confirm(`"${t.name}" 을(를) 삭제하시겠어요?`)) return;
    let delError: Error | null = null;
    try {
      await deleteTemplate(t.id);
    } catch (e) {
      delError = e instanceof Error ? e : new Error("오류");
    }
    if (delError) {
      toast({
        title: "삭제 실패",
        description: delError.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "삭제 완료" });
      fetchData();
    }
  };

  return (
    <AdminGuard>
      <AdminLayout
        title="청첩장 템플릿"
        description="모바일 청첩장 디자인 시안 + 기본 레이아웃 관리"
        rightAction={
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() =>
                setEditorTpl({
                  name: "새 템플릿",
                  format: "paper",
                  tone: "MODERN",
                  thumbnail_url: "",
                  layout: JSON.parse(
                    JSON.stringify(STARTER_LAYOUT),
                  ) as InvitationLayout,
                })
              }
            >
              <Plus className="w-4 h-4" />편집기로 만들기
            </Button>
          <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="w-4 h-4" />새 템플릿
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "템플릿 수정" : "새 템플릿 등록"}
                </DialogTitle>
              </DialogHeader>

              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="mb-2 block">썸네일 이미지</Label>
                    <ImageUploader
                      key={`thumb-${editingId ?? "new"}`}
                      bucket="invitation-templates"
                      pathPrefix="thumbnails/"
                      initialUrl={form.thumbnail_url || undefined}
                      onUploaded={(_, url) =>
                        setForm((p) => ({ ...p, thumbnail_url: url }))
                      }
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block">큰 미리보기 (선택)</Label>
                    <ImageUploader
                      key={`preview-${editingId ?? "new"}`}
                      bucket="invitation-templates"
                      pathPrefix="previews/"
                      initialUrl={form.preview_url || undefined}
                      onUploaded={(_, url) =>
                        setForm((p) => ({ ...p, preview_url: url }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="slug">Slug</Label>
                    <Input
                      id="slug"
                      value={form.slug ?? ""}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, slug: e.target.value }))
                      }
                      placeholder="newspaper-a4-01"
                    />
                  </div>

                  <div>
                    <Label htmlFor="name">템플릿 이름</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, name: e.target.value }))
                      }
                      placeholder="예: 로맨틱 봄꽃 #001"
                    />
                  </div>

                  <div>
                    <Label htmlFor="format">매체</Label>
                    <Select
                      value={form.format}
                      onValueChange={(v) =>
                        setForm((p) => ({ ...p, format: v }))
                      }
                    >
                      <SelectTrigger id="format">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FORMAT_OPTIONS.map((f) => (
                          <SelectItem key={f.value} value={f.value}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="price">가격 (하트)</Label>
                    <Input
                      id="price"
                      type="number"
                      min={0}
                      value={form.price_hearts}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          price_hearts: parseInt(e.target.value) || 0,
                        }))
                      }
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {
                        FORMAT_OPTIONS.find((f) => f.value === form.format)
                          ?.priceGuide
                      }
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="tone">톤</Label>
                    <Select
                      value={form.tone}
                      onValueChange={(v) => setForm((p) => ({ ...p, tone: v }))}
                    >
                      <SelectTrigger id="tone">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TONE_OPTIONS.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="font">기본 폰트 (선택)</Label>
                    <Select
                      value={form.default_font_id ?? "__none__"}
                      onValueChange={(v) =>
                        setForm((p) => ({
                          ...p,
                          default_font_id: v === "__none__" ? null : v,
                        }))
                      }
                    >
                      <SelectTrigger id="font">
                        <SelectValue placeholder="없음" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">없음</SelectItem>
                        {fonts.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            <span className="flex items-baseline gap-2">
                              <span className="text-xs text-muted-foreground shrink-0">
                                {f.name}
                              </span>
                              <span
                                className="text-base truncate"
                                style={fontStyleOf(f)}
                              >
                                가나다 Ag 123
                              </span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {/* 선택 폰트 미리보기 */}
                    {selectedFont && (
                      <div className="mt-2 p-3 bg-muted rounded-lg">
                        <p className="text-[10px] text-muted-foreground mb-1">
                          미리보기 · {selectedFont.name}
                        </p>
                        <p
                          className="text-xl leading-snug"
                          style={fontStyleOf(selectedFont)}
                        >
                          신랑 ♥ 신부 결혼합니다
                          <br />
                          CHUNG KYEOM · OCT 5, 2024
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="hint">AI 텍스트 톤 힌트 (선택)</Label>
                    <Input
                      id="hint"
                      value={form.text_prompt_hint ?? ""}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          text_prompt_hint: e.target.value || null,
                        }))
                      }
                      placeholder="예: 따뜻한 봄 결혼식 인사말 톤"
                    />
                  </div>

                  <div>
                    <Label htmlFor="order">노출 순서</Label>
                    <Input
                      id="order"
                      type="number"
                      value={form.display_order}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          display_order: parseInt(e.target.value) || 0,
                        }))
                      }
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      숫자가 작을수록 위에 노출돼요 (1번이 최상단).
                    </p>
                  </div>
                </div>
              </div>

              <section className="rounded-lg border border-border bg-muted/20 p-4 space-y-2">
                <p className="text-sm font-semibold text-foreground">미리보기</p>
                <p className="text-[11px] text-muted-foreground -mt-1">
                  아래 레이아웃 JSON 을 실제 캔버스로 렌더해요(샘플 내용). 썸네일이 없어도 모습을 확인할 수 있어요.
                </p>
                <LayoutPreview json={layoutJson} />
              </section>

              {form.format === "mobile" && (
                <section className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      모바일 롤페이지
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                      세로 이미지를 최대 {MOBILE_ROLL_MAX_FRAMES}장,
                      전체 높이 {MOBILE_ROLL_MAX_HEIGHT}px까지 등록할 수 있어요.
                      각 이미지는 1080×1920px로 자동 맞춤되고 사용자 화면에서는
                      경계 없이 이어집니다.
                    </p>
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="w-24">
                      <Label htmlFor="roll-frame-count" className="text-[11px]">
                        프레임 수
                      </Label>
                      <Input
                        id="roll-frame-count"
                        type="number"
                        min={1}
                        max={MOBILE_ROLL_MAX_FRAMES}
                        value={rollFrameCount}
                        onChange={(e) =>
                          setRollFrameCount(
                            Math.max(
                              1,
                              Math.min(
                                MOBILE_ROLL_MAX_FRAMES,
                                parseInt(e.target.value) || 1,
                              ),
                            ),
                          )
                        }
                        className="mt-1"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={prepareMobileRoll}
                      disabled={isRollUploading}
                      className="flex-1"
                    >
                      <Rows3 className="w-4 h-4 mr-2" />
                      등록 칸 만들기
                    </Button>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2">
                    <label
                      className={`inline-flex items-center justify-center gap-2 h-10 rounded-md border border-border bg-background text-xs font-semibold cursor-pointer hover:bg-muted ${
                        isRollUploading ? "pointer-events-none opacity-50" : ""
                      }`}
                    >
                      {isRollUploading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Images className="w-4 h-4" />
                      )}
                      9:16 프레임 일괄 등록
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleMobileFramesSelected}
                      />
                    </label>
                    <label
                      className={`inline-flex items-center justify-center gap-2 h-10 rounded-md border border-border bg-background text-xs font-semibold cursor-pointer hover:bg-muted ${
                        isRollUploading ? "pointer-events-none opacity-50" : ""
                      }`}
                    >
                      {isRollUploading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Rows3 className="w-4 h-4" />
                      )}
                      긴 롤 이미지 자동 분할
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleMobileRollSelected}
                      />
                    </label>
                  </div>
                  {isMobileRoll && (
                    <p className="text-[11px] font-medium text-emerald-700">
                      현재 JSON은 모바일 롤페이지 규격입니다.
                    </p>
                  )}
                </section>
              )}

              {form.format === "paper" && (
                <section className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      종이 페이지
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                      앞·뒤 또는 여러 장(최대 {PAPER_MAX_PAGES}장)을 등록할 수
                      있어요. 이미지를 올리면 각 장의 원본 크기로 페이지가
                      만들어지고, 사용자 화면에서는 페이지별로 넘겨 봅니다.
                      한 장짜리는 아래 "배경 이미지" 한 칸만 써도 돼요.
                    </p>
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="w-24">
                      <Label htmlFor="paper-page-count" className="text-[11px]">
                        페이지 수
                      </Label>
                      <Input
                        id="paper-page-count"
                        type="number"
                        min={1}
                        max={PAPER_MAX_PAGES}
                        value={paperPageCount}
                        onChange={(e) =>
                          setPaperPageCount(
                            Math.max(
                              1,
                              Math.min(
                                PAPER_MAX_PAGES,
                                parseInt(e.target.value) || 1,
                              ),
                            ),
                          )
                        }
                        className="mt-1"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={preparePaperPages}
                      disabled={isPaperUploading}
                      className="flex-1"
                    >
                      <Rows3 className="w-4 h-4 mr-2" />
                      등록 칸 만들기
                    </Button>
                  </div>
                  <label
                    className={`inline-flex items-center justify-center gap-2 h-10 w-full rounded-md border border-border bg-background text-xs font-semibold cursor-pointer hover:bg-muted ${
                      isPaperUploading ? "pointer-events-none opacity-50" : ""
                    }`}
                  >
                    {isPaperUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Images className="w-4 h-4" />
                    )}
                    페이지 이미지 일괄 등록
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handlePaperPagesSelected}
                    />
                  </label>
                </section>
              )}

              <div>
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="layout">레이아웃 JSON</Label>
                  <label className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border bg-background text-xs font-medium cursor-pointer hover:bg-muted">
                    <FileJson className="w-3.5 h-3.5" />
                    JSON 불러오기
                    <input
                      type="file"
                      accept="application/json,.json"
                      className="hidden"
                      onChange={handleLayoutFileSelected}
                    />
                  </label>
                </div>
                <Textarea
                  id="layout"
                  value={layoutJson}
                  onChange={(e) => setLayoutJson(e.target.value)}
                  rows={12}
                  className="font-mono text-xs"
                  placeholder={`{
  "canvas": {
    "w": 800,
    "h": 1200,
    "bg": "#FFFFFF",
    "background_url": "디자이너가 export 한 배경 PNG URL (선택)"
  },
  "slots": [
    {
      "id": "couple_names",
      "type": "text",
      "x": 200, "y": 480, "w": 400, "h": 60,
      "z": 2,
      "field": "groom_name",
      "ai_promptable": false,
      "font_size": 28,
      "align": "center"
    }
  ]
}`}
                />
                {layoutPages.length === 0 && !isMobileRoll && (
                  <div className="mt-4">
                    <div className="mb-2">
                      <p className="text-sm font-semibold text-foreground">
                        배경 이미지
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                        텍스트·사진 레이어를 끈 배경 PNG를 올리면
                        canvas.background_url 에 자동 반영돼요. (종이 단면 템플릿 등)
                      </p>
                    </div>
                    <div className="max-w-[200px]">
                      <ImageUploader
                        key={`canvas-bg-${editingId ?? "new"}-${canvasBackgroundUrl ?? ""}`}
                        bucket="invitation-templates"
                        pathPrefix="pages/"
                        initialUrl={canvasBackgroundUrl}
                        maxSizeMB={8}
                        onUploaded={(_, url) => updateCanvasBackgroundUrl(url)}
                      />
                    </div>
                  </div>
                )}
                {layoutPages.length > 0 && (
                  <div className="mt-4">
                    <div className="mb-2">
                      <p className="text-sm font-semibold text-foreground">
                        {isMobileRoll ? "프레임별 배경 이미지" : "페이지별 배경 이미지"}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        JSON의 pages 배열을 기준으로 업로드 칸이 생성됩니다.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {layoutPages.map((page, index) => (
                        <div key={page.id ?? index}>
                          <Label className="mb-1.5 block text-[11px]">
                            {page.label ?? page.id ?? `${index + 1}P`}
                          </Label>
                          <ImageUploader
                            key={`page-bg-${editingId ?? "new"}-${page.id ?? index}-${page.canvas?.background_url ?? ""}`}
                            bucket="invitation-templates"
                            pathPrefix="pages/"
                            initialUrl={page.canvas?.background_url}
                            maxSizeMB={8}
                            onUploaded={(_, url) =>
                              updatePageBackgroundUrl(index, url)
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mt-2 p-3 bg-blue-50 rounded-lg text-[11px] text-blue-900 leading-relaxed">
                  <p className="font-semibold mb-1">Figma 워크플로우</p>
                  <ol className="list-decimal list-inside space-y-0.5">
                    <li>청첩장 프레임 작업 (예: 800×1200)</li>
                    <li>
                      두 번 export — 모두 PNG @2x:
                      <ul className="list-disc list-inside ml-3 mt-0.5">
                        <li>풀시안 (모든 레이어 ON) → 위 "썸네일"</li>
                        <li>배경 (텍스트·사진 레이어 OFF) → canvas.background_url</li>
                      </ul>
                    </li>
                    <li>슬롯 박스 선택 → 피그마 우측 X, Y, W, H → slots 배열에 그대로</li>
                    <li>슬롯 type: text / image / asset / calendar / qr / map</li>
                    <li>field 값으로 user_data 자동 매핑 (groom_name, bride_name, wedding_date 등)</li>
                    <li>ai_promptable=true 인 text 슬롯은 8초 후 AI 추천 시트 트리거</li>
                  </ol>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="active"
                  checked={form.is_active}
                  onCheckedChange={(c) =>
                    setForm((p) => ({ ...p, is_active: !!c }))
                  }
                />
                <Label htmlFor="active" className="text-sm cursor-pointer">
                  즉시 노출
                </Label>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => handleOpenChange(false)}>
                  취소
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingId ? "수정 저장" : "저장"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        }
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {items.map((t) => (
              <article
                key={t.id}
                className="bg-background rounded-lg overflow-hidden border border-border"
              >
                <div className="relative aspect-[3/4] bg-muted">
                  {resolvePreviewImage(t) ? (
                    <img
                      src={resolvePreviewImage(t)!}
                      alt={t.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    // 썸네일·배경 둘 다 없는 템플릿(슬롯 전용) — 깨진 이미지 대신 플레이스홀더.
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-center px-2">
                      <Images className="w-6 h-6 text-muted-foreground" />
                      <span className="text-[11px] font-medium text-foreground line-clamp-2">{t.name}</span>
                      <span className="text-[10px] text-muted-foreground">미리보기 없음 · 편집기에서 확인</span>
                    </div>
                  )}
                  {!t.is_active && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white text-xs font-semibold">
                        비활성
                      </span>
                    </div>
                  )}
                  <span className="absolute top-1.5 left-1.5 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                    {t.format === "paper" ? "종이" : "모바일"}
                    {" · "}
                    {TONE_OPTIONS.find((o) => o.value === t.tone)?.label ?? t.tone}
                  </span>
                  <span
                    className={`absolute top-1.5 right-1.5 text-[10px] px-1.5 py-0.5 rounded ${
                      t.price_hearts > 0
                        ? "bg-rose-500 text-white"
                        : "bg-emerald-500 text-white"
                    }`}
                  >
                    {t.price_hearts > 0 ? `${t.price_hearts}하트` : "무료"}
                  </span>
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-semibold truncate">{t.name}</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    노출 순서 {t.display_order}
                  </p>
                  <div className="flex gap-1 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(t)}
                      className="flex-1 h-8 text-xs px-2"
                    >
                      {t.is_active ? (
                        <Eye className="w-3 h-3 mr-1" />
                      ) : (
                        <EyeOff className="w-3 h-3 mr-1" />
                      )}
                      {t.is_active ? "노출" : "숨김"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(t)}
                      className="h-8 w-8 p-0"
                      aria-label="수정"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setEditorTpl({
                          id: t.id,
                          name: t.name,
                          format: t.format,
                          tone: t.tone,
                          thumbnail_url: t.thumbnail_url,
                          layout: t.layout as unknown as InvitationLayout,
                        })
                      }
                      className="h-8 px-2 text-[11px]"
                      aria-label="편집기"
                    >
                      편집기
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDuplicate(t)}
                      className="h-8 w-8 p-0"
                      aria-label="복제"
                      title="복제"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(t)}
                      className="h-8 w-8 p-0 text-destructive"
                      aria-label="삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </AdminLayout>
      {editorTpl && (
        <AdminTemplateEditor
          template={editorTpl}
          fonts={fonts}
          onClose={() => setEditorTpl(null)}
          onSaved={() => {
            setEditorTpl(null);
            fetchData();
          }}
        />
      )}
    </AdminGuard>
  );
};

const EmptyState = () => (
  <div className="text-center py-20 px-6">
    <div className="inline-block p-4 bg-muted rounded-full mb-4">
      <Plus className="w-6 h-6 text-muted-foreground" />
    </div>
    <h2 className="text-base font-semibold text-foreground mb-2">
      등록된 청첩장 템플릿이 없어요
    </h2>
    <p className="text-sm text-muted-foreground">
      우측 상단 "새 템플릿" 으로 첫 시안을 등록해보세요.
    </p>
  </div>
);

export default AdminInvitationTemplates;
