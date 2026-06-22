import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { draftKey, loadDraft, saveDraft, clearDraft, jsonEqual } from "@/lib/formDraft";

// 업체 기본/운영 정보(연락처·운영시간·SNS·주차·교통) 폼.
// 공개 상세페이지(place_details)가 읽는 값을 사장님이 직접 채울 수 있게 한다. 카테고리
// 상세(BusinessListingDetailForm)와 분리된 별도 RPC(upsert/get_my_listing_contact)만 사용.
// 값은 전부 선택(빈칸이면 상세페이지에서 해당 항목 미노출).

const DAYS: { key: string; label: string }[] = [
  { key: "hours_mon", label: "월" },
  { key: "hours_tue", label: "화" },
  { key: "hours_wed", label: "수" },
  { key: "hours_thu", label: "목" },
  { key: "hours_fri", label: "금" },
  { key: "hours_sat", label: "토" },
  { key: "hours_sun", label: "일" },
];

// http(s) 만 허용(살균은 서버에서도 하지만, 저장 전에 알려 죽은 입력 방지).
const URL_FIELDS: { key: string; label: string; placeholder: string }[] = [
  { key: "website_url", label: "홈페이지", placeholder: "https://..." },
  { key: "instagram_url", label: "인스타그램", placeholder: "https://instagram.com/..." },
  { key: "naver_blog_url", label: "네이버 블로그", placeholder: "https://blog.naver.com/..." },
  { key: "kakao_channel_url", label: "카카오 채널", placeholder: "https://pf.kakao.com/..." },
  { key: "youtube_url", label: "유튜브", placeholder: "https://youtube.com/..." },
  { key: "facebook_url", label: "페이스북", placeholder: "https://facebook.com/..." },
];

const BusinessListingContactForm = ({ onSaved }: { onSaved?: () => void }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<Record<string, unknown>>({});

  const draftKeyStr = useMemo(() => draftKey("biz-listing-contact", user?.id), [user?.id]);
  const hydratedRef = useRef(false);
  const serverSnapshotRef = useRef<Record<string, unknown>>({});

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any).rpc("get_my_listing_contact");
      if (cancelled) return;
      const server = (data as Record<string, unknown>) ?? {};
      serverSnapshotRef.current = server;
      const draft = loadDraft<Record<string, unknown>>(draftKeyStr);
      if (draft && !jsonEqual(draft, server)) {
        setValues(draft);
        toast("이전에 작성하던 연락처 정보를 불러왔어요");
      } else {
        setValues(server);
      }
      hydratedRef.current = true;
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, draftKeyStr]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    if (jsonEqual(values, serverSnapshotRef.current)) {
      clearDraft(draftKeyStr);
    } else {
      saveDraft(draftKeyStr, values);
    }
  }, [values, draftKeyStr]);

  const str = (key: string) => (values[key] != null ? String(values[key]) : "");
  const setStr = (key: string, v: string) => setValues((p) => ({ ...p, [key]: v }));
  const setNum = (key: string, v: string) =>
    setValues((p) => ({ ...p, [key]: v ? parseInt(v.replace(/[^0-9]/g, ""), 10) || null : null }));

  const handleSave = async () => {
    // URL 형식 검증 — 잘못된 링크는 서버가 버려서 사용자가 모르고 비게 됨. 미리 알린다.
    for (const f of URL_FIELDS) {
      const v = str(f.key).trim();
      if (v && !/^https?:\/\//.test(v)) {
        toast.error(`${f.label} 링크는 http:// 또는 https:// 로 입력해주세요`);
        return;
      }
    }
    setSaving(true);
    const { data, error } = await (supabase as any).rpc("upsert_my_listing_contact", { p_contact: values });
    setSaving(false);
    const res = data as { ok?: boolean; error?: string } | null;
    if (error || !res?.ok) {
      toast.error(res?.error === "no_listing" ? "기본 정보를 먼저 저장해주세요" : "저장에 실패했어요");
      return;
    }
    serverSnapshotRef.current = values;
    clearDraft(draftKeyStr);
    toast.success("연락처·운영 정보를 저장했어요. 검토 후 반영됩니다");
    onSaved?.();
  };

  if (loading) {
    return <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-5">
      {/* 연락처·채널 */}
      <div className="space-y-3">
        <p className="text-[13px] font-semibold text-foreground">연락처 · 채널</p>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">대표 전화</Label>
          <Input
            type="tel"
            value={str("tel")}
            onChange={(e) => setStr("tel", e.target.value)}
            placeholder="02-123-4567"
          />
        </div>
        {URL_FIELDS.map((f) => (
          <div key={f.key} className="space-y-1.5">
            <Label className="text-sm font-medium">{f.label}</Label>
            <Input
              type="url"
              inputMode="url"
              value={str(f.key)}
              onChange={(e) => setStr(f.key, e.target.value)}
              placeholder={f.placeholder}
            />
          </div>
        ))}
      </div>

      {/* 운영시간 */}
      <div className="space-y-3">
        <p className="text-[13px] font-semibold text-foreground">운영시간</p>
        <p className="text-[11px] text-muted-foreground -mt-1">예: 10:00~20:00, 휴무. 비워두면 상세페이지에서 숨겨져요.</p>
        <div className="space-y-2">
          {DAYS.map((d) => (
            <div key={d.key} className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground w-6 text-center shrink-0">{d.label}</span>
              <Input
                value={str(d.key)}
                onChange={(e) => setStr(d.key, e.target.value)}
                placeholder="10:00~20:00"
                className="flex-1"
              />
            </div>
          ))}
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">정기 휴무</Label>
          <Input value={str("closed_days")} onChange={(e) => setStr("closed_days", e.target.value)} placeholder="매주 월요일" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">휴무·공지 안내</Label>
          <Input value={str("holiday_notice")} onChange={(e) => setStr("holiday_notice", e.target.value)} placeholder="명절 당일 휴무" />
        </div>
      </div>

      {/* 주차 · 교통 */}
      <div className="space-y-3">
        <p className="text-[13px] font-semibold text-foreground">주차 · 교통</p>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">주차 안내</Label>
          <Input value={str("parking_location")} onChange={(e) => setStr("parking_location", e.target.value)} placeholder="건물 지하 1~3층" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">주차 가능 대수</Label>
            <Input type="number" inputMode="numeric" value={str("parking_capacity")} onChange={(e) => setNum("parking_capacity", e.target.value)} placeholder="100" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">하객 무료주차</Label>
            <Input value={str("parking_free_guest")} onChange={(e) => setStr("parking_free_guest", e.target.value)} placeholder="2시간 무료" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">혼주 무료주차</Label>
          <Input value={str("parking_free_parents")} onChange={(e) => setStr("parking_free_parents", e.target.value)} placeholder="종일 무료" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">지하철 호선</Label>
            <Input value={str("subway_line")} onChange={(e) => setStr("subway_line", e.target.value)} placeholder="2호선" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">가까운 역</Label>
            <Input value={str("subway_station")} onChange={(e) => setStr("subway_station", e.target.value)} placeholder="강남역" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">역에서 도보(분)</Label>
          <Input type="number" inputMode="numeric" value={str("walk_minutes")} onChange={(e) => setNum("walk_minutes", e.target.value)} placeholder="5" />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">셔틀버스 운영</Label>
          <Switch
            checked={!!values.shuttle_bus_available}
            onCheckedChange={(c) => setValues((p) => ({ ...p, shuttle_bus_available: c }))}
          />
        </div>
        {!!values.shuttle_bus_available && (
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">셔틀 안내</Label>
            <Input value={str("shuttle_bus_info")} onChange={(e) => setStr("shuttle_bus_info", e.target.value)} placeholder="강남역 10번 출구, 30분 간격" />
          </div>
        )}
      </div>

      <Button onClick={handleSave} disabled={saving} variant="outline" className="w-full">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "연락처·운영 정보 저장"}
      </Button>
    </div>
  );
};

export default BusinessListingContactForm;
