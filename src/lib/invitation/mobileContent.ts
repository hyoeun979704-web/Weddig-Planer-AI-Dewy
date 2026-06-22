// 네이티브 모바일 청첩장 뷰어(I-MOBILE Phase 1)용 콘텐츠 어댑터.
//
// 발행 invitations row(user_data + layout.imageUrlsForViewer + template.tone)를 캔버스
// 구조와 무관한 깔끔한 섹션 콘텐츠로 정규화한다. 데이터 없는 필드는 undefined/빈배열 →
// 섹션 컴포넌트가 알아서 숨긴다(큐레이션·dead-end 방지). 스키마 변경 없이 동작.

import { readFaceLayout } from "@/lib/invitation/types";
import { parseKoreanDate } from "@/lib/koreanDate";

export interface AccountEntry {
  side: "groom" | "bride";
  /** 표시 라벨(예: "신랑측"). */
  label: string;
  /** 계좌 원문(예: "OO은행 000-0000 홍길동"). 복사 대상. */
  value: string;
}

export interface MobileInvitationContent {
  groomName: string;
  brideName: string;
  /** 영문 표기(있을 때만). */
  namesEn?: string;
  /** 사용자가 입력한 날짜 문자열 원문(표시용). */
  weddingDateText?: string;
  /** 파싱 성공 시 Date — 달력·D-day 계산용. 실패하면 null. */
  weddingDate: Date | null;
  greeting?: string;
  groomParents?: string;
  brideParents?: string;
  heroImage?: string;
  gallery: string[];
  venueName?: string;
  venueAddress?: string;
  accounts: AccountEntry[];
  /** 배경음악 URL(아직 데이터 모델 미수집 — bgm_url 있을 때만). */
  bgmUrl?: string;
  /** 템플릿 tone — 테마 매핑 키. */
  tone: string;
}

type Row = {
  user_data?: Record<string, unknown> | null;
  layout?: unknown;
  invitation_templates?: { tone?: string | null } | null;
};

const str = (v: unknown): string | undefined => {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length > 0 ? t : undefined;
};

/** imageUrlsForViewer 에서 갤러리 이미지를 키 순서대로(메인 제외) 추출. */
const collectGallery = (images: Record<string, string>): string[] => {
  return Object.keys(images)
    .filter((k) => k !== "main_photo" && !!images[k])
    .sort((a, b) => {
      // gallery_1 < gallery_2 < gallery#0 < gallery#1 … 숫자 인지 정렬.
      const na = Number(a.replace(/[^\d]/g, "")) || 0;
      const nb = Number(b.replace(/[^\d]/g, "")) || 0;
      if (na !== nb) return na - nb;
      return a.localeCompare(b);
    })
    .map((k) => images[k]);
};

export function extractMobileContent(row: Row): MobileInvitationContent {
  const ud = (row.user_data ?? {}) as Record<string, unknown>;
  const front = readFaceLayout(row.layout).front;
  const t = front.textOverrides ?? {};
  const images = front.imageUrlsForViewer ?? {};

  // 텍스트는 스튜디오 슬롯 편집(textOverrides) 우선, 없으면 위저드 구조 필드(user_data).
  const greeting = str(t.intro_text) ?? str(ud.intro_text);
  const weddingDateText = str(t.wedding_date) ?? str(ud.wedding_date);
  // parseKoreanDate 는 "YYYY-MM-DD" 문자열을 돌려준다(또는 null). 달력·D-day 용 Date 로 변환.
  const ymd = weddingDateText ? parseKoreanDate(weddingDateText) : null;
  const weddingDate = ymd ? new Date(`${ymd}T00:00:00`) : null;

  const accounts: AccountEntry[] = [];
  const groomAcct = str(ud.account_groom);
  const brideAcct = str(ud.account_bride);
  if (groomAcct) accounts.push({ side: "groom", label: "신랑측", value: groomAcct });
  if (brideAcct) accounts.push({ side: "bride", label: "신부측", value: brideAcct });

  const groomEn = str(ud.groom_name_en);
  const brideEn = str(ud.bride_name_en);
  const namesEn = groomEn && brideEn ? `${groomEn} & ${brideEn}` : undefined;

  return {
    groomName: str(ud.groom_name) ?? "신랑",
    brideName: str(ud.bride_name) ?? "신부",
    namesEn,
    weddingDateText,
    weddingDate,
    greeting,
    groomParents: str(t.groom_parents) ?? str(ud.groom_parents),
    brideParents: str(t.bride_parents) ?? str(ud.bride_parents),
    heroImage: images.main_photo || undefined,
    gallery: collectGallery(images),
    venueName: str(t.venue_name) ?? str(ud.venue_name),
    venueAddress: str(t.venue_address) ?? str(ud.venue_address),
    accounts,
    bgmUrl: str(ud.bgm_url),
    tone: str(row.invitation_templates?.tone) ?? "warm_letter",
  };
}
