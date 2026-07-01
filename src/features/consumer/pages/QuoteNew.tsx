import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Send, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { uploadQuoteImage } from "@/features/consumer/data/quotes";
import { PLACE_CATEGORY_LABEL } from "@/lib/categoryLabels";
import { createQuoteRequest, quoteImageUrl } from "@/hooks/useQuotes";
import { markBoardSlotQuoting } from "@/hooks/useVendorBoard";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import { usePersonaInsights } from "@/hooks/usePersonaInsights";
import { useTextDraft } from "@/hooks/useTextDraft";
import { QUOTE_STYLE_LABEL } from "@/lib/quoteContext";

// 스타일 라벨 단일 소스(견적 컨텍스트 카드와 공유 — 드리프트 방지).
const STYLES = Object.entries(QUOTE_STYLE_LABEL).map(([v, label]) => ({ v, label }));

// 소비자가 필요를 한 번에 남기면 조건 매칭 업체들에 리드가 뿌려진다(견적 요청).
const QuoteNew = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const { weddingSettings } = useWeddingSchedule();
  // 초개인화 — 비표준 페르소나면 "그 조건도 적어달라"는 안심 카피를 덧붙여(④) 매칭 적합도
  // 인식을 높인다(재혼·스몰·임신·예산형 사용자가 자기 조건을 빼먹지 않게).
  const { personaMode, personaLabel } = usePersonaInsights();
  const isStandardPersona = personaMode === "standard_bride" || personaMode === "standard_groom";
  const [category, setCategory] = useState(params.get("category") ?? "");
  const boardSlot = params.get("slot"); // 업체 보드 슬롯에서 진입 시 — 성공하면 그 슬롯을 '견적중'으로
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [weddingDate, setWeddingDate] = useState("");
  const [style, setStyle] = useState("");
  // 이미 입력한 결혼 정보 자동 채움 — 회원가입·결혼정보 설정에서 등록한 데이터를 견적 요청에
  // 기본값으로 넣어 같은 정보를 매번 다시 적던 마찰을 없앤다. 매칭이 '내 지역/일정' 기준으로
  // 큐레이션되고 리드 품질도 올라간다. 사용자가 입력 중이면 덮지 않도록 1회만 시드(ref 가드).
  //   · 지역 ← 등록한 결혼식장/지역  · 예식일 ← wedding_date(미정 제외)  · 스타일 ← wedding_style
  // 예산은 시드하지 않는다: 저장된 예산은 카테고리군(예: sdm=스튜디오+드레스+메이크업) 단위
  // 단일 금액이라 단일 카테고리 견적에 넣으면 과대 시드로 매칭이 왜곡된다.
  const prefilled = useRef(false);
  useEffect(() => {
    if (prefilled.current) return;
    const seedCity = weddingSettings.wedding_venue_city || weddingSettings.wedding_region;
    const seedDistrict = weddingSettings.wedding_venue_district;
    const seedDate = weddingSettings.wedding_date_tbd ? "" : weddingSettings.wedding_date || "";
    const seedStyle = weddingSettings.wedding_style || "";
    if (!seedCity && !seedDistrict && !seedDate && !seedStyle) return;
    prefilled.current = true;
    if (seedCity || seedDistrict) {
      setCity((cur) => (cur ? cur : seedCity ?? ""));
      setDistrict((cur) => (cur ? cur : seedDistrict ?? ""));
    }
    if (seedDate) setWeddingDate((cur) => (cur ? cur : seedDate));
    if (seedStyle) setStyle((cur) => (cur ? cur : seedStyle));
  }, [
    weddingSettings.wedding_venue_city,
    weddingSettings.wedding_venue_district,
    weddingSettings.wedding_region,
    weddingSettings.wedding_date,
    weddingSettings.wedding_date_tbd,
    weddingSettings.wedding_style,
  ]);
  const [note, setNote] = useState("");
  const [imagePaths, setImagePaths] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 미저장 입력 유실 방지(iOS 웹 등). 이미지는 업로드된 path(문자열)라 직렬화 가능.
  // hasContent 는 프리필(카테고리·지역·예식일·스타일)만으로 빈 draft·오인 복원토스트가
  // 생기지 않게 '직접 작성한' 필드만 본다(메모·예산·사진). 예식일/스타일은 설정에서
  // 재시드되므로 draft 에 안 넣어도 복귀 시 그대로 채워진다.
  const draft = useTextDraft({
    scope: "quote-new",
    userId: user?.id,
    enabled: !!user,
    values: { category, city, district, budgetMin, budgetMax, weddingDate, style, note, imagePaths },
    apply: (d) => {
      if (d.category != null) setCategory(d.category);
      if (d.city != null) setCity(d.city);
      if (d.district != null) setDistrict(d.district);
      if (d.budgetMin != null) setBudgetMin(d.budgetMin);
      if (d.budgetMax != null) setBudgetMax(d.budgetMax);
      if (d.weddingDate != null) setWeddingDate(d.weddingDate);
      if (d.style != null) setStyle(d.style);
      if (d.note != null) setNote(d.note);
      if (Array.isArray(d.imagePaths)) setImagePaths(d.imagePaths);
    },
    hasContent: (v) =>
      !!(v.note?.trim() || v.budgetMin || v.budgetMax) ||
      (Array.isArray(v.imagePaths) && v.imagePaths.length > 0),
  });

  const onPickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (imagePaths.length >= 3) { toast.error("사진은 최대 3장까지 올릴 수 있어요."); return; }
    setUploading(true);
    try {
      const path = await uploadQuoteImage(user.id, file);
      setImagePaths((p) => [...p, path]);
    } catch {
      toast.error("사진 업로드에 실패했어요.");
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!user) { navigate("/auth"); return; }
    if (!category) { toast.error("카테고리를 골라주세요."); return; }
    setSubmitting(true);
    const res = await createQuoteRequest({
      category,
      city: city.trim() || undefined,
      district: district.trim() || undefined,
      budgetMin: budgetMin ? parseInt(budgetMin, 10) : null,
      budgetMax: budgetMax ? parseInt(budgetMax, 10) : null,
      weddingDate: weddingDate || null,
      style: style || null,
      note: note.trim() || null,
      imagePaths,
    });
    setSubmitting(false);
    if (!res.ok) {
      toast.error(
        res.error === "too_many_open" ? "진행 중인 견적 요청이 너무 많아요(최대 5개)." : "요청에 실패했어요. 다시 시도해주세요.",
      );
      return;
    }
    draft.clear();
    // 업체 보드에서 진입했다면 해당 슬롯을 '견적중'으로 반영(best-effort).
    if (boardSlot) void markBoardSlotQuoting(user.id, boardSlot);
    toast.success(
      res.matched && res.matched > 0
        ? `${res.matched}곳에 견적 요청을 보냈어요!`
        : "요청을 등록했어요. 조건에 맞는 업체가 늘면 전달돼요.",
    );
    navigate(`/quote/${res.requestId}`, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background app-col mx-auto pb-28">
      <PageHeader title="견적 요청" />
      <main className="px-5 py-5 space-y-4">
        <p className="text-[13px] text-muted-foreground">
          필요한 정보를 남기면 조건에 맞는 업체들에게 한 번에 견적을 요청해요. 업체가 답하면 알림으로 알려드려요.
        </p>
        {!isStandardPersona && (
          <p className="text-[12px] text-primary bg-primary/5 rounded-lg px-3 py-2">
            {personaLabel} 조건(예산·규모·일정 등)도 메모에 적어주시면 맞는 업체에게 우선 전달돼요.
          </p>
        )}

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">어떤 업체를 찾으세요? *</Label>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(PLACE_CATEGORY_LABEL).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setCategory(key)}
                className={`h-10 rounded-lg border text-[13px] font-medium ${
                  category === key ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">지역(시/도)</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="서울특별시" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">구/군</Label>
              <Input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="강남구" />
            </div>
          </div>
          {(weddingSettings.wedding_venue_city || weddingSettings.wedding_region) && city && (
            <p className="text-[12px] text-primary">내 식장 지역으로 채웠어요 · 이 지역 업체에게 우선 전달돼요</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">예산 최소(만원)</Label>
            <Input type="number" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} placeholder="100" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">예산 최대(만원)</Label>
            <Input type="number" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} placeholder="300" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">예식 예정일</Label>
          <Input type="date" value={weddingDate} onChange={(e) => setWeddingDate(e.target.value)} />
          {!weddingSettings.wedding_date_tbd && weddingSettings.wedding_date && weddingDate === weddingSettings.wedding_date && (
            <p className="text-[12px] text-primary">내 결혼 정보에서 채웠어요 · 바꿔도 돼요</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">스타일</Label>
          <div className="grid grid-cols-4 gap-2">
            {STYLES.map((s) => (
              <button
                key={s.v}
                type="button"
                onClick={() => setStyle(style === s.v ? "" : s.v)}
                className={`h-10 rounded-lg border text-[12px] font-medium ${
                  style === s.v ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">요청 메모</Label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="원하는 조건·일정·궁금한 점을 적어주세요." />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">참고 사진 (선택, 최대 3장)</Label>
          <p className="text-[12px] text-muted-foreground">원하는 분위기·드레스·홀 사진을 올리면 더 정확한 견적을 받을 수 있어요.</p>
          <div className="flex flex-wrap gap-2">
            {imagePaths.map((p) => (
              <div key={p} className="relative w-20 h-20 rounded-xl overflow-hidden border border-border">
                <img src={quoteImageUrl(p)} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setImagePaths((arr) => arr.filter((x) => x !== p))}
                  className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"
                  aria-label="삭제"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {imagePaths.length < 3 && (
              <label className="w-20 h-20 rounded-xl border border-dashed border-border flex items-center justify-center cursor-pointer text-muted-foreground">
                {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5" />}
                <input type="file" accept="image/*" className="hidden" onChange={onPickPhoto} disabled={uploading} />
              </label>
            )}
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 app-col mx-auto bg-background border-t border-border px-3 pt-3 pb-[calc(0.75rem+var(--safe-bottom))] z-40">
        <Button onClick={submit} disabled={submitting} className="w-full h-12 gap-2">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          견적 요청 보내기
        </Button>
      </div>
    </div>
  );
};

export default QuoteNew;
