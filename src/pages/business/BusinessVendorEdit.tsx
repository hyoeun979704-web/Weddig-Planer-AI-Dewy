import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, Eye } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { confirm } from "@/components/ui/confirm-dialog";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";
import ImageUploader from "@/components/admin/ImageUploader";
import BusinessListingDetailForm from "@/components/business/BusinessListingDetailForm";
import { draftKey, loadDraft, saveDraft, clearDraft, shallowEqual } from "@/lib/formDraft";
import { computeListingCompleteness } from "@/lib/businessListingCompleteness";

type InquiryChannel = "chat" | "url" | "phone";

/** 폼 전체 값(자동 임시저장 단위). 전부 문자열 — localStorage 직렬화·비교 단순화. */
interface ListingDraft {
  name: string;
  description: string;
  city: string;
  district: string;
  imageUrl: string;
  minPrice: string;
  tags: string;
  inquiryChannel: InquiryChannel;
  inquiryUrl: string;
  inquiryPhone: string;
}

const EMPTY_LISTING: ListingDraft = {
  name: "", description: "", city: "", district: "", imageUrl: "",
  minPrice: "", tags: "", inquiryChannel: "chat", inquiryUrl: "", inquiryPhone: "",
};

const normalizeChannel = (c: unknown): InquiryChannel =>
  c === "url" || c === "phone" ? c : "chat";

// 승인된 기업회원이 공개 상세페이지(places) 공통 정보를 입력/수정. 저장하면
// 운영자 검토 대기(미노출)로 전환되고, 승인 시 공개된다. 카테고리별 상세 항목은
// 후속(Phase 2b)에서 추가.
//
// 입력 자동 임시저장(draft): iOS 웹에서 앱 전환/탭 폐기로 SPA 가 재로드돼도 미저장
// 입력이 사라지지 않게, 변경 때마다 localStorage 에 draft 저장 → 복귀 시 복원 →
// 저장 성공 시 제거. (사업자 피드백 버그 수정)
const BusinessVendorEdit = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // 멀티지점: ?new=1 = 새 지점 등록, ?branch=<id> = 특정 지점 수정, (없음) = 기존 단일 리스팅(호환).
  const isNew = searchParams.get("new") === "1";
  const branchParam = searchParams.get("branch");
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
  // 오프라인 매장 유무 → 중복 판정 분기(매장有=좌표/주소, 매장無=이름+지역).
  const [hasOfflineStore, setHasOfflineStore] = useState(true);
  const [roadAddress, setRoadAddress] = useState("");
  // 문의 받는 방법 — 'chat'(인앱) | 'url' | 'phone'
  const [inquiryChannel, setInquiryChannel] = useState<"chat" | "url" | "phone">("chat");
  const [inquiryUrl, setInquiryUrl] = useState("");
  const [inquiryPhone, setInquiryPhone] = useState("");

  // draft 키는 사용자별 격리. 서버 스냅샷(마지막 저장/로드값)·hydrate 가드 ref.
  // draft 키는 사용자 + 편집 대상(new/지점별/기존)으로 격리(지점 간 입력 섞임 방지).
  const draftScope = isNew ? "new" : branchParam ?? "default";
  const draftKeyStr = useMemo(() => draftKey("biz-listing", `${user?.id}:${draftScope}`), [user?.id, draftScope]);
  const hydratedRef = useRef(false);
  const serverSnapshotRef = useRef<ListingDraft | null>(null);

  const applyValues = useCallback((v: ListingDraft) => {
    setName(v.name);
    setDescription(v.description);
    setCity(v.city);
    setDistrict(v.district);
    setImageUrl(v.imageUrl);
    setMinPrice(v.minPrice);
    setTags(v.tags);
    setInquiryChannel(v.inquiryChannel);
    setInquiryUrl(v.inquiryUrl);
    setInquiryPhone(v.inquiryPhone);
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      // 새 지점: 서버 로드 없이 빈 폼.
      if (isNew) {
        serverSnapshotRef.current = EMPTY_LISTING;
        const draft = loadDraft<Partial<ListingDraft>>(draftKeyStr);
        applyValues(draft ? { ...EMPTY_LISTING, ...draft, inquiryChannel: normalizeChannel(draft.inquiryChannel) } : EMPTY_LISTING);
        hydratedRef.current = true;
        setLoading(false);
        return;
      }
      let row: Record<string, any> | null | undefined;
      let error: unknown;
      if (branchParam) {
        // 특정 지점 수정 — 내 지점 목록에서 해당 id.
        const res = await supabase.rpc("get_my_listings" as never);
        error = res.error;
        row = Array.isArray(res.data) ? (res.data as any[]).find((r) => r.place_id === branchParam) : null;
      } else {
        const res = await supabase.rpc("get_my_listing");
        error = res.error;
        row = Array.isArray(res.data) ? res.data[0] : res.data;
      }
      if (cancelled) return;
      if (error) {
        toast.error("정보를 불러오지 못했어요. 다시 시도해주세요");
        setLoading(false);
        return;
      }
      let server = EMPTY_LISTING;
      if (row && row.place_id) {
        setPlaceId(row.place_id);
        setModeration(row.moderation_status);
        setModerationNote(row.moderation_note ?? null);
        setHasOfflineStore(row.has_offline_store ?? true);
        setRoadAddress(row.road_address ?? "");
        server = {
          name: row.name ?? "",
          description: row.description ?? "",
          city: row.city ?? "",
          district: row.district ?? "",
          imageUrl: row.main_image_url ?? "",
          minPrice: row.min_price != null ? String(row.min_price) : "",
          tags: Array.isArray(row.tags) ? row.tags.join(", ") : "",
          inquiryChannel: normalizeChannel(row.inquiry_channel),
          inquiryUrl: row.inquiry_url ?? "",
          inquiryPhone: row.inquiry_phone ?? "",
        };
      }
      serverSnapshotRef.current = server;
      // 미저장 draft 가 서버와 다르면 = 작성하다 이탈한 내용 → 복원.
      const draft = loadDraft<Partial<ListingDraft>>(draftKeyStr);
      const restored: ListingDraft | null = draft
        ? { ...server, ...draft, inquiryChannel: normalizeChannel(draft.inquiryChannel) }
        : null;
      if (restored && !shallowEqual(restored, server)) {
        applyValues(restored);
        toast("이전에 작성하던 내용을 불러왔어요");
      } else {
        applyValues(server);
      }
      hydratedRef.current = true;
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, draftKeyStr, applyValues, isNew, branchParam]);

  // 변경 때마다 draft 자동 저장(서버값과 같으면 제거). hydrate 전엔 no-op 로 초기
  // 로드값이 draft 로 덮어써지는 것 방지. 매 키 입력 후 동기 저장이라 iOS 탭 폐기에도 안전.
  useEffect(() => {
    if (!hydratedRef.current) return;
    const current: ListingDraft = {
      name, description, city, district, imageUrl, minPrice, tags,
      inquiryChannel, inquiryUrl, inquiryPhone,
    };
    if (serverSnapshotRef.current && shallowEqual(current, serverSnapshotRef.current)) {
      clearDraft(draftKeyStr);
    } else {
      saveDraft(draftKeyStr, current);
    }
  }, [
    name, description, city, district, imageUrl, minPrice, tags,
    inquiryChannel, inquiryUrl, inquiryPhone, draftKeyStr,
  ]);

  // 등록 완성도 — 채울수록 추천 노출↑ 유도(#318 Phase 1). 현재 폼 값 기준 실시간 계산.
  const completeness = useMemo(
    () => computeListingCompleteness({
      name, description, city, district, imageUrl, minPrice, tags,
      inquiryChannel, inquiryUrl, inquiryPhone,
    }),
    [name, description, city, district, imageUrl, minPrice, tags, inquiryChannel, inquiryUrl, inquiryPhone],
  );

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
    // 공통 기본 필드.
    const base = {
      p_name: name.trim(),
      p_description: description.trim() || undefined,
      p_city: city.trim() || undefined,
      p_district: district.trim() || undefined,
      p_main_image_url: imageUrl.trim() || undefined,
      p_min_price: minPrice ? parseInt(minPrice, 10) : undefined,
      p_tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      p_inquiry_channel: inquiryChannel,
      p_inquiry_url: inquiryChannel === "url" ? inquiryUrl.trim() : undefined,
      p_inquiry_phone: inquiryChannel === "phone" ? inquiryPhone.trim() : undefined,
    };
    const branchExtra = {
      p_has_offline_store: hasOfflineStore,
      p_road_address: hasOfflineStore ? (roadAddress.trim() || undefined) : undefined,
    };
    let data: unknown, error: unknown;
    if (isNew) {
      ({ data, error } = await supabase.rpc("create_my_branch" as never, { ...base, ...branchExtra } as never));
    } else if (branchParam) {
      ({ data, error } = await supabase.rpc("update_my_branch" as never, { p_place_id: branchParam, ...base, ...branchExtra } as never));
    } else {
      ({ data, error } = await supabase.rpc("upsert_my_listing", base));
    }
    setSaving(false);
    const res = data as { ok?: boolean; error?: string; reason?: string; place_id?: string; name?: string } | null;
    if (error || !res?.ok) {
      // 중복 가드 응답 처리 — 같은 좌표/이름 업체 존재 시 차단/claim 안내.
      if (res?.reason === "claimable" && res.place_id) {
        const go = await confirm({
          title: "이미 등록된 업체가 있어요",
          description: `'${res.name ?? "해당 업체"}'가 같은 위치/이름으로 이미 등록되어 있어요. 내 업체로 등록(claim)을 요청할까요?`,
          confirmText: "내 업체로 등록 요청",
        });
        if (go) {
          const claim = await supabase.rpc("request_place_claim", { p_place_id: res.place_id } as never);
          toast[claim.error ? "error" : "success"](
            claim.error ? "요청에 실패했어요" : "등록 요청을 보냈어요. 운영자 승인 후 내 업체가 됩니다",
          );
        }
        return;
      }
      if (res?.reason === "duplicate_own") {
        toast.error("이미 등록한 지점이에요. 기존 지점에서 수정해주세요");
        return;
      }
      if (res?.reason === "duplicate_other") {
        toast.error("같은 위치/이름의 업체가 이미 등록되어 있어요");
        return;
      }
      toast.error(
        res?.error === "not_approved"
          ? "운영자 승인 후 입력할 수 있어요"
          : res?.error === "name_required"
            ? "업체명을 입력해주세요"
            : "저장에 실패했어요",
      );
      return;
    }
    setPlaceId(res.place_id ?? placeId);
    setModeration("pending");
    // 저장 성공 → 현재 값이 정식(서버) 상태. 스냅샷 갱신 + draft 제거(미저장 표시 해제).
    serverSnapshotRef.current = {
      name, description, city, district, imageUrl, minPrice, tags,
      inquiryChannel, inquiryUrl, inquiryPhone,
    };
    clearDraft(draftKeyStr);
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
          <h1 className="flex-1 text-center font-semibold text-lg pr-10">{isNew ? "새 지점 등록" : "업체 정보"}</h1>
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

        {/* 등록 완성도 — 채울수록 추천 노출이 올라간다는 동기 부여(#318 Phase 1 D). */}
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[13px] font-semibold text-foreground">프로필 완성도</p>
            <p className="text-[13px] font-bold text-primary">{completeness.percent}%</p>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${completeness.percent}%` }} />
          </div>
          {completeness.missing.length > 0 ? (
            <p className="text-[11px] text-muted-foreground mt-2">
              <span className="text-foreground font-medium">채우면 노출↑:</span>{" "}
              {completeness.missing.map((m) => m.label).join(" · ")}
            </p>
          ) : (
            <p className="text-[11px] text-emerald-600 mt-2">기본 정보를 모두 채웠어요! 포트폴리오까지 등록하면 더 좋아요.</p>
          )}
        </div>

        <Field label="업체명 *" value={name} onChange={setName} placeholder="상세페이지에 표시될 이름" />
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">소개</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="업체 소개" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="시/도" value={city} onChange={setCity} placeholder="서울특별시" />
          <Field label="구/군" value={district} onChange={setDistrict} placeholder="강남구" />
        </div>

        {/* 오프라인 매장 유무 → 중복 등록 판정 기준. 매장 있으면 주소(좌표)로, 없으면 이름+지역으로 판정. */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">오프라인 매장</Label>
          <div className="grid grid-cols-2 gap-2">
            {([
              { v: true, label: "매장 있음" },
              { v: false, label: "매장 없음 (스냅·축가 등)" },
            ] as const).map((opt) => (
              <button
                key={String(opt.v)}
                type="button"
                onClick={() => setHasOfflineStore(opt.v)}
                className={`h-10 rounded-lg border text-[13px] font-medium transition-colors ${
                  hasOfflineStore === opt.v
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {hasOfflineStore && (
            <Input
              value={roadAddress}
              onChange={(e) => setRoadAddress(e.target.value)}
              placeholder="도로명 주소 (예: 인천 남동구 구월로 123)"
              className="mt-1"
            />
          )}
          <p className="text-[11px] text-muted-foreground">
            {hasOfflineStore
              ? "같은 위치에 이미 등록된 업체가 있으면 중복 등록이 제한돼요."
              : "매장이 없는 경우 같은 이름·지역 중복만 확인해요."}
          </p>
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
        <div className="space-y-1">
          <Field label="최소가 · 시작가(원)" value={minPrice} onChange={setMinPrice} placeholder="500000" type="number" />
          <p className="text-[11px] text-muted-foreground">목록·추천 카드의 “최저가~” 미리보기와 검색·필터에 쓰여요. 상세페이지 첫 화면 대표가격은 ‘상품 관리’의 패키지 가격을 따라요.</p>
        </div>
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
