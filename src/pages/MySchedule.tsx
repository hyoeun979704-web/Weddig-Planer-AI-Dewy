import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Plus, Check, Trash2, Loader2, Pencil, X, Save } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import { useAuth } from "@/contexts/AuthContext";

const categoryOptions = [
  { value: "general", label: "일반" },
  { value: "phase-1", label: "D-365~180: 웨딩 준비 시작" },
  { value: "phase-2", label: "D-180~120: 웨딩홀 & 스드메" },
  { value: "phase-3", label: "D-120~60: 혼수 및 예물" },
  { value: "phase-4", label: "D-60~30: 허니문 & 청첩장" },
  { value: "phase-5", label: "D-30~Day: 최종 점검" },
];

const MySchedule = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    weddingSettings,
    scheduleItems,
    isLoading,
    saveWeddingDate,
    addScheduleItem,
    toggleItemCompletion,
    deleteScheduleItem,
    updateScheduleItem,
  } = useWeddingSchedule();

  const [weddingDateInput, setWeddingDateInput] = useState("");
  const [newTask, setNewTask] = useState("");
  const [newTaskDate, setNewTaskDate] = useState("");
  const [newTaskCategory, setNewTaskCategory] = useState("general");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<{
    id: string;
    title: string;
    scheduled_date: string;
    category: string;
  } | null>(null);

  const daysUntilWedding = () => {
    if (!weddingSettings.wedding_date) return null;
    const wedding = new Date(weddingSettings.wedding_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((wedding.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const handleStartEditing = () => {
    setWeddingDateInput(weddingSettings.wedding_date || "");
    setIsEditing(true);
  };

  const handleSaveWeddingDate = async () => {
    if (!weddingDateInput) return;
    setIsSaving(true);
    const success = await saveWeddingDate(weddingDateInput);
    if (success) {
      setIsEditing(false);
    }
    setIsSaving(false);
  };

  const handleAddTask = async () => {
    if (!newTask.trim() || !newTaskDate) return;
    setIsSaving(true);
    const success = await addScheduleItem(newTask.trim(), newTaskDate, newTaskCategory);
    if (success) {
      setNewTask("");
      setNewTaskDate("");
      setNewTaskCategory("general");
    }
    setIsSaving(false);
  };

  const getCategoryLabel = (category: string) => {
    const found = categoryOptions.find(c => c.value === category);
    return found ? found.label : "일반";
  };

  const handleStartEdit = (item: typeof scheduleItems[0]) => {
    setEditingItem({
      id: item.id,
      title: item.title,
      scheduled_date: item.scheduled_date,
      category: item.category || "general",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    setIsSaving(true);
    const success = await updateScheduleItem(editingItem.id, {
      title: editingItem.title,
      scheduled_date: editingItem.scheduled_date,
      category: editingItem.category,
    });
    if (success) {
      setEditingItem(null);
    }
    setIsSaving(false);
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
  };

  const days = daysUntilWedding();

  if (!user) {
    return (
      <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
          <div className="flex items-center h-14 px-4">
            <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center -ml-2">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="flex-1 text-center font-semibold text-lg pr-10">내 웨딩 일정</h1>
          </div>
        </header>
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <Calendar className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-lg font-bold text-foreground mb-2">로그인이 필요합니다</h2>
          <p className="text-sm text-muted-foreground text-center mb-4">
            웨딩 일정을 관리하려면 로그인해주세요
          </p>
          <Button onClick={() => navigate("/auth")}>로그인하기</Button>
        </div>
        <BottomNav activeTab="/mypage" onTabChange={(href) => navigate(href)} />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background max-w-[430px] mx-auto relative flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center h-14 px-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-center font-semibold text-lg pr-10">내 웨딩 일정</h1>
        </div>
      </header>

      <main className="pb-20">
        {/* D-Day Card */}
        <div className="p-4">
          <div className="p-6 bg-gradient-to-r from-primary/20 to-primary/5 rounded-2xl border border-primary/20">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">결혼식까지</p>
                {days !== null ? (
                  <p className="text-4xl font-bold text-primary">
                    {days > 0 ? `D-${days}` : days === 0 ? "D-Day!" : `D+${Math.abs(days)}`}
                  </p>
                ) : (
                  <p className="text-2xl font-bold text-muted-foreground">날짜를 설정해주세요</p>
                )}
              </div>
              <Calendar className="w-12 h-12 text-primary/50" />
            </div>
            
            {isEditing ? (
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={weddingDateInput}
                  onChange={(e) => setWeddingDateInput(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleSaveWeddingDate} size="sm" disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "저장"}
                </Button>
                <Button onClick={() => setIsEditing(false)} size="sm" variant="outline">
                  취소
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {weddingSettings.wedding_date || "아직 설정되지 않음"}
                </p>
                <Button variant="outline" size="sm" onClick={handleStartEditing}>
                  {weddingSettings.wedding_date ? "날짜 변경" : "날짜 설정"}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Add Task */}
        <div className="px-4 py-2">
          <div className="p-4 bg-card rounded-2xl border border-border">
            <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              새 일정 추가
            </h3>
            <div className="space-y-2">
              <Input
                placeholder="일정 제목"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
              />
              <Select value={newTaskCategory} onValueChange={setNewTaskCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="타임라인 단계 선택" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={newTaskDate}
                  onChange={(e) => setNewTaskDate(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleAddTask} disabled={isSaving || !newTask.trim() || !newTaskDate}>
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "추가"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Schedule List */}
        <div className="p-4">
          <h2 className="font-bold text-foreground mb-4">웨딩 체크리스트</h2>
          {scheduleItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">아직 등록된 일정이 없습니다</p>
              <p className="text-xs">위에서 새 일정을 추가해보세요</p>
            </div>
          ) : (
            <div className="space-y-2">
              {scheduleItems.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 bg-card rounded-xl border border-border ${
                    item.completed ? "opacity-60" : ""
                  }`}
                >
                  {editingItem?.id === item.id ? (
                    /* Edit Mode */
                    <div className="space-y-2">
                      <Input
                        value={editingItem.title}
                        onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                        placeholder="일정 제목"
                      />
                      <Select 
                        value={editingItem.category} 
                        onValueChange={(v) => setEditingItem({ ...editingItem, category: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categoryOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="date"
                        value={editingItem.scheduled_date}
                        onChange={(e) => setEditingItem({ ...editingItem, scheduled_date: e.target.value })}
                      />
                      <div className="flex gap-2 pt-2">
                        <Button 
                          onClick={handleSaveEdit} 
                          size="sm" 
                          disabled={isSaving || !editingItem.title.trim()}
                          className="flex-1"
                        >
                          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-1" /> 저장</>}
                        </Button>
                        <Button onClick={handleCancelEdit} size="sm" variant="outline">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* View Mode */
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleItemCompletion(item.id)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                          item.completed
                            ? "bg-primary border-primary"
                            : "border-muted-foreground"
                        }`}
                      >
                        {item.completed && <Check className="w-4 h-4 text-primary-foreground" />}
                      </button>
                      <div className="flex-1">
                        <p className={`font-medium text-sm ${item.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                          {item.title}
                        </p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground">{item.scheduled_date}</p>
                          {item.category && item.category !== "general" && (
                            <span className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                              {getCategoryLabel(item.category)}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleStartEdit(item)}
                        className="p-2 text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteScheduleItem(item.id)}
                        className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <BottomNav activeTab="/mypage" onTabChange={(href) => navigate(href)} />
    </div>
  );
};

export default MySchedule;
