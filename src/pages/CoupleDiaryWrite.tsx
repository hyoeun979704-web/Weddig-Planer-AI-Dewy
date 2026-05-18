import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCoupleDiary } from "@/hooks/useCoupleDiary";

const moods = [
  { value: "happy", emoji: "😊", label: "행복" },
  { value: "excited", emoji: "🥰", label: "설렘" },
  { value: "love", emoji: "💕", label: "사랑" },
  { value: "tired", emoji: "😴", label: "피곤" },
  { value: "worried", emoji: "😟", label: "걱정" },
];

const CoupleDiaryWrite = () => {
  const navigate = useNavigate();
  const { createEntry } = useCoupleDiary();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [diaryDate, setDiaryDate] = useState(new Date().toISOString().split("T")[0]);
  const [mood, setMood] = useState<string>("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (photos.length + files.length > 5) {
      alert("사진은 최대 5장까지 첨부할 수 있어요");
      return;
    }

    setPhotos((prev) => [...prev, ...files]);

    // 미리보기 생성
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPhotoPreview((prev) => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreview((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) return;

    setIsSaving(true);
    const success = await createEntry(title.trim(), content.trim(), diaryDate, mood || undefined, photos.length > 0 ? photos : undefined);
    setIsSaving(false);

    if (success) {
      navigate("/couple-diary");
    }
  };

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-1">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-lg font-bold text-foreground">일기 쓰기</h1>
          </div>
          <Button onClick={handleSave} disabled={!title.trim() || !content.trim() || isSaving} size="sm">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            저장
          </Button>
        </div>
      </header>

      <main className="px-4 py-4 pb-20 space-y-5">
        {/* Date */}
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">날짜</label>
          <Input type="date" value={diaryDate} onChange={(e) => setDiaryDate(e.target.value)} />
        </div>

        {/* Mood */}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">오늘의 기분</label>
          <div className="flex gap-2">
            {moods.map((m) => (
              <button
                key={m.value}
                onClick={() => setMood(mood === m.value ? "" : m.value)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl border transition-all ${
                  mood === m.value
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <span className="text-xl">{m.emoji}</span>
                <span className="text-[10px] text-muted-foreground">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">제목</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="오늘의 웨딩 준비 이야기"
            maxLength={50}
          />
        </div>

        {/* Content */}
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">내용</label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="오늘 있었던 일을 기록해보세요..."
            className="min-h-[200px] resize-none"
          />
        </div>

        {/* Photos */}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            사진 ({photos.length}/5)
          </label>
          <div className="flex gap-2 flex-wrap">
            {photoPreview.map((src, idx) => (
              <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden">
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => removePhoto(idx)}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
            {photos.length < 5 && (
              <label className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
                <Camera className="w-5 h-5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground mt-1">추가</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default CoupleDiaryWrite;
