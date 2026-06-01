import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, Heart, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import InvitationCanvas from "@/components/invitation/InvitationCanvas";
import { useInvitationFonts } from "@/hooks/useInvitationFonts";
import { getInvitationPages, pageToLayout } from "@/lib/invitation/layout";
import {
  readFaceLayout,
  type InvitationLayout,
  type InvitationUserData,
} from "@/lib/invitation/types";

/**
 * 공개 청첩장 뷰어 — /i/:slug
 *
 * 익명 누구나 접근. 본인 청첩장이 아니라 published 상태의 invitation row 를
 * share_slug 로 조회. RLS 의 "Published invitations are publicly viewable
 * via slug" 정책이 익명 SELECT 를 허용.
 *
 * 사진 슬롯은 storage 의 private signed URL 이 필요하지만 익명 사용자는
 * createSignedUrl 호출 권한 없음 → 별도 처리:
 *   - 발행 시점에 모든 사진 path 들의 long-lived (1년) signed URL 을
 *     invitations.layout.imageUrls 에 함께 저장
 *   - 뷰어는 그 저장된 URL 을 그대로 사용
 *
 * (다른 뷰는 본인 인증 후 24h signed URL 재발급 모델 유지 — viewer 만 예외)
 */

interface PublishedInvitation {
  id: string;
  user_data: InvitationUserData;
  layout: {
    textOverrides?: Record<string, string>;
    fontOverrides?: Record<string, string>;
    imagePaths?: Record<string, string>;
    /** viewer 용 long-lived URL — 발행 시점에 함께 저장 */
    imageUrlsForViewer?: Record<string, string>;
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

const InvitationViewer = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<PublishedInvitation | null>(null);
  const [backLayout, setBackLayout] = useState<InvitationLayout | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const { fontsReady } = useInvitationFonts();

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
      // 후면 템플릿은 FK 미사용 → 별도 조회
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
  const renderPages = (
    layout: InvitationLayout,
    overrides: ReturnType<typeof readFaceLayout>["front"],
  ) =>
    getInvitationPages(layout).map((page, index, pages) => (
      <div key={page.id} className="flex flex-col items-center gap-2">
        {pages.length > 1 && (
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
          fontSizeOverrides={overrides.fontSizeOverrides ?? {}}
          extraSlots={index === 0 ? overrides.extraSlots ?? [] : []}
          hiddenSlots={overrides.hiddenSlots ?? []}
          fontsReady={fontsReady}
          imageUrls={overrides.imageUrlsForViewer ?? {}}
          selectedSlotId={null}
          onSelectSlot={() => {}}
          displayWidth={360}
          shareUrl={window.location.href}
        />
      </div>
    ));

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto pb-24">
      {/* 전면 */}
      <div className="flex flex-col items-center bg-muted/20 py-5 gap-5">
        {renderPages(tpl.layout, faces.front)}
        {/* 후면 (있을 때만) */}
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
    </div>
  );
};

export default InvitationViewer;
