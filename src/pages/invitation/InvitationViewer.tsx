import { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, Heart, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import InvitationCanvas from "@/components/invitation/InvitationCanvas";
import { useInvitationFonts } from "@/hooks/useInvitationFonts";
import { Drawer } from "vaul";
import {
  collectFontFamilies,
  getInvitationPages,
  isSeamlessRoll,
  pageToLayout,
} from "@/lib/invitation/layout";
import {
  readFaceLayout,
  type InvitationLayout,
  type InvitationSlot,
  type InvitationSlotAction,
  type InvitationUserData,
} from "@/lib/invitation/types";

/**
 * 공개 청첩장 뷰어 — /i/:slug
 */

interface PublishedInvitation {
  id: string;
  user_data: InvitationUserData;
  layout: {
    target_mobile_slug?: string | null;
    textOverrides?: Record<string, string>;
    fontOverrides?: Record<string, string>;
    imagePaths?: Record<string, string>;
    imageUrlsForViewer?: Record<string, string>;
    imageFitOverrides?: Record<string, "cover" | "contain">;
    actionOverrides?: Record<string, InvitationSlotAction>;
  };
  ai_generated_text: Record<string, string> | null;
  share_slug: string;
  status: string;
  back_template_id: string | null;
  invitation_templates: {
    name: string;
    layout: InvitationLayout;
    tone: string;
    format: string;
  } | null;
}

type MealPreference = "undecided" | "yes" | "no";
type RsvpSide = "undecided" | "groom" | "bride";

const RSVP_NAME_MAX_LENGTH = 80;
const RSVP_MESSAGE_MAX_LENGTH = 500;
const RSVP_COMPANION_MAX_COUNT = 20;

function resolveSlotActionValue(
  action: InvitationSlotAction | undefined,
  userData: InvitationUserData,
) {
  if (!action) return "";
  if (action.field && userData[action.field]) return userData[action.field] ?? "";
  return action.value ?? "";
}

function normalizeExternalUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^(https?:|mailto:|tel:|sms:)/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/")) return trimmed;
  return `https://${trimmed}`;
}

function normalizePhone(value: string) {
  return value.replace(/[^\d+]/g, "");
}

function slotWithActionOverride(
  slot: InvitationSlot,
  overrides: Record<string, InvitationSlotAction> = {},
) {
  const action = overrides[slot.id] ?? slot.action;
  return action ? { ...slot, action } : slot;
}

const InvitationViewer = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<PublishedInvitation | null>(null);
  const [backLayout, setBackLayout] = useState<InvitationLayout | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // RSVP Drawer 상태 관리
  const [isRsvpOpen, setIsRsvpOpen] = useState(false);
  const [rsvpName, setRsvpName] = useState("");
  const [isAttending, setIsAttending] = useState(true);
  const [mealPreference, setMealPreference] =
    useState<MealPreference>("undecided");
  const [companionCount, setCompanionCount] = useState(0);
  const [childCount, setChildCount] = useState(0);
  const [rsvpSide, setRsvpSide] = useState<RsvpSide>("undecided");
  const [rsvpMessage, setRsvpMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const usedFonts = useMemo(() => {
    const tpl = data?.invitation_templates;
    if (!tpl) return undefined;
    const f = readFaceLayout(data!.layout);
    const ov = {
      ...(f.front.fontOverrides ?? {}),
      ...(f.back.fontOverrides ?? {}),
    };
    const extra = [
      ...(f.front.extraSlots ?? []),
      ...(f.back.extraSlots ?? []),
    ];
    const layouts = [tpl.layout, backLayout].filter(
      (l): l is InvitationLayout => !!l,
    );
    return collectFontFamilies(layouts, ov, extra);
  }, [data, backLayout]);
  const { fontsReady } = useInvitationFonts(usedFonts);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data: row, error } = await (supabase as any)
        .from("invitations")
        .select(
          "id, user_data, layout, ai_generated_text, share_slug, status, back_template_id, invitation_templates(name, layout, tone, format)",
        )
        .eq("share_slug", slug)
        .eq("status", "published")
        .maybeSingle();
      if (error || !row) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setData(row as PublishedInvitation);
      if (row.back_template_id) {
        const { data: bt } = await (supabase as any)
          .from("invitation_templates")
          .select("layout")
          .eq("id", row.back_template_id)
          .maybeSingle();
        if (bt?.layout) setBackLayout(bt.layout as InvitationLayout);
      }
      setLoading(false);
    })();
  }, [slug]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ url, title: "청첩장" });
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          await navigator.clipboard.writeText(url);
          toast({ title: "URL 복사됨" });
        }
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: "URL 복사됨" });
    }
  };

  // RSVP 제출 처리
  const handleRsvpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;

    const name = rsvpName.trim();
    const message = rsvpMessage.trim();
    const normalizedCompanionCount = Number.isFinite(companionCount)
      ? Math.trunc(companionCount)
      : 0;

    if (!name) {
      toast({ title: "성함을 입력해주세요." });
      return;
    }
    if (name.length > RSVP_NAME_MAX_LENGTH) {
      toast({ title: "성함은 80자 이내로 입력해주세요." });
      return;
    }
    if (
      normalizedCompanionCount < 0 ||
      normalizedCompanionCount > RSVP_COMPANION_MAX_COUNT
    ) {
      toast({ title: "동행 인원은 0명에서 20명 사이로 입력해주세요." });
      return;
    }
    if (message.length > RSVP_MESSAGE_MAX_LENGTH) {
      toast({ title: "메시지는 500자 이내로 입력해주세요." });
      return;
    }

    setSubmitting(true);
    try {
      // 아동은 동행 안에 포함 — DB CHECK(child_count <= companion_count)와 동일 방어
      const normalizedChildCount = Math.max(
        0,
        Math.min(Math.trunc(childCount) || 0, normalizedCompanionCount),
      );
      const { error } = await (supabase as any)
        .from("invitation_rsvp")
        .insert({
          invitation_id: data.id,
          name,
          is_attending: isAttending,
          side: rsvpSide,
          meal_preference: mealPreference,
          companion_count: normalizedCompanionCount,
          child_count: normalizedChildCount,
          message: message || null,
        });

      if (error) throw error;

      toast({ title: "참석 의사가 신랑 신부에게 전달되었습니다!" });
      setIsRsvpOpen(false);
      // 폼 리셋
      setRsvpName("");
      setIsAttending(true);
      setRsvpSide("undecided");
      setMealPreference("undecided");
      setCompanionCount(0);
      setChildCount(0);
      setRsvpMessage("");
    } catch (err: any) {
      console.error(err);
      toast({
        title: "제출 실패",
        description: "다시 시도해 주세요.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const findSlotAction = (slotId: string) => {
    if (!data?.invitation_templates) return undefined;
    const faces = readFaceLayout(data.layout);
    const layouts = [
      { layout: data.invitation_templates.layout, face: faces.front },
      ...(backLayout ? [{ layout: backLayout, face: faces.back }] : []),
    ];
    for (const item of layouts) {
      const slot =
        getInvitationPages(item.layout)
          .flatMap((page) => page.slots)
          .find((candidate) => candidate.id === slotId) ??
        item.face.extraSlots?.find((candidate) => candidate.id === slotId);
      if (slot) {
        return slotWithActionOverride(slot, item.face.actionOverrides).action;
      }
    }
    return undefined;
  };

  // 갤러리 — 탭하면 인스타 피드형 전체 보기(그리드), 사진 탭하면 확대 스와이프
  const [galleryView, setGalleryView] = useState<string[] | null>(null);
  const [lightbox, setLightbox] = useState<{
    urls: string[];
    index: number;
  } | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const lightboxScrollRef = useRef<HTMLDivElement>(null);

  // 확대 보기가 열리면 탭한 사진 위치로 즉시 이동
  useEffect(() => {
    if (!lightbox) return;
    setLightboxIndex(lightbox.index);
    const el = lightboxScrollRef.current;
    if (el) el.scrollLeft = lightbox.index * el.clientWidth;
  }, [lightbox]);

  // 내비 선택 시트 — 지도 액션 탭 시 검색할 장소명/주소
  const [navQuery, setNavQuery] = useState<string | null>(null);

  /** slotId 가 갤러리 슬롯이면 그 면의 발행 이미지 url 들을 index 순으로 반환. */
  const galleryUrlsOf = (slotId: string): string[] | null => {
    if (!data?.invitation_templates) return null;
    const faces = readFaceLayout(data.layout);
    const items = [
      { layout: data.invitation_templates.layout, face: faces.front },
      ...(backLayout ? [{ layout: backLayout, face: faces.back }] : []),
    ];
    for (const item of items) {
      const slot =
        getInvitationPages(item.layout)
          .flatMap((page) => page.slots)
          .find((c) => c.id === slotId) ??
        item.face.extraSlots?.find((c) => c.id === slotId);
      if (slot?.type === "gallery") {
        const urls = item.face.imageUrlsForViewer ?? {};
        return Object.keys(urls)
          .filter((k) => k.startsWith(`${slotId}#`))
          .sort((a, b) => Number(a.split("#")[1]) - Number(b.split("#")[1]))
          .map((k) => urls[k]);
      }
      if (slot) return null;
    }
    return null;
  };

  // 슬롯 액션 라우팅
  const handleSlotClick = async (slotId: string | null) => {
    if (!slotId || !data) return;

    // 갤러리 탭 → 인스타 피드형 전체 보기
    const galleryUrls = galleryUrlsOf(slotId);
    if (galleryUrls && galleryUrls.length > 0) {
      setGalleryView(galleryUrls);
      return;
    }

    const action = findSlotAction(slotId);
    if (action && action.type !== "none") {
      const value = resolveSlotActionValue(action, data.user_data ?? {});
      switch (action.type) {
        case "rsvp":
          setIsRsvpOpen(true);
          return;
        case "copy":
          if (!value) {
            toast({ title: "복사할 값이 아직 입력되지 않았어요." });
            return;
          }
          await navigator.clipboard.writeText(value);
          toast({ title: action.label ? `${action.label} 복사 완료` : "복사 완료" });
          return;
        case "link": {
          const url = normalizeExternalUrl(value);
          if (!url) {
            toast({ title: "연결할 링크가 아직 입력되지 않았어요." });
            return;
          }
          window.open(url, "_blank", "noopener,noreferrer");
          return;
        }
        case "phone": {
          const phone = normalizePhone(value);
          if (!phone) {
            toast({ title: "전화번호가 아직 입력되지 않았어요." });
            return;
          }
          window.location.href = `tel:${phone}`;
          return;
        }
        case "sms": {
          const phone = normalizePhone(value);
          if (!phone) {
            toast({ title: "문자 받을 번호가 아직 입력되지 않았어요." });
            return;
          }
          window.location.href = `sms:${phone}`;
          return;
        }
        case "map": {
          const query = value || data.user_data.venue_address || data.user_data.venue_name || "";
          if (!query.trim()) {
            toast({ title: "지도에서 찾을 장소가 아직 입력되지 않았어요." });
            return;
          }
          // 바로 한 앱으로 보내지 않고 내비 선택 시트 — 하객마다 쓰는 지도 앱이 다르다.
          setNavQuery(query.trim());
          return;
        }
        default:
          break;
      }
    }

    if (slotId === "rsvp_trigger") {
      setIsRsvpOpen(true);
    } else if (slotId === "groom_account_btn" || slotId === "bride_account_btn") {
      // 미입력 시 가짜 계좌 폴백 금지 — 하객이 엉뚱한 계좌로 송금할 수 있다.
      const isGroom = slotId === "groom_account_btn";
      const account = isGroom
        ? data.user_data.account_groom
        : data.user_data.account_bride;
      if (!account) {
        toast({ title: "계좌번호가 아직 입력되지 않았어요." });
        return;
      }
      try {
        await navigator.clipboard.writeText(account);
        toast({
          title: isGroom
            ? "신랑측 계좌번호가 복사되었습니다."
            : "신부측 계좌번호가 복사되었습니다.",
        });
      } catch {
        toast({ title: "복사 권한이 없어 복사하지 못했어요." });
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !data || !data.invitation_templates) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 text-center">
        <h1 className="text-xl font-bold text-foreground mb-2">
          청첩장을 찾을 수 없어요
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          링크가 잘못됐거나 더 이상 유효하지 않은 청첩장이에요.
        </p>
        <Button onClick={() => navigate("/")}>홈으로</Button>
      </div>
    );
  }

  const tpl = data.invitation_templates;
  const faces = readFaceLayout(data.layout);
  const seamlessRoll = isSeamlessRoll(tpl.layout);
  const qrShareUrl = data.layout.target_mobile_slug
    ? `${window.location.origin}/i/${data.layout.target_mobile_slug}`
    : window.location.href;
  const renderPages = (
    layout: InvitationLayout,
    overrides: ReturnType<typeof readFaceLayout>["front"],
  ) =>
    getInvitationPages(layout).map((page, index, pages) => {
      const seamless = isSeamlessRoll(layout);
      // 스크롤 리빌: 사용자 토글 우선 (on=페이지형도 적용, off=끄기), 기본은 롤 전용
      const reveal =
        overrides.revealOverride === "off"
          ? false
          : overrides.revealOverride === "on"
            ? true
            : seamless;
      return (
        <RevealSection
          key={page.id}
          enabled={reveal}
          className={`flex flex-col items-center ${seamless ? "gap-0" : "gap-2"}`}
        >
          {!seamless && pages.length > 1 && (
            <span className="text-[11px] font-bold text-muted-foreground">
              {page.label ?? `${index + 1}P`}
            </span>
          )}
          <InvitationCanvas
            layout={pageToLayout(page)}
            userData={data.user_data ?? {}}
            aiText={data.ai_generated_text ?? {}}
            textOverrides={overrides.textOverrides ?? {}}
            fontOverrides={overrides.fontOverrides ?? {}}
            positionOverrides={overrides.positionOverrides ?? {}}
            sizeOverrides={overrides.sizeOverrides ?? {}}
            animOverrides={overrides.animOverrides ?? {}}
            animationsEnabled={data.invitation_templates?.format !== "paper"}
            zOverrides={overrides.zOverrides ?? {}}
            rotationOverrides={overrides.rotationOverrides ?? {}}
            fontSizeOverrides={overrides.fontSizeOverrides ?? {}}
            extraSlots={index === 0 ? overrides.extraSlots ?? [] : []}
            hiddenSlots={overrides.hiddenSlots ?? []}
            fontsReady={fontsReady}
            imageUrls={overrides.imageUrlsForViewer ?? {}}
            bgOverride={overrides.bgOverride}
            selectedSlotId={null}
            onSelectSlot={handleSlotClick}
            displayWidth={360}
            shareUrl={qrShareUrl}
            imageFitOverrides={overrides.imageFitOverrides}
            actionOverrides={overrides.actionOverrides}
          />
        </RevealSection>
      );
    });

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto pb-24">
      <div
        className={`relative flex flex-col items-center bg-muted/20 ${
          seamlessRoll ? "py-0 gap-0" : "py-5 gap-5"
        }`}
      >
        {seamlessRoll &&
          (() => {
            // 사용자 장식 override 우선: 'none' 은 끄기, 미지정은 템플릿 기본.
            const decor =
              faces.front.decorOverride === "none"
                ? undefined
                : (faces.front.decorOverride ?? tpl.layout.decor);
            return decor ? (
              <>
                <style>{DECOR_KEYFRAMES}</style>
                <FloatingDecor kind={decor} />
              </>
            ) : null;
          })()}
        {renderPages(tpl.layout, faces.front)}
        {backLayout && renderPages(backLayout, faces.back)}
      </div>

      <div className="px-5 pt-5 space-y-3">
        <Button
          onClick={handleShare}
          variant="outline"
          className="w-full h-12"
        >
          <Share2 className="w-4 h-4 mr-2" />
          이 청첩장 공유하기
        </Button>

        <div className="pt-6 border-t border-border text-center">
          <p className="text-[12px] text-muted-foreground mb-3">
            나도 청첩장을 만들고 싶다면
          </p>
          <Button
            variant="ghost"
            onClick={() => navigate("/invitation/new?format=mobile")}
            className="text-primary"
          >
            <Heart className="w-4 h-4 mr-2" />
            Dewy 에서 청첩장 만들기
          </Button>
        </div>
      </div>

      {/* 내비 선택 시트 — 하객이 쓰는 지도 앱으로 길찾기 */}
      {navQuery && (
        <div
          className="fixed inset-0 z-[55] bg-black/40 flex items-end"
          onClick={() => setNavQuery(null)}
          role="dialog"
          aria-label="지도 앱 선택"
        >
          <div
            className="w-full max-w-[430px] mx-auto bg-background rounded-t-2xl p-4 pb-8 space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-bold text-foreground text-center mb-1">
              어떤 지도로 찾아갈까요?
            </p>
            <p className="text-[11px] text-muted-foreground text-center mb-3 truncate">
              {navQuery}
            </p>
            {(
              [
                {
                  label: "카카오맵",
                  href: `kakaomap://search?q=${encodeURIComponent(navQuery)}`,
                },
                {
                  label: "네이버 지도",
                  href: `nmap://search?query=${encodeURIComponent(navQuery)}`,
                },
                {
                  label: "티맵",
                  href: `tmap://search?name=${encodeURIComponent(navQuery)}`,
                },
                {
                  label: "웹에서 보기 (카카오맵)",
                  href: `https://map.kakao.com/link/search/${encodeURIComponent(navQuery)}`,
                  web: true,
                },
              ] as const
            ).map((opt) => (
              <a
                key={opt.label}
                href={opt.href}
                {...("web" in opt && opt.web
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                className="block w-full h-11 leading-[44px] text-center rounded-xl border border-border bg-card text-sm font-medium text-foreground active:scale-[0.99] transition-transform"
                onClick={() => setNavQuery(null)}
              >
                {opt.label}
              </a>
            ))}
            <button
              type="button"
              onClick={() => setNavQuery(null)}
              className="block w-full h-11 text-center text-sm text-muted-foreground"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* 갤러리 전체 보기 — 인스타 피드형 3열 그리드 페이지 */}
      {galleryView && (
        <div
          className="fixed inset-0 z-[58] bg-background flex flex-col max-w-[430px] mx-auto"
          role="dialog"
          aria-label="갤러리 전체 보기"
        >
          <div className="flex items-center justify-between px-4 h-12 border-b border-border bg-background/95 backdrop-blur sticky safe-sticky-header">
            <button
              type="button"
              onClick={() => setGalleryView(null)}
              className="text-sm font-bold text-foreground px-1"
              aria-label="뒤로"
            >
              ←
            </button>
            <p className="text-sm font-bold text-foreground">
              갤러리 <span className="text-muted-foreground font-normal">{galleryView.length}</span>
            </p>
            <span className="w-6" />
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-3 gap-0.5">
              {galleryView.map((u, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setLightbox({ urls: galleryView, index: i })}
                  className="aspect-square overflow-hidden active:opacity-80"
                  aria-label={`사진 ${i + 1} 크게 보기`}
                >
                  <img
                    src={u}
                    alt=""
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 갤러리 확대 보기 — 탭한 사진부터 좌우 스와이프(scroll-snap) */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[60] bg-black/95 flex flex-col"
          role="dialog"
          aria-label="갤러리 크게 보기"
        >
          <div className="flex items-center justify-between p-3">
            <span className="text-white/80 text-[13px] font-medium px-2 tabular-nums">
              {lightboxIndex + 1} / {lightbox.urls.length}
            </span>
            <button
              type="button"
              onClick={() => setLightbox(null)}
              className="w-9 h-9 rounded-full bg-white/15 text-white text-lg leading-none"
              aria-label="닫기"
            >
              ×
            </button>
          </div>
          <div
            ref={lightboxScrollRef}
            onScroll={(e) => {
              const el = e.currentTarget;
              setLightboxIndex(
                Math.max(0, Math.round(el.scrollLeft / el.clientWidth)),
              );
            }}
            className="flex-1 flex overflow-x-auto snap-x snap-mandatory"
          >
            {lightbox.urls.map((u, i) => (
              <div
                key={i}
                className="min-w-full snap-center flex items-center justify-center p-2"
              >
                <img
                  src={u}
                  alt=""
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            ))}
          </div>
          <p className="text-center text-white/60 text-[11px] py-3">
            좌우로 넘겨 보세요
          </p>
        </div>
      )}

      {/* RSVP Bottom Sheet Drawer */}
      <Drawer.Root open={isRsvpOpen} onOpenChange={setIsRsvpOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Drawer.Content className="bg-background flex flex-col rounded-t-[10px] h-[85%] mt-24 fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto z-50 focus:outline-none">
            <div className="p-4 bg-background rounded-t-[10px] flex-1 overflow-y-auto">
              <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted mb-6" />
              <Drawer.Title className="text-xl font-bold text-center mb-6 text-foreground">
                참석 의사 전달하기
              </Drawer.Title>

              <form onSubmit={handleRsvpSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">성함</label>
                  <input
                    type="text"
                    required
                    maxLength={RSVP_NAME_MAX_LENGTH}
                    value={rsvpName}
                    onChange={(e) => setRsvpName(e.target.value)}
                    placeholder="성함을 입력해주세요"
                    className="w-full h-11 px-3 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">참석 여부</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAttending(true)}
                      className={`h-11 rounded-md text-sm font-medium border transition-colors ${
                        isAttending
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-foreground border-input hover:bg-accent"
                      }`}
                    >
                      참석합니다
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAttending(false)}
                      className={`h-11 rounded-md text-sm font-medium border transition-colors ${
                        !isAttending
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-foreground border-input hover:bg-accent"
                      }`}
                    >
                      미참석
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">어느 측 하객이신가요?</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { val: "groom", label: "신랑측" },
                      { val: "bride", label: "신부측" },
                    ].map((s) => (
                      <button
                        key={s.val}
                        type="button"
                        onClick={() =>
                          setRsvpSide((prev) =>
                            prev === s.val ? "undecided" : (s.val as RsvpSide),
                          )
                        }
                        className={`h-11 rounded-md text-sm font-medium border transition-colors ${
                          rsvpSide === s.val
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-foreground border-input hover:bg-accent"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">식사 여부</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { val: "yes", label: "식사함" },
                      { val: "no", label: "식사안함" },
                      { val: "undecided", label: "미정" }
                    ].map((pref) => (
                      <button
                        key={pref.val}
                        type="button"
                        onClick={() =>
                          setMealPreference(pref.val as MealPreference)
                        }
                        className={`h-11 rounded-md text-sm font-medium border transition-colors ${
                          mealPreference === pref.val
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-foreground border-input hover:bg-accent"
                        }`}
                      >
                        {pref.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">동행 인원 (본인 제외)</label>
                  <input
                    type="number"
                    min={0}
                    max={RSVP_COMPANION_MAX_COUNT}
                    step={1}
                    value={companionCount}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      if (!Number.isFinite(next)) {
                        setCompanionCount(0);
                        return;
                      }
                      setCompanionCount(
                        Math.max(
                          0,
                          Math.min(RSVP_COMPANION_MAX_COUNT, Math.trunc(next)),
                        ),
                      );
                    }}
                    className="w-full h-11 px-3 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>

                {companionCount > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      동행 중 아동 수 <span className="text-muted-foreground font-normal">(식수 산정에 도움돼요)</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={companionCount}
                      step={1}
                      value={childCount}
                      onChange={(e) => {
                        const next = Number(e.target.value);
                        if (!Number.isFinite(next)) {
                          setChildCount(0);
                          return;
                        }
                        setChildCount(
                          Math.max(0, Math.min(companionCount, Math.trunc(next))),
                        );
                      }}
                      className="w-full h-11 px-3 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">축하의 메시지</label>
                  <textarea
                    value={rsvpMessage}
                    maxLength={RSVP_MESSAGE_MAX_LENGTH}
                    onChange={(e) => setRsvpMessage(e.target.value)}
                    placeholder="신랑 신부에게 전할 축하의 한마디를 적어주세요"
                    className="w-full h-24 p-3 rounded-md border border-input bg-background text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>

                <Button type="submit" disabled={submitting} className="w-full h-12 mt-4">
                  {submitting ? "제출 중..." : "참석 의사 전달하기"}
                </Button>
              </form>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
};

// ── 모바일 청첩장 애니메이션 ───────────────────────────────────
const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** 스크롤 진입 시 페이드업(등장). enabled=false 면 정적. */
function RevealSection({
  enabled,
  className,
  children,
}: {
  enabled: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(!enabled);
  useEffect(() => {
    if (!enabled || prefersReduced()) {
      setShown(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setShown(true);
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [enabled]);
  return (
    <div
      ref={ref}
      className={className}
      style={
        enabled
          ? {
              opacity: shown ? 1 : 0,
              transform: shown ? "none" : "translateY(28px)",
              transition:
                "opacity .7s ease, transform .7s cubic-bezier(.22,.61,.36,1)",
              willChange: "opacity, transform",
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}

const DECOR_GLYPH: Record<string, string> = {
  hearts: "♥",
  petals: "❀",
  confetti: "✦",
};
const DECOR_COLOR: Record<string, string> = {
  hearts: "rgba(225,120,140,0.55)",
  petals: "rgba(240,170,190,0.6)",
  confetti: "rgba(210,180,120,0.6)",
};

/** 스크롤 위에 떠다니는 루프 데코(하트/꽃잎/컨페티). */
function FloatingDecor({ kind }: { kind: "hearts" | "petals" | "confetti" }) {
  if (prefersReduced()) return null;
  const glyph = DECOR_GLYPH[kind] ?? "♥";
  const color = DECOR_COLOR[kind] ?? DECOR_COLOR.hearts;
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 5,
      }}
    >
      {Array.from({ length: 14 }).map((_, i) => {
        const left = (i * 7.1 + (i % 3) * 5) % 100;
        const dur = 9 + (i % 5) * 2.2;
        const delay = (i % 7) * 1.6;
        const size = 12 + (i % 4) * 7;
        return (
          <span
            key={i}
            style={{
              position: "absolute",
              left: `${left}%`,
              bottom: "-48px",
              fontSize: size,
              color,
              animation: `dewy-float ${dur}s linear ${delay}s infinite`,
            }}
          >
            {glyph}
          </span>
        );
      })}
    </div>
  );
}

const DECOR_KEYFRAMES = `@keyframes dewy-float{0%{transform:translateY(0) rotate(0);opacity:0}12%{opacity:.85}88%{opacity:.85}100%{transform:translateY(-112vh) rotate(45deg);opacity:0}}`;

export default InvitationViewer;
