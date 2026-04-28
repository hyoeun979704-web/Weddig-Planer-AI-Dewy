import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Heart, Loader2, BookOpen, Trash2 } from "lucide-react";
import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { useCoupleDiary, DiaryEntry } from "@/hooks/useCoupleDiary";
import { useCoupleLink } from "@/hooks/useCoupleLink";
import { useAuth } from "@/contexts/AuthContext";

const moodEmojis: Record<string, string> = {
  happy: "😊",
  excited: "🥰",
  love: "💕",
  tired: "😴",
  worried: "😟",
};

const CoupleDiary = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isLinked } = useCoupleLink();
  const { entries, isLoading, deleteEntry } = useCoupleDiary();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await deleteEntry(id);
    setDeletingId(null);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
    const weekday = weekdays[date.getDay()];
    return `${month}월 ${day}일 (${weekday})`;
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center pt-32">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Header */}
      <header className="sticky top-[112px] z-30 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/schedule")} className="p-1">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-bold text-foreground">우리의 일기</h1>
            </div>
          </div>
          {isLinked && (
            <button
              onClick={() => navigate("/couple-diary/write")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 rounded-full text-primary text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              쓰기
            </button>
          )}
        </div>
      </header>

      <div className="px-4 py-4">
        {!isLinked ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center mb-4">
              <Heart className="w-8 h-8 text-pink-400" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">파트너 연결이 필요해요</h3>
            <p className="text-sm text-muted-foreground mb-4">
              스케줄 페이지에서 파트너와 먼저 연결해주세요
            </p>
            <button
              onClick={() => navigate("/schedule")}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium"
            >
              스케줄로 이동
            </button>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <BookOpen className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">아직 일기가 없어요</h3>
            <p className="text-sm text-muted-foreground mb-4">
              결혼 준비 과정을 함께 기록해보세요
            </p>
            <button
              onClick={() => navigate("/couple-diary/write")}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium"
            >
              첫 일기 쓰기
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map((entry) => (
              <DiaryCard
                key={entry.id}
                entry={entry}
                onDelete={() => handleDelete(entry.id)}
                isDeleting={deletingId === entry.id}
                formatDate={formatDate}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

interface DiaryCardProps {
  entry: DiaryEntry;
  onDelete: () => void;
  isDeleting: boolean;
  formatDate: (date: string) => string;
}

const DiaryCard = ({ entry, onDelete, isDeleting, formatDate }: DiaryCardProps) => {
  const navigate = useNavigate();
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className="bg-card rounded-2xl border border-border overflow-hidden"
      onClick={() => setShowActions(false)}
    >
      {/* Photos */}
      {entry.photos.length > 0 && (
        <div className="flex overflow-x-auto scrollbar-hide">
          {entry.photos.map((photo) => (
            <img
              key={photo.id}
              src={photo.photo_url}
              alt=""
              className="h-48 w-auto object-cover flex-shrink-0"
            />
          ))}
        </div>
      )}

      <div className="p-4">
        {/* Date & Mood & Author */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{formatDate(entry.diary_date)}</span>
            {entry.mood && <span className="text-sm">{moodEmojis[entry.mood] || ""}</span>}
          </div>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              entry.is_mine
                ? "bg-primary/10 text-primary"
                : "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400"
            }`}
          >
            {entry.is_mine ? "나" : entry.author_name}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-foreground mb-1">{entry.title}</h3>

        {/* Content preview */}
        <p className="text-sm text-muted-foreground line-clamp-3">{entry.content}</p>

        {/* Actions (only for own entries) */}
        {entry.is_mine && (
          <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-border">
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/couple-diary/edit/${entry.id}`);
              }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              수정
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              disabled={isDeleting}
              className="text-xs text-destructive hover:text-destructive/80 transition-colors flex items-center gap-1"
            >
              {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              삭제
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CoupleDiary;
