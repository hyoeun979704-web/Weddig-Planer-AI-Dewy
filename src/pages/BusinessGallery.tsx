import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, GripVertical, Image as ImageIcon, Sparkles, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface GalleryImage {
  id: string;
  image_url: string;
  storage_path: string;
  caption: string | null;
  image_type: string;
  display_order: number;
}

interface Highlight {
  id: string;
  title: string;
  description: string | null;
  icon: string;
  display_order: number;
}

const BusinessGallery = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { businessProfile, isBusiness, isLoading: roleLoading } = useUserRole();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [images, setImages] = useState<GalleryImage[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // New highlight form
  const [newHighlight, setNewHighlight] = useState({ title: "", description: "", icon: "✨" });
  const [showHighlightForm, setShowHighlightForm] = useState(false);

  const vendorId = businessProfile?.vendor_id;

  useEffect(() => {
    if (roleLoading) return;
    if (!isBusiness || !vendorId) {
      navigate("/business/dashboard");
      return;
    }

    const fetchData = async () => {
      const [imgRes, hlRes] = await Promise.all([
        (supabase as any).from("vendor_gallery").select("*").eq("vendor_id", vendorId).order("display_order"),
        (supabase as any).from("vendor_highlights").select("*").eq("vendor_id", vendorId).order("display_order"),
      ]);

      setImages(imgRes.data || []);
      setHighlights(hlRes.data || []);
      setIsLoadingData(false);
    };

    fetchData();
  }, [roleLoading, isBusiness, vendorId, navigate]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || !user || !vendorId) return;
    setIsUploading(true);

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name}은 이미지 파일이 아닙니다`);
          continue;
        }
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name}은 5MB를 초과합니다`);
          continue;
        }

        const ext = file.name.split(".").pop();
        const path = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("vendor-images")
          .upload(path, file);

        if (uploadError) {
          toast.error(`업로드 실패: ${uploadError.message}`);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from("vendor-images")
          .getPublicUrl(path);

        const { error: insertError } = await (supabase as any)
          .from("vendor_gallery")
          .insert({
            vendor_id: vendorId,
            image_url: publicUrl,
            storage_path: path,
            display_order: images.length,
            image_type: "gallery",
          });

        if (insertError) {
          toast.error(`등록 실패: ${insertError.message}`);
        } else {
          setImages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              image_url: publicUrl,
              storage_path: path,
              caption: null,
              image_type: "gallery",
              display_order: prev.length,
            },
          ]);
        }
      }
      toast.success("이미지가 업로드되었습니다");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("업로드 중 오류가 발생했습니다");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteImage = async (img: GalleryImage) => {
    try {
      await supabase.storage.from("vendor-images").remove([img.storage_path]);
      await (supabase as any).from("vendor_gallery").delete().eq("id", img.id);
      setImages((prev) => prev.filter((i) => i.id !== img.id));
      toast.success("이미지가 삭제되었습니다");
    } catch (error) {
      toast.error("삭제에 실패했습니다");
    }
  };

  const handleAddHighlight = async () => {
    if (!newHighlight.title || !vendorId) return;

    try {
      const { data, error } = await (supabase as any)
        .from("vendor_highlights")
        .insert({
          vendor_id: vendorId,
          title: newHighlight.title,
          description: newHighlight.description || null,
          icon: newHighlight.icon || "✨",
          display_order: highlights.length,
        })
        .select()
        .single();

      if (error) throw error;

      setHighlights((prev) => [...prev, data]);
      setNewHighlight({ title: "", description: "", icon: "✨" });
      setShowHighlightForm(false);
      toast.success("장점카드가 추가되었습니다");
    } catch (error) {
      toast.error("추가에 실패했습니다");
    }
  };

  const handleDeleteHighlight = async (id: string) => {
    try {
      await (supabase as any).from("vendor_highlights").delete().eq("id", id);
      setHighlights((prev) => prev.filter((h) => h.id !== id));
      toast.success("장점카드가 삭제되었습니다");
    } catch {
      toast.error("삭제에 실패했습니다");
    }
  };

  if (isLoadingData || roleLoading) {
    return (
      <div className="min-h-screen bg-background max-w-[430px] mx-auto flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const ICON_OPTIONS = ["✨", "🏆", "💎", "🎯", "🌟", "💐", "🎨", "📸", "🍽️", "🅿️", "🎵", "💡"];

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center h-14 px-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-center font-semibold text-lg pr-10">이미지/장점카드 관리</h1>
        </div>
      </header>

      <Tabs defaultValue="gallery" className="w-full">
        <TabsList className="w-full rounded-none border-b border-border bg-background h-11">
          <TabsTrigger value="gallery" className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
            <ImageIcon className="w-4 h-4 mr-1.5" /> 갤러리 ({images.length})
          </TabsTrigger>
          <TabsTrigger value="highlights" className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
            <Sparkles className="w-4 h-4 mr-1.5" /> 장점카드 ({highlights.length})
          </TabsTrigger>
        </TabsList>

        {/* Gallery Tab */}
        <TabsContent value="gallery" className="p-4 space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
          />

          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full h-11 gap-2"
            variant="outline"
          >
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            이미지 업로드
          </Button>

          {images.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">아직 등록된 이미지가 없습니다</p>
              <p className="text-xs mt-1">상세페이지에 표시될 이미지를 업로드하세요</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {images.map((img) => (
                <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden group">
                  <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => handleDeleteImage(img)}
                    className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-destructive/80 text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Highlights Tab */}
        <TabsContent value="highlights" className="p-4 space-y-4">
          {!showHighlightForm ? (
            <Button onClick={() => setShowHighlightForm(true)} className="w-full h-11 gap-2" variant="outline">
              <Plus className="w-4 h-4" /> 장점카드 추가
            </Button>
          ) : (
            <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">새 장점카드</Label>
                <button onClick={() => setShowHighlightForm(false)}>
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">아이콘</Label>
                <div className="flex flex-wrap gap-2">
                  {ICON_OPTIONS.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setNewHighlight((p) => ({ ...p, icon }))}
                      className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${
                        newHighlight.icon === icon ? "bg-primary/10 ring-2 ring-primary" : "bg-muted"
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">제목 *</Label>
                <Input
                  placeholder="예: 프리미엄 신부대기실"
                  value={newHighlight.title}
                  onChange={(e) => setNewHighlight((p) => ({ ...p, title: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">설명</Label>
                <Input
                  placeholder="예: 넓고 쾌적한 전용 대기실 제공"
                  value={newHighlight.description}
                  onChange={(e) => setNewHighlight((p) => ({ ...p, description: e.target.value }))}
                />
              </div>

              <Button onClick={handleAddHighlight} disabled={!newHighlight.title} className="w-full">
                추가
              </Button>
            </div>
          )}

          {highlights.length === 0 && !showHighlightForm ? (
            <div className="text-center py-12 text-muted-foreground">
              <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">아직 등록된 장점카드가 없습니다</p>
              <p className="text-xs mt-1">업체의 강점을 카드로 만들어보세요</p>
            </div>
          ) : (
            <div className="space-y-2">
              {highlights.map((hl) => (
                <div key={hl.id} className="flex items-center gap-3 bg-card rounded-xl border border-border p-3">
                  <span className="text-2xl">{hl.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{hl.title}</p>
                    {hl.description && (
                      <p className="text-xs text-muted-foreground truncate">{hl.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteHighlight(hl.id)}
                    className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BusinessGallery;
