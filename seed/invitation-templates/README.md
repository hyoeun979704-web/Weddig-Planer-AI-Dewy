# 청첩장 시드 템플릿

이 디렉토리는 코드(시드 데이터)와 함께 청첩장 템플릿용 PNG 자산을 보관합니다.
운영자(디자이너) 가 Figma 에서 작업한 결과물을 여기에 둡니다.

## 디렉토리 구조

```
seed/invitation-templates/
├── README.md                       (이 파일)
├── <slug>.md                       각 템플릿의 디자인 가이드
├── <slug>-thumb.png                풀시안 PNG (모든 텍스트 보임) — 갤러리 미리보기
├── <slug>-bg.png                   배경 PNG (텍스트·사진 자리 빠짐) — 캔버스 배경 레이어
└── ...
```

## 워크플로우

```
1. Figma 에서 청첩장 디자인 작업
2. 디자인 가이드(.md) 와 layout JSON(src/data/seedInvitationTemplates.ts) 확인
3. 두 번 export — 모두 PNG @2x:
   ├── 풀시안 (모든 레이어 ON)        → <slug>-thumb.png
   └── 배경 (텍스트·사진 레이어 OFF)   → <slug>-bg.png
4. PR 생성 → 머지
5. CI 또는 운영 환경에서:
      npm run seed:invitation-templates
   실행 → Storage 업로드 + DB upsert
6. 사용자가 즉시 사용 가능
```

## PNG 가 아직 없는 시드

`thumbnail_file` / `background_file` 이 비어 있거나 파일이 존재하지 않으면
시드 스크립트가 자동으로 placeholder 처리합니다 — 사용자 측 UI 는
fallback 박스(슬롯 윤곽선만)로 그립니다. 디자인 작업 끝나면 PNG 만 채워서
재실행하면 즉시 적용됩니다.
