// 네이티브 모바일 청첩장 뷰어 (I-MOBILE Phase 1) — 프리뷰 라우트 /i2/:slug.
// 기존 캔버스 뷰어(/i/:slug)는 그대로 두고, 네이티브 DOM 섹션 렌더러를 병행 출시해
// MakeDear 급과 나란히 비교·검증한다. 합의 후 모바일 기본 뷰어로 승격 예정(docs/mobile-invitation-revamp.md).

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useInvitationFonts } from "@/hooks/useInvitationFonts";
import { extractMobileContent, type MobileInvitationContent } from "@/lib/invitation/mobileContent";
import { themeForTone } from "@/lib/invitation/mobileThemes";
import { BgmPlayer } from "@/components/invitation/native/BgmPlayer";
import {
  CoverSection,
  GreetingSection,
  DateSection,
  GallerySection,
  VenueSection,
  AccountSection,
  ClosingSection,
} from "@/components/invitation/native/MobileInvitationSections";

/** 은은한 꽃잎 오버레이(테마 decor='petals' 일 때). 콘텐츠 위 장식, 입력 방해 없음. */
function Petals({ color }: { color: string }) {
  const petals = useMemo(() => Array.from({ length: 9 }, (_, i) => i), []);
  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden app-col mx-auto">
      {petals.map((i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            top: "-6%",
            left: `${(i * 11 + 4) % 96}%`,
            width: 10,
            height: 10,
            borderRadius: "60% 0 60% 0",
            background: color,
            opacity: 0.28,
            animation: `dewy-petal ${9 + (i % 5)}s linear ${i * 1.3}s infinite`,
          }}
        />
      ))}
      <style>{`@keyframes dewy-petal{0%{transform:translateY(0) rotate(0);opacity:0}10%{opacity:.3}100%{transform:translateY(112vh) rotate(360deg);opacity:0}}`}</style>
    </div>
  );
}

const MobileInvitationView2 = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const [content, setContent] = useState<MobileInvitationContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const theme = useMemo(() => themeForTone(content?.tone), [content?.tone]);
  const { fontsReady } = useInvitationFonts(theme.fonts);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data: row, error } = await (supabase as any)
        .from("invitations")
        .select("user_data, layout, invitation_templates(tone)")
        .eq("share_slug", slug)
        .eq("status", "published")
        .maybeSingle();
      if (error || !row) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setContent(extractMobileContent(row));
      setLoading(false);
    })();
  }, [slug]);

  useEffect(() => {
    if (content) document.title = `${content.groomName} ♥ ${content.brideName} 결혼합니다`;
  }, [content]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: theme.bg }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: theme.accent }} />
      </div>
    );
  }
  if (notFound || !content) {
    return (
      <div className="min-h-screen flex items-center justify-center px-8 text-center" style={{ background: theme.bg }}>
        <p className="text-sm" style={{ color: theme.inkSoft }}>청첩장을 찾을 수 없어요. 링크를 다시 확인해 주세요.</p>
      </div>
    );
  }

  // BGM: 데이터 모델 미수집 단계 — content.bgmUrl 우선, 테스트용 ?bgm= 허용.
  const bgmUrl = content.bgmUrl ?? searchParams.get("bgm") ?? undefined;

  return (
    <div
      className="relative app-col mx-auto min-h-screen"
      style={{ background: theme.bg, opacity: fontsReady ? 1 : 0, transition: "opacity 0.4s ease" }}
    >
      <BgmPlayer src={bgmUrl} accent={theme.accent} />
      {theme.decor === "petals" && <Petals color={theme.accent} />}

      <CoverSection content={content} theme={theme} />
      <GreetingSection content={content} theme={theme} />
      <DateSection content={content} theme={theme} />
      <GallerySection content={content} theme={theme} />
      <VenueSection content={content} theme={theme} />
      <AccountSection content={content} theme={theme} />
      <ClosingSection content={content} theme={theme} />
    </div>
  );
};

export default MobileInvitationView2;
