# 앱형 모바일 청첩장 — 엔진 확장 설계 (제안 / 로드맵)

> 상태: **설계 제안서(미구현)**. 현재 코드는 정적 단일 캔버스다. 이 문서는
> "어플과 유사한" 인터랙티브 모바일 청첩장을 지원하기 위한 엔진 확장 방향을
> 정리한다. 실제 착수 전 §8 "결정 필요" 를 사용자와 합의해야 한다.

---

## 1. 문제 정의

### 1-1. 현재 (as-is)
- 모바일 청첩장 = `InvitationCanvas`(Konva) 로 그린 **이미지 1장**. 뷰어(`/i/:slug`)는
  그 캔버스를 세로로 렌더할 뿐. → **스크롤·표지뿐, 인터랙션 없음.**
- 사용자가 입력하는 데이터는 §`user_data` 기본 set(이름/날짜/식장/혼주)뿐.

### 1-2. 트렌드 (to-be)
시장 모바일 청첩장은 **섹션형 세로 스크롤 + 인터랙션**이 표준:
- 식순 타임라인, 드레스코드 컬러칩, **계좌 복사 버튼**, **RSVP 참석 폼**,
  **방명록**, 좋아요/이모지, sticky 공유 버튼, 실시간 D-day, 지도 임베드,
  오프닝 애니메이션.

### 1-3. 간극
정적 캔버스로는 **버튼·폼·실시간·DB 연동**이 불가능. 비주얼만 흉내 가능(현
`mobile-app-01` 템플릿이 그 한계 예시).

---

## 2. 목표 / 비목표

**목표**
- 모바일 format 에 한해 **섹션 컴포넌트 기반 렌더러**를 도입(진짜 인터랙션).
- 운영자 템플릿은 기존처럼 카탈로그로 등록(섹션 구성 + 스타일).
- 사용자는 섹션별 데이터를 채우고 발행 → 공개 뷰어에서 인터랙션 동작.

**비목표**
- **종이(paper) 는 그대로 Konva 캔버스 유지**(인쇄 충실도·PDF). 건드리지 않음.
- 기존 v1 모바일 템플릿/발행본 하위호환 유지(마이그레이션 X, 공존).

---

## 3. 아키텍처 결정 — 하이브리드

| format | 렌더러 | 이유 |
|--------|--------|------|
| paper  | Konva 캔버스(현행) | 300dpi PDF·정밀 좌표 |
| mobile (layout v1) | Konva 캔버스(현행) | 기존 발행본 유지 |
| **mobile (layout v2)** | **React 섹션 컴포넌트 스크롤(신규)** | 인터랙션·반응형 |

- `invitation_templates.layout` 에 `version` 키 도입. `version: 2` 면 섹션 모델.
- 뷰어(`InvitationViewer`)와 결과(`InvitationFlow`)가 `version` 분기:
  v2 → `<SectionRenderer>`, 그 외 → 기존 `<InvitationCanvas>`.

---

## 4. 신규 스키마 — 섹션 모델 (layout v2)

```ts
interface InvitationLayoutV2 {
  version: 2;
  theme: {                     // 전역 스타일 토큰
    primary: string; accent: string; bg: string;
    font_heading?: string; font_body?: string;
    photo_shape?: "square" | "rounded" | "arch";
  };
  sections: InvitationSection[]; // 순서 = 화면 세로 순서
}

type SectionType =
  | "cover"      // 표지: 사진 + 이름 + 날짜 (+ 오프닝 애니메이션 옵션)
  | "greeting"   // 인사말 (AI 가능) + 혼주
  | "gallery"    // 사진 캐러셀/그리드
  | "calendar"   // 달력 + D-day(실시간)
  | "timing"     // 식순 타임라인 (items[])
  | "dresscode"  // 드레스코드 컬러 팔레트 + 안내
  | "location"   // 지도 임베드(카카오맵) + 교통편(지하철/버스/주차)
  | "account"    // 마음 전하실 곳 — 계좌 + 복사 버튼
  | "rsvp"       // 참석 여부 폼 → DB 저장
  | "guestbook"  // 방명록 — 작성/조회
  | "closing";   // 마무리 문구 + 공유 CTA

interface InvitationSection {
  id: string;
  type: SectionType;
  visible?: boolean;            // 운영자/사용자가 섹션 on/off
  // 타입별 설정 (예시)
  data?: Record<string, unknown>;   // 사용자 입력 바인딩
  style?: Record<string, unknown>;  // 섹션 개별 스타일 override
}
```

- 템플릿(운영자)은 `sections` 의 **구성·순서·스타일**을 정의(빈 데이터).
- 사용자는 wizard 에서 섹션별 데이터를 채움 → `invitations.user_data` 확장 또는
  `invitations.section_data JSONB`.

---

## 5. 데이터 모델 변경

### 5-1. `user_data` field 확장
```
account_groom, account_bride, account_groom_bank, account_bride_bank,
venue_transit_subway, venue_transit_bus, venue_transit_parking,
dress_code_note, timing_items(JSON: [{time,label}]),
groom_profile / bride_profile (선택)
```
→ wizard 에 섹션형 입력 UI 추가.

### 5-2. 신규 테이블 (인터랙션)
```sql
-- 참석 여부
CREATE TABLE invitation_rsvp (
  id uuid PK, invitation_id uuid FK, side text,        -- groom|bride|both
  guest_name text, attending boolean, headcount int,
  meal boolean, message text, created_at timestamptz
);
-- 방명록
CREATE TABLE invitation_guestbook (
  id uuid PK, invitation_id uuid FK,
  author text, password_hash text,                     -- 작성자 삭제용
  message text, created_at timestamptz
);
```
- RLS: 발행본(`published`)에 익명 INSERT 허용(슬러그 기반), SELECT 는 본인+슬러그.
  스팸 방지 rate-limit / 간단 캡차 고려.
- 신랑신부(본인)는 RSVP/방명록 조회·관리 화면 별도.

### 5-3. 인터랙션 구현 메모
- **계좌 복사**: `navigator.clipboard.writeText` (캔버스 밖, 컴포넌트 버튼).
- **실시간 D-day**: 클라 런타임 계산.
- **지도**: 카카오맵 JS SDK 임베드(좌표는 venue_address 지오코딩 or 운영자 입력).
- **sticky 공유/오프닝 애니메이션**: CSS/framer-motion, 컴포넌트 레벨.

---

## 6. 렌더러 (신규 컴포넌트)

```
src/components/invitation/sections/
  SectionRenderer.tsx      // version 분기 진입점, sections 순회
  CoverSection.tsx
  GreetingSection.tsx
  GallerySection.tsx       // embla/swiper 캐러셀
  CalendarSection.tsx      // 기존 캘린더 로직 재사용 + 실시간 D-day
  TimingSection.tsx
  DresscodeSection.tsx     // 컬러칩 = 진짜 div, theme/data 기반
  LocationSection.tsx      // 카카오맵 임베드 + 교통편
  AccountSection.tsx       // 계좌 + 복사 버튼
  RsvpSection.tsx          // 폼 → invitation_rsvp insert
  GuestbookSection.tsx     // 작성/조회
  ClosingSection.tsx
```
- 공유 미리보기(OG 이미지)는 첫 섹션을 캔버스로 1장 스냅샷(기존 toDataUrl 재사용).

---

## 7. 단계별 계획 (phasing)

1. **P1 — 스키마·분기 골격**: `layout.version` 분기, `SectionRenderer` 스텁,
   cover/greeting/gallery/calendar/location/closing(비인터랙션) 먼저. (정적 대비
   비주얼 향상만으로도 가치)
2. **P2 — 데이터 입력**: wizard 섹션형 UI + `user_data` 확장(계좌·교통·식순·드레스코드).
   account 복사, dresscode 칩, timing 타임라인.
3. **P3 — 인터랙션 DB**: `invitation_rsvp` + RsvpSection + 본인 관리 화면.
4. **P4 — 커뮤니티**: `invitation_guestbook` + 좋아요/이모지, sticky CTA, 애니메이션.
5. **P5 — 운영자 빌더**: 어드민에서 섹션 추가/정렬/스타일 편집 UI(현재 JSON 직접 입력 대체).

## 7-1. 하위호환 / 리스크
- v1 캔버스 코드·발행본 **그대로 유지**(version 없으면 v1). 마이그레이션 불필요.
- paper 무영향. PDF 경로 동일.
- 리스크: 익명 INSERT 스팸(rate-limit 필요), 카카오맵 키 관리, OG 스냅샷 비용,
  운영자 빌더 UX 복잡도(P5 가 가장 큼).

---

## 8. 결정 필요 (사용자 합의 항목)
1. **범위**: P1(비주얼)까지만 빠르게? 아니면 RSVP/방명록(P3·P4)까지 풀스택?
2. **RSVP/방명록 데이터**: 신랑신부에게 카톡 알림까지 필요한가(외부 연동)?
3. **지도**: 카카오맵 임베드 도입 OK? (키·정책)
4. **운영자 빌더**(P5) 우선순위 — 당장은 JSON/이 GPT 산출로 충분한가?
5. **가격**: 인터랙티브 모바일을 프리미엄 티어(20하트)로 둘지.

---

## 9. 이 GPT(템플릿 제작) 와의 관계
- **v2 도입 전**: GPT 는 계속 v1 캔버스 템플릿을 생산(앱형은 "비주얼 흉내 + 🚧 명시").
- **v2 도입 후**: GPT 산출물 형식에 `InvitationLayoutV2`(sections) 모드를 추가하고,
  §4 섹션 타입·§5 field 확장을 지침서에 반영해야 함
  (`docs/invitation-template-gpt-guide.md` 동시 갱신 필요).

### 참조
- 현행 렌더러: `src/components/invitation/InvitationCanvas.tsx`
- 현행 뷰어: `src/pages/invitation/InvitationViewer.tsx`
- 타입: `src/lib/invitation/types.ts` (여기에 v2 타입 추가)
- 템플릿 GPT 지침서: `docs/invitation-template-gpt-guide.md`
</content>
