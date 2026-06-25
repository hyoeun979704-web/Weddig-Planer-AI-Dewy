import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { X, Plus, Trash2, Copy, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import InvitationCanvas from "@/components/invitation/InvitationCanvas";
import { useInvitationFonts } from "@/hooks/useInvitationFonts";
import { useUndoable } from "@/hooks/useUndoable";
import { Undo2, Redo2 } from "lucide-react";
import {
  collectFontFamilies,
  getInvitationPages,
  pageToLayout,
} from "@/lib/invitation/layout";
import type {
  InvitationLayout,
  InvitationSlot,
  SlotType,
} from "@/lib/invitation/types";

export interface EditorTemplate {
  id?: string;
  name: string;
  format: string;
  layout: InvitationLayout;
  tone?: string;
  thumbnail_url?: string;
}

interface FontOpt {
  id: string;
  name: string;
  family: string;
  file_url: string;
  weight: string;
  style: string;
}

interface AssetOpt {
  id: string;
  name: string;
  image_url: string;
  category: string;
  is_recolorable: boolean;
  natural_width: number | null;
  natural_height: number | null;
}

const ASSET_CATS = ["FLOWER", "LINE", "FRAME", "RIBBON", "ICON", "SHAPE", "TEXT_STICKER", "STICKER", "TAPE", "OBJECT_3D", "NATURE", "PHOTO_FRAME"];

// 미리보기용 샘플 데이터 (실제 슬롯 field 바인딩이 어떻게 채워지는지 확인)
const SAMPLE = {
  groom_name: "김충겸",
  bride_name: "엄수빈",
  wedding_date: "2024-10-05",
  wedding_time: "16:10",
  venue_name: "더 파티움 3층 파티움홀",
  venue_address: "여의도 더 파티움",
  groom_parents: "김영호 · 권정희의 아들",
  bride_parents: "엄영종 · 곽승림의 딸",
};

const FIELD_OPTIONS = [
  "", "groom_name", "bride_name", "groom_given_en", "bride_given_en",
  "groom_name_en", "bride_name_en", "couple_names", "couple_names_en",
  "groom_parents", "bride_parents", "wedding_date", "wedding_time",
  "venue_name", "venue_address", "venue_name_en", "venue_address_en",
];

let slotSeq = 0;
const newId = (type: string) => `slot-${type}-${Date.now()}-${slotSeq++}`;

const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o));

/**
 * 선택 슬롯 우하단 리사이즈 핸들 (편집기 전용 HTML 오버레이).
 * 공유 InvitationCanvas 를 건드리지 않고, 포인터 캡처로 드래그→w/h 갱신.
 * 좌표 변환: 화면 픽셀 delta / dispScale = 캔버스 단위 delta. 스냅 ON 이면 10px.
 */
const ResizeHandle = ({
  slot,
  scale,
  snap,
  onResize,
}: {
  slot: InvitationSlot;
  scale: number;
  snap: boolean;
  onResize: (w: number, h: number) => void;
}) => {
  const start = useRef<{ px: number; py: number; w: number; h: number } | null>(
    null,
  );
  return (
    <div className="absolute inset-0" style={{ pointerEvents: "none", zIndex: 20 }}>
      <div
        title="드래그해서 크기 조절"
        onPointerDown={(e) => {
          e.stopPropagation();
          (e.currentTarget as Element).setPointerCapture(e.pointerId);
          start.current = { px: e.clientX, py: e.clientY, w: slot.w, h: slot.h };
        }}
        onPointerMove={(e) => {
          const s = start.current;
          if (!s) return;
          const q = (n: number) =>
            snap ? Math.round(n / 10) * 10 : Math.round(n);
          const w = Math.max(8, q(s.w + (e.clientX - s.px) / scale));
          const h = Math.max(8, q(s.h + (e.clientY - s.py) / scale));
          onResize(w, h);
        }}
        onPointerUp={(e) => {
          start.current = null;
          (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
        }}
        style={{
          position: "absolute",
          left: (slot.x + slot.w) * scale - 7,
          top: (slot.y + slot.h) * scale - 7,
          width: 14,
          height: 14,
          background: "#3b82f6",
          border: "2px solid #fff",
          borderRadius: 3,
          cursor: "nwse-resize",
          pointerEvents: "auto",
          boxShadow: "0 1px 3px rgba(0,0,0,.4)",
          touchAction: "none",
        }}
      />
    </div>
  );
};

/** 편집 캔버스 위 격자/눈금 오버레이 (캔버스 좌표 기준 — x/y 입력값과 1:1). */
const GridOverlay = ({ w, h, scale }: { w: number; h: number; scale: number }) => {
  const minor = 50; // 작은 눈금(캔버스 단위)
  const major = 250; // 굵은 눈금 + 숫자
  const vx: number[] = [];
  for (let x = 0; x <= w; x += minor) vx.push(x);
  const hy: number[] = [];
  for (let y = 0; y <= h; y += minor) hy.push(y);
  return (
    <svg
      className="pointer-events-none absolute inset-0"
      width={w * scale}
      height={h * scale}
      style={{ left: 0, top: 0 }}
    >
      {vx.map((x) => (
        <line
          key={`v${x}`}
          x1={x * scale}
          y1={0}
          x2={x * scale}
          y2={h * scale}
          stroke={x % major === 0 ? "#2563eb" : "#60a5fa"}
          strokeWidth={1}
          opacity={x % major === 0 ? 0.45 : 0.18}
        />
      ))}
      {hy.map((y) => (
        <line
          key={`h${y}`}
          x1={0}
          y1={y * scale}
          x2={w * scale}
          y2={y * scale}
          stroke={y % major === 0 ? "#2563eb" : "#60a5fa"}
          strokeWidth={1}
          opacity={y % major === 0 ? 0.45 : 0.18}
        />
      ))}
      {vx
        .filter((x) => x % major === 0)
        .map((x) => (
          <text
            key={`vl${x}`}
            x={x * scale + 2}
            y={11}
            fontSize={9}
            fill="#2563eb"
            opacity={0.7}
          >
            {x}
          </text>
        ))}
      {hy
        .filter((y) => y % major === 0)
        .map((y) => (
          <text
            key={`hl${y}`}
            x={2}
            y={y * scale + 10}
            fontSize={9}
            fill="#2563eb"
            opacity={0.7}
          >
            {y}
          </text>
        ))}
    </svg>
  );
};

const AdminTemplateEditor = ({
  template,
  fonts,
  onClose,
  onSaved,
}: {
  template: EditorTemplate;
  fonts: FontOpt[];
  onClose: () => void;
  onSaved: () => void;
}) => {
  const {
    state: layout,
    set: setLayout,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useUndoable<InvitationLayout>(() => clone(template.layout));
  const [name, setName] = useState(template.name);
  const [pageIdx, setPageIdx] = useState(0);
  const [selId, setSelId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [snap, setSnap] = useState(true);
  // 미리보기용 샘플 데이터 — 긴 이름/실제 식장명으로 넘침·잘림을 확인
  const [sampleData, setSampleData] = useState<Record<string, string>>(SAMPLE);
  const [assets, setAssets] = useState<AssetOpt[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [assetQuery, setAssetQuery] = useState("");

  // 에셋 라이브러리 로드 (편집기에서 카드에 끌어다 놓기용)
  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("invitation_assets")
        .select("id,name,image_url,category,is_recolorable,natural_width,natural_height")
        .eq("is_active", true)
        .order("category")
        .order("display_order");
      if (data) setAssets(data as AssetOpt[]);
    })();
  }, []);

  const close = () => {
    if (dirty && !window.confirm("저장하지 않은 변경이 있습니다. 닫을까요?"))
      return;
    onClose();
  };

  const pages = getInvitationPages(layout);
  const page = pages[Math.min(pageIdx, pages.length - 1)];
  const slots = page.slots;
  const selected = slots.find((s) => s.id === selId) ?? null;

  const usedFonts = useMemo(() => collectFontFamilies([layout]), [layout]);
  const { fontsReady } = useInvitationFonts(usedFonts);

  // 편집 캔버스 표시 폭/배율 (InvitationCanvas 내부 계산과 동일하게 맞춤)
  const dispW = Math.min(640, page.canvas.w);
  const dispScale = dispW / page.canvas.w;

  // ── 슬롯 변경 헬퍼 (현재 페이지 슬롯 배열을 갱신) ──
  // coalesceKey: 같은 동작(같은 슬롯 드래그/리사이즈)의 연속 변경을 한 undo 단계로 묶음.
  const setPageSlots = (
    updater: (s: InvitationSlot[]) => InvitationSlot[],
    opts?: { coalesceKey?: string },
  ) => {
    setDirty(true);
    setLayout((prev) => {
      const next = clone(prev);
      if (Array.isArray(next.pages) && next.pages.length > 0) {
        const i = Math.min(pageIdx, next.pages.length - 1);
        next.pages[i].slots = updater(next.pages[i].slots);
      } else {
        next.slots = updater(next.slots);
      }
      return next;
    }, opts);
  };

  const updateSlot = (
    id: string,
    patch: Partial<InvitationSlot>,
    opts?: { coalesceKey?: string },
  ) =>
    setPageSlots(
      (arr) => arr.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      opts,
    );

  // 드래그 이동 — 스냅 ON 이면 10px 격자에 맞춰 좌표를 깔끔하게(CLAUDE.md 그리드 규칙).
  const SNAP_STEP = 10;
  const moveSlot = (id: string, x: number, y: number) => {
    const q = (n: number) =>
      snap ? Math.round(n / SNAP_STEP) * SNAP_STEP : Math.round(n);
    updateSlot(id, { x: q(x), y: q(y) }, { coalesceKey: "move:" + id });
  };

  // 숫자 입력 — 빈 값/NaN 이면 무시(0 으로 튀지 않게)
  const numChange =
    (id: string, key: keyof InvitationSlot) =>
    (e: ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      if (v === "") return;
      const n = Number(v);
      if (!Number.isNaN(n))
        updateSlot(id, { [key]: n } as Partial<InvitationSlot>);
    };

  const addSlot = (type: SlotType) => {
    const id = newId(type);
    const base: InvitationSlot = {
      id,
      type,
      x: Math.round(page.canvas.w * 0.1),
      y: Math.round(page.canvas.h * 0.1),
      w: type === "text" ? 400 : 300,
      h: type === "text" ? 60 : 300,
      z: 2,
      ...(type === "text"
        ? { text: "텍스트", font_size: 32, color: "#1A1A1A", align: "left" }
        : {}),
      ...(type === "image" ? { role: "free", placeholder: "사진" } : {}),
    };
    setPageSlots((arr) => [...arr, base]);
    setSelId(id);
  };

  const addAsset = (a: AssetOpt) => {
    const id = newId("asset");
    const natW = a.natural_width || 300;
    const natH = a.natural_height || 300;
    const w = Math.min(natW, Math.round(page.canvas.w * 0.4));
    const h = Math.round((w * natH) / natW);
    const base: InvitationSlot = {
      id,
      type: "asset",
      x: Math.round((page.canvas.w - w) / 2),
      y: Math.round(page.canvas.h * 0.12),
      w,
      h,
      z: 3,
      image_url: a.image_url,
    };
    setPageSlots((arr) => [...arr, base]);
    setSelId(id);
    setPickerOpen(false);
  };

  const deleteSlot = (id: string) => {
    setPageSlots((arr) => arr.filter((s) => s.id !== id));
    setSelId(null);
  };

  const duplicateSlot = (id: string) => {
    const s = slots.find((x) => x.id === id);
    if (!s) return;
    const copy = { ...clone(s), id: newId(s.type), x: s.x + 20, y: s.y + 20 };
    setPageSlots((arr) => [...arr, copy]);
    setSelId(copy.id);
  };

  const bringToFront = (id: string) => {
    const maxZ = Math.max(0, ...slots.map((s) => s.z ?? 0));
    updateSlot(id, { z: maxZ + 1 });
  };
  const sendToBack = (id: string) => {
    const minZ = Math.min(0, ...slots.map((s) => s.z ?? 0));
    updateSlot(id, { z: minZ - 1 });
  };

  // 키보드: Esc 선택해제, Delete/Backspace 삭제 (입력칸 포커스 중엔 무시)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      // 텍스트 입력칸: 모든 단축키 양보(네이티브 텍스트 편집 유지)
      const inTextField =
        !!t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable);
      // 인터랙티브 컨트롤(버튼·셀렉트·다이얼로그): 파괴적 키 양보 — 버튼 포커스 중
      // Backspace 가 슬롯을 지우는 사고 방지.
      const onControl =
        inTextField ||
        (!!t &&
          (t.tagName === "BUTTON" ||
            t.tagName === "SELECT" ||
            !!t.closest('[role="dialog"],[role="menu"],[role="listbox"]')));
      // 되돌리기/다시실행 — 입력칸 밖에서 (입력칸 안은 브라우저 기본 텍스트 undo 유지)
      if (!inTextField && (e.ctrlKey || e.metaKey)) {
        const k = e.key.toLowerCase();
        if (k === "z") {
          e.preventDefault();
          if (e.shiftKey) redo();
          else undo();
          return;
        }
        if (k === "y") {
          // Windows 다시실행 관습
          e.preventDefault();
          redo();
          return;
        }
      }
      if (inTextField) return;
      if (e.key === "Escape") {
        setSelId(null);
        return;
      }
      if (onControl) return;
      if ((e.key === "Delete" || e.key === "Backspace") && selId) {
        e.preventDefault();
        deleteSlot(selId);
      } else if (selId && e.key.startsWith("Arrow")) {
        // 방향키 미세 이동 (Shift=10px, 기본 1px) — 정밀 배치.
        // 함수형 업데이트로 현재 좌표를 읽어 연속 이동이 누적되게(stale 방지).
        const step = e.shiftKey ? 10 : 1;
        const dx =
          e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy =
          e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        if (dx || dy) {
          e.preventDefault();
          setPageSlots(
            (arr) =>
              arr.map((s) =>
                s.id === selId ? { ...s, x: s.x + dx, y: s.y + dy } : s,
              ),
            { coalesceKey: "move:" + selId },
          );
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selId, undo, redo]);

  const save = async () => {
    if (!name.trim()) {
      toast({ title: "템플릿 이름을 입력해주세요" });
      return;
    }
    setSaving(true);
    try {
      const payload = { name: name.trim(), layout };
      const res = template.id
        ? await (supabase as any)
            .from("invitation_templates")
            .update({ ...payload, updated_at: new Date().toISOString() })
            .eq("id", template.id)
        : await (supabase as any)
            .from("invitation_templates")
            // 신규: NOT NULL 컬럼(thumbnail_url·tone) 기본값 채움 (없으면 insert 실패)
            .insert({
              ...payload,
              format: template.format,
              tone: template.tone ?? "MODERN",
              thumbnail_url: template.thumbnail_url ?? "",
              is_active: false,
            });
      if (res.error) throw res.error;
      setDirty(false);
      toast({ title: "템플릿 저장됨" });
      onSaved();
    } catch (e) {
      toast({
        title: "저장 실패",
        description: e instanceof Error ? e.message : "오류",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const fontStyleOf = (f: FontOpt) => ({
    fontFamily: `'${f.family.replace(/'/g, "")}', sans-serif`,
  });

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* 헤더 */}
      <header className="flex items-center gap-2 px-4 h-14 border-b border-border shrink-0">
        <Input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setDirty(true);
          }}
          placeholder="템플릿 이름"
          className="max-w-xs h-9"
        />
        <div className="flex gap-1">
          {pages.map((p, i) => (
            <button
              key={p.id}
              onClick={() => {
                setPageIdx(i);
                setSelId(null);
              }}
              className={`px-3 h-9 rounded-md text-xs font-semibold border ${
                i === pageIdx
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border"
              }`}
            >
              {p.label ?? `${i + 1}P`}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={undo}
            disabled={!canUndo}
            title="되돌리기 (Ctrl+Z)"
            aria-label="되돌리기"
          >
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={redo}
            disabled={!canRedo}
            title="다시 실행 (Ctrl+Shift+Z)"
            aria-label="다시 실행"
          >
            <Redo2 className="w-4 h-4" />
          </Button>
          <Button onClick={save} disabled={saving} size="sm">
            {saving ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-1" />
            )}
            저장
          </Button>
          <Button variant="outline" size="sm" onClick={close}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* 캔버스 */}
        <div className="flex-1 overflow-auto bg-muted/40 flex flex-col items-center justify-start p-6 gap-2">
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground self-start">
            <button
              onClick={() => setShowGrid((v) => !v)}
              className={`px-2 h-7 rounded-md border ${
                showGrid
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border"
              }`}
            >
              격자 {showGrid ? "ON" : "OFF"}
            </button>
            <button
              onClick={() => setSnap((v) => !v)}
              title="드래그 시 10px 격자에 맞춤"
              className={`px-2 h-7 rounded-md border ${
                snap
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border"
              }`}
            >
              스냅 {snap ? "ON" : "OFF"}
            </button>
            <span>
              캔버스 {page.canvas.w}×{page.canvas.h}
              {dispScale < 1 && ` · ${Math.round(dispScale * 100)}%`}
            </span>
            {selected && (
              <span className="font-mono">
                선택: x{selected.x} y{selected.y} w{selected.w} h{selected.h}
              </span>
            )}
          </div>
          <div className="relative shadow-lg" style={{ width: dispW }}>
            <InvitationCanvas
              key={`${page.id}:${slots.length}`}
              layout={pageToLayout(page)}
              userData={sampleData}
              aiText={{}}
              textOverrides={{}}
              imageUrls={{}}
              fontsReady={fontsReady}
              selectedSlotId={selId}
              onSelectSlot={setSelId}
              displayWidth={dispW}
              editable
              unlockAll
              onMoveSlot={moveSlot}
              background="#ffffff"
            />
            {showGrid && (
              <GridOverlay
                w={page.canvas.w}
                h={page.canvas.h}
                scale={dispScale}
              />
            )}
            {selected && (
              <ResizeHandle
                slot={selected}
                scale={dispScale}
                snap={snap}
                onResize={(w, h) =>
                  updateSlot(selected.id, { w, h }, {
                    coalesceKey: "resize:" + selected.id,
                  })
                }
              />
            )}
          </div>
        </div>

        {/* 속성 패널 */}
        <aside className="w-72 shrink-0 border-l border-border overflow-auto p-3 space-y-3">
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={() => addSlot("text")}>
              <Plus className="w-3 h-3 mr-1" />
              텍스트
            </Button>
            <Button size="sm" variant="outline" onClick={() => addSlot("image")}>
              <Plus className="w-3 h-3 mr-1" />
              사진
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPickerOpen(true)}
              disabled={assets.length === 0}
            >
              <Plus className="w-3 h-3 mr-1" />
              에셋
            </Button>
          </div>

          {!selected ? (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground pt-1">
                슬롯을 클릭해 편집하세요. 드래그로 이동(스냅 {snap ? "ON" : "OFF"}),
                아래에서 위치·크기·폰트 조정. Esc=선택해제, Delete=삭제.
              </p>
              {/* 샘플 데이터 — 미리보기에 들어가는 값(긴 이름/실제 식장명으로 넘침 확인) */}
              <div className="border-t border-border pt-2 space-y-1.5">
                <p className="text-[11px] font-semibold text-muted-foreground">
                  샘플 데이터 (미리보기용)
                </p>
                {(
                  [
                    ["groom_name", "신랑"],
                    ["bride_name", "신부"],
                    ["wedding_date", "날짜"],
                    ["venue_name", "식장"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <Label className="text-[10px] w-8 shrink-0">{label}</Label>
                    <Input
                      value={sampleData[key] ?? ""}
                      onChange={(e) =>
                        setSampleData((p) => ({ ...p, [key]: e.target.value }))
                      }
                      className="h-7 px-1.5 text-xs"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setSampleData(SAMPLE)}
                  className="text-[10px] text-muted-foreground underline"
                >
                  기본 샘플로 되돌리기
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">
                  {selected.type} · {selected.id.slice(0, 12)}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => duplicateSlot(selected.id)}
                    className="p-1 hover:bg-muted rounded"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteSlot(selected.id)}
                    className="p-1 hover:bg-muted rounded text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* z 순서 */}
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px] flex-1"
                  onClick={() => bringToFront(selected.id)}
                >
                  맨 앞으로
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px] flex-1"
                  onClick={() => sendToBack(selected.id)}
                >
                  맨 뒤로
                </Button>
              </div>

              {/* 위치/크기 */}
              <div className="grid grid-cols-4 gap-1">
                {(["x", "y", "w", "h"] as const).map((k) => (
                  <div key={k}>
                    <Label className="text-[10px]">{k}</Label>
                    <Input
                      type="number"
                      value={selected[k]}
                      onChange={numChange(selected.id, k)}
                      className="h-8 px-1 text-xs"
                    />
                  </div>
                ))}
              </div>

              {selected.type === "text" && (
                <>
                  <div>
                    <Label className="text-[10px]">텍스트</Label>
                    <Input
                      value={selected.text ?? ""}
                      onChange={(e) =>
                        updateSlot(selected.id, { text: e.target.value })
                      }
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px]">필드 바인딩</Label>
                    <Select
                      value={selected.field ?? "__none__"}
                      onValueChange={(v) =>
                        updateSlot(selected.id, {
                          field: v === "__none__" ? undefined : v,
                        })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="없음(고정 텍스트)" />
                      </SelectTrigger>
                      <SelectContent>
                        {FIELD_OPTIONS.map((f) => (
                          <SelectItem key={f} value={f || "__none__"}>
                            {f || "없음(고정)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px]">폰트</Label>
                    <Select
                      value={selected.font_family ?? "__default__"}
                      onValueChange={(v) =>
                        updateSlot(selected.id, {
                          font_family: v === "__default__" ? undefined : v,
                        })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="기본" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__default__">기본</SelectItem>
                        {fonts.map((f) => (
                          <SelectItem key={f.id} value={f.family}>
                            <span style={fontStyleOf(f)}>{f.name} 가나다 Ag</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <div>
                      <Label className="text-[10px]">크기</Label>
                      <Input
                        type="number"
                        value={selected.font_size ?? 18}
                        onChange={numChange(selected.id, "font_size")}
                        className="h-8 px-1 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px]">자간</Label>
                      <Input
                        type="number"
                        value={selected.letter_spacing ?? 0}
                        onChange={numChange(selected.id, "letter_spacing")}
                        className="h-8 px-1 text-xs"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <div>
                      <Label className="text-[10px]">색상</Label>
                      <Input
                        type="text"
                        value={selected.color ?? "#1A1A1A"}
                        onChange={(e) =>
                          updateSlot(selected.id, { color: e.target.value })
                        }
                        className="h-8 px-1 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px]">정렬</Label>
                      <Select
                        value={selected.align ?? "left"}
                        onValueChange={(v) =>
                          updateSlot(selected.id, {
                            align: v as InvitationSlot["align"],
                          })
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["left", "center", "right"].map((a) => (
                            <SelectItem key={a} value={a}>
                              {a}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-[10px]">회전(°)</Label>
                    <Input
                      type="number"
                      value={selected.rotation ?? 0}
                      onChange={numChange(selected.id, "rotation")}
                      className="h-8 px-1 text-xs"
                    />
                  </div>
                </>
              )}

              {selected.type === "image" && (
                <div className="space-y-2">
                  <div>
                    <Label className="text-[10px]">채움</Label>
                    <Select
                      value={selected.fit ?? "cover"}
                      onValueChange={(v) =>
                        updateSlot(selected.id, {
                          fit: v as InvitationSlot["fit"],
                        })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cover">
                          cover(꽉 채움·잘림)
                        </SelectItem>
                        <SelectItem value="contain">
                          contain(전체 보임·여백)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px]">자리표시 문구</Label>
                    <Input
                      value={selected.placeholder ?? ""}
                      onChange={(e) =>
                        updateSlot(selected.id, {
                          placeholder: e.target.value || undefined,
                        })
                      }
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              )}

              {selected.type === "asset" && (
                <div>
                  <Label className="text-[10px]">색 변경 (단색 에셋만)</Label>
                  <div className="flex gap-1 items-center">
                    <Input
                      type="text"
                      placeholder="#000000 (비우면 원본색)"
                      value={selected.tint_color ?? ""}
                      onChange={(e) =>
                        updateSlot(selected.id, {
                          tint_color: e.target.value || undefined,
                        })
                      }
                      className="h-8 px-1 text-xs"
                    />
                    {selected.tint_color && (
                      <span
                        className="w-7 h-7 rounded border shrink-0"
                        style={{ background: selected.tint_color }}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>

      {pickerOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-6"
          onClick={() => setPickerOpen(false)}
        >
          <div
            className="bg-background rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] overflow-auto p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">에셋 선택</h3>
              <button onClick={() => setPickerOpen(false)} className="p-1 hover:bg-muted rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <Input
              autoFocus
              value={assetQuery}
              onChange={(e) => setAssetQuery(e.target.value)}
              placeholder="에셋 이름 검색 (예: 꽃, 리본, 하트)"
              className="h-9 text-sm mb-3"
            />
            {(() => {
              const aq = assetQuery.trim().toLowerCase();
              const match = (a: AssetOpt) =>
                !aq || a.name.toLowerCase().includes(aq);
              const cats = ASSET_CATS.filter((c) =>
                assets.some((a) => a.category === c && match(a)),
              );
              if (cats.length === 0) {
                return (
                  <p className="text-center text-xs text-muted-foreground py-12">
                    검색 결과가 없어요.
                  </p>
                );
              }
              return cats.map((cat) => (
                <div key={cat} className="mb-4">
                  <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">
                    {cat}
                  </p>
                  <div className="grid grid-cols-5 gap-2">
                    {assets
                      .filter((a) => a.category === cat && match(a))
                      .map((a) => (
                        <button
                          key={a.id}
                          onClick={() => addAsset(a)}
                          title={a.name}
                          className="aspect-square border border-border rounded hover:border-primary hover:bg-muted/50 flex items-center justify-center p-2 bg-white"
                        >
                          <img
                            src={a.image_url}
                            alt={a.name}
                            className="max-w-full max-h-full object-contain"
                          />
                        </button>
                      ))}
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTemplateEditor;
