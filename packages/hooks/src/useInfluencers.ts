import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface InfluencerContent {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  content_url: string | null;
  content_type: string;
  view_count: number;
  like_count: number;
}

export interface Influencer {
  id: string;
  name: string;
  handle: string;
  platform: string;
  profile_image_url: string | null;
  cover_image_url: string | null;
  bio: string | null;
  follower_count: number;
  category: string;
  tags: string[];
  external_url: string | null;
  is_featured: boolean;
  contents?: InfluencerContent[];
}

const categoryLabels: Record<string, string> = {
  all: "전체",
  wedding_planner: "웨딩플래너",
  dress: "드레스",
  makeup: "메이크업",
  photo: "촬영",
  honeymoon: "허니문",
  interior: "인테리어",
  general: "기타",
};

export const useCategoryLabels = () => categoryLabels;

export const useInfluencers = (category?: string) => {
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [featured, setFeatured] = useState<Influencer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInfluencers = useCallback(async () => {
    try {
      let query = (supabase
        .from("influencers" as any)
        .select("*") as any)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (category && category !== "all") {
        query = query.eq("category", category) as any;
      }

      const { data, error } = await query;
      if (error) throw error;

      setInfluencers((data || []) as any);
      setFeatured(((data || []) as any).filter((i: any) => i.is_featured));
    } catch (error) {
      console.error("Error fetching influencers:", error);
    } finally {
      setIsLoading(false);
    }
  }, [category]);

  useEffect(() => {
    fetchInfluencers();
  }, [fetchInfluencers]);

  return { influencers, featured, isLoading };
};

export const useInfluencerDetail = (id: string | undefined) => {
  const [influencer, setInfluencer] = useState<Influencer | null>(null);
  const [contents, setContents] = useState<InfluencerContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetch = async () => {
      try {
        const [infRes, contRes] = await Promise.all([
          (supabase.from("influencers" as any).select("*") as any).eq("id", id).single(),
          (supabase
            .from("influencer_contents" as any)
            .select("*") as any)
            .eq("influencer_id", id)
            .order("display_order", { ascending: true }),
        ]);

        if (infRes.data) setInfluencer(infRes.data as any);
        if (contRes.data) setContents(contRes.data as any);
      } catch (error) {
        console.error("Error fetching influencer detail:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetch();
  }, [id]);

  return { influencer, contents, isLoading };
};
