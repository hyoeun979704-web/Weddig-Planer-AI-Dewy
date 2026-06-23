# blog-core/ — 콘텐츠 단일 소스(SSOT) 저장소

`content-distribution.md §1`의 `blog_core` 가 사는 곳. 주제 1개당 `<topic-slug>.md` 1개.

- **역할:** 모든 텍스트 채널 산출물(쓰레드·네이버·인스타·워드프레스·카페)의 **유일 원천**.
  여기 1개를 쓰면 → `marketing-draft` 스킬이 화자(me/대표)×독자(mp_*)×변형으로 6채널로 재구성 → 노션 적재.
- **생성:** `marketing-draft` 스킬 워크플로 §2 가 자동 작성. 사람이 검수·수정 가능(git 추적).
- **파일명:** `<topic-slug>.md` (예: `스드메-순서.md`). H1 = 노션 토픽 페이지 제목.

> 채널별 변환물은 여기 두지 않는다(ephemeral `/tmp/dewy-drafts/`). 여기는 **소스만**.
