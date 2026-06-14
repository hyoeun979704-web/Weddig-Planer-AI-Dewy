import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Eye } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";
import ImageUploader from "@/components/admin/ImageUploader";
import BusinessListingDetailForm from "@/components/business/BusinessListingDetailForm";

// 승인된 기업회원이 공개 상세페이지(places) 공통 정보를 입력/수정. 저장하면
// 운영자 검토 대기(미노출)로 전환되고, 승인 시 공개된다. 카테고리별 상세 항목은
// 후속(Phase 2b)에서 추가.
const BusinessVendorEdit = () => {
  const navigate = useNavigate();
  const { businessProfile, isLoading: roleLoading } = useUserRole();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [moderation, setModeration] = useState<string | null>(null);
  const [moderationNote, setModerationNote] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [tags, setTags] = useState("");
  // 문의 받는 방법 — 'chat'(인앱) | 'url' | 'phone'
  const [inquiryChannel, setInquiryChannel] = useState<"chat" | "url" | "phone">("chat");
  const [inquiryUrl, setInquiryUrl] = useState("");
  const [inquiryPhone, setInquiryPhone] = useState("");

  useEffect(() => {
    (async () => {
      const { data, error } = await (supabase as any).rpc("get_my_listing");
      if (error) {
        toast.error("정보를 불러오지 못했어요. 다시 시도해주세요");
        setLoading(false);
        return;
      }
      const row = Array.isArray(data) ? data[0] : data;
      if (row && row.place_id) {
        setPlaceId(row.place_id);
        setModeration(row.moderation_status);
        setModerationNote(row.moderation_note ?? null);
        setName(row.name ?? "");
        setDescription(row.description ?? "");
        setCity(row.city ?? "");
        setDistrict(row.district ?? "");
        setImageUrl(row.main_image_url ?? "");
        setMinPrice(row.min_price != null ? String(row.min_price) : "");
        setTags(Array.isArray(row.tags) ? row.tags.join(", ") : "");
        setInquiryChannel(
          row.inquiry_channel === "url" || row.inquiry_channel === "phone" ? row.inquiry_channel : "chat",
        );
        setInquiryUrl(row.inquiry_url ?? "");
        setInquiryPhone(row.inquiry_phone ?? "");
      }
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("업체명을 입력해주세요");
      return;
    }
    // 문의 채널 검증 — 고른 방법에 값이 빠지면 저장 막아 '죽은 버튼' 방지.
    if (inquiryChannel === "url" && !/^https?:\/\//.test(inquiryUrl.trim())) {
      toast.error("문의 URL을 http:// 또는 https:// 로 입력해주세요");
      return;
    }
    if (inquiryChannel === "phone" && !inquiryPhone.trim()) {
      toast.error("문의 전화번호를 입력해주세요");
      return;
    }
    setSaving(true);
    const { data, error } = await (supabase as any).rpc("upsert_my_listing", {
      p_name: name.trim(),
      p_description: description.trim() || null,
      p_city: city.trim() || null,
      p_district: district.trim() || null,
      p_main_image_url: imageUrl.trim() || null,
      p_min_price: minPrice ? parseInt(minPrice, 10) : null,
      p_tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      p_inquiry_channel: inquiryChannel,
      p_inquiry_url: inquiryChannel === "url" ? inquiryUrl.trim() : null,
      p_inquiry_phone: inquiryChannel === "phone" ? inquiryPhone.trim() : null,
    });
    setSaving(false);
    const res = data as { ok?: boolean; error?: string; place_id?: string } | null;
    if (error || !res?.ok) {
      toast.error(
        res?.error === "not_approved"
          ? "운영자 승인 후 입력할 수 있어요"
          : "저장에 실패했어요",
      );
      return;
    }
    setPlaceId(res.place_id ?? placeId);
    setModeration("pending");
    toast.success("저장됐어요. 운영자 검토 후 상세페이지에 노출됩니다");
  };

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen bg-background app-col mx-auto flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // 승인 전에는 입력 불가
  if (!businessProfile || businessProfile.approval_status !== "approved") {
    return (
      <div className="min-h-screen bg-background app-col mx-auto">
        <PageHeader title="업체 정보" />
        <div className="px-5 py-20 text-center">
          <p className="text-muted-foreground">운영자 승인 후 업체 정보를 입력할 수 있어요.</p>
          <Button className="mt-6" onClick={() => navigate("/business/dashboard")}>비즈니스 화면으로</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background app-col mx-auto">
      <header className="sticky safe-sticky-header z-50 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center h-14 px-4">
          <button onClick={() => navigate("/business/dashboard")} className="w-10 h-10 flex items-center justify-center -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-center font-semibold text-lg pr-10">업체 정보</h1>
        </div>
      </header>

      <main className="p-5 space-y-4">
        {moderation === "pending" && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[13px] text-amber-800">
            검토 중이에요. 승인되면 상세페이지에 노출됩니다.
          </div>
        )}
        {moderation === "rejected" && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 text-[13px] text-destructive">
            <p>검토에서 반려됐어요. 정보를 수정해 다시 저장해주세요.</p>
            {moderationNote && (
              <p className="mt-2 text-foreground bg-background/60 rounded-lg p-2 whitespace-pre-line">반려 사유: {moderationNote}</p>
            )}
          </div>
        )}

        <Field label="업체명 *" value={name} onChange={setName} placeholder="상세페이지에 표시될 이름" />
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">소개</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="업체 소개" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="시/도" value={city} onChange={setCity} placeholder="서울특별시" />
          <Field label="구/군" value={district} onChange={setDistrict} placeholder="강남구" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">대표 이미지</Label>
          {user && (
            <ImageUploader
              bucket="vendor-images"
              pathPrefix={`${user.id}/`}
              initialUrl={imageUrl || undefined}
              onUploaded={(_, url) => setImageUrl(url)}
            />
          )}
          <Input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="또는 외부 이미지 URL (https://...)"
            className="mt-2"
          />
        </div>
        <Field label="최소 가격(원)" value={minPrice} onChange={setMinPrice} placeholder="500000" type="number" />
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">키워드 (쉼표로 구분)</Label>
          <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="강남웨딩홀, 가성비, 소규모" />
        </div>

        {/* 문의 받는 방법 — 상세페이지 '문의하기' 버튼이 이대로 동작한다. */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">문의 받는 방법</Label>
          <p className="text-[12px] text-muted-foreground">
            고객이 상세페이지에서 '문의하기'를 누르면 아래 방식으로 연결돼요.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {([
              { key: "chat", label: "앱 채팅" },
              { key: "url", label: "내 링크" },
              { key: "phone", label: "전화" },
            ] as const).map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setInquiryChannel(opt.key)}
                className={`h-10 rounded-lg border text-[13px] font-medium transition-colors ${
                  inquiryChannel === opt.key
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {inquiryChannel === "chat" && (
            <p className="text-[12px] text-muted-foreground pt-1">앱 안에서 고객 문의를 직접 받고 답변해요.</p>
          )}
          {inquiryChannel === "url" && (
            <Input
              value={inquiryUrl}
              onChange={(e) => setInquiryUrl(e.target.value)}
              placeholder="https:// 카톡 오픈채팅·네이버 예약·구글폼 등"
              className="mt-1"
            />
          )}
          {inquiryChannel === "phone" && (
            <Input
              type="tel"
              value={inquiryPhone}
              onChange={(e) => setInquiryPhone(e.target.value)}
              placeholder="010-1234-5678"
              className="mt-1"
            />
          )}
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full h-12 mt-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "기본 정보 저장하고 검토 요청"}
        </Button>

        {placeId ? (
          <div className="pt-4 mt-2 border-t border-border">
            <h2 className="text-sm font-semibold text-foreground mb-1">업체 종류별 상세 정보</h2>
            <p className="text-[12px] text-muted-foreground mb-3">아래 "상세 정보 저장"은 위 기본 정보와 별도로 저장돼요. 둘 다 저장하면 함께 검토 요청됩니다.</p>
            <BusinessListingDetailForm onSaved={() => setModeration("pending")} />
          </div>
        ) : (
          <p className="text-[12px] text-muted-foreground text-center pt-2">
            기본 정보를 먼저 저장하면 업체 종류별 상세 항목을 입력할 수 있어요.
          </p>
        )}

        {placeId && (
          <button
            onClick={() => navigate(`/vendor/${placeId}`)}
            className="w-full text-[13px] text-primary font-medium flex items-center justify-center gap-1 pt-1"
          >
            <Eye className="w-4 h-4" /> 상세페이지 미리보기
          </button>
        )}
      </main>
    </div>
  );
};

const Field = ({
  label, value, onChange, placeholder, type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) => (
  <div className="space-y-1.5">
    <Label className="text-sm font-medium">{label}</Label>
    <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
  </div>
);

export default BusinessVendorEdit;
