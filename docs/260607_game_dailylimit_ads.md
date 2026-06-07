# 260607 — 꽃 머지 게임: 일일 플레이 구조 · 광고 3종 · 레이아웃/렌더 안정화

> 작업 기록(핸드오프). PR **#226** → `main` 스쿼시 머지(`33445b5`). 개별 커밋은 스쿼시로
> 합쳐졌으므로 추적은 머지 커밋·파일 기준. 인터랙티브 캔버스 게임이라 샌드박스 e2e 불가 →
> 레이아웃·렌더는 사용자(안드로이드 인앱 웹뷰) 시각 확인으로 검증함.

## TL;DR (핵심 성과)
- **일일 플레이 구조**: 무료 3판 + 광고 3판(하루 6판), KST 자정 리셋, 소진 시 잠금 + 카운트다운.
- **광고 3종 확립**: ① 하단 배너 ② 포인트 2배 적립(15초 보상형) ③ 광고 보고 한 판 더(5초 보상형).
- **적립 1회 보장**: 게임오버 시 즉시 적립하지 않고 '청구 보류' → 기본(doubled=false) 또는
  2배(doubled=true) 중 **딱 한 번만** 적립(이중/3배 적립 버그 제거). 서버 스키마 변경 없음.
- **캔버스 렌더/레이아웃 회귀 다수 해결**: 흰 화면 · 세로 넘침 · 페이지 스크롤 · 비율 진동.
- **PWA 구버전 노출 제거**: HTML NetworkFirst.
- **씨앗 에셋 중심 정렬**.

## 영역별 변경

### 1. 일일 쿼터 UX (`src/game/useGameQuota.ts` 신규, `src/pages/MergeGame.tsx`)
- `useGameQuota`: localStorage(`mergeGame_quota_v1`) 기반, KST 자정 리셋. FREE_MAX=3, AD_MAX=3.
  반환: freeLeft·adLeft·totalLeft·consumeFree·consumeAd·msUntilReset.
- 게임오버 오버레이 3-상태: 무료 남음→다시하기 / 무료 소진→📺한 판 더 / 전부 소진→잠금+HH:MM:SS.
- 상단 인디케이터 🌸무료/📺광고. 진입 시 무료 남으면 첫 판 자동 시작.
- **주의(이중 안전)**: localStorage 는 UX 게이팅일 뿐, 적립 진짜 캡은 서버 `add_game_points`
  (doubled 값별 3회/일). 클라 리셋(아래 ?resetquota)으로도 적립은 서버가 막음.

### 2. 광고 (`src/components/ads/RewardedAdModal.tsx`, `src/components/ads/AdBanner.tsx`)
- `RewardedAdModal`: 문구(title/ctaLabel/closeLabel)+카운트다운(countdownSec) props 화 →
  한 판 더(5초)·포인트 2배(15초) 한 모달 재사용.
- `AdBanner`: `fill` 모드 추가 → 캔버스 아래 남는 공간 전부를 광고 영역으로 채움.
- 적립 매핑: 기본 판 = `saveScore(score, false)`(score/40), 2배 = `saveScore(score, true)`(score/20).
  `claimBase`(다음 행동 시)·`claimDouble`(15초 광고 시) 가 `claimedRef` 로 1회만 청구.

### 3. 렌더/레이아웃 안정화 (`src/game/Game.tsx`, `src/pages/MergeGame.tsx`)
회귀와 해결을 순서대로(검증 교훈은 `docs/verification-lessons.md` 에 별도 기록):
- **흰 화면**: `9792ddf`(이전 머지)의 컨테이너쿼리 캔버스 사이징(`min(100cqh,..)`+`containerType:size`)이
  안드로이드 인앱 웹뷰에서 캔버스를 0 높이로 무너뜨림 → JS 측정(ResizeObserver)으로 교체.
- **세로 넘침 / 위 여백**: contain(중앙)·width-fit(상단) 사이 시행착오 끝에 **width-fit 상단정렬**로 확정
  (가로폭=화면폭, 위 여백 없음, 아래는 광고 영역).
- **비율 진동 / 스크롤**: 캔버스 높이를 dvh 에 의존시키면 주소창 토글로 비율이 진동, `100dvh`는
  실제 보이는 높이와 달라 스크롤 발생 → 캔버스는 **가로폭만 기준**(높이 비의존), 루트는
  **`position:fixed`(top/bottom:0)** 로 뷰포트에 고정해 스크롤 원천 차단.
- Game 은 **항상 마운트(in-flow)** 유지(영역 높이·캔버스 측정 보존). 시작/재시작은 부모가
  `ref.start()`(forwardRef). 캔버스 내 게임오버 팝업·2배 버튼·orphan `setRewardClaimed` 제거(React 오버레이로 이관).

### 4. PWA (`vite.config.ts`)
- HTML 네비게이션 **NetworkFirst** + `cleanupOutdatedCaches` → 새 배포 직후 precache 된 구
  index.html(=구 번들)이 서빙돼 "구버전이 새로고침마다 번갈아 뜨던" 현상 제거. 오프라인은 캐시 폴백 유지.

### 5. 에셋 (`public/game-flowers/1.png`)
- 씨앗 콘텐츠가 256×256 캔버스 우하단 구석(97×128)에 치우쳐 작고 비뚤게 렌더됨 → 트림 후
  비율 유지로 캔버스 ~95% 중앙 재배치(나머지 11개 꽃과 동일 채움/정렬). 드로잉 코드·충돌 반경 불변.

## 검증
- 정적: `vite build` ✓ · `tsc -p tsconfig.app.json --noEmit`(해당 파일) ✓ · `eslint` 0 error · `vitest` 336/336 ✓.
- 동작: 인앱 웹뷰에서 사용자 시각 확인 — 스크롤 없음·비율 고정·캔버스 영역 채움·배너 노출·잠금/카운트다운·씨앗 중앙.
- 한계: 캔버스 게임 e2e 자동화 불가(샌드박스). 적립 캡 등 서버 경로는 정적+로직 검토 + 서버 함수 불변으로 안전 판단.

## 남은 작업 (deferred)
- **`?resetquota` 제거**: 테스트용 쿼터 리셋(`src/game/useGameQuota.ts` 의 URL 파라미터). 정식 출시 전 삭제.
- **포인트 2배 적립 정책 확인**: 현재 기본(score/40)·2배(score/20) + 서버 doubled 값별 3회/일 캡.
  무료·한판더가 모두 같은 버킷을 쓰면 캡 상호작용 재점검 필요(현재는 청구 시 doubled 선택으로 분리).
- **네이티브 AdMob 보상형**: 정식 출시 후 연결(현재 웹 AdSense 모달 브리지 유지).
- **배너 실제 슬롯 사이즈**: 남는 영역(fill)에 맞는 광고 슬롯 설정은 운영팀.
