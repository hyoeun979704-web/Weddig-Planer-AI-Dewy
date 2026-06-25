// 인앱 사용법 가이드 공용 타입 — 소비자(/help)·기업(/business/guide) 가이드가 공유한다.
// 프레젠테이션 컴포넌트: src/components/guides/GuideView.tsx(공용·shared).
// 데이터 단일 소스: 소비자=src/data/consumerGuides.ts, 기업=src/data/businessGuides.ts.
// (도메인 경계: GuideView 는 소비자·partners 양쪽이 쓰므로 shared 에 둔다 — features/* 로 옮기지 말 것.)

export interface GuideSlide {
  phase: string;
  img: string;
  alt: string;
  title: string;
  subtitle: string;
  tip: string;
  tags: string[];
}

export interface GuideViewProps {
  /** 헤더 h1 (예: "사용법 가이드", "업체 정보 수정 가이드") */
  headerTitle: string;
  /** 데스크톱 상단 eyebrow (대문자 라벨) */
  eyebrow: string;
  /** 데스크톱 상단 큰 제목 */
  deskHeading: string;
  /** 데스크톱 상단 보조 설명 */
  deskSub: string;
  slides: GuideSlide[];
  /** 마지막 슬라이드/하단 CTA */
  cta: { label: string; target: string };
  /** 블로그식 이전/다음 가이드(게시물) 네비 — 목록 순서 기반 */
  prevNext?: {
    prev: { title: string; route: string } | null;
    next: { title: string; route: string } | null;
  };
}
