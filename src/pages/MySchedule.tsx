import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Plus, Check, Trash2, Loader2, Pencil, X, Save, Settings2, ChevronDown, ChevronUp, Zap } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWeddingSchedule, type ScheduleItem } from "@/hooks/useWeddingSchedule";
import { useAuth } from "@/contexts/AuthContext";
import {
  CATEGORY_OPTIONS,
  COMPRESSION_DDAY_THRESHOLD,
  daysUntilWedding,
  getTaskUrgency,
  parseLocalDate,
  URGENCY_LABEL,
  type TaskUrgency,
} from "@/lib/schedule";
import {
  CATEGORY_LABELS,
  WEDDING_STYLE_LABEL,
  isHiddenByExclusion,
  type SkippableCategory,
} from "@/lib/weddingStyle";
import WeddingInfoSetupModal from "@/components/wedding-planner/WeddingInfoSetupModal";

const URGENCY_ORDER: TaskUrgency[] = ["past_due", "urgent", "this_month", "later"];
const URGENCY_STYLE: Record<TaskUrgency, { dot: string; chip: string; emoji: string }> = {
  past_due: { dot: "bg-destructive", chip: "bg-destructive/10 text-destructive", emoji: "🚨" },
  urgent: { dot: "bg-orange-500", chip: "bg-orange-100 text-orange-700", emoji: "🔴" },
  this_month: { dot: "bg-yellow-500", chip: "bg-yellow-100 text-yellow-800", emoji: "🟡" },
  later: { dot: "bg-muted-foreground/50", chip: "bg-muted text-muted-foreground", emoji: "⚪" },
};

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
  const [styleModalOpen, setStyleModalOpen] = useState(false);

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
    const found = CATEGORY_OPTIONS.find(c => c.value === category);
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

  const days = daysUntilWedding(weddingSettings.wedding_date);

  const formattedWeddingDate = weddingSettings.wedding_date
    ? format(parseLocalDate(weddingSettings.wedding_date), "yyyy년 M월 d일 (EEEE)", { locale: ko })
    : null;

  const visibleItems = scheduleItems.filter(
    i => !isHiddenByExclusion(i.category, weddingSettings.excluded_categories)
  );
  const hiddenCount = scheduleItems.length - visibleItems.length;

  // Compression mode kicks in inside the last 90 days — at that point the
  // 30+ template items create overwhelm (F-1 임산부 D-60 페르소나). We group
  // by urgency tier and default-collapse the long-tail "여유 일정" / "완료"
  // sections. Users can still expand them.
  const isCompressionMode =
    days !== null && days >= 0 && days < COMPRESSION_DDAY_THRESHOLD;

  const groups = useMemo(() => {
    const today = new Date();
    const open: Record<TaskUrgency, ScheduleItem[]> = {
      past_due: [],
      urgent: [],
      this_month: [],
      later: [],
    };
    const completed: ScheduleItem[] = [];
    for (const item of visibleItems) {
      if (item.completed) {
        completed.push(item);
        continue;
      }
      const tier = getTaskUrgency(item.scheduled_date, today);
      open[tier].push(item);
    }
    for (const tier of URGENCY_ORDER) {
      open[tier].sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
    }
    completed.sort((a, b) => b.scheduled_date.localeCompare(a.scheduled_date));
    return { open, completed };
  }, [visibleItems]);

  // User overrides take precedence; otherwise default-collapse "later" when
  // in compression mode and always default-collapse "completed".
  const [collapseOverride, setCollapseOverride] = useState<Record<string, boolean>>({});
  const isSectionCollapsed = (key: "later" | "completed") => {
    if (key in collapseOverride) return collapseOverride[key];
    if (key === "later") return isCompressionMode;
    return true; // completed
  };
  const toggleSection = (key: "later" | "completed") =>
    setCollapseOverride((prev) => ({ ...prev, [key]: !isSectionCollapsed(key) }));

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
                    {days > 0 ? `D-${days}` : days === 0 ? "D-Day 🎉" : `D+${Math.abs(days)}`}
                  </p>
                ) : weddingSettings.wedding_date_tbd ? (
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-primary">D-Day</p>
                    <span className="inline-block text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">
                      예정일 미정
                    </span>
                  </div>
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
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  {formattedWeddingDate
                    ?? (weddingSettings.wedding_date_tbd ? "1년 후 기준으로 일정이 잡혀요" : "아직 설정되지 않음")}
                </p>
                <Button variant="outline" size="sm" onClick={handleStartEditing} className="shrink-0">
                  {weddingSettings.wedding_date ? "날짜 변경" : "날짜 설정"}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Wedding Style Card */}
        <div className="px-4 pb-2">
          <button
            type="button"
            onClick={() => setStyleModalOpen(true)}
            className="w-full p-4 bg-card rounded-2xl border border-border text-left active:scale-[0.99] transition-transform"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <Settings2 className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-semibold text-foreground truncate">
                  결혼 스타일 · {WEDDING_STYLE_LABEL[weddingSettings.wedding_style ?? "general"]}
                </span>
              </div>
              <span className="text-xs text-primary font-semibold shrink-0">변경</span>
            </div>
            {weddingSettings.excluded_categories.length === 0 ? (
              <p className="text-xs text-muted-foreground">제외한 카테고리 없음 · 모든 추천 일정 표시</p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {weddingSettings.excluded_categories.map((c) => (
                  <span
                    key={c}
                    className="text-[11px] px-2 py-0.5 bg-muted text-muted-foreground rounded-full"
                  >
                    {CATEGORY_LABELS[c as SkippableCategory]?.label ?? c} 제외
                  </span>
                ))}
              </div>
            )}
            {hiddenCount > 0 && (
              <p className="text-[11px] text-muted-foreground mt-2">
                숨겨진 일정 {hiddenCount}개 (DB에는 남아있어요)
              </p>
            )}
          </button>
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
                  {CATEGORY_OPTIONS.map((option) => (
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-foreground">웨딩 체크리스트</h2>
            {isCompressionMode && (
              <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 bg-primary/10 text-primary rounded-full font-semibold">
                <Zap className="w-3 h-3" /> 압축 모드
              </span>
            )}
          </div>

          {isCompressionMode && (
            <p className="text-[12px] text-muted-foreground mb-3 leading-snug">
              결혼식까지 90일 미만이라 급한 일정 위주로 보여드려요. 여유 일정은
              섹션을 눌러 펼칠 수 있어요.
            </p>
          )}

          {visibleItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">아직 등록된 일정이 없습니다</p>
              <p className="text-xs">위에서 새 일정을 추가해보세요</p>
            </div>
          ) : (
            <div className="space-y-5">
              {URGENCY_ORDER.map((tier) => {
                const items = groups.open[tier];
                if (items.length === 0) return null;
                const isLater = tier === "later";
                const collapsed = isLater && isSectionCollapsed("later");
                const meta = URGENCY_STYLE[tier];
                return (
                  <section key={tier}>
                    <button
                      type="button"
                      onClick={() => isLater && toggleSection("later")}
                      disabled={!isLater}
                      className="w-full flex items-center justify-between mb-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${meta.dot}`} aria-hidden />
                        <span className="text-sm font-semibold text-foreground">
                          {URGENCY_LABEL[tier]}
                        </span>
                        <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-semibold ${meta.chip}`}>
                          {items.length}
                        </span>
                      </div>
                      {isLater && (
                        <span className="text-muted-foreground">
                          {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                        </span>
                      )}
                    </button>
                    {!collapsed && (
                      <div className="space-y-2">
                        {items.map((item) =>
                          renderItem({
                            item,
                            editingItem,
                            setEditingItem,
                            handleSaveEdit,
                            handleCancelEdit,
                            isSaving,
                            toggleItemCompletion,
                            deleteScheduleItem,
                            handleStartEdit,
                            getCategoryLabel,
                            urgency: tier,
                          })
                        )}
                      </div>
                    )}
                  </section>
                );
              })}

              {groups.completed.length > 0 && (
                <section>
                  <button
                    type="button"
                    onClick={() => toggleSection("completed")}
                    className="w-full flex items-center justify-between mb-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary/50" aria-hidden />
                      <span className="text-sm font-semibold text-foreground">완료</span>
                      <span className="text-[11px] px-1.5 py-0.5 rounded-full font-semibold bg-primary/10 text-primary">
                        {groups.completed.length}
                      </span>
                    </div>
                    <span className="text-muted-foreground">
                      {isSectionCollapsed("completed") ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronUp className="w-4 h-4" />
                      )}
                    </span>
                  </button>
                  {!isSectionCollapsed("completed") && (
                    <div className="space-y-2">
                      {groups.completed.map((item) =>
                        renderItem({
                          item,
                          editingItem,
                          setEditingItem,
                          handleSaveEdit,
                          handleCancelEdit,
                          isSaving,
                          toggleItemCompletion,
                          deleteScheduleItem,
                          handleStartEdit,
                          getCategoryLabel,
                          urgency: null,
                        })
                      )}
                    </div>
                  )}
                </section>
              )}
            </div>
          )}
        </div>
      </main>

      <WeddingInfoSetupModal isOpen={styleModalOpen} onClose={() => setStyleModalOpen(false)} />

      <BottomNav activeTab="/mypage" onTabChange={(href) => navigate(href)} />
    </div>
  );
};

interface RenderItemArgs {
  item: ScheduleItem;
  editingItem: {
    id: string;
    title: string;
    scheduled_date: string;
    category: string;
  } | null;
  setEditingItem: (v: RenderItemArgs["editingItem"]) => void;
  handleSaveEdit: () => Promise<void>;
  handleCancelEdit: () => void;
  isSaving: boolean;
  toggleItemCompletion: (id: string) => Promise<boolean | void>;
  deleteScheduleItem: (id: string) => Promise<boolean | void>;
  handleStartEdit: (item: ScheduleItem) => void;
  getCategoryLabel: (cat: string) => string;
  urgency: TaskUrgency | null;
}

function renderItem({
  item,
  editingItem,
  setEditingItem,
  handleSaveEdit,
  handleCancelEdit,
  isSaving,
  toggleItemCompletion,
  deleteScheduleItem,
  handleStartEdit,
  getCategoryLabel,
  urgency,
}: RenderItemArgs) {
  const dot = urgency ? URGENCY_STYLE[urgency].dot : "bg-primary/40";
  if (editingItem?.id === item.id) {
    return (
      <div key={item.id} className="p-4 bg-card rounded-xl border border-border space-y-2">
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
            {CATEGORY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={editingItem.scheduled_date}
          onChange={(e) =>
            setEditingItem({ ...editingItem, scheduled_date: e.target.value })
          }
        />
        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleSaveEdit}
            size="sm"
            disabled={isSaving || !editingItem.title.trim()}
            className="flex-1"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4 mr-1" /> 저장
              </>
            )}
          </Button>
          <Button onClick={handleCancelEdit} size="sm" variant="outline">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div
      key={item.id}
      className={`p-4 bg-card rounded-xl border border-border flex items-center gap-3 ${
        item.completed ? "opacity-60" : ""
      }`}
    >
      <span className={`w-1.5 self-stretch rounded-full ${dot}`} aria-hidden />
      <button
        onClick={() => toggleItemCompletion(item.id)}
        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${
          item.completed ? "bg-primary border-primary" : "border-muted-foreground"
        }`}
      >
        {item.completed && <Check className="w-4 h-4 text-primary-foreground" />}
      </button>
      <div className="flex-1 min-w-0">
        <p
          className={`font-medium text-sm ${
            item.completed ? "line-through text-muted-foreground" : "text-foreground"
          }`}
        >
          {item.title}
        </p>
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">
            {format(parseLocalDate(item.scheduled_date), "yyyy.M.d (EEE)", { locale: ko })}
          </p>
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
  );
}

export default MySchedule;
