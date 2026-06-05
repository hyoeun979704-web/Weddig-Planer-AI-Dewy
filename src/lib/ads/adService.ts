// 통합 광고 서비스 — 네이티브(Capacitor)는 AdMob, 웹은 AdSense 로 분기.
//
// 환경변수(.env):
//   VITE_ADSENSE_CLIENT        ca-pub-XXXXXXXXXXXXXXXX  (웹 배너)
//   VITE_ADSENSE_BANNER_SLOT   1234567890               (웹 배너 슬롯)
//   VITE_ADMOB_BANNER_ID       ca-app-pub-…/…           (네이티브 배너)
//   VITE_ADMOB_REWARDED_ID     ca-app-pub-…/…           (네이티브 보상형)
//
// 네이티브 사용 전 1회: `npm i @capacitor-community/admob` + `npx cap sync` +
//   AndroidManifest 에 AdMob App ID 메타데이터 추가(플러그인 문서 참고).
//   (웹 빌드는 admob 플러그인 미설치여도 동작 — 동적 import 를 vite-ignore 처리)

import { Capacitor } from "@capacitor/core";

// 퍼블리셔 ID 는 index.html <head> 에도 정적 포함됨(소유권 확인용). env 미설정 시 기본값 사용.
export const ADSENSE_CLIENT = (import.meta.env.VITE_ADSENSE_CLIENT as string | undefined) || "ca-pub-8005269626005297";
export const ADSENSE_BANNER_SLOT = import.meta.env.VITE_ADSENSE_BANNER_SLOT as string | undefined;
// AdMob 광고 "단위" ID (앱에 노출되는 공개 값이라 커밋 기본값 안전).
// ※ AndroidManifest 의 AdMob "앱" ID(strings.xml: admob_app_id, '~' 포함)와는 별개.
const ADMOB_BANNER_ID = (import.meta.env.VITE_ADMOB_BANNER_ID as string | undefined) || "ca-app-pub-3558095447353368/8611781514";
const ADMOB_REWARDED_ID = (import.meta.env.VITE_ADMOB_REWARDED_ID as string | undefined) || "ca-app-pub-3558095447353368/8758376311";

export const isNativeAds = () => Capacitor.isNativePlatform();

// 동적 import 지정자를 명시적 string 타입 변수로 둬서, 플러그인 미설치 환경에서도
// tsc("Cannot find module")·vite 번들 해석을 피한다(웹 빌드는 admob 불필요).
const ADMOB_PKG: string = "@capacitor-community/admob";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let admob: any = null;
let initialized = false;

export async function initAds(): Promise<void> {
  if (initialized) return;
  initialized = true;
  if (isNativeAds()) {
    try {
      const mod = await import(/* @vite-ignore */ ADMOB_PKG);
      admob = mod.AdMob;
      await admob.initialize();
    } catch (e) {
      console.warn("[ads] AdMob init 실패 (플러그인 미설치?)", e);
    }
  } else if (ADSENSE_CLIENT && !document.querySelector('script[src*="adsbygoogle.js"]')) {
    // index.html 에 이미 정적 포함돼 있으면 재주입하지 않음.
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
    s.crossOrigin = "anonymous";
    document.head.appendChild(s);
  }
}

/**
 * 보상형 광고를 띄우고, 시청 완료(보상 획득) 시 true.
 * - 네이티브: AdMob 보상형.
 * - 웹: 표준 보상형이 없어(H5 Ad Placement 승인 별도) 일단 true 로 보상 지급하는
 *   graceful 폴백. 추후 웹 보상형 도입 시 이 분기만 교체.
 */
export async function showRewardedAd(): Promise<boolean> {
  await initAds();
  if (isNativeAds() && admob && ADMOB_REWARDED_ID) {
    try {
      const mod = await import(/* @vite-ignore */ ADMOB_PKG);
      const Events = mod.RewardAdPluginEvents;
      await admob.prepareRewardVideoAd({ adId: ADMOB_REWARDED_ID });
      return await new Promise<boolean>((resolve) => {
        let rewarded = false;
        admob.addListener(Events.Rewarded, () => { rewarded = true; });
        admob.addListener(Events.Dismissed, () => resolve(rewarded));
        admob.addListener(Events.FailedToShow, () => resolve(false));
        admob.showRewardVideoAd().catch(() => resolve(false));
      });
    } catch (e) {
      console.warn("[ads] 보상형 실패", e);
      return false;
    }
  }
  // 웹 폴백 — 보상 지급
  return true;
}

/** 하단 배너 노출. 네이티브는 AdMob 오버레이, 웹은 <AdBanner/> 컴포넌트가 렌더. */
export async function showBanner(): Promise<void> {
  if (!isNativeAds() || !ADMOB_BANNER_ID) return;
  try {
    await initAds();
    const mod = await import(/* @vite-ignore */ ADMOB_PKG);
    await admob.showBanner({
      adId: ADMOB_BANNER_ID,
      adSize: mod.BannerAdSize.ADAPTIVE_BANNER ?? mod.BannerAdSize.BANNER,
      position: mod.BannerAdPosition.BOTTOM_CENTER,
      margin: 0,
    });
  } catch (e) {
    console.warn("[ads] 배너 실패", e);
  }
}

export async function hideBanner(): Promise<void> {
  if (!isNativeAds() || !admob) return;
  try { await admob.hideBanner(); } catch { /* noop */ }
}
