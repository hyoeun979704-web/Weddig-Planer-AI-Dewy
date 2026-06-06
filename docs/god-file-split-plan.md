# God-file 분리 계획 — InvitationStudio / InvitationFlow

> 청첩장 에디터 2개 대형 파일의 단계적·리스크별 분리 계획.
> **이 계획은 실행 전 청사진**이다. 각 단계는 별도 PR + 실제 에디터 e2e 검증(`/invitation` 스튜디오·플로우 클릭)으로 끝나야 한다 — build/lint/typecheck 는 closure·effect·prop 런타임 버그를 못 잡는다.

## 현황 (왜 위험한가)

| 파일 | 줄 | 컨테이너 | 인라인 컴포넌트 | 상태 |
|---|---|---|---|---|
| `src/pages/invitation/InvitationStudio.tsx` | 2,268 | `InvitationStudio` 123–1194 (~1,070줄) | `WizardForm`(1195) · `Field`(1292) · `TemplatePicker`(1320) · `BgControl`(1388) · `StudioView`(1545) · `FontPicker`(2203) | 26 useState · 17 handler · 7 useEffect |
| `src/pages/invitation/InvitationFlow.tsx` | 2,121 | `InvitationFlow` 89–1287 (~1,200줄) | `TemplatePicker`(1288) · `WizardCombined`(1382) · `Field`(1743) · `VenueAddressField`(1793) · `ResultView`(1907) | 33 useState · 11 handler · 8 useEffect |

문제:
- 단일 컴포넌트가 **렌더 + 25개 핸들러(사진 업로드·AI 지도 생성/스타일·PDF export·저장/발행) + 6개 인라인 컴포넌트**를 모두 안고 있음.
- `Field`·`TemplatePicker` 가 **양쪽 파일에 중복 정의**(드리프트 위험).
- 핸들러들이 대량의 useState 를 closure 로 캡처 → hook 으로 빼면 의존성 전달 실수 시 stale state·무한 effect 가 런타임에만 터짐.

## 분리 원칙

1. **상향식·소단위**: 잎(leaf) 프리젠테이셔널 컴포넌트 → 가벼운 상태 컴포넌트 → 무거운 side-effect 핸들러(hook) 순. 절대 한 번에 2,000줄을 쪼개지 않는다.
2. **PR = 1 단계**. 각 PR 후 에디터를 띄워 해당 기능(템플릿 선택/배경/폰트/지도/저장/PDF)을 직접 클릭 검증. 회귀 시 그 PR만 되돌림.
3. **동작 보존**: 추출은 "이동"이지 "재설계"가 아니다. props/state 시그니처를 그대로 옮기고, 동작이 같음을 확인한 뒤에만 정리.
4. **검증 게이트**: 프리젠테이셔널은 build+typecheck 로 충분(props 타입이 잡아줌). **상태/effect/핸들러가 섞이면 반드시 실제 앱 실행 검증**(`verify` 스킬 또는 수동).

## 목표 구조

```
src/components/invitation/studio/      # 공유·프리젠테이셔널
  Field.tsx                # 양쪽 중복 → 단일화
  TemplatePicker.tsx       # 양쪽 중복 → 단일화
  BgControl.tsx
  FontPicker.tsx
  StudioView.tsx           # Konva 캔버스 뷰
  WizardForm.tsx
  ResultView.tsx
  VenueAddressField.tsx
src/hooks/invitation/                  # side-effect 로직
  useInvitationPersistence.ts   # 저장/발행/슬러그
  useInvitationMapTools.ts      # AI 지도 생성/스타일
  useInvitationExport.ts        # PDF export
  useInvitationPhotoUpload.ts   # 사진 업로드 + 저화질 경고
src/pages/invitation/
  InvitationStudio.tsx     # 얇은 컨테이너(상태 오케스트레이션만)
  InvitationFlow.tsx
```

## 단계 (리스크 오름차순)

### Phase 1 — 공유 잎 컴포넌트 단일화 (리스크 낮음, build 검증)
`Field` 와 `TemplatePicker` 는 양쪽에 중복. 둘 다 순수 프리젠테이셔널(props in → JSX out)로 추정.
1. 두 파일의 `Field` 구현을 비교(diff). 동일하면 `studio/Field.tsx` 로 추출, 양쪽이 import. 다르면 props 로 차이 흡수 후 단일화.
2. `TemplatePicker` 동일 절차.
- **검증**: build + typecheck(props 불일치 잡힘) + 에디터에서 템플릿 선택 1회 클릭.
- **이득**: 드리프트 제거 + 양쪽 ~150줄 감소.

### Phase 2 — 단방향 프리젠테이셔널 컴포넌트 추출 (리스크 낮음~중)
콜백을 props 로 받기만 하는 컴포넌트들. 내부 effect/네트워크 없음 우선.
- Studio: `BgControl`, `FontPicker`, `WizardForm`.
- Flow: `VenueAddressField`, `ResultView`, `WizardCombined`.
- 각각 현재 props 시그니처 그대로 `studio/*.tsx` 로 이동, 컨테이너는 import.
- **검증**: build + 해당 UI 직접 조작(배경 변경/폰트 선택/주소 입력/결과 화면).

### Phase 3 — Konva 뷰 분리 (리스크 중)
`StudioView`(1545~) 는 Konva Stage/Layer 렌더. 캔버스 ref·좌표·이미지 로드가 얽혀 있으니 **props 경계를 명확히** 한 뒤 이동.
- ref forwarding·이미지 onError fallback 동작 보존 확인.
- **검증**: 실제 캔버스 렌더·드래그·리사이즈·이미지 로드 e2e 필수.

### Phase 4 — side-effect 핸들러 → hooks (리스크 높음, e2e 필수)
가장 위험. 핸들러가 다수 useState 를 closure 캡처하므로, 의존성을 명시적으로 hook 인자/반환으로 옮긴다. **반드시 하나씩**, 단계별 검증.
1. `useInvitationPersistence` — 저장/발행/슬러그 공유(`handleSave`/`handlePublish`). 트랜잭션·토스트·낙관적 갱신 동작 보존. Supabase 쓰기라 실패/롤백 경로 확인.
2. `useInvitationExport` — `handleExportPdf`(pdfGenerator 사용). 폰트 로딩 대기·캔버스 캡처 타이밍 보존.
3. `useInvitationMapTools` — `handleGenerateMap`/`handleStylizeMap`(AI 호출). 로딩/에러/취소 상태 보존.
4. `useInvitationPhotoUpload` — `handlePhotoUpload` + 저화질 경고(`lowResPrintWarning`)·동의(`PhotoUploadConsent`).
- **검증(각 hook 마다)**: 실제로 저장→재로드, PDF 다운로드, 지도 생성, 사진 업로드를 끝까지 수행. 토스트·에러·로딩 상태까지 동일한지.

### Phase 5 — 컨테이너 정리
핸들러/뷰가 빠지면 컨테이너는 상태 선언 + hook 조립 + 레이아웃만 남는다. 남은 중복(Flow↔Studio 공통 상태 흐름)을 마지막에 정리.

## 리스크·검증 매트릭스

| Phase | 추출 대상 | 리스크 | 검증 |
|---|---|---|---|
| 1 | Field·TemplatePicker(공유) | 낮음 | build+typecheck, 클릭 1회 |
| 2 | 프리젠테이셔널 6개 | 낮음~중 | build, 해당 UI 조작 |
| 3 | StudioView(Konva) | 중 | 캔버스 e2e |
| 4 | 핸들러→hooks ×4 | **높음** | **기능별 e2e 필수**(저장/PDF/지도/업로드) |
| 5 | 컨테이너 정리 | 중 | 전체 회귀 |

## 주의 (회귀 방지)
- 추출 시 **closure 캡처 상태를 빠짐없이 props/인자로** 넘긴다. 누락 시 stale 값으로 조용히 오작동.
- `useEffect` 이동 시 **deps 배열을 그대로** 옮기고, 새 컴포넌트 경계로 인해 deps 가 매 렌더 새 객체가 되지 않도록(렌더 폭주) `useMemo`/`useCallback` 안정화.
- Konva ref·`use-image`·폰트 로딩은 타이밍 민감 — 이동 후 빈 캔버스/폰트 깜빡임 없는지 확인.
- 각 Phase 는 **독립 PR**. build/lint 통과는 최소 조건일 뿐, **에디터 실행 검증 없이는 머지 금지**(CLAUDE.md "작동한다 ≠ 검증됨").

## 실행 선결 조건
이 샌드박스에선 에디터 e2e 검증이 불가하다. **앱을 실제 실행할 수 있는 환경**에서, `verify` 스킬로 각 Phase 를 띄워 확인하며 진행할 것. 그 전까지는 본 계획서가 산출물이다.
