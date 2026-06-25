import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Loader2,
  Save,
  Eye,
  EyeOff,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AdminGuard from "@/components/admin/AdminGuard";
import AdminLayout from "@/components/admin/AdminLayout";
import ImageUploader from "@/components/ImageUploader";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

/**
 * 운영자용 업체 (places) 정보 편집 페이지.
 *
 * 진입 경로:
 *   1. VendorDetailPage 우상단 "편집" 버튼 (isAdmin 시 표시)
 *   2. 직접 URL: /admin/places/:id
 *
 * 편집 가능 필드:
 *   - 기본: name / category 표시만 (변경 시 다른 컬럼 정합성 깨짐 위험)
 *   - 위치: city / district / lat / lng
 *   - 가격: min_price
 *   - 콘텐츠: description / tags (콤마 구분) / main_image_url
 *   - 노출: is_active (소프트 비활성)
 *
 * RLS: places 의 admin 정책 또는 service-role 이 UPDATE 허용 가정.
 * (places 는 일반적으로 public read + admin write 패턴)
 */

const CATEGORY_LABEL: Record<string, string> = {
  wedding_hall: "웨딩홀",
  studio: "스튜디오",
  dress_shop: "드레스샵",
  makeup_shop: "메이크업샵",
  honeymoon: "신혼여행",
  hanbok: "한복",
  tailor_shop: "예복",
  jewelry: "예물·반지",
  appliance: "가전·혼수",
  invitation_venue: "청첩장 모임 장소",
};

interface PlaceRow {
  place_id: string;
  category: string;
  name: string;
  city: string | null;
  district: string | null;
  min_price: number | null;
  description: string | null;
  tags: string[] | null;
  main_image_url: string | null;
  lat: number | null;
  lng: number | null;
  is_active: boolean | null;
  is_partner: boolean | null;
  updated_at: string | null;
}

const AdminPlaceEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<PlaceRow | null>(null);
  const [tagsInput, setTagsInput] = useState("");
  // 이 업체의 등록 콘텐츠 요약(읽기전용 검수용) — 상품·이벤트·사진. (편집은 기업 계정이)
  const [summary, setSummary] = useState<{ products: { name: string; price: number | null }[]; events: number; media: number } | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("places")
      .select(
        "place_id, category, name, city, district, min_price, description, tags, main_image_url, lat, lng, is_active, is_partner, updated_at",
      )
      .eq("place_id", id)
      .maybeSingle();
    setLoading(false);
    if (error || !data) {
      toast({ title: "불러오기 실패", description: error?.message ?? "업체를 찾을 수 없습니다.", variant: "destructive" });
      return;
    }
    setForm(data as PlaceRow);
    setTagsInput((data as PlaceRow).tags?.join(", ") ?? "");
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // 등록 콘텐츠 요약(읽기전용) — 상품 목록 + 이벤트/사진 수. 실패해도 화면 영향 없음(null 유지).
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      const [pr, ev, md] = await Promise.all([
        (supabase as any).from("business_products").select("name, price").eq("place_id", id).order("created_at", { ascending: false }),
        (supabase as any).from("business_events").select("id", { count: "exact", head: true }).eq("place_id", id),
        (supabase as any).from("place_media").select("id", { count: "exact", head: true }).eq("place_id", id),
      ]);
      if (cancelled) return;
      setSummary({
        products: ((pr.data ?? []) as { name: string; price: number | null }[]),
        events: ev.count ?? 0,
        media: md.count ?? 0,
      });
    })();
    return () => { cancelled = true; };
  }, [id]);

  const setField = <K extends keyof PlaceRow>(key: K, value: PlaceRow[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSave = async () => {
    if (!form || !id) return;
    if (!form.name.trim()) {
      toast({ title: "이름은 필수입니다", variant: "destructive" });
      return;
    }
    setSaving(true);
    // tags 는 콤마/공백 구분 input → text[]. 빈 항목 제거.
    const tags = tagsInput
      .split(/[,\n]/)
      .map((t) => t.trim())
      .filter(Boolean);
    const payload = {
      name: form.name.trim(),
      city: form.city?.trim() || null,
      district: form.district?.trim() || null,
      min_price: form.min_price,
      description: form.description?.trim() || null,
      tags: tags.length > 0 ? tags : null,
      main_image_url: form.main_image_url?.trim() || null,
      lat: form.lat,
      lng: form.lng,
      is_active: form.is_active ?? true,
      is_partner: form.is_partner ?? false,
    };
    const { error } = await (supabase as any)
      .from("places")
      .update(payload)
      .eq("place_id", id);
    setSaving(false);
    if (error) {
      toast({ title: "저장 실패", description: error.message, variant: "destructive" });
      return;
    }
    // 사용자 화면의 React Query 캐시 (place_detail · places 목록 등) 무효화.
    // staleTime 5분 기다리지 않고 다음 마운트 시 즉시 새 데이터 fetch.
    await queryClient.invalidateQueries({ queryKey: ["place_detail", id] });
    await queryClient.invalidateQueries({ queryKey: ["places"] });
    await queryClient.invalidateQueries({ queryKey: ["place_list"] });
    toast({ title: "저장 완료", description: "사용자 화면에 즉시 반영됩니다." });
    await load();
  };

  if (loading) {
    return (
      <AdminGuard>
        <AdminLayout title="업체 정보 수정">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </AdminLayout>
      </AdminGuard>
    );
  }

  if (!form) {
    return (
      <AdminGuard>
        <AdminLayout title="업체 정보 수정">
          <div className="text-center py-20">
            <AlertCircle className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">업체를 찾을 수 없습니다.</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>돌아가기</Button>
          </div>
        </AdminLayout>
      </AdminGuard>
    );
  }

  // category → 사용자 라우트 매핑 (사용자 view 미리보기용)
  const userViewPath = `/vendor/${form.place_id}`;

  return (
    <AdminGuard>
      <AdminLayout
        title="업체 정보 수정"
        description={`${CATEGORY_LABEL[form.category] ?? form.category} · ${form.name}`}
        rightAction={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> 뒤로
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to={userViewPath} target="_blank" rel="noopener">
                <ExternalLink className="w-4 h-4 mr-1" /> 사용자 화면 보기
              </Link>
            </Button>
          </div>
        }
      >
        <div className="space-y-5 max-w-2xl">
          {/* 메타 */}
          <div className="bg-muted/40 rounded-lg p-3 text-xs space-y-1">
            <div>
              <span className="text-muted-foreground">카테고리:</span>{" "}
              <strong>{CATEGORY_LABEL[form.category] ?? form.category}</strong>{" "}
              <span className="text-muted-foreground">(변경 불가 — 데이터 정합성 보호)</span>
            </div>
            <div>
              <span className="text-muted-foreground">place_id:</span>{" "}
              <code className="text-[10px]">{form.place_id}</code>
            </div>
            <div>
              <span className="text-muted-foreground">마지막 수정:</span>{" "}
              {form.updated_at ? new Date(form.updated_at).toLocaleString("ko-KR") : "—"}
            </div>
          </div>

          {/* 등록 콘텐츠 요약(읽기전용 검수) — 상품·이벤트·사진. 편집은 기업 계정의 전용 화면에서. */}
          {summary && (summary.products.length > 0 || summary.events > 0 || summary.media > 0) && (
            <div className="rounded-lg border border-border bg-card p-3 space-y-2">
              <div className="flex items-center gap-3 text-[12px] text-muted-foreground">
                <span><strong className="text-foreground">{summary.products.length}</strong> 상품</span>
                <span><strong className="text-foreground">{summary.events}</strong> 이벤트</span>
                <span><strong className="text-foreground">{summary.media}</strong> 사진</span>
                <span className="ml-auto text-[11px]">검수용 · 편집은 업체 계정</span>
              </div>
              {summary.products.length > 0 && (
                <ul className="text-[12px] text-foreground divide-y divide-border">
                  {summary.products.slice(0, 8).map((p, i) => (
                    <li key={i} className="flex items-center justify-between py-1">
                      <span className="truncate">{p.name}</span>
                      <span className="text-muted-foreground shrink-0">{p.price != null ? `${p.price.toLocaleString()}원` : "—"}</span>
                    </li>
                  ))}
                  {summary.products.length > 8 && <li className="py-1 text-[11px] text-muted-foreground">외 {summary.products.length - 8}개</li>}
                </ul>
              )}
            </div>
          )}

          {/* 노출 토글 */}
          <div className="flex items-center justify-between rounded-lg border border-border p-3 bg-card">
            <div>
              <p className="text-sm font-semibold flex items-center gap-2">
                {form.is_active ? <Eye className="w-4 h-4 text-green-600" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                노출 상태
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                꺼두면 사용자 검색·추천에서 즉시 제외됩니다.
              </p>
            </div>
            <Checkbox
              checked={!!form.is_active}
              onCheckedChange={(v) => setField("is_active", !!v)}
            />
          </div>

          {/* 이름 */}
          <div className="space-y-1.5">
            <Label className="text-sm">업체명 *</Label>
            <Input
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="예: W웨딩 W시티컨벤션"
            />
          </div>

          {/* 메인 이미지 — 가장 눈에 띄는 깨짐 원인 */}
          <div className="space-y-1.5">
            <Label className="text-sm">대표 이미지</Label>
            <p className="text-[11px] text-muted-foreground">
              사용자 카드와 상세 페이지 상단에 표시. 1:1 또는 가로형 권장.
            </p>
            <ImageUploader
              bucket="vendor-images"
              initialUrl={form.main_image_url ?? undefined}
              onUploaded={(_, url) => setField("main_image_url", url)}
            />
            <Input
              value={form.main_image_url ?? ""}
              onChange={(e) => setField("main_image_url", e.target.value)}
              placeholder="또는 외부 URL 직접 입력 (https://...)"
              className="mt-2"
            />
          </div>

          {/* 위치 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm">시·도</Label>
              <Input
                value={form.city ?? ""}
                onChange={(e) => setField("city", e.target.value)}
                placeholder="예: 서울특별시"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">구·군</Label>
              <Input
                value={form.district ?? ""}
                onChange={(e) => setField("district", e.target.value)}
                placeholder="예: 강남구"
              />
            </div>
          </div>

          {/* 좌표 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm">위도 (lat)</Label>
              <Input
                type="number"
                step="0.000001"
                value={form.lat ?? ""}
                onChange={(e) => setField("lat", e.target.value === "" ? null : parseFloat(e.target.value))}
                placeholder="37.5"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">경도 (lng)</Label>
              <Input
                type="number"
                step="0.000001"
                value={form.lng ?? ""}
                onChange={(e) => setField("lng", e.target.value === "" ? null : parseFloat(e.target.value))}
                placeholder="127.0"
              />
            </div>
          </div>

          {/* 가격 */}
          <div className="space-y-1.5">
            <Label className="text-sm">최소가 · 시작가 (원)</Label>
            <p className="text-[11px] text-muted-foreground">상세페이지 “최저가~” 표기용. 개별 상품 가격은 업체의 ‘상품’ 탭에서 따로 관리돼요.</p>
            <Input
              type="number"
              value={form.min_price ?? ""}
              onChange={(e) =>
                setField("min_price", e.target.value === "" ? null : Number(e.target.value))
              }
              placeholder="예: 500000"
            />
          </div>

          {/* 설명 */}
          <div className="space-y-1.5">
            <Label className="text-sm">설명</Label>
            <Textarea
              value={form.description ?? ""}
              onChange={(e) => setField("description", e.target.value)}
              rows={4}
              placeholder="업체 소개 / 특징"
            />
          </div>

          {/* 태그 */}
          <div className="space-y-1.5">
            <Label className="text-sm">태그 (콤마 구분)</Label>
            <Input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="예: 웨딩홀, 호텔, 클래식, 강남"
            />
            <p className="text-[11px] text-muted-foreground">
              필터·검색에 사용. 짧고 명확한 키워드 권장.
            </p>
          </div>

          {/* 파트너 */}
          <div className="flex items-center gap-2 rounded-lg border border-border p-3 bg-card">
            <Checkbox
              id="is_partner"
              checked={!!form.is_partner}
              onCheckedChange={(v) => setField("is_partner", !!v)}
            />
            <Label htmlFor="is_partner" className="text-sm font-normal cursor-pointer">
              파트너 업체로 표시 (우선 노출 + 파트너 배지)
            </Label>
          </div>

          {/* 저장 */}
          <div className="sticky bottom-0 -mx-4 px-4 py-3 bg-background border-t border-border flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => navigate(-1)}>
              취소
            </Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4 mr-1" /> 저장
                </>
              )}
            </Button>
          </div>
        </div>
      </AdminLayout>
    </AdminGuard>
  );
};

export default AdminPlaceEdit;
