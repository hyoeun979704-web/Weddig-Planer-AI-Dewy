# 릴스 광고 (세로 9:16, 12초)

> 선행: `README.md` §1~§3. 클립/릴스/쇼츠 공용. 첫 1초 후킹 + 브랜드명 노출.

## 1. 후킹 (0~1초)
첫 자막: **"청첩장 5만원? 0원에 만들었습니다"**

## 2. 컷 콘티
| 초 | 화면 | 자막 |
|---|---|---|
| 0~1 | 빈 청첩장 템플릿 클로즈업 | "청첩장 5만원? 0원에 만들었습니다" |
| 2~5 | 제작 타임랩스(문구 AI 자동 입력) | "문구도 AI가, RSVP도 한 번에" |
| 6~8 | 드레스 투어 before→after 전환 | "드레스도 우리 사진으로 미리보기" |
| 9~10 | 꽃 머지 게임 + 부케 할인권 팝업 | "게임 깨면 부케 20만원 할인권 💐" |
| 11~12 | 로고(그라데이션 하트) + 이벤트 배너 | "1호 테스터 모집 중 · 무료 시작" |

## 3. CTA / 해시태그 / 편집
- **CTA:** 프로필 링크 / `dewy-wedding.com` (README §4 UTM: `utm_source=instagram`, `utm_content=reels`)
- **해시태그:** `#청첩장 #셀프청첩장 #결혼준비 #예비신부 #스드메 #웨딩앱 #방구석드레스투어`
- **편집:** 트렌디 비트, 0.5초 컷 전환, 첫 자막 1초 내 노출, 세로 9:16 풀프레임.

## 4. 🎨 첫 프레임(후킹 컷) 이미지 생성 프롬프트
```
A vertical 1080x1920 first frame for a wedding app reel. A blank elegant mobile wedding
invitation template mockup on a phone screen, held against a soft blush-pink blurred
background, warm natural light, a few rose petals, premium Korean wedding aesthetic.
Space at top for a bold Korean hook caption. No text, no letters, no numbers, no
watermark. High detail, soft cinematic, scroll-stopping. --ar 9:16
```
**엔드 프레임(11~12초) 변형:** 위에서 "blank invitation template"→"glossy 3D gradient heart logo (pink-coral-blue) centered with a small bridal bouquet", 하단 CTA 여백 확보.

## 5. 체크
- [ ] 첫 자막 1초 내 · 9:16 풀프레임
- [ ] 9~10초 부케 수치 §2와 일치(가안/확정 표기)
- [ ] 이미지 텍스트 없음 → 한글 오버레이
