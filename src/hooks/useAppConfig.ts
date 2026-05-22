import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// 배포 없이 바꿀 수 있는 운영 설정(app_config)을 읽는다. 키별 하드코딩 폴백을
// 받아, 테이블 미배포·로드 실패·키 부재 시에도 안전하게 기본값을 반환한다.
export type ContactConfig = { email: string; kakao_url: string };
export type AnnouncementConfig = { enabled: boolean; text: string; link: string };

const DEFAULTS = {
  contact: { email: "help@dewy-wedding.com", kakao_url: "" } as ContactConfig,
  announcement: { enabled: false, text: "", link: "" } as AnnouncementConfig,
};

function useConfigMap() {
  return useQuery({
    queryKey: ["app_config"],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Record<string, unknown>> => {
      const { data, error } = await (supabase as any)
        .from("app_config")
        .select("key, value");
      if (error || !Array.isArray(data)) return {};
      const map: Record<string, unknown> = {};
      for (const row of data) map[row.key] = row.value;
      return map;
    },
  });
}

export function useContactConfig(): ContactConfig {
  const { data } = useConfigMap();
  const v = (data?.contact ?? {}) as Partial<ContactConfig>;
  return { email: v.email || DEFAULTS.contact.email, kakao_url: v.kakao_url || DEFAULTS.contact.kakao_url };
}

export function useAnnouncementConfig(): AnnouncementConfig {
  const { data } = useConfigMap();
  const v = (data?.announcement ?? {}) as Partial<AnnouncementConfig>;
  return {
    enabled: !!v.enabled,
    text: v.text || DEFAULTS.announcement.text,
    link: v.link || DEFAULTS.announcement.link,
  };
}
