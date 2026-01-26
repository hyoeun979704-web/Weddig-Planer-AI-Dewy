import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, X, ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const categories = ["웨딩홀", "스드메", "혼수", "허니문", "자유"];

const CommunityWrite = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        })
        .select()
        .single();

      if (error) throw error;

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
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">글쓰기</h1>
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
        </div>
      </header>

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
                onClick={() => setSelectedCategory(category)}
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

        {/* Info Notice */}
        <div className="p-4 bg-muted rounded-xl">
          <p className="text-xs text-muted-foreground leading-relaxed">
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
