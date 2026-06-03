import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, ImagePlus, Loader2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import VendorTagPicker from "@/components/community/VendorTagPicker";
import type { VendorLite } from "@/hooks/useCommunityPlaces";

// Community.tsx 와 동일 카테고리 세트(전체 제외). 페르소나별 카테고리 포함.
const categories = [
  "웨딩홀", "스드메", "혼수", "허니문",
  "신랑 모드", "재혼·자녀", "임신 결혼",
  "해외·국제결혼", "지방 결혼", "노웨딩·셀프", "스냅·기념일",
  "자유",
];

// 작성 중 글이 백그라운드 전환·뒤로가기로 날아가지 않도록 텍스트를 임시 저장한다.
// (이미지 File 객체는 직렬화 불가라 텍스트만 보존)
const DRAFT_KEY = "dewy:community-write:draft";

type PostWeddingStyle = "general" | "small" | "self";

const STYLE_OPTIONS: { value: PostWeddingStyle | ""; label: string; hint: string }[] = [
  { value: "", label: "선택 안 함", hint: "모든 스타일 필터에서 노출돼요" },
  { value: "general", label: "일반 결혼식", hint: "표준 웨딩홀·식순 기반" },
  { value: "small", label: "스몰웨딩", hint: "50명 이하·하우스/레스토랑" },
  { value: "self", label: "셀프웨딩", hint: "직접 준비·DIY" },
];

const CommunityWrite = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { weddingSettings } = useWeddingSchedule();
  const [selectedCategory, setSelectedCategory] = useState("");
  const [weddingStyle, setWeddingStyle] = useState<PostWeddingStyle | "">("");
  const [styleAutoApplied, setStyleAutoApplied] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [selectedVendors, setSelectedVendors] = useState<VendorLite[]>([]);

  // 임시 저장된 작성 내용 복원 (마운트 시 1회)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.selectedCategory) setSelectedCategory(d.selectedCategory);
        if (d.weddingStyle) { setWeddingStyle(d.weddingStyle); setStyleAutoApplied(true); }
        if (d.title) setTitle(d.title);
        if (d.content) setContent(d.content);
      }
    } catch { /* 손상된 draft 무시 */ }
    setDraftLoaded(true);
  }, []);

  // 내용 변경 시 자동 임시 저장
  useEffect(() => {
    if (!draftLoaded) return;
    if (!title && !content && !selectedCategory && !weddingStyle) {
      localStorage.removeItem(DRAFT_KEY);
      return;
    }
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ selectedCategory, weddingStyle, title, content }));
    } catch { /* 저장 실패 무시 */ }
  }, [draftLoaded, selectedCategory, weddingStyle, title, content]);

  // 사용자의 결혼 유형이 로드되면 첫 1회 자동 선택. 직접 바꾼 뒤에는 덮어쓰지 않음.
  useEffect(() => {
    if (styleAutoApplied) return;
    const myStyle = weddingSettings.wedding_style;
    if (!myStyle || myStyle === "custom") return;
    setWeddingStyle(myStyle);
    setStyleAutoApplied(true);
  }, [weddingSettings.wedding_style, styleAutoApplied]);

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: File[] = [];
    const newPreviews: string[] = [];

    Array.from(files).forEach((file) => {
      if (images.length + newImages.length >= 5) {
        toast.error("이미지는 최대 5장까지 첨부할 수 있습니다.");
        return;
      }
      newImages.push(file);
      newPreviews.push(URL.createObjectURL(file));
    });

    setImages([...images, ...newImages]);
    setImagePreviews([...imagePreviews, ...newPreviews]);
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setImages(images.filter((_, i) => i !== index));
    setImagePreviews(imagePreviews.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    if (!user || images.length === 0) return [];

    const uploadedUrls: string[] = [];

    for (const image of images) {
      const fileExt = image.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error } = await supabase.storage
        .from("community-images")
        .upload(fileName, image);

      if (error) {
        console.error("Image upload error:", error);
        throw new Error("이미지 업로드에 실패했습니다.");
      }

      const { data: urlData } = supabase.storage
        .from("community-images")
        .getPublicUrl(fileName);

      uploadedUrls.push(urlData.publicUrl);
    }

    return uploadedUrls;
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error("로그인이 필요합니다.");
      navigate("/auth");
      return;
    }

    if (!selectedCategory) {
      toast.error("카테고리를 선택해주세요.");
      return;
    }

    if (!title.trim()) {
      toast.error("제목을 입력해주세요.");
      return;
    }

    if (!content.trim()) {
      toast.error("내용을 입력해주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      let imageUrls: string[] = [];
      if (images.length > 0) {
        imageUrls = await uploadImages();
      }

      const { data, error } = await supabase
        .from("community_posts")
        .insert({
          user_id: user.id,
          category: selectedCategory,
          title: title.trim(),
          content: content.trim(),
          has_image: imageUrls.length > 0,
          image_urls: imageUrls,
          wedding_style: weddingStyle === "" ? null : weddingStyle,
        })
        .select()
        .single();

      if (error) throw error;

      // 태그한 업체 연결 (실패해도 글 작성은 성공으로 처리).
      if (selectedVendors.length > 0) {
        const { error: linkErr } = await supabase
          .from("community_post_places")
          .insert(selectedVendors.map((v) => ({ post_id: data.id, place_id: v.place_id })));
        if (linkErr) console.warn("vendor link failed:", linkErr.message);
      }

      localStorage.removeItem(DRAFT_KEY);
      toast.success("게시글이 작성되었습니다.");
      navigate(`/community/${data.id}`);
    } catch (error) {
      console.error("Post creation error:", error);
      toast.error("게시글 작성에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto">
      <PageHeader
        title="글쓰기"
        rightExtra={
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedCategory || !title.trim() || !content.trim()}
            size="sm"
            className="h-8"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "등록"
            )}
          </Button>
        }
      />

      {/* Content */}
      <main className="p-4 space-y-6">
        {/* Category Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            카테고리 <span className="text-destructive">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => handleCategorySelect(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Wedding Style Tag */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            결혼 유형 <span className="text-muted-foreground font-normal">(선택)</span>
          </label>
          <p className="text-xs text-muted-foreground">
            같은 유형의 부부들이 내 글을 더 쉽게 찾을 수 있어요.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {STYLE_OPTIONS.map((opt) => {
              const isActive = weddingStyle === opt.value;
              return (
                <button
                  key={opt.value || "none"}
                  type="button"
                  onClick={() => {
                    setWeddingStyle(opt.value);
                    setStyleAutoApplied(true);
                  }}
                  className={`text-left px-3 py-2.5 rounded-xl border transition-colors ${
                    isActive
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:bg-muted/40"
                  }`}
                >
                  <p className={`text-sm font-semibold ${isActive ? "text-primary" : "text-foreground"}`}>
                    {opt.label}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {opt.hint}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Title Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            제목 <span className="text-destructive">*</span>
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목을 입력해주세요"
            maxLength={100}
          />
          <p className="text-xs text-muted-foreground text-right">
            {title.length}/100
          </p>
        </div>

        {/* Content Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            내용 <span className="text-destructive">*</span>
          </label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="내용을 입력해주세요"
            className="min-h-[200px] resize-none"
            maxLength={5000}
          />
          <p className="text-xs text-muted-foreground text-right">
            {content.length}/5000
          </p>
        </div>

        {/* Image Upload */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            이미지 첨부 <span className="text-muted-foreground font-normal">(최대 5장)</span>
          </label>
          
          <div className="flex flex-wrap gap-2">
            {imagePreviews.map((preview, index) => (
              <div key={index} className="relative w-20 h-20">
                <img
                  src={preview}
                  alt={`첨부 이미지 ${index + 1}`}
                  className="w-full h-full object-cover rounded-lg"
                />
                <button
                  onClick={() => removeImage(index)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            
            {images.length < 5 && (
              <label className="w-20 h-20 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
                <ImagePlus className="w-6 h-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground mt-1">
                  {images.length}/5
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        {/* Vendor Tag */}
        <div>
          <VendorTagPicker value={selectedVendors} onChange={setSelectedVendors} />
        </div>

        {/* Info Notice */}
        <div className="p-4 bg-muted rounded-xl">
          <p className="text-xs text-muted-foreground leading-relaxed">
            • 작성 중 내용은 자동 임시저장돼요. 나갔다 와도 이어서 쓸 수 있어요. (이미지 제외)<br />
            • 게시글은 익명으로 작성됩니다.<br />
            • 부적절한 내용이 포함된 게시글은 삭제될 수 있습니다.<br />
            • 타인을 비방하거나 불쾌감을 주는 글은 삼가해주세요.
          </p>
        </div>
      </main>
    </div>
  );
};

export default CommunityWrite;
