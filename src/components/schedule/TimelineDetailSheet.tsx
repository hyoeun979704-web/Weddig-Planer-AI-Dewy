import { useState, useEffect } from "react";
import { X, Plus, Check, Trash2, MessageSquare, Loader2, Pencil, Save, SkipForward } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScheduleItem } from "@/hooks/useWeddingSchedule";
import { CATEGORY_OPTIONS, parseLocalDate, type TimelinePhase } from "@/lib/schedule";

interface TimelineDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phase: TimelinePhase | null;
  items: ScheduleItem[];
  onAddItem: (title: string, date: string, category: string) => Promise<boolean>;
  onToggleItem: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onUpdateNotes: (id: string, notes: string) => Promise<boolean>;
  onUpdateItem?: (id: string, updates: { title?: string; scheduled_date?: string; category?: string }) => Promise<boolean>;
  weddingDate: string | null;
}

const TimelineDetailSheet = ({
  open,
  onOpenChange,
  phase,
  items,
  onAddItem,
  onToggleItem,
  onDeleteItem,
  onUpdateNotes,
  onUpdateItem,
  weddingDate,
}: TimelineDetailSheetProps) => {
  const [newTask, setNewTask] = useState("");
  const [newTaskDate, setNewTaskDate] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<{ id: string; notes: string } | null>(null);
  const [editingItem, setEditingItem] = useState<{ id: string; title: string; scheduled_date: string; category: string } | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  // Quiz-card 할일 추가 — 추천을 한 장씩 카드로 보여주고 추가/건너뛰기. 직접 입력은 접어둔다.
  const [handledRecs, setHandledRecs] = useState<Set<string>>(new Set());
  const [addingRec, setAddingRec] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);

  // 단계가 바뀌면(시트를 다른 단계로 다시 열면) 카드 진행 상태를 초기화.
  const phaseId = phase?.id;
  useEffect(() => {
    setHandledRecs(new Set());
    setManualOpen(false);
    setAddingRec(null);
  }, [phaseId]);

  if (!phase) return null;

  const phaseItems = items.filter(item => item.category === phase.category);
  const completedCount = phaseItems.filter(item => item.completed).length;
  const progress = phaseItems.length > 0 ? Math.round((completedCount / phaseItems.length) * 100) : 0;

  // 추천 카드 큐 — 이미 추가됐거나(같은 제목) 이번 세션에 처리(추가/건너뛰기)한 추천은 제외.
  const addedTitles = new Set(phaseItems.map(i => i.title));
  const recQueue = phase.defaultTasks.filter(t => !addedTitles.has(t) && !handledRecs.has(t));
  const currentRec = recQueue[0] ?? null;

  // 추천 추가 시 들어갈 날짜(단계 권장일 = 예식일 - defaultDaysBeforeWedding) — 카드에 미리 보여준다.
  const toLocalISODate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const recDate = (() => {
    if (!weddingDate) return toLocalISODate(new Date());
    const t = parseLocalDate(weddingDate);
    t.setDate(t.getDate() - phase.defaultDaysBeforeWedding);
    return toLocalISODate(t);
  })();

  const handleAdoptRec = async (task: string) => {
    setAddingRec(task);
    const success = await onAddItem(task, recDate, phase.category);
    setAddingRec(null);
    // 성공/실패 무관하게 카드 큐에서 제거(중복 추가 방지). 실패 시 직접 입력으로 재시도 가능.
    setHandledRecs(prev => new Set(prev).add(task));
  };

  const handleSkipRec = (task: string) => {
    setHandledRecs(prev => new Set(prev).add(task));
  };

  const handleAddTask = async () => {
    if (!newTask.trim() || !newTaskDate) return;
    setIsAdding(true);
    const success = await onAddItem(newTask.trim(), newTaskDate, phase.category);
    if (success) {
      setNewTask("");
      setNewTaskDate("");
    }
    setIsAdding(false);
  };

  const handleSaveNotes = async (id: string, notes: string) => {
    setIsSavingNotes(true);
    const success = await onUpdateNotes(id, notes);
    setIsSavingNotes(false);
    if (success) setEditingNotes(null);
  };

  const handleStartEdit = (item: ScheduleItem) => {
    setEditingItem({ id: item.id, title: item.title, scheduled_date: item.scheduled_date, category: item.category || "general" });
  };

  const handleSaveEdit = async () => {
    if (!editingItem || !onUpdateItem) return;
    setIsSavingEdit(true);
    const success = await onUpdateItem(editingItem.id, {
      title: editingItem.title,
      scheduled_date: editingItem.scheduled_date,
      category: editingItem.category,
    });
    if (success) setEditingItem(null);
    setIsSavingEdit(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <phase.icon className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <SheetTitle className="text-left">{phase.title}</SheetTitle>
              <p className="text-sm text-muted-foreground">{phase.period}</p>
            </div>
          </div>
          {/* Progress bar — only when this phase has items */}
          {phaseItems.length > 0 ? (
            <div className="flex items-center gap-2 mt-3">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-sm font-medium text-primary">{completedCount}/{phaseItems.length}</span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mt-3">{phase.description}</p>
          )}
        </SheetHeader>

        <div className="overflow-y-auto h-[calc(100%-120px)] -mx-6 px-6">
          {/* Quiz-card 추천 — 한 장씩 추가/건너뛰기. 복잡한 폼 대신 한 번에 한 결정만. */}
          {currentRec && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-foreground">이 단계 추천 할 일</p>
                <span className="text-[11px] text-muted-foreground">{recQueue.length}개 남음</span>
              </div>
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
                <p className="text-[15px] font-semibold text-foreground leading-snug">{currentRec}</p>
                <p className="text-[11px] text-muted-foreground mt-1 mb-4">
                  추가하면 {format(parseLocalDate(recDate), "yyyy.M.d (EEE)", { locale: ko })}로 들어가요
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleSkipRec(currentRec)}
                    disabled={!!addingRec}
                  >
                    <SkipForward className="w-4 h-4 mr-1" /> 건너뛰기
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => handleAdoptRec(currentRec)}
                    disabled={!!addingRec}
                  >
                    {addingRec === currentRec
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <><Plus className="w-4 h-4 mr-1" /> 추가</>}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* 직접 입력 — 기본은 접어두고 필요할 때만 펼친다(화면 단순화). */}
          {manualOpen ? (
            <div className="mb-4 p-3 bg-muted/50 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-foreground">직접 입력</span>
                <button
                  onClick={() => setManualOpen(false)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="직접 입력 닫기"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <Input
                placeholder="새 할 일 입력"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                className="flex-1 mb-2"
              />
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={newTaskDate}
                  onChange={(e) => setNewTaskDate(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={handleAddTask}
                  disabled={isAdding || !newTask.trim() || !newTaskDate}
                  size="sm"
                >
                  {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setManualOpen(true)}
              className="mb-4 w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
            >
              <Pencil className="w-4 h-4" /> 직접 할 일 추가하기
            </button>
          )}

          {/* Checklist items */}
          {phaseItems.length > 0 ? (
            <div className="space-y-2">
              {phaseItems.map((item) => (
                <div key={item.id} className="bg-card rounded-xl border border-border overflow-hidden">
                  {editingItem?.id === item.id ? (
                    /* Edit Mode */
                    <div className="p-3 space-y-2">
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
                      <Input
                        type="date"
                        value={editingItem.scheduled_date}
                        onChange={(e) => setEditingItem({ ...editingItem, scheduled_date: e.target.value })}
                      />
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="sm" onClick={() => setEditingItem(null)}>
                          <X className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={handleSaveEdit} 
                          disabled={isSavingEdit || !editingItem.title.trim()}
                        >
                          {isSavingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-1" /> 저장</>}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* View Mode */
                    <div className="flex items-center gap-3 p-3">
                      <button
                        onClick={() => onToggleItem(item.id)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                          item.completed
                            ? "bg-primary border-primary"
                            : "border-muted-foreground hover:border-primary"
                        }`}
                      >
                        {item.completed && <Check className="w-4 h-4 text-primary-foreground" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className={`font-medium text-sm ${item.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                            {item.title}
                          </p>
                          {item.source === "template" && (
                            <span
                              className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full font-medium"
                              title="결혼 정보 등록 시 자동으로 추가된 추천 일정"
                            >
                               추천
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(parseLocalDate(item.scheduled_date), "yyyy.M.d (EEE)", { locale: ko })}
                        </p>
                      </div>
                      {onUpdateItem && (
                        <button
                          onClick={() => handleStartEdit(item)}
                          className="p-2 text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setExpandedNotes(expandedNotes === item.id ? null : item.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          item.notes ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteItem(item.id)}
                        className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  
                  {/* Notes section */}
                  {expandedNotes === item.id && (
                    <div className="px-3 pb-3 pt-0">
                      {editingNotes?.id === item.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editingNotes.notes}
                            onChange={(e) => setEditingNotes({ ...editingNotes, notes: e.target.value })}
                            placeholder="메모를 입력하세요..."
                            className="min-h-[80px]"
                          />
                          <div className="flex gap-2 justify-end">
                            <Button variant="outline" size="sm" onClick={() => setEditingNotes(null)} disabled={isSavingNotes}>
                              취소
                            </Button>
                            <Button size="sm" onClick={() => handleSaveNotes(item.id, editingNotes.notes)} disabled={isSavingNotes}>
                              {isSavingNotes ? <Loader2 className="w-4 h-4 animate-spin" /> : "저장"}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div 
                          className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground cursor-pointer hover:bg-muted transition-colors"
                          onClick={() => setEditingNotes({ id: item.id, notes: item.notes || "" })}
                        >
                          {item.notes || "탭하여 메모 추가..."}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : !currentRec ? (
            /* 항목도 없고 남은 추천도 없을 때 — 가벼운 빈 상태 안내(추천은 위 카드에서 소진). */
            <p className="text-center text-sm text-muted-foreground py-10">
              {phase.defaultTasks.length > 0
                ? "추천을 모두 확인했어요. 직접 할 일을 추가해보세요."
                : "위에서 직접 할 일을 추가해보세요."}
            </p>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default TimelineDetailSheet;
