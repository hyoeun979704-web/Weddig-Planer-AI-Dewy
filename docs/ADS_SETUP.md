# 광고 설정 (꽃 머지 게임: 하단 배너 + 포인트 2배 보상형)

웹은 **AdSense**, 네이티브(Capacitor 안드로이드)는 **AdMob** 으로 런타임 분기합니다.
코드는 다 들어가 있고, **ID/키만 채우면** 동작합니다.

## 1) 환경변수 (.env)
```
# 웹 (AdSense)
VITE_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX
VITE_ADSENSE_BANNER_SLOT=1234567890     # 디스플레이 광고 단위 슬롯 ID(숫자)
# 네이티브 (AdMob)
VITE_ADMOB_BANNER_ID=ca-app-pub-XXXX/XXXX      # 배너 광고 단위 ID
VITE_ADMOB_REWARDED_ID=ca-app-pub-XXXX/XXXX    # 보상형 광고 단위 ID
```
- 미설정이면: 웹 배너는 **안 뜨고**(안전), 보상형은 **그냥 2배 지급**(폴백).

## 2) 웹 (AdSense)
- 위 `VITE_ADSENSE_*` 만 채우면 끝. `adsbygoogle.js` 스크립트는 자동 주입됨.
- AdSense 콘솔에서 **디스플레이 광고 단위** 1개 만들어 client(ca-pub-…) + slot(숫자) 사용.
- ⚠️ 웹 **보상형**은 표준 API 가 없습니다(H5 Ad Placement API 별도 승인). 지금은 폴백으로
  바로 2배 지급. 웹에서도 진짜 보상형이 필요하면 `adService.showRewardedAd()` 웹 분기만 교체.

## 3) 네이티브 (AdMob, 안드로이드)
```
npm i @capacitor-community/admob   # package.json 에 이미 추가됨
npx cap sync
```
- `android/app/src/main/AndroidManifest.xml` 의 `<application>` 안에 AdMob **App ID** 메타데이터 추가:
  ```xml
  <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID"
             android:value="ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX"/>
  ```
- 위 `VITE_ADMOB_*` 에 **배너/보상형 광고 단위 ID** 입력.
- 배너는 시스템 하단 오버레이로 뜨고(게임 화면에서 자동 show/hide), 보상형은 게임오버의
  "광고 보고 포인트 2배" 버튼에서 호출됩니다.

## 코드 위치
- `src/lib/ads/adService.ts` — 분기·초기화·`showRewardedAd()`·배너 show/hide
- `src/components/ads/AdBanner.tsx` — 하단 배너(웹 `<ins>` / 네이티브 오버레이 spacer)
- `src/game/Game.tsx` — 게임오버 "포인트 2배" → 진짜 보상형으로 교체(기존 가짜 카운트다운 제거)
- `src/pages/MergeGame.tsx` — 게임 하단에 `<AdBanner/>` 마운트

## 전달해 주실 것 (정리)
1. **AdSense**: 퍼블리셔 ID(ca-pub-…), 배너 슬롯 ID(숫자)
2. **AdMob**: 앱 ID(ca-app-pub-…~…), 배너 단위 ID, 보상형 단위 ID
→ 채팅으로 주시면 `.env`(+ AndroidManifest 앱ID)만 꽂으면 끝.
