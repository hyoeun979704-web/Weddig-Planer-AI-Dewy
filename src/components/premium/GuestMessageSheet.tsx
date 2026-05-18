import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface GuestMessageSheetProps {
  open: boolean;
  onClose: () => void;
}

interface TemplateCategory {
  category: string;
  templates: { name: string; template: string }[];
}

const TEMPLATE_GROUPS: TemplateCategory[] = [
  {
    category: " 청첩장 안내",
    templates: [
      {
        name: "기본 안내 메시지",
        template: `안녕하세요 
{groom}·{bride}의 결혼식에 초대합니다.

 일시: {date} {time}
 장소: {venue}
 주소: {address}

 주차: {parking}
 대중교통: {transit}

축하의 마음으로 함께해 주시면 감사하겠습니다 

[모바일 청첩장 보기]
{invitation_url}`,
      },
      {
        name: "친한 지인용 (캐주얼)",
        template: `안녕! 
드디어 결혼해 :)

 {date} {time}
 {venue} ({address})

꼭 와줘! 잘 챙겨먹고 멋진 모습으로 보자 

 모바일 청첩장: {invitation_url}`,
      },
      {
        name: "직장/거래처용 (공식적)",
        template: `[결혼식 안내]

안녕하십니까. 저 {sender}는 다음과 같이 혼례를 올리게 되었습니다. 바쁘신 중에도 시간 내어 주시면 큰 영광이겠습니다.

▪ 일시: {date} {time}
▪ 장소: {venue}
▪ 주소: {address}

자세한 안내는 첨부된 모바일 청첩장을 참고 부탁드립니다.
{invitation_url}

감사합니다.`,
      },
    ],
  },
  {
    category: " 식사·계좌·세부 안내",
    templates: [
      {
        name: "식사 안내 포함",
        template: `안녕하세요 
{groom}·{bride}의 결혼식에 초대합니다.

 {date} {time}
 {venue}

 식사: {meal}
⏰ 식사 시작: 예식 후 약 30분
 답례품: 입구에서 수령 가능

참석 여부를 알려주시면 좌석 준비에 큰 도움이 됩니다 `,
      },
      {
        name: "계좌번호 안내 (불참 안내용)",
        template: `직접 참석이 어려우신 분들을 위해
마음 전달 계좌를 안내드립니다.

 신랑측: {groom_bank} {groom_account} ({groom})
 신부측: {bride_bank} {bride_account} ({bride})

소중한 마음 잘 받겠습니다.
마음만으로도 충분히 감사합니다 `,
      },
      {
        name: "교통 / 주차 상세 안내",
        template: `결혼식장 오시는 길 안내입니다 

 {venue}
 {address}

 주차
- 건물 자체 주차장 {parking_hours}시간 무료
- 만차 시 인근 {alt_parking} 이용 (도보 5분)

 대중교통
- {subway_line} {subway_station} {subway_exit}번 출구 도보 {walk_min}분
- 버스: {bus_info}

 도착 권장 시간: 예식 30~60분 전 (주차 만석 대비)`,
      },
    ],
  },
  {
    category: "⏰ 리마인드 / 사후 인사",
    templates: [
      {
        name: "리마인드 메시지 (D-7)",
        template: `안녕하세요! 
다음 주, {groom}·{bride}의 결혼식이 있습니다.

 {date} {time}
 {venue}

뵙게 되어 정말 기쁩니다.
조심히 와주세요! 

[청첩장 다시 보기]
{invitation_url}`,
      },
      {
        name: "리마인드 메시지 (D-1)",
        template: `내일이에요! 
{groom}·{bride} 결혼식 다시 한 번 안내드려요.

 내일 {time}
 {venue}

 주차 만석 대비 1시간 전 도착 권장
 일기예보: {weather}

내일 뵙겠습니다! 너무 기다려져요 `,
      },
      {
        name: "참석 감사 인사 (사후)",
        template: `안녕하세요 
{groom}·{bride}입니다.

바쁘신 와중에도 결혼식에 함께해 주셔서
정말 깊이 감사드립니다.

덕분에 평생 잊지 못할 따뜻한 하루였어요.
앞으로도 잘 부탁드리며,
새 가정에 늘 좋은 일만 가득하길 바랍니다 

다녀가신 한 분 한 분 마음 깊이 새기겠습니다.`,
      },
      {
        name: "축의금 감사 인사 (불참자)",
        template: `안녕하세요 
{groom}·{bride}입니다.

직접 뵙지는 못했지만,
보내주신 따뜻한 마음 잘 받았습니다.

덕분에 더 든든하게 새 출발을 할 수 있게 되었어요.
다음에 좋은 자리에서 꼭 인사드릴게요.

진심으로 감사드립니다 `,
      },
    ],
  },
];

const PLACEHOLDER_LEGEND = [
  { key: "{groom} / {bride}", desc: "신랑 / 신부 이름" },
  { key: "{date} / {time}", desc: "예식일 / 예식 시간" },
  { key: "{venue} / {address}", desc: "장소명 / 주소" },
  { key: "{parking} / {transit}", desc: "주차 안내 / 대중교통 안내" },
  { key: "{invitation_url}", desc: "모바일 청첩장 링크" },
  { key: "{groom_bank} / {groom_account}", desc: "신랑측 계좌 은행 / 번호" },
  { key: "{bride_bank} / {bride_account}", desc: "신부측 계좌 은행 / 번호" },
];

const GuestMessageSheet = ({ open, onClose }: GuestMessageSheetProps) => {
  const allTemplates = TEMPLATE_GROUPS.flatMap((g) => g.templates);
  const [editedTemplates, setEditedTemplates] = useState(allTemplates.map((t) => t.template));
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [showLegend, setShowLegend] = useState(false);

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

  let runningIdx = -1;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="max-w-[430px] mx-auto rounded-t-3xl max-h-[85vh] overflow-y-auto pb-8">
        <SheetHeader>
          <SheetTitle> 하객 안내 메시지</SheetTitle>
        </SheetHeader>
        <p className="text-xs text-muted-foreground mt-2 mb-3">
          {"{ }"} 부분을 실제 정보로 수정한 후 복사하세요
        </p>

        <button
          onClick={() => setShowLegend((s) => !s)}
          className="w-full mb-4 px-3 py-2 text-xs font-medium text-primary bg-primary/5 rounded-xl border border-primary/20"
        >
          {showLegend ? "변수 가이드 닫기" : "변수 가이드 보기"}
        </button>

        {showLegend && (
          <div className="mb-5 p-3 bg-muted rounded-xl space-y-1.5">
            {PLACEHOLDER_LEGEND.map((p) => (
              <div key={p.key} className="text-caption flex gap-2">
                <code className="text-primary font-mono shrink-0">{p.key}</code>
                <span className="text-muted-foreground">{p.desc}</span>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-6">
          {TEMPLATE_GROUPS.map((group) => (
            <div key={group.category}>
              <p className="text-xs font-bold text-muted-foreground mb-2">{group.category}</p>
              <div className="space-y-3">
                {group.templates.map((tmpl) => {
                  runningIdx += 1;
                  const idx = runningIdx;
                  return (
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
                        rows={8}
                        className="w-full px-4 py-3 text-sm text-foreground bg-transparent outline-none resize-none"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default GuestMessageSheet;
