import { useCallback, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Scissors } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  extractStickers,
  dataUrlToBlob,
  type StickerPiece,
} from "@/lib/invitation/sheetSplit";

const BUCKET = "invitation-assets";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onDone: () => void;
  categories: { value: string; label: string }[];
}

export default function SheetSplitDialog({
  open,
  onOpenChange,
  onDone,
  categories,
}: Props) {
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
  const [pieces, setPieces] = useState<StickerPiece[]>([]);
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [tol, setTol] = useState(28);
  const [merge, setMerge] = useState(4);
  const [category, setCategory] = useState("STICKER");
  const [collection, setCollection] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [recolor, setRecolor] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const run = useCallback(
    (img: HTMLImageElement, t: number, m: number) => {
      setProcessing(true);
      setTimeout(() => {
        try {
          const ps = extractStickers(img, { bgTolerance: t, dilate: m });
          setPieces(ps);
          setSel(new Set(ps.map((_, i) => i)));
        } catch (e) {
          toast({
            title: "분석 실패",
            description: String(e),
            variant: "destructive",
          });
        } finally {
          setProcessing(false);
        }
      }, 30);
    },
    [],
  );

  const onFile = (f: File) => {
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      setImgEl(img);
      run(img, tol, merge);
    };
    img.onerror = () =>
      toast({ title: "이미지 로드 실패", variant: "destructive" });
    img.src = url;
  };

  const toggle = (i: number) =>
    setSel((s) => {
      const n = new Set(s);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });

  const register = async () => {
    const idxs = [...sel].sort((a, b) => a - b);
    if (!idxs.length) {
      toast({ title: "선택된 조각이 없어요", variant: "destructive" });
      return;
    }
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    setUploading(true);
    setProgress(0);
    let ok = 0;
    for (let k = 0; k < idxs.length; k++) {
      const p = pieces[idxs[k]];
      try {
        const blob = dataUrlToBlob(p.dataUrl);
        const path = `sheet/${crypto.randomUUID()}.png`;
        const up = await supabase.storage
          .from(BUCKET)
          .upload(path, blob, {
            cacheControl: "3600",
            upsert: false,
            contentType: "image/png",
          });
        if (up.error) throw up.error;
        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
        const label =
          collection ||
          categories.find((c) => c.value === category)?.label ||
          "스티커";
        const name = `${label} ${k + 1}`;
        const ins = await (supabase as any).from("invitation_assets").insert({
          name,
          image_url: pub.publicUrl,
          category,
          collection: collection || null,
          tags,
          is_recolorable: recolor,
          natural_width: p.width,
          natural_height: p.height,
          is_active: true,
          display_order: 0,
        });
        if (ins.error) throw ins.error;
        ok++;
      } catch (e) {
        console.error("piece register failed", e);
      }
      setProgress(Math.round(((k + 1) / idxs.length) * 100));
    }
    setUploading(false);
    toast({ title: `${ok}/${idxs.length}개 등록 완료` });
    onDone();
    if (ok > 0) {
      setPieces([]);
      setSel(new Set());
      setImgEl(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="w-4 h-4" /> 시트 자동 누끼 + 분리 등록
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 업로드 */}
          <div>
            <Button
              variant="outline"
              onClick={() => fileRef.current?.click()}
              className="w-full"
            >
              스티커 시트 이미지 선택 (여러 요소가 한 장에)
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) onFile(f);
              }}
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              연한/단색 배경 시트에 최적 (모서리 색을 배경으로 보고 제거).
            </p>
          </div>

          {/* 분석 파라미터 */}
          {imgEl && (
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border border-border bg-muted/30">
              <div>
                <Label className="text-[12px]">
                  배경 제거 강도 ({tol})
                </Label>
                <input
                  type="range"
                  min={6}
                  max={70}
                  value={tol}
                  onChange={(e) => setTol(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <Label className="text-[12px]">조각 병합 ({merge})</Label>
                <input
                  type="range"
                  min={0}
                  max={8}
                  value={merge}
                  onChange={(e) => setMerge(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="col-span-2"
                disabled={processing}
                onClick={() => imgEl && run(imgEl, tol, merge)}
              >
                {processing ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : null}
                다시 분석
              </Button>
            </div>
          )}

          {/* 조각 미리보기 */}
          {pieces.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[12px] font-semibold">
                  분리된 {pieces.length}개 · 선택 {sel.size}개
                </p>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-[11px]"
                    onClick={() => setSel(new Set(pieces.map((_, i) => i)))}
                  >
                    전체 선택
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-[11px]"
                    onClick={() => setSel(new Set())}
                  >
                    해제
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-64 overflow-y-auto p-1">
                {pieces.map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggle(i)}
                    className={`relative aspect-square rounded border bg-[linear-gradient(45deg,#eee_25%,transparent_25%),linear-gradient(-45deg,#eee_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#eee_75%),linear-gradient(-45deg,transparent_75%,#eee_75%)] bg-[length:12px_12px] bg-[position:0_0,0_6px,6px_-6px,-6px_0] ${
                      sel.has(i)
                        ? "border-primary ring-2 ring-primary"
                        : "border-border opacity-60"
                    }`}
                  >
                    <img
                      src={p.dataUrl}
                      alt=""
                      className="w-full h-full object-contain p-1"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 공통 메타 */}
          {pieces.length > 0 && (
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-[12px]">카테고리</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[12px]">세트·컬렉션</Label>
                <Input
                  value={collection}
                  onChange={(e) => setCollection(e.target.value)}
                  placeholder="예: 레드 코케트"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-[12px]">공통 태그 (쉼표)</Label>
                <Input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="예: 레드, 손그림, 발렌타인"
                />
              </div>
              <label className="flex items-center gap-2 text-[12px] sm:col-span-2">
                <Checkbox
                  checked={recolor}
                  onCheckedChange={(v) => setRecolor(!!v)}
                />
                색변경 가능(단색 라인아트)
              </label>
            </div>
          )}

          {/* 등록 */}
          {pieces.length > 0 && (
            <Button
              onClick={register}
              disabled={uploading || sel.size === 0}
              className="w-full h-11"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  업로드 중… {progress}%
                </>
              ) : (
                `선택 ${sel.size}개 스토리지 업로드 + 등록`
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
