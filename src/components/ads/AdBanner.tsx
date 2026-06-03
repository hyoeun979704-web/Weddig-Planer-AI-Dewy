import { useEffect } from "react";
import {
  initAds,
  showBanner,
  hideBanner,
  isNativeAds,
  ADSENSE_CLIENT,
  ADSENSE_BANNER_SLOT,
} from "@/lib/ads/adService";

// 하단 광고 배너.
//  - 네이티브(Capacitor): AdMob 배너를 화면 하단 오버레이로 표시(이 컴포넌트는 빈 자리만).
//  - 웹: AdSense <ins> 렌더. client/slot 미설정이면 아무것도 안 그림(안전).
const AdBanner = ({ className }: { className?: string }) => {
  const configured = isNativeAds() ? true : !!(ADSENSE_CLIENT && ADSENSE_BANNER_SLOT);

  useEffect(() => {
    if (isNativeAds()) {
      void showBanner();
      return () => { void hideBanner(); };
    }
    if (!ADSENSE_CLIENT || !ADSENSE_BANNER_SLOT) return;
    void initAds();
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch { /* 스크립트 로드 전이면 무시 */ }
  }, []);

  if (!configured) return null;
  // 네이티브 배너는 시스템 오버레이라 자리만 비워둠(레이아웃 밀림 방지용 spacer).
  if (isNativeAds()) return <div className={className} style={{ height: 50 }} aria-hidden />;

  return (
    <div className={className} style={{ minHeight: 50, overflow: "hidden" }}>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={ADSENSE_BANNER_SLOT}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
};

export default AdBanner;
