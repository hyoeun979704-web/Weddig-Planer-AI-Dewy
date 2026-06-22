# 모바일 청첩장 편집 UI 설계 (I-MOBILE Editor) — 메이크디어 기준

> 뷰어를 네이티브 섹션으로 전환(`docs/mobile-invitation-revamp.md`)함에 따라, 편집 UI도
> "자유 캔버스 드래그" → **"테마 + 섹션 폼 + 라이브 프리뷰"** 로 바꾼다. 기준:
> **모바일 = 메이크디어(MakeDear)**. **종이 = 비즈하우스(BizHows)** 는 별 트랙(아래 §2).

## 1. 현 파이프라인 (재사용 지점 — 갈아엎지 않는다)

- **위저드 `InvitationFlow`** 가 이미 핵심 콘텐츠를 `user_data` 로 수집: `groom_name/bride_name`,
  `groom_parents/bride_parents`, `wedding_date`(yyyy-mm-dd), `wedding_time`(HH:mm),
  `venue_name/venue_address`, `contact_*`, `account_groom/account_bride`. → **그대로 재사용**.
- **사진**: 버킷 `invitation-uploads`, 경로 `{user_id}/{uuid}.ext`. 편집 중 24h 서명, 발행 시 1년 서명.
- **발행**: `layout.front/back.imagePaths` 를 1년 서명 → `imageUrlsForViewer` 기록 → RPC
  `publish_invitation(p_invitation_id)` 가 `share_slug` 생성 + `status='published'`. → **그대로 재사용**.
- **폰트/에셋**: `invitation_fonts`(family/file_url), `invitation_assets`(스티커). `useInvitationFonts`
  가 @font-face 전역 주입 → 네이티브 DOM 에서도 동일 폰트. → **재사용**.

## 2. 두 트랙으로 분리 (중요)

| | 모바일 | 종이 |
|---|---|---|
| 기준 | 메이크디어 | 비즈하우스 |
| 렌더 | **네이티브 DOM 섹션**(/i2) | **Konva 캔버스**(인쇄 정밀 좌표·mm·300dpi) |
| 편집 | **섹션 폼 + 라이브 프리뷰**(신규) | **캔버스 에디터 유지**(`InvitationStudio`/`AdminTemplateEditor`) |

→ 모바일만 섹션 폼으로 전환. 종이는 캔버스가 정답(인쇄 규격)이라 손대지 않는다. 편집 진입 시
`template.format` 으로 분기: `mobile` → 신규 `MobileInvitationEditor`, `paper` → 기존 Studio.

## 3. 데이터 모델 — `user_data`(원자값) + `layout.mobile`(구성)

원자 콘텐츠는 `user_data` 재사용, **섹션 구성·테마·BGM·갤러리만** `layout.mobile` 블롭에 추가.
(슬롯 좌표 모델을 끌고 오지 않는 깨끗한 모델 — 캔버스 override 키와 독립.)

```ts
interface MobileLayout {
  themeId: string;                 // mobileThemes id (운영자 테마)
  sections: SectionConfig[];       // 순서(배열 순서) + 토글
  bgmPath?: string;                // 갤러리처럼 발행 시 서명
  bgmUrl?: string;                 // 발행 시 채움
  galleryPaths?: string[];         // 갤러리 사진(순서) storage paths
  galleryUrls?: string[];          // 발행 시 서명
  mapCoords?: { lat: number; lng: number };
  guestbookEnabled?: boolean;
  sharePreview?: { title?: string; description?: string; imagePath?: string; imageUrl?: string };
}
type SectionId =
  | "cover" | "greeting" | "family" | "date" | "gallery"
  | "venue" | "account" | "rsvp" | "guestbook" | "closing";
interface SectionConfig {
  id: string;                      // 고정 섹션 id 또는 사용자 추가 섹션 uid
  type: SectionId | "custom_text" | "custom_image";
  enabled: boolean;                // on/off 토글
  label?: string;                  // 섹션 헤더 커스텀(선택)
  fontFamily?: string;             // 섹션 폰트 override(허용)
  content?: Record<string, unknown>; // 사용자 추가 섹션(custom_*)의 텍스트/사진
  stickers?: StickerPlacement[];   // 섹션 장식 스티커 — 프리셋 앵커(자유 좌표 X)
}
// 스티커는 '추가'만, 자유 위치/크기 이동 없음 → 섹션 내 프리셋 앵커에 배치.
interface StickerPlacement {
  assetId: string;                 // invitation_assets.id
  anchor: "tl" | "tr" | "bl" | "br" | "center";
  scale?: number;                  // 사전 정의 스텝(예: 0.8/1/1.2)만, 자유 리사이즈 X
}
```

> **편집 권한 범위(확정)**: 허용 = 스티커 추가 · 사진/BGM 변경 · 섹션 추가/삭제/순서변경 ·
> 폰트 변경 · 내용(텍스트) 변경. **제외 = 자유 위치 이동·크기 변경**(메이크디어처럼 드래그
> 캔버스 없음 — 일관 품질). 스티커도 프리셋 앵커 배치라 좌표 드래그 아님.

- 발행 서명 함수(`signFace`)를 확장해 `bgmPath`·`galleryPaths`·`sharePreview.imagePath` 도 1년 서명.
- `extractMobileContent` 가 `layout.mobile` 우선 사용, 없으면 현재 휴리스틱(레거시 캔버스 발행본 호환).
- **레거시 호환**: 캔버스로 만든 기존 모바일 발행본은 `layout.mobile` 이 없어도 어댑터 휴리스틱으로 /i2 렌더.

## 4. 편집 화면 UX (메이크디어 모델)

```
┌─────────────────────────────┐
│   📱 라이브 프리뷰 (폰 프레임)   │ ← 실제 네이티브 뷰어 body, draft 상태 즉시 반영
│   (스크롤·모션·BGM 그대로)     │
├─────────────────────────────┤
│  [ 내용 ]   [ 디자인 ]   ⌄저장 │ ← 탭
│  ┌ 섹션 카드 ─────────────┐  │
│  │ ≡ 커버        [켜짐 ▸]  │  │ ← 드래그 순서 + on/off + 펼쳐서 폼
│  │ ≡ 인사말      [켜짐 ▸]  │  │
│  │ ≡ 갤러리      [켜짐 ▸]  │  │
│  │ ≡ 오시는 길   [켜짐 ▸]  │  │
│  │ ≡ 마음전하실곳 [꺼짐 ▸]  │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
```

- **라이브 프리뷰**: 뷰어를 `<MobileInvitationBody content theme bgmUrl/>`(프레젠테이셔널) 와
  데이터-fetch 페이지로 분리 → 에디터가 **인메모리 draft** 로 동일 body 를 렌더(저장 전 실시간).
- **내용 탭**: 섹션 카드 리스트. 카드 = 드래그 핸들(**순서 변경**) + 토글(**on/off**) +
  삭제 + 펼침 인라인 폼. 하단에 **＋ 섹션 추가**(custom_text/custom_image). 각 폼에서 **내용(텍스트)·
  폰트 변경**과 **스티커 추가**(프리셋 앵커) 가능. **위치 이동·크기 변경은 없음.**
  - 커버: 대표사진 변경 + 한/영 이름(=user_data) + 날짜
  - 인사말: 인사말 텍스트(+AI 생성 재사용) + 혼주
  - 갤러리: 다중 사진 추가·삭제·정렬(galleryPaths)
  - 오시는 길: 예식장명·주소(+지도 좌표 핀)
  - 마음 전하실 곳: 신랑/신부 계좌(은행·번호·예금주)
  - 참석여부: on/off(기존 RSVP RPC 연결)
  - 방명록: on/off
- **디자인 탭**: 테마 썸네일 그리드(themeId) · 폰트 · 색/톤 · **배경음악(BGM) 업로드/변경** ·
  모션 강도 · 배경 장식. (자유 캔버스 없음 — 좌표/크기 편집 미제공.)
- **저장/발행**: 저장 = `user_data` + `layout.mobile` update(status=draft). 발행 = 이미지·BGM 서명 →
  `publish_invitation` RPC(기존 그대로). 공유 URL = `/i2/{share_slug}` (승격 후 `/i/`).

## 5. 운영자 어드민 변화

- **모바일 템플릿** = 좌표 슬롯이 아니라 **"테마 프리셋"**: 기본 `themeId` + 기본 섹션셋/순서 +
  샘플 콘텐츠 + 추천폰트 + 썸네일. `AdminInvitationTemplates` 메타 폼에서 관리.
- `AdminTemplateEditor`(Konva) 는 **종이 전용**으로 한정(모바일 진입 차단).
- 테마는 1차로 코드 정의(`mobileThemes.ts`) + 운영자가 템플릿별 기본 테마 선택. 추후 `invitation_mobile_themes`
  테이블로 운영자 직접 테마 토큰 관리(색·폰트·장식) — Phase E5.

## 6. 단계별 로드맵 (PR 단위)

- **E1** — 뷰어를 `MobileInvitationBody`(프레젠테이셔널) + 페이지로 분리. `extractMobileContent`
  가 `layout.mobile` 우선 읽도록 확장(+레거시 휴리스틱 fallback). 발행 서명에 bgm/gallery 추가. *UX 없음, 기반.*
- **E2** — `MobileInvitationEditor` 셸: 라이브 프리뷰 + **내용 탭** 핵심 섹션 폼(커버·인사말·예식일시·
  오시는길·계좌) → `user_data`+`layout.mobile.sections` 저장. 저장/발행 재사용. `/invitation/:id/edit` 모바일 분기.
- **E3** — **디자인 탭**: 테마 선택 + **BGM 업로드(발행 서명)** + 갤러리 다중사진 관리 + 모션/장식.
- **E4** — 섹션 토글·드래그 순서 + 방명록/지도 좌표 설정. (방명록 테이블은 뷰어 Phase 4 와 연동.)
- **E5** — 운영자 어드민: 모바일 템플릿=테마 프리셋 관리, 캔버스 모바일 편집 폐지. (선택)테마 토큰 테이블화.

## 7. 결정 사항 / 리스크

- **자유 캔버스 편집(위치 이동·크기 변경)은 제외(확정).** 대신 **스티커 추가·사진/BGM 변경·
  섹션 추가/삭제/순서변경·폰트/내용 변경**은 제공. 메이크디어와 동일하게 드래그 캔버스 없이도
  충분한 커스터마이즈 + 일관 품질. 기존 캔버스 발행본은 /i 에서 계속 보여 사용자 영향 0.
- 위저드(`InvitationFlow`)는 최초 생성용으로 유지하되, 모바일은 위저드 완료 후 **섹션 에디터로 진입**
  (캔버스 Studio 대신). 위저드 자체는 그대로(필드 재사용).
- **스티커 배치 방식 — E-design 시 확정 디테일**: '추가만, 위치이동 없음' 요구를 지키기 위해
  섹션별 프리셋 앵커(좌상/우상/하단/중앙)에 배치. 자유 좌표/리사이즈는 미제공.
- 리스크: 라이브 프리뷰 = 실제 body 재사용이라 뷰어/에디터 결합. E1 의 분리 리팩터가 깨끗해야 함.

## 8. 현재 상태

**계획만 확정, 구현 착수 보류(사용자 지시).** 편집 권한 범위·데이터 모델·단계까지 합의 완료.
재개 시 E1(뷰어 body 분리 + `layout.mobile` 어댑터 + 발행 서명 확장)부터 시작한다.
