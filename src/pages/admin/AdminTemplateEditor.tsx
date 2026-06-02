import { useEffect, useMemo, useState, type ChangeEvent } from "react";
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
  const [layout, setLayout] = useState<InvitationLayout>(() =>
    clone(template.layout),
  );
  const [name, setName] = useState(template.name);
  const [pageIdx, setPageIdx] = useState(0);
  const [selId, setSelId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

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

  // ── 슬롯 변경 헬퍼 (현재 페이지 슬롯 배열을 갱신) ──
  const setPageSlots = (updater: (s: InvitationSlot[]) => InvitationSlot[]) => {
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
    });
  };

  const updateSlot = (id: string, patch: Partial<InvitationSlot>) =>
    setPageSlots((arr) =>
      arr.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    );

  const moveSlot = (id: string, x: number, y: number) =>
    updateSlot(id, { x: Math.round(x), y: Math.round(y) });

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
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable)
      )
        return;
      if (e.key === "Escape") setSelId(null);
      else if ((e.key === "Delete" || e.key === "Backspace") && selId) {
        e.preventDefault();
        deleteSlot(selId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selId]);

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
        <div className="flex-1 overflow-auto bg-muted/40 flex items-start justify-center p-6">
          <div className="shadow-lg">
            <InvitationCanvas
              key={`${page.id}:${slots.length}`}
              layout={pageToLayout(page)}
              userData={SAMPLE}
              aiText={{}}
              textOverrides={{}}
              imageUrls={{}}
              fontsReady={fontsReady}
              selectedSlotId={selId}
              onSelectSlot={setSelId}
              displayWidth={Math.min(640, page.canvas.w)}
              editable
              unlockAll
              onMoveSlot={moveSlot}
              background="#ffffff"
            />
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
          </div>

          {!selected ? (
            <p className="text-xs text-muted-foreground pt-4">
              슬롯을 클릭해 편집하세요. 드래그로 이동, 아래에서 위치·크기·폰트
              조정.
            </p>
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
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default AdminTemplateEditor;
