import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Camera, X, Loader2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCoupleDiary } from "@/hooks/useCoupleDiary";
import { useAuth } from "@/contexts/AuthContext";
import { useTextDraft } from "@/hooks/useTextDraft";
import { toast } from "sonner";

const moods = [
  { value: "happy", emoji: "", label: "행복" },
  { value: "excited", emoji: "", label: "설렘" },
  { value: "love", emoji: "", label: "사랑" },
  { value: "tired", emoji: "", label: "피곤" },
  { value: "worried", emoji: "", label: "걱정" },
];

const CoupleDiaryWrite = () => {
  const navigate = useNavigate();
  // 같은 컴포넌트가 /write(작성)과 /edit/:id(수정) 둘 다를 담당한다.
  const { id: editId } = useParams<{ id: string }>();
  const isEdit = !!editId;
  const { entries, createEntry, updateEntry, deletePhoto } = useCoupleDiary();
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [diaryDate, setDiaryDate] = useState(new Date().toISOString().split("T")[0]);
  const [mood, setMood] = useState<string>("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  // 수정 모드: 기존 entry 로딩/prefill 상태. 새로고침 직후 entries 가 아직
  // 비어 있을 수 있어 별도 추적한다(없으면 "찾을 수 없음" 안내).
  const [prefilled, setPrefilled] = useState(false);
  const existing = isEdit ? entries.find((e) => e.id === editId) : undefined;

  // 수정 모드 prefill — entries 가 로드되면 1회 채운다.
  useEffect(() => {
    if (!isEdit || prefilled || !existing) return;
    setTitle(existing.title);
    setContent(existing.content);
    setDiaryDate(existing.diary_date);
    setMood(existing.mood || "");
    setPrefilled(true);
  }, [isEdit, prefilled, existing]);

  // 미저장 입력 유실 방지(iOS 웹 등). 사진(File)은 직렬화 불가라 텍스트만 임시저장.
  // 수정 모드는 prefill 과 충돌하지 않도록 draft 자동저장을 끈다(짧은 편집 세션).
  const draft = useTextDraft({
    scope: "couple-diary-write",
    userId: user?.id,
    enabled: !!user && !isEdit,
    values: { title, content, diaryDate, mood },
    apply: (d) => {
      if (d.title != null) setTitle(d.title);
      if (d.content != null) setContent(d.content);
      if (d.diaryDate) setDiaryDate(d.diaryDate);
      if (d.mood != null) setMood(d.mood);
    },
    hasContent: (v) => !!(v.title?.trim() || v.content?.trim()),
  });

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const existingCount = existing?.photos.length || 0;
    if (existingCount + photos.length + files.length > 5) {
      toast.info("사진은 최대 5장까지 첨부할 수 있어요");
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
    const newPhotos = photos.length > 0 ? photos : undefined;
    const success = isEdit
      ? await updateEntry(editId!, title.trim(), content.trim(), diaryDate, mood || undefined, newPhotos)
      : await createEntry(title.trim(), content.trim(), diaryDate, mood || undefined, newPhotos);
    setIsSaving(false);

    if (success) {
      if (!isEdit) draft.clear();
      navigate("/couple-diary");
    }
  };

  // 수정 모드인데 해당 일기를 찾을 수 없으면(이미 로드됐는데 없음) 안내.
  const notFound = isEdit && entries.length > 0 && !existing;

  const totalPhotos = (existing?.photos.length || 0) + photos.length;

  return (
    <div className="min-h-screen bg-background app-col mx-auto relative">
      <PageHeader
        title={isEdit ? "일기 수정" : "일기 쓰기"}
        rightExtra={
          <Button onClick={handleSave} disabled={!title.trim() || !content.trim() || isSaving || notFound} size="sm">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            저장
          </Button>
        }
      />

      {notFound ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <p className="text-sm text-muted-foreground mb-4">일기를 찾을 수 없어요</p>
          <Button variant="outline" size="sm" onClick={() => navigate("/couple-diary")}>
            목록으로
          </Button>
        </div>
      ) : (
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
                aria-label={m.label}
                aria-pressed={mood === m.value}
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
            사진 ({totalPhotos}/5)
          </label>
          <div className="flex gap-2 flex-wrap">
            {/* 기존 사진(수정 모드) — 삭제 가능 */}
            {existing?.photos.map((photo) => (
              <div key={photo.id} className="relative w-20 h-20 rounded-xl overflow-hidden">
                <img src={photo.photo_url} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => deletePhoto(photo.id, photo.storage_path)}
                  aria-label="기존 사진 삭제"
                  className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
            {/* 새로 추가한 사진 */}
            {photoPreview.map((src, idx) => (
              <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden">
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => removePhoto(idx)}
                  aria-label="사진 삭제"
                  className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
            {totalPhotos < 5 && (
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
      )}
    </div>
  );
};

export default CoupleDiaryWrite;
