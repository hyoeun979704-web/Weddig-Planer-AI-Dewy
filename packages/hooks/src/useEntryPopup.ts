// 홈 진입 팝업 콘텐츠 로더 — promotional_events 에서 운영자가 지정한 팝업(show_as_popup)을
// 읽어온다. 활성(live) + 스케줄(starts/ends) 내 + audience(all/guest/user) 일치 중 position
// 우선 1건. 운영자가 지정한 게 없으면 null → 컴포넌트가 기존 기본 팝업으로 폴백한다.
//
// DB 실패/미설정에도 화면이 깨지지 않도록 항상 안전하게 null 또는 유효한 콘텐츠만 반환.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface EntryPopupContent {
  slug: string;
  badgeLabel: string | null;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  /** image_url 이 없을 때 쓰는 히어로 그라데이션(tailwind from-/to- 또는 css). */
  thumbBg: string | null;
  ctaLabel: string;
  ctaPath: string;
}

function mapRow(row: any): EntryPopupContent {
  return {
    slug: row.slug,
    badgeLabel: row.badge_label ?? null,
    title: row.title,
    subtitle: row.subtitle ?? null,
    imageUrl: row.image_url ?? null,
    thumbBg: row.thumb_bg ?? null,
    ctaLabel: row.cta_label,
    ctaPath: row.cta_path,
  };
}

/** audience 가 사용자 로그인 상태와 맞는지(서버 필터 보강 — 클라에서도 한번 더). */
function audienceMatches(audience: string | null, isAuthenticated: boolean): boolean {
  if (!audience || audience === "all") return true;
  if (audience === "guest") return !isAuthenticated;
  if (audience === "user") return isAuthenticated;
  return true;
}

function withinSchedule(row: any, now: Date): boolean {
  if (row.starts_at && new Date(row.starts_at) > now) return false;
  if (row.ends_at && new Date(row.ends_at) < now) return false;
  return true;
}

export function useEntryPopup() {
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const [popup, setPopup] = useState<EntryPopupContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("promotional_events")
          .select(
            "slug, title, subtitle, image_url, thumb_bg, badge_label, cta_label, cta_path, status, starts_at, ends_at, audience, position, show_as_popup",
          )
          .eq("show_as_popup", true)
          .eq("status", "live")
          .order("position", { ascending: true })
          .limit(20);
        if (error) throw error;
        if (!mounted) return;
        const now = new Date();
        const picked = (data ?? []).find(
          (r: any) => withinSchedule(r, now) && audienceMatches(r.audience, isAuthenticated),
        );
        setPopup(picked ? mapRow(picked) : null);
      } catch (e) {
        // 운영자 팝업 로드 실패는 치명적이지 않다 — 기본 팝업으로 폴백.
        console.error("useEntryPopup load failed", e);
        if (mounted) setPopup(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [isAuthenticated]);

  return { popup, loading };
}
