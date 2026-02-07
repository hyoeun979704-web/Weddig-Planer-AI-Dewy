import { useState } from "react";
import { X, Plus, Check, Trash2, MessageSquare, Loader2, Pencil, Save } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScheduleItem } from "@/hooks/useWeddingSchedule";

interface TimelinePhase {
  id: string;
  period: string;
  title: string;
  description: string;
  icon: React.ElementType;
  defaultTasks: string[];
  category: string;
}

interface TimelineDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phase: TimelinePhase | null;
  items: ScheduleItem[];
  onAddItem: (title: string, date: string, category: string) => Promise<boolean>;
  onToggleItem: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
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

  const categoryOptions = [
    { value: "general", label: "일반" },
    { value: "phase-1", label: "D-365~180: 웨딩 준비 시작" },
    { value: "phase-2", label: "D-180~120: 웨딩홀 & 스드메" },
    { value: "phase-3", label: "D-120~60: 혼수 및 예물" },
    { value: "phase-4", label: "D-60~30: 허니문 & 청첩장" },
    { value: "phase-5", label: "D-30~Day: 최종 점검" },
  ];

  if (!phase) return null;

  const phaseItems = items.filter(item => item.category === phase.category);
  const completedCount = phaseItems.filter(item => item.completed).length;
  const progress = phaseItems.length > 0 ? Math.round((completedCount / phaseItems.length) * 100) : 0;

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

  const handleSaveNotes = (id: string, notes: string) => {
    onUpdateNotes(id, notes);
    setEditingNotes(null);
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

  const handleAddDefaultTask = async (task: string) => {
    // Calculate a default date based on wedding date and phase
    let defaultDate = new Date().toISOString().split('T')[0];
    if (weddingDate) {
      const wedding = new Date(weddingDate);
      // Estimate date based on phase category
      const daysMap: Record<string, number> = {
        'phase-1': 270,
        'phase-2': 150,
        'phase-3': 90,
        'phase-4': 45,
        'phase-5': 15,
      };
      const daysBeforeWedding = daysMap[phase.category] || 90;
      const taskDate = new Date(wedding);
      taskDate.setDate(taskDate.getDate() - daysBeforeWedding);
      defaultDate = taskDate.toISOString().split('T')[0];
    }
    await onAddItem(task, defaultDate, phase.category);
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
          {/* Progress bar */}
          <div className="flex items-center gap-2 mt-3">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all" 
                style={{ width: `${progress}%` }} 
              />
            </div>
            <span className="text-sm font-medium text-primary">{completedCount}/{phaseItems.length}</span>
          </div>
        </SheetHeader>

        <div className="overflow-y-auto h-[calc(100%-120px)] -mx-6 px-6">
          {/* Add new task */}
          <div className="mb-4 p-3 bg-muted/50 rounded-xl">
            <div className="flex gap-2 mb-2">
              <Input
                placeholder="새 할 일 입력"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                className="flex-1"
              />
            </div>
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
                        <p className={`font-medium text-sm ${item.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                          {item.title}
                        </p>
                        <p className="text-xs text-muted-foreground">{item.scheduled_date}</p>
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
                            <Button variant="outline" size="sm" onClick={() => setEditingNotes(null)}>
                              취소
                            </Button>
                            <Button size="sm" onClick={() => handleSaveNotes(item.id, editingNotes.notes)}>
                              저장
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
          ) : (
            /* Default tasks suggestions */
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-3">추천 할 일을 추가해보세요:</p>
              {phase.defaultTasks.map((task, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAddDefaultTask(task)}
                  className="w-full flex items-center gap-3 p-3 bg-muted/30 rounded-xl border border-dashed border-border hover:border-primary/50 hover:bg-muted/50 transition-colors text-left"
                >
                  <Plus className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{task}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default TimelineDetailSheet;
