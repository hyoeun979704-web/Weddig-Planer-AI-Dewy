import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// 카테고리(업체 종류)마다 detail 테이블·컬럼이 달라, 종류별 필드 스키마를 정의해
// 폼을 동적으로 렌더한다. key 는 detail 테이블 컬럼명과 일치(RPC가 그대로 upsert).
type FieldDef =
  | { key: string; label: string; type: "multi"; options: string[] }
  | { key: string; label: string; type: "number" }
  | { key: string; label: string; type: "bool" };

const DETAIL_SCHEMA: Record<string, FieldDef[]> = {
  wedding_hall: [
    { key: "hall_styles", label: "홀 유형", type: "multi", options: ["호텔", "하우스", "채플", "컨벤션"] },
    { key: "meal_types", label: "식사 옵션", type: "multi", options: ["한식", "양식", "뷔페"] },
    { key: "min_guarantee", label: "최소 보증 인원", type: "number" },
    { key: "max_guarantee", label: "최대 수용 인원", type: "number" },
  ],
  studio: [
    { key: "shoot_styles", label: "촬영 스타일", type: "multi", options: ["모던", "내추럴", "클래식", "로맨틱", "빈티지", "심플", "엘레강스"] },
    { key: "includes_originals", label: "원본 제공", type: "bool" },
    { key: "dress_provided", label: "드레스 제공", type: "bool" },
  ],
  dress_shop: [
    { key: "dress_styles", label: "드레스 스타일", type: "multi", options: ["머메이드", "에이라인", "프린세스", "심플"] },
    { key: "rental_only", label: "대여 전용", type: "bool" },
    { key: "fitting_count", label: "피팅 횟수", type: "number" },
  ],
  makeup_shop: [
    { key: "makeup_styles", label: "메이크업 스타일", type: "multi", options: ["내추럴", "글램", "로맨틱", "청순"] },
    { key: "includes_rehearsal", label: "리허설 포함", type: "bool" },
    { key: "hair_makeup_separate", label: "헤어·메이크업 분리", type: "bool" },
  ],
  hanbok: [
    { key: "hanbok_types", label: "한복 유형", type: "multi", options: ["신부한복", "혼주한복", "폐백한복", "대여", "촬영용", "프리미엄"] },
    { key: "custom_available", label: "맞춤 제작", type: "bool" },
    { key: "delivery_available", label: "배송 가능", type: "bool" },
  ],
  tailor_shop: [
    { key: "suit_styles", label: "예복 유형", type: "multi", options: ["턱시도", "정장", "예복", "캐주얼", "프리미엄"] },
    { key: "custom_available", label: "맞춤 제작", type: "bool" },
    { key: "fitting_count", label: "피팅 횟수", type: "number" },
  ],
  invitation_venue: [
    { key: "venue_types", label: "장소 유형", type: "multi", options: ["레스토랑", "한정식", "카페", "파인다이닝", "호텔레스토랑"] },
    { key: "capacity_min", label: "최소 인원", type: "number" },
    { key: "capacity_max", label: "최대 인원", type: "number" },
    { key: "private_room_count", label: "룸 개수", type: "number" },
  ],
};

const BusinessListingDetailForm = ({ onSaved }: { onSaved?: () => void }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).rpc("get_my_listing_detail");
      const res = data as { category?: string; detail?: Record<string, unknown> } | null;
      setCategory(res?.category ?? null);
      setValues(res?.detail ?? {});
      setLoading(false);
    })();
  }, []);

  const schema = category ? DETAIL_SCHEMA[category] : undefined;

  const toggleMulti = (key: string, opt: string) => {
    setValues((prev) => {
      const arr = Array.isArray(prev[key]) ? (prev[key] as string[]) : [];
      return { ...prev, [key]: arr.includes(opt) ? arr.filter((v) => v !== opt) : [...arr, opt] };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    const { data, error } = await (supabase as any).rpc("upsert_my_listing_detail", { p_detail: values });
    setSaving(false);
    const res = data as { ok?: boolean; error?: string } | null;
    if (error || !res?.ok) {
      toast.error(res?.error === "no_listing" ? "기본 정보를 먼저 저장해주세요" : "저장에 실패했어요");
      return;
    }
    toast.success("상세 정보를 저장했어요. 검토 후 반영됩니다");
    onSaved?.();
  };

  if (loading) {
    return <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  }
  if (!schema) {
    return (
      <p className="text-[13px] text-muted-foreground py-2">
        이 업체 종류의 상세 항목은 준비 중이에요. 기본 정보만으로도 노출됩니다.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {schema.map((f) => (
        <div key={f.key} className="space-y-1.5">
          <Label className="text-sm font-medium">{f.label}</Label>
          {f.type === "multi" && (
            <div className="flex flex-wrap gap-2">
              {f.options.map((opt) => {
                const arr = Array.isArray(values[f.key]) ? (values[f.key] as string[]) : [];
                const active = arr.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleMulti(f.key, opt)}
                    className={`px-3 py-1.5 rounded-full text-sm ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          )}
          {f.type === "number" && (
            <Input
              type="number"
              value={values[f.key] != null ? String(values[f.key]) : ""}
              onChange={(e) => setValues((p) => ({ ...p, [f.key]: e.target.value ? parseInt(e.target.value, 10) : null }))}
            />
          )}
          {f.type === "bool" && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">제공 여부</span>
              <Switch checked={!!values[f.key]} onCheckedChange={(c) => setValues((p) => ({ ...p, [f.key]: c }))} />
            </div>
          )}
        </div>
      ))}
      <Button onClick={handleSave} disabled={saving} variant="outline" className="w-full">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "상세 정보 저장"}
      </Button>
    </div>
  );
};

export default BusinessListingDetailForm;
