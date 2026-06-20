import { useEffect } from "react";
import { showBanner, hideBanner, isNativeAds } from "@/lib/ads/adService";

// 하단 광고 배너.
//  - 네이티브(Capacitor): AdMob 배너를 화면 하단 오버레이로 표시(이 컴포넌트는 빈 자리만).
//  - 웹: **광고 없음**. AdSense는 '콘텐츠 없는 화면 광고' 정책 위반이라 웹에선 미표시(앱 광고는 AdMob).
//  - placeholder prop 은 호환을 위해 받지만 웹에선 무시(아무것도 그리지 않음).
const AdBanner = ({
  className,
  height = 90,
  fill = false,
}: { className?: string; height?: number; placeholder?: boolean; fill?: boolean }) => {
  useEffect(() => {
    if (!isNativeAds()) return;
    void showBanner();
    return () => { void hideBanner(); };
  }, []);

  // 웹: 광고 미표시(정책 준수).
  if (!isNativeAds()) return null;

  // 네이티브 배너는 시스템 오버레이라 자리만 비워둠(레이아웃 밀림 방지용 spacer).
  return <div className={className} style={fill ? {} : { height }} aria-hidden />;
};

export default AdBanner;
