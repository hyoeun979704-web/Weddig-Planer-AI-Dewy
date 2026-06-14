import { Megaphone } from "lucide-react";
import { useAnnouncementConfig } from "@/hooks/useAppConfig";

// 운영자가 배포 없이 켜고/문구를 바꿀 수 있는 공지 배너 (app_config.announcement).
// 기본은 비활성 → 미설정 시 아무것도 렌더하지 않는다.
const AnnouncementBanner = () => {
  const ann = useAnnouncementConfig();
  if (!ann.enabled || !ann.text) return null;

  const content = (
    <div className="mx-4 mt-3 flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5">
      <Megaphone className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" aria-hidden="true" />
      <p className="text-[13px] leading-relaxed text-foreground">{ann.text}</p>
    </div>
  );

  // 링크는 http(s) 만 허용 — 관리자 설정값이라도 javascript:/data: 스킴이면 클릭 시
  // 실행될 수 있어 스킴을 검증한다(XSS 방지).
  const safeLink = ann.link && /^https?:\/\//i.test(ann.link) ? ann.link : null;
  if (safeLink) {
    return (
      <a href={safeLink} target="_blank" rel="noopener noreferrer" className="block">
        {content}
      </a>
    );
  }
  return content;
};

export default AnnouncementBanner;
