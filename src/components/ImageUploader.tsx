import { useState, useRef, useCallback } from "react";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ImageUploaderProps {
  /** Storage 버킷 ID (예: 'dress-samples') */
  bucket: string;
  /** Storage 내부 경로 prefix (선택, 예: 'dresses/') */
  pathPrefix?: string;
  /** 업로드 완료 시 콜백 (Storage 내부 경로 전달) */
  onUploaded: (path: string, publicUrl: string) => void;
  /** 현재 미리보기 URL (편집 시) */
  initialUrl?: string;
  /** 최대 파일 크기 (MB) */
  maxSizeMB?: number;
  /** 클래스 보강 */
  className?: string;
}

/**
 * 어드민용 단일 이미지 업로드 컴포넌트.
 * - 드래그&드롭 또는 클릭 업로드
 * - 즉시 Storage 업로드 (UUID 파일명 자동 생성)
 * - 업로드 후 콜백으로 path·publicUrl 전달
 *
 * 사용 예:
 *   <ImageUploader
 *     bucket="dress-samples"
 *     onUploaded={(path, url) => setForm({ ...form, image_url: url, path })}
 *   />
 */
const ImageUploader = ({
  bucket,
  pathPrefix = "",
  onUploaded,
  initialUrl,
  maxSizeMB = 5,
  className,
}: ImageUploaderProps) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialUrl ?? null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      // 크기 검증
      if (file.size > maxSizeMB * 1024 * 1024) {
        toast({
          title: "파일이 너무 큽니다",
          description: `최대 ${maxSizeMB}MB 까지 업로드 가능합니다.`,
          variant: "destructive",
        });
        return;
      }
      // 형식 검증
      if (!file.type.startsWith("image/")) {
        toast({
          title: "이미지 파일만 업로드 가능합니다",
          variant: "destructive",
        });
        return;
      }

      setIsUploading(true);
      try {
        // UUID 파일명 (확장자 보존)
        const ext = file.name.split(".").pop()?.toLowerCase() || "png";
        const filename = `${crypto.randomUUID()}.${ext}`;
        const path = pathPrefix ? `${pathPrefix}${filename}` : filename;

        // Storage 업로드
        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type,
          });

        if (uploadError) throw uploadError;

        // public URL 생성
        const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path);

        setPreviewUrl(publicData.publicUrl);
        onUploaded(path, publicData.publicUrl);

        toast({ title: "업로드 완료" });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "알 수 없는 오류";
        toast({
          title: "업로드 실패",
          description: msg,
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
      }
    },
    [bucket, pathPrefix, maxSizeMB, onUploaded],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = ""; // 같은 파일 재선택 가능하게
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleClear = () => {
    setPreviewUrl(null);
  };

  return (
    <div className={cn("w-full", className)}>
      {previewUrl && !isUploading ? (
        <div className="relative group">
          <img
            src={previewUrl}
            alt="업로드된 이미지"
            className="w-full aspect-square object-cover rounded-lg border border-border"
          />
          <button
            type="button"
            onClick={handleClear}
            className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="이미지 제거"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute bottom-2 right-2 px-3 py-1 bg-black/60 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
          >
            교체
          </button>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "w-full aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 bg-muted/30",
          )}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">업로드 중...</p>
            </>
          ) : (
            <>
              <div className="p-3 bg-background rounded-full">
                {isDragging ? (
                  <ImageIcon className="w-6 h-6 text-primary" />
                ) : (
                  <Upload className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  {isDragging ? "여기에 놓기" : "이미지 업로드"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  드래그&드롭 또는 클릭 (최대 {maxSizeMB}MB)
                </p>
              </div>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        className="hidden"
      />
    </div>
  );
};

export default ImageUploader;
