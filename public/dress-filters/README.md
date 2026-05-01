# 드레스 필터 일러스트

이 폴더는 드레스 갤러리의 필터 옵션 일러스트가 들어가는 자리입니다.

## 필요한 파일 (총 35개)

`src/data/dressFilters.ts` 의 `icon` 경로와 일치해야 합니다.

### 실루엣 (6장)
- `silhouette-a-line.png`
- `silhouette-mermaid.png`
- `silhouette-ball.png`
- `silhouette-empire.png`
- `silhouette-sheath.png`
- `silhouette-trumpet.png`

### 네크라인 (7장)
- `neckline-v.png`
- `neckline-sweetheart.png`
- `neckline-off-shoulder.png`
- `neckline-halter.png`
- `neckline-boat.png`
- `neckline-square.png`
- `neckline-illusion.png`

### 슬리브 (6장)
- `sleeve-sleeveless.png`
- `sleeve-cap.png`
- `sleeve-short.png`
- `sleeve-long.png`
- `sleeve-off-shoulder.png`
- `sleeve-cape.png`

### 길이·트레인 (6장)
- `length-mini.png`
- `length-midi.png`
- `length-full.png`
- `length-short-train.png`
- `length-chapel.png`
- `length-cathedral.png`

### 백 디자인 (6장)
- `back-closed.png`
- `back-illusion.png`
- `back-open.png`
- `back-keyhole.png`
- `back-v.png`
- `back-corset.png`

### 허리 라인 (4장)
- `waist-natural.png`
- `waist-empire.png`
- `waist-dropped.png`
- `waist-none.png`

## 권장 스펙

- 형식: PNG 또는 WebP (투명 배경 권장)
- 크기: 200×200px 또는 정사각 (UI에서 60~80px로 표시)
- 스타일: 단순 라인 일러스트, 흑백 또는 단색
- 배경: 투명 또는 순백
- 일관성: 모든 일러스트 같은 스타일 (선 굵기·디테일 정도)

## Nano Banana 프롬프트 예시

```
Simple flat line illustration of a wedding dress mannequin showing
[silhouette name] silhouette only.
Pure white or transparent background, single black outline,
no face, no detail decorations, no text,
minimal Azazie cheat sheet style icon.
```

위 프롬프트의 `[silhouette name]` 부분만 바꿔가며 35번 생성하면 일관된
세트가 완성됩니다.

## 일러스트가 없을 때

일러스트 파일이 없어도 UI는 정상 동작합니다.
필터 옵션 자리에 텍스트 라벨만 표시되고, 이미지가 추가되면 자동 노출됩니다.

## 색상 칩 (컬러 축)

컬러 축은 일러스트 대신 hex 색상값(`swatch`)을 사용하므로 별도 이미지가
필요하지 않습니다 (`dressFilters.ts` 참고).
