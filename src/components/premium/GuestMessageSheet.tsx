import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface GuestMessageSheetProps {
  open: boolean;
  onClose: () => void;
}

const templates = [
  {
    name: "기본 안내 메시지",
    template: `안녕하세요 🌿
{groom}·{bride}의 결혼식에 초대합니다.

📅 일시: {date} {time}
📍 장소: {venue}
📍 주소: {address}

🚗 주차: {parking}

축하의 마음으로 함께해 주시면 감사하겠습니다 💍`,
  },
  {
    name: "식사 안내 포함",
    template: `안녕하세요 🌿
{groom}·{bride}의 결혼식에 초대합니다.

📅 {date} {time}
📍 {venue}

🍽️ 식사: {meal}
⏰ 식사 시간: 예식 후 약 30분

참석 여부를 알려주시면 감사하겠습니다 🙏`,
  },
  {
    name: "계좌번호 안내",
    template: `직접 참석이 어려우신 분들을 위해
마음 전달 계좌를 안내드립니다.

🤵 신랑측: {groom_bank} {groom_account} ({groom})
👰 신부측: {bride_bank} {bride_account} ({bride})

마음만으로도 충분히 감사합니다 💕`,
  },
  {
    name: "리마인드 메시지 (D-7)",
    template: `안녕하세요! 😊
다음 주, {groom}·{bride}의 결혼식이 있습니다.

📅 {date} {time}
📍 {venue}

뵙게 되어 기쁩니다! 💐`,
  },
];

const GuestMessageSheet = ({ open, onClose }: GuestMessageSheetProps) => {
  const [editedTemplates, setEditedTemplates] = useState(templates.map(t => t.template));
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const handleCopy = async (idx: number) => {
    try {
      await navigator.clipboard.writeText(editedTemplates[idx]);
      setCopiedIdx(idx);
      toast.success("클립보드에 복사되었습니다!");
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch {
      toast.error("복사에 실패했습니다");
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="max-w-[430px] mx-auto rounded-t-3xl max-h-[85vh] overflow-y-auto pb-8">
        <SheetHeader>
          <SheetTitle>📱 하객 안내 메시지</SheetTitle>
        </SheetHeader>
        <p className="text-xs text-muted-foreground mt-2 mb-4">{ } 부분을 실제 정보로 수정한 후 복사하세요</p>

        <div className="space-y-4">
          {templates.map((tmpl, idx) => (
            <div key={idx} className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="px-4 py-2.5 bg-muted/50 flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">{tmpl.name}</span>
                <button onClick={() => handleCopy(idx)} className="flex items-center gap-1 text-xs text-primary font-medium">
                  {copiedIdx === idx ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedIdx === idx ? "복사됨" : "복사"}
                </button>
              </div>
              <textarea
                value={editedTemplates[idx]}
                onChange={(e) => {
                  const next = [...editedTemplates];
                  next[idx] = e.target.value;
                  setEditedTemplates(next);
                }}
                rows={6}
                className="w-full px-4 py-3 text-sm text-foreground bg-transparent outline-none resize-none"
              />
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default GuestMessageSheet;
