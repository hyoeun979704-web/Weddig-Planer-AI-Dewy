/**
 * 청첩장 템플릿 시드 데이터.
 *
 * 운영자(디자이너) 가 Figma 에서 디자인 → PNG 두 장 export 후
 * seed/invitation-templates/ 디렉토리에 저장 + 이 파일에 객체 추가.
 * scripts/seedInvitationTemplates.ts 실행 시:
 *   1. PNG 들을 Supabase Storage 에 업로드
 *   2. slug 기준으로 invitation_templates 에 upsert
 *
 * thumbnail_file / background_file 이 비어 있어도 row 등록 자체는 가능
 * (사용자 측 fallback UI 가 처리). 디자인 PNG 가 준비되면 그때 채우면 됨.
 */

import type { InvitationLayout } from "@/lib/invitation/types";

export interface SeedTemplate {
  /** upsert key (영문 소문자 + 하이픈) */
  slug: string;
  name: string;
  format: "paper" | "mobile";
  tone: "ROMANTIC" | "MODERN" | "CLASSIC" | "MINIMAL" | "CUTE" | "LUXURY";
  price_hearts: number;
  text_prompt_hint?: string;

  /**
   * 폰트 등록 후 family 값. seedInvitationFonts 에 같은 family 가 있어야 함.
   * 비어 있으면 시스템 fallback (Pretendard).
   */
  default_font_family?: string;

  /**
   * seed/invitation-templates/ 기준 상대 파일명.
   * 둘 다 옵셔널 — 없으면 사용자 측 fallback placeholder 표시.
   */
  thumbnail_file?: string;
  background_file?: string;

  layout: InvitationLayout;

  display_order?: number;
  is_active?: boolean;
}

// ════════════════════════════════════════════════════════════════
// V1 무료 등급 — 종이 청첩장 3개
// 모두 price_hearts = 0, API 호출(누끼·일러스트 변환) 없음.
// 디자인 가이드는 seed/invitation-templates/<slug>.md 참고.
// ════════════════════════════════════════════════════════════════

export const SEED_INVITATION_TEMPLATES: SeedTemplate[] = [
  // ──────────────────────────────────────────────────────────────
  // 1. free_modern_01 — "11.3" boda_card 스타일
  //    좌측 큰 날짜 + 영문/한글 이름 + 우측 큰 캘린더
  // ──────────────────────────────────────────────────────────────
  {
    slug: "free-modern-01",
    name: "모던 — 큰 날짜 & 캘린더",
    format: "paper",
    tone: "MODERN",
    price_hearts: 0,
    text_prompt_hint:
      "단정하고 모던한 톤. 짧고 간결한 한국어 인사말. 격조 있고 차분하게.",
    thumbnail_file: "free-modern-01-thumb.png",
    background_file: "free-modern-01-bg.png",
    display_order: 30,
    is_active: true,
    layout: {
      canvas: { w: 1200, h: 800, bg: "#FFFFFF" },
      slots: [
        // 좌측 상단 — 결혼일 (월.일)
        {
          id: "wedding_date_short",
          type: "text",
          x: 60,
          y: 60,
          w: 200,
          h: 60,
          z: 2,
          field: "wedding_date",
          font_size: 36,
          font_weight: 300,
          color: "#1A1A1A",
          align: "left",
          letter_spacing: 2,
        },
        // 좌측 세로 라인 장식은 배경 PNG 가 담당

        // 좌측 — "We Pledge Our Love" 영문 타이틀
        {
          id: "title_en",
          type: "text",
          x: 60,
          y: 300,
          w: 420,
          h: 200,
          z: 2,
          text: "We\nPledge\nOur Love",
          font_family: "serif",
          font_size: 60,
          font_weight: 400,
          color: "#1A1A1A",
          align: "left",
          line_height: 1.05,
          locked: true,
        },

        // 좌측 — 한글 이름
        {
          id: "names_ko",
          type: "text",
          x: 60,
          y: 520,
          w: 420,
          h: 30,
          z: 2,
          text: "신랑 · 신부",
          font_family: "serif",
          font_size: 16,
          color: "#666",
          align: "left",
          letter_spacing: 4,
        },

        // INVITATION 본문 (좌측 하단)
        {
          id: "intro_message",
          type: "text",
          x: 60,
          y: 580,
          w: 480,
          h: 140,
          z: 2,
          role: "intro",
          placeholder:
            "서로의 이름을 부르는 것만으로도\n사랑의 깊이를 확인할 수 있는 두 사람이\n꽃과 나무처럼 걸어와서\n서로의 모든 것이 되기 위해\n오랜 기다림 끝에 혼례식을 치르는 날\n세상은 더욱 아름다워라",
          ai_promptable: true,
          font_size: 13,
          color: "#444",
          align: "left",
          line_height: 1.7,
        },

        // 우측 — 큰 캘린더 (결혼일 하트 마커 자동)
        {
          id: "wedding_calendar",
          type: "calendar",
          x: 660,
          y: 200,
          w: 480,
          h: 380,
          z: 2,
          calendar_color: "#1A1A1A",
          calendar_accent_color: "#E0364B",
          font_family: "serif",
          locked: true,
        },

        // 우측 하단 — 식 정보
        {
          id: "venue_info",
          type: "text",
          x: 660,
          y: 620,
          w: 480,
          h: 80,
          z: 2,
          field: "venue_name",
          font_size: 13,
          color: "#666",
          align: "left",
          line_height: 1.6,
        },

        // 모바일 청첩장 안내 QR (3-C 활성 후)
        {
          id: "share_qr",
          type: "qr",
          x: 1080,
          y: 660,
          w: 80,
          h: 80,
          z: 2,
        },
      ],
    },
  },

  // ──────────────────────────────────────────────────────────────
  // 2. free_classic_01 — "Kim Dong hyun" 스타일
  //    큰 커플 사진 + 영문 이름 워터마크 + 본문/약도 분리
  // ──────────────────────────────────────────────────────────────
  {
    slug: "free-classic-01",
    name: "클래식 — 커플 사진 강조",
    format: "paper",
    tone: "CLASSIC",
    price_hearts: 0,
    text_prompt_hint:
      "정통적이고 격식 있는 한국어 청첩장 인사말. 부모님 세대도 자연스러운 톤.",
    thumbnail_file: "free-classic-01-thumb.png",
    background_file: "free-classic-01-bg.png",
    display_order: 20,
    is_active: true,
    layout: {
      canvas: { w: 1000, h: 1400, bg: "#FAF8F4" },
      slots: [
        // 상단 — 큰 커플 사진
        {
          id: "main_photo",
          type: "image",
          x: 0,
          y: 0,
          w: 1000,
          h: 700,
          z: 1,
          fit: "cover",
          image_order: 1,
        },

        // 사진 위 — 신랑 영문 이름 (좌상단)
        {
          id: "name_en_groom",
          type: "text",
          x: 60,
          y: 60,
          w: 420,
          h: 50,
          z: 3,
          placeholder: "Kim Dong hyun",
          font_family: "script",
          font_size: 32,
          font_style: "italic",
          color: "#FFFFFF",
          align: "left",
        },

        // 사진 위 — 신부 영문 이름 (우하단)
        {
          id: "name_en_bride",
          type: "text",
          x: 540,
          y: 640,
          w: 420,
          h: 50,
          z: 3,
          placeholder: "Choi Eun seo",
          font_family: "script",
          font_size: 32,
          font_style: "italic",
          color: "#FFFFFF",
          align: "right",
        },

        // 사진 위 — 결혼 날짜 (우상단)
        {
          id: "wedding_date_en",
          type: "text",
          x: 540,
          y: 60,
          w: 400,
          h: 40,
          z: 3,
          field: "wedding_date",
          font_size: 14,
          color: "#FFFFFF",
          align: "right",
          letter_spacing: 3,
        },

        // 사진 아래 — 식장 이름
        {
          id: "venue_label",
          type: "text",
          x: 60,
          y: 590,
          w: 420,
          h: 30,
          z: 3,
          field: "venue_name",
          font_size: 12,
          color: "#FFFFFF",
          align: "left",
          letter_spacing: 2,
        },

        // 하단 — INVITATION 인사말
        {
          id: "intro_label",
          type: "text",
          x: 60,
          y: 760,
          w: 880,
          h: 30,
          z: 2,
          text: "INVITATION",
          font_size: 14,
          color: "#888",
          align: "left",
          letter_spacing: 4,
          locked: true,
        },
        {
          id: "intro_message",
          type: "text",
          x: 60,
          y: 810,
          w: 540,
          h: 220,
          z: 2,
          role: "intro",
          placeholder:
            "저희 두 사람이 사랑과 믿음으로\n한 가정을 이루게 되었습니다.\n바쁘시더라도 부디 오셔서\n저희들의 앞날을 축복해 주시고\n격려해 주시면 더없이 큰 기쁨이 되겠습니다.",
          ai_promptable: true,
          font_size: 14,
          color: "#333",
          align: "left",
          line_height: 1.8,
        },

        // 부모님 + 신랑·신부 이름
        {
          id: "groom_parents",
          type: "text",
          x: 60,
          y: 1060,
          w: 540,
          h: 30,
          z: 2,
          field: "groom_parents",
          font_size: 13,
          color: "#333",
          align: "left",
        },
        {
          id: "bride_parents",
          type: "text",
          x: 60,
          y: 1100,
          w: 540,
          h: 30,
          z: 2,
          field: "bride_parents",
          font_size: 13,
          color: "#333",
          align: "left",
        },

        // 날짜·시간·식장
        {
          id: "wedding_datetime_full",
          type: "text",
          x: 60,
          y: 1180,
          w: 540,
          h: 30,
          z: 2,
          field: "wedding_date",
          font_size: 13,
          color: "#666",
          align: "left",
        },
        {
          id: "venue_full",
          type: "text",
          x: 60,
          y: 1220,
          w: 540,
          h: 30,
          z: 2,
          field: "venue_address",
          font_size: 13,
          color: "#666",
          align: "left",
        },

        // 우측 — 약도 (운영자가 등록한 약도 PNG 슬롯)
        {
          id: "location_label",
          type: "text",
          x: 660,
          y: 810,
          w: 280,
          h: 30,
          z: 2,
          text: "LOCATION",
          font_size: 14,
          color: "#888",
          align: "left",
          letter_spacing: 4,
          locked: true,
        },
        {
          id: "venue_map",
          type: "map",
          x: 660,
          y: 850,
          w: 280,
          h: 200,
          z: 2,
          fit: "contain",
        },
        {
          id: "venue_map_address",
          type: "text",
          x: 660,
          y: 1080,
          w: 280,
          h: 60,
          z: 2,
          field: "venue_address",
          font_size: 11,
          color: "#666",
          align: "left",
          line_height: 1.5,
        },
      ],
    },
  },

  // ──────────────────────────────────────────────────────────────
  // 누끼 데모 — 종이 5하트
  // 사용자 사진을 두 번 사용 — 원본은 배경(z:1), 누낀 버전은 텍스트 위(z:3).
  // 같은 image_order=1 → distributePhotos 가 같은 사진을 두 슬롯에 매핑.
  // 누낀 슬롯이 핑크 인사말 위로 올라와 인물이 텍스트 사이에 끼는 효과.
  // ──────────────────────────────────────────────────────────────
  {
    slug: "paper-cutout-01",
    name: "누끼 — 인물이 텍스트 위로",
    format: "paper",
    tone: "ROMANTIC",
    price_hearts: 5,
    text_prompt_hint:
      "감성적이고 따뜻한 톤. 사진 인물 위에 시처럼 흐르는 인사말.",
    thumbnail_file: "paper-cutout-01-thumb.png",
    background_file: "paper-cutout-01-bg.png",
    display_order: 40,
    is_active: true,
    layout: {
      canvas: { w: 1000, h: 1400, bg: "#FAF6F1" },
      slots: [
        // ── 배경 사진 (z:1) — 원본 사진
        {
          id: "main_photo_bg",
          type: "image",
          x: 0,
          y: 0,
          w: 1000,
          h: 1000,
          z: 1,
          fit: "cover",
          image_order: 1,
        },

        // ── 사진 위 큰 영문 타이틀 (z:2)
        {
          id: "title_en",
          type: "text",
          x: 80,
          y: 380,
          w: 840,
          h: 240,
          z: 2,
          text: "We're\nGetting\nMarried",
          font_family: "script",
          font_size: 96,
          font_style: "italic",
          color: "#FFFFFF",
          align: "center",
          line_height: 1,
          locked: true,
        },

        // ── 인물 누낀 사진 (z:3) — 텍스트 위로 인물이 떠오름
        {
          id: "main_photo_cutout",
          type: "image",
          x: 0,
          y: 0,
          w: 1000,
          h: 1000,
          z: 3,
          fit: "cover",
          image_order: 1,         // 원본과 같은 사진
          auto_cutout: true,       // ★ 발행 시 remove.bg 호출
        },

        // ── 사진 아래 흰 카드 영역 (z:2, 배경 PNG 가 처리)

        // ── 인사말
        {
          id: "intro_message",
          type: "text",
          x: 80,
          y: 1060,
          w: 840,
          h: 160,
          z: 2,
          role: "intro",
          placeholder:
            "두 사람이 한 길을 걷기로 했습니다.\n그 첫 걸음에 함께해 주세요.",
          ai_promptable: true,
          font_size: 16,
          color: "#1A1A1A",
          align: "center",
          line_height: 1.8,
        },

        // ── 날짜·식장
        {
          id: "wedding_date_short",
          type: "text",
          x: 80,
          y: 1240,
          w: 840,
          h: 30,
          z: 2,
          field: "wedding_date",
          font_size: 14,
          color: "#1A1A1A",
          align: "center",
          letter_spacing: 2,
        },
        {
          id: "venue_info",
          type: "text",
          x: 80,
          y: 1290,
          w: 840,
          h: 30,
          z: 2,
          field: "venue_name",
          font_size: 13,
          color: "#666",
          align: "center",
        },
      ],
    },
  },

  // ──────────────────────────────────────────────────────────────
  // 모바일 무료 — 1080×1920 세로 (인스타 스토리 비율)
  // 큰 커플 사진 + 인사말 + 캘린더 + 식 정보 + 부모님
  // ──────────────────────────────────────────────────────────────
  {
    slug: "mobile-modern-01",
    name: "모바일 — 모던 세로",
    format: "mobile",
    tone: "MODERN",
    price_hearts: 0,
    text_prompt_hint:
      "단정하고 따뜻한 모바일 청첩장 인사말. 모바일 화면에서 읽기 좋은 짧고 명료한 톤.",
    thumbnail_file: "mobile-modern-01-thumb.png",
    background_file: "mobile-modern-01-bg.png",
    display_order: 50,
    is_active: true,
    layout: {
      canvas: { w: 1080, h: 1920, bg: "#FAF8F4" },
      slots: [
        // 상단 — 큰 사진 영역 (1080×1080 정사각)
        {
          id: "main_photo",
          type: "image",
          x: 0,
          y: 0,
          w: 1080,
          h: 1080,
          z: 1,
          fit: "cover",
          image_order: 1,
        },

        // 사진 위 영문 이름 (좌상단)
        {
          id: "names_en",
          type: "text",
          x: 60,
          y: 60,
          w: 960,
          h: 60,
          z: 3,
          placeholder: "Hong Gildong & Kim Younghee",
          font_family: "script",
          font_size: 36,
          font_style: "italic",
          color: "#FFFFFF",
          align: "left",
        },

        // 사진 위 결혼 날짜 (우하단)
        {
          id: "wedding_date_overlay",
          type: "text",
          x: 60,
          y: 980,
          w: 960,
          h: 50,
          z: 3,
          field: "wedding_date",
          font_size: 18,
          color: "#FFFFFF",
          align: "right",
          letter_spacing: 4,
        },

        // 사진 아래 — 인사말
        {
          id: "intro_message",
          type: "text",
          x: 80,
          y: 1130,
          w: 920,
          h: 260,
          z: 2,
          role: "intro",
          placeholder:
            "두 사람이 사랑으로 만나\n작은 결실을 맺습니다.\n\n귀한 걸음으로 축복해주세요.",
          ai_promptable: true,
          font_size: 24,
          color: "#1A1A1A",
          align: "center",
          line_height: 1.7,
        },

        // 신랑·신부 이름 한글
        {
          id: "names_ko",
          type: "text",
          x: 80,
          y: 1420,
          w: 920,
          h: 50,
          z: 2,
          placeholder: "신랑 · 신부",
          font_size: 22,
          color: "#1A1A1A",
          align: "center",
          letter_spacing: 4,
        },

        // 부모님
        {
          id: "groom_parents",
          type: "text",
          x: 80,
          y: 1490,
          w: 920,
          h: 36,
          z: 2,
          field: "groom_parents",
          font_size: 16,
          color: "#666",
          align: "center",
        },
        {
          id: "bride_parents",
          type: "text",
          x: 80,
          y: 1530,
          w: 920,
          h: 36,
          z: 2,
          field: "bride_parents",
          font_size: 16,
          color: "#666",
          align: "center",
        },

        // 캘린더
        {
          id: "wedding_calendar",
          type: "calendar",
          x: 240,
          y: 1600,
          w: 600,
          h: 280,
          z: 2,
          calendar_color: "#1A1A1A",
          calendar_accent_color: "#E0364B",
        },
      ],
    },
  },

  // ──────────────────────────────────────────────────────────────
  // 3. free_moody_01 — "Getting Married" 무디 스타일
  //    검정 배경 사진 카드 + 흰 배경 텍스트 카드 양면 시뮬레이션
  // ──────────────────────────────────────────────────────────────
  {
    slug: "free-moody-01",
    name: "무디 — Getting Married",
    format: "paper",
    tone: "ROMANTIC",
    price_hearts: 0,
    text_prompt_hint:
      "감성적이고 따뜻한 톤. 짧은 인사말이되 감정이 담긴 표현.",
    thumbnail_file: "free-moody-01-thumb.png",
    background_file: "free-moody-01-bg.png",
    display_order: 10,
    is_active: true,
    layout: {
      // 좌(검정)·우(흰색) 양면을 한 캔버스에 시뮬레이션 (1000+1000 가로)
      canvas: { w: 2000, h: 1400, bg: "#FFFFFF" },
      slots: [
        // ─── 좌측 카드 (검정 배경) ───
        // 배경 PNG 가 좌측 절반에 검정 + 사진 영역을 그림
        {
          id: "main_photo",
          type: "image",
          x: 0,
          y: 200,
          w: 1000,
          h: 1100,
          z: 1,
          fit: "cover",
          image_order: 1,
        },

        // 좌측 상단 — Getting Married 타이틀
        {
          id: "title_en",
          type: "text",
          x: 80,
          y: 80,
          w: 840,
          h: 200,
          z: 3,
          text: "Getting\nMarried",
          font_family: "script",
          font_size: 96,
          font_style: "italic",
          color: "#F4A8C2",
          align: "center",
          line_height: 1,
          locked: true,
        },

        // 좌측 — 결혼 날짜
        {
          id: "wedding_date_en_top",
          type: "text",
          x: 80,
          y: 280,
          w: 840,
          h: 30,
          z: 3,
          field: "wedding_date",
          font_size: 14,
          color: "#FFFFFF",
          align: "center",
          letter_spacing: 4,
        },

        // 사진 아래 — 영문 이름
        {
          id: "names_en_bottom",
          type: "text",
          x: 80,
          y: 1310,
          w: 840,
          h: 40,
          z: 3,
          placeholder: "Jeong Hyeok & Eun Ha Su",
          font_family: "serif",
          font_size: 24,
          color: "#FFFFFF",
          align: "center",
          font_style: "italic",
        },

        // ─── 우측 카드 (흰 배경) ───

        // 상단 — 인사말
        {
          id: "intro_message",
          type: "text",
          x: 1100,
          y: 120,
          w: 820,
          h: 220,
          z: 2,
          role: "intro",
          placeholder:
            "햇살 가득 활짝 웃는 3월\n정혁, 은하수 결혼합니다.\n\n기쁜 날, 가까이서 축복해주시면\n감사하겠습니다.",
          ai_promptable: true,
          font_size: 16,
          color: "#1A1A1A",
          align: "center",
          line_height: 1.8,
        },

        // + 구분선은 배경 PNG가 담당

        // 부모님 + 이름
        {
          id: "groom_parents_with_name",
          type: "text",
          x: 1100,
          y: 420,
          w: 820,
          h: 30,
          z: 2,
          field: "groom_parents",
          font_size: 14,
          font_weight: 500,
          color: "#1A1A1A",
          align: "center",
        },
        {
          id: "bride_parents_with_name",
          type: "text",
          x: 1100,
          y: 460,
          w: 820,
          h: 30,
          z: 2,
          field: "bride_parents",
          font_size: 14,
          font_weight: 500,
          color: "#1A1A1A",
          align: "center",
        },

        // 큰 캘린더
        {
          id: "wedding_calendar",
          type: "calendar",
          x: 1240,
          y: 560,
          w: 540,
          h: 420,
          z: 2,
          calendar_color: "#1A1A1A",
          calendar_accent_color: "#E0364B",
          font_family: "serif",
        },

        // 하단 — 식 정보
        {
          id: "wedding_datetime",
          type: "text",
          x: 1100,
          y: 1080,
          w: 820,
          h: 30,
          z: 2,
          field: "wedding_date",
          font_size: 14,
          color: "#1A1A1A",
          align: "center",
        },
        {
          id: "venue_name",
          type: "text",
          x: 1100,
          y: 1130,
          w: 820,
          h: 30,
          z: 2,
          field: "venue_name",
          font_size: 14,
          color: "#1A1A1A",
          align: "center",
        },
        {
          id: "venue_address",
          type: "text",
          x: 1100,
          y: 1180,
          w: 820,
          h: 60,
          z: 2,
          field: "venue_address",
          font_size: 12,
          color: "#666",
          align: "center",
          line_height: 1.5,
        },
      ],
    },
  },

  // ════════════════════════════════════════════════════════════════
  // 트렌디 — 티켓 청첩장 (세로 티켓 + 절취선·바코드는 배경 PNG)
  //   레퍼런스: 버건디·골드 봉투 + 절취 티켓 스타일.
  //   ⚠️ 티켓번호는 user_data field 가 없어 placeholder 슬롯(스튜디오에서 수정).
  //   절취선 톱니·바코드·골드 라인은 배경 PNG 가 담당.
  // ════════════════════════════════════════════════════════════════
  {
    slug: "paper-ticket-01",
    name: "티켓 — 부티크 버건디",
    format: "paper",
    tone: "LUXURY",
    price_hearts: 5,
    text_prompt_hint:
      "절제되고 품격 있는 단문 초대. 특별한 한 장의 티켓을 건네는 느낌으로.",
    thumbnail_file: "paper-ticket-01-thumb.png",
    background_file: "paper-ticket-01-bg.png",
    display_order: 38,
    is_active: true,
    layout: {
      canvas: { w: 560, h: 1600, bg: "#FBF8F3" },
      slots: [
        // 상단 — "ADMIT TWO / 우리 결혼합니다" 티켓 타이틀 (고정)
        {
          id: "title",
          type: "text",
          x: 50,
          y: 110,
          w: 460,
          h: 56,
          z: 2,
          text: "우리, 결혼합니다",
          font_family: "serif",
          font_size: 30,
          color: "#7A1F2B",
          align: "center",
          letter_spacing: 1,
          locked: true,
        },
        // 인물 사진 (작게)
        {
          id: "main_photo",
          type: "image",
          x: 90,
          y: 210,
          w: 380,
          h: 300,
          z: 1,
          fit: "cover",
          image_order: 1,
        },
        // 신랑·신부 이름 (합친 이름 — placeholder)
        {
          id: "names",
          type: "text",
          x: 50,
          y: 550,
          w: 460,
          h: 50,
          z: 2,
          placeholder: "신랑 · 신부",
          font_family: "serif",
          font_size: 26,
          color: "#1A1A1A",
          align: "center",
          letter_spacing: 2,
        },
        // 일시
        {
          id: "datetime",
          type: "text",
          x: 50,
          y: 620,
          w: 460,
          h: 36,
          z: 2,
          field: "wedding_date",
          font_size: 16,
          color: "#444",
          align: "center",
        },
        {
          id: "time",
          type: "text",
          x: 50,
          y: 660,
          w: 460,
          h: 32,
          z: 2,
          field: "wedding_time",
          font_size: 14,
          color: "#666",
          align: "center",
        },
        // 식장
        {
          id: "venue",
          type: "text",
          x: 50,
          y: 700,
          w: 460,
          h: 60,
          z: 2,
          field: "venue_name",
          font_size: 14,
          color: "#666",
          align: "center",
          line_height: 1.5,
        },
        // 인사말 (AI)
        {
          id: "intro_message",
          type: "text",
          x: 60,
          y: 800,
          w: 440,
          h: 200,
          z: 2,
          role: "intro",
          ai_promptable: true,
          placeholder:
            "한 장의 초대로,\n저희의 새로운 시작을\n함께해 주세요.",
          font_size: 15,
          color: "#333",
          align: "center",
          line_height: 1.7,
        },
        // 혼주
        {
          id: "groom_parents",
          type: "text",
          x: 50,
          y: 1030,
          w: 460,
          h: 30,
          z: 2,
          field: "groom_parents",
          font_size: 13,
          color: "#444",
          align: "center",
        },
        {
          id: "bride_parents",
          type: "text",
          x: 50,
          y: 1070,
          w: 460,
          h: 30,
          z: 2,
          field: "bride_parents",
          font_size: 13,
          color: "#444",
          align: "center",
        },
        // 모바일 청첩장 안내 QR
        {
          id: "share_qr",
          type: "qr",
          x: 240,
          y: 1330,
          w: 80,
          h: 80,
          z: 2,
        },
        // ⚠️(a) 티켓 번호 — 앱이 수집 안 함 → placeholder, 스튜디오에서 수정
        {
          id: "ticket_no",
          type: "text",
          x: 50,
          y: 1460,
          w: 460,
          h: 30,
          z: 2,
          placeholder: "NO. 0000",
          font_size: 12,
          color: "#9A8B8E",
          align: "center",
          letter_spacing: 3,
        },
      ],
    },
  },

  // ════════════════════════════════════════════════════════════════
  // 트렌디 — 초콜릿(바) 청첩장 (손그림 일러스트는 배경 PNG)
  //   레퍼런스: 흰 wrapper + 손글씨 타이틀 + 손그림 인물 + 꽃·리본.
  //   사진 없음. 모든 장식은 배경 PNG, 슬롯은 텍스트 데이터만.
  // ════════════════════════════════════════════════════════════════
  {
    slug: "paper-chocolate-01",
    name: "초콜릿 — 손그림 위트",
    format: "paper",
    tone: "CUTE",
    price_hearts: 0,
    text_prompt_hint:
      "친근하고 발랄한 톤. 달콤한 위트가 담긴 짧은 인사말. 친구 하객에게 건네듯.",
    thumbnail_file: "paper-chocolate-01-thumb.png",
    background_file: "paper-chocolate-01-bg.png",
    display_order: 36,
    is_active: true,
    layout: {
      canvas: { w: 600, h: 1500, bg: "#FFFFFF" },
      slots: [
        // "Happy Wedding!" 손글씨 타이틀·인물 일러스트는 배경 PNG(상단 0~520)

        // 영문 이름 (손글씨 느낌 — placeholder)
        {
          id: "names_en",
          type: "text",
          x: 60,
          y: 300,
          w: 480,
          h: 60,
          z: 2,
          placeholder: "SEONGMIN & SOONYOUNG",
          font_family: "script",
          font_size: 30,
          color: "#C2185B",
          align: "center",
          letter_spacing: 1,
        },
        // 인사말 (AI)
        {
          id: "intro_message",
          type: "text",
          x: 70,
          y: 600,
          w: 460,
          h: 220,
          z: 2,
          role: "intro",
          ai_promptable: true,
          placeholder:
            "따뜻한 봄날, 소중한 걸음으로\n저희의 설렘을\n함께 축복해 주시면 감사하겠습니다.",
          font_size: 16,
          color: "#2E2E2E",
          align: "center",
          line_height: 1.8,
        },
        // GROOM / BRIDE 혼주
        {
          id: "groom_parents",
          type: "text",
          x: 70,
          y: 870,
          w: 460,
          h: 32,
          z: 2,
          field: "groom_parents",
          font_size: 14,
          color: "#2E7D32",
          align: "center",
        },
        {
          id: "bride_parents",
          type: "text",
          x: 70,
          y: 912,
          w: 460,
          h: 32,
          z: 2,
          field: "bride_parents",
          font_size: 14,
          color: "#C2185B",
          align: "center",
        },
        // 식장·일시
        {
          id: "venue",
          type: "text",
          x: 70,
          y: 1010,
          w: 460,
          h: 32,
          z: 2,
          field: "venue_name",
          font_size: 14,
          color: "#2E2E2E",
          align: "center",
        },
        {
          id: "datetime",
          type: "text",
          x: 70,
          y: 1052,
          w: 460,
          h: 32,
          z: 2,
          field: "wedding_date",
          font_size: 14,
          color: "#555",
          align: "center",
        },
      ],
    },
  },

  // ════════════════════════════════════════════════════════════════
  // 트렌디 — 앱형 모바일 (세로 섹션 스크롤 비주얼)
  //   레퍼런스: Save the Date 풀세트 — 표지·인사말·갤러리·캘린더·식순·
  //   드레스코드·오시는길·참석안내를 세로 블록으로 쌓음.
  //   ★ 인터랙션(RSVP 폼/방명록)은 정적 캔버스라 불가(🚧) → "참석 회신은
  //     카카오톡/QR" 정적 안내로 대체. 식순·드레스코드 라벨은 ⚠️(a) placeholder,
  //     컬러 칩·섹션 구분선은 배경 PNG.
  // ════════════════════════════════════════════════════════════════
  {
    slug: "mobile-app-01",
    name: "모바일 — 앱형 세로 스크롤",
    format: "mobile",
    tone: "ROMANTIC",
    price_hearts: 0,
    text_prompt_hint:
      "감성적이고 따뜻한 모바일 인사말. 섹션이 많은 앱형 화면에 어울리는 짧고 명료한 톤.",
    thumbnail_file: "mobile-app-01-thumb.png",
    background_file: "mobile-app-01-bg.png",
    display_order: 48,
    is_active: true,
    layout: {
      canvas: { w: 1080, h: 3600, bg: "#FBFAF8" },
      slots: [
        // ── 1. 표지 (풀폭 사진)
        {
          id: "cover_photo",
          type: "image",
          x: 0,
          y: 0,
          w: 1080,
          h: 1350,
          z: 1,
          fit: "cover",
          image_order: 1,
        },
        {
          id: "cover_title",
          type: "text",
          x: 80,
          y: 120,
          w: 920,
          h: 60,
          z: 3,
          text: "SAVE THE DATE",
          font_size: 26,
          color: "#FFFFFF",
          align: "center",
          letter_spacing: 6,
          locked: true,
        },
        {
          id: "cover_names",
          type: "text",
          x: 80,
          y: 1130,
          w: 920,
          h: 70,
          z: 3,
          placeholder: "Alexander & Maria",
          font_family: "script",
          font_size: 44,
          font_style: "italic",
          color: "#FFFFFF",
          align: "center",
        },
        {
          id: "cover_date",
          type: "text",
          x: 80,
          y: 1230,
          w: 920,
          h: 44,
          z: 3,
          field: "wedding_date",
          font_size: 22,
          color: "#FFFFFF",
          align: "center",
          letter_spacing: 4,
        },
        // ── 2. 인사말 (섹션 라벨은 배경 PNG: "Invitation")
        {
          id: "intro_message",
          type: "text",
          x: 100,
          y: 1480,
          w: 880,
          h: 280,
          z: 2,
          role: "intro",
          ai_promptable: true,
          placeholder:
            "두 사람이 사랑으로 만나\n한 길을 걷기로 했습니다.\n\n귀한 걸음으로 축복해 주세요.",
          font_size: 26,
          color: "#2E2E2E",
          align: "center",
          line_height: 1.8,
        },
        // 혼주
        {
          id: "groom_parents",
          type: "text",
          x: 100,
          y: 1800,
          w: 880,
          h: 40,
          z: 2,
          field: "groom_parents",
          font_size: 20,
          color: "#666",
          align: "center",
        },
        {
          id: "bride_parents",
          type: "text",
          x: 100,
          y: 1844,
          w: 880,
          h: 40,
          z: 2,
          field: "bride_parents",
          font_size: 20,
          color: "#666",
          align: "center",
        },
        // ── 3. 갤러리 (사진 2장 더 — 서로 다른 image_order)
        {
          id: "gallery_1",
          type: "image",
          x: 90,
          y: 1960,
          w: 430,
          h: 540,
          z: 2,
          fit: "cover",
          image_order: 2,
        },
        {
          id: "gallery_2",
          type: "image",
          x: 560,
          y: 1960,
          w: 430,
          h: 540,
          z: 2,
          fit: "cover",
          image_order: 3,
        },
        // ── 4. 캘린더
        {
          id: "wedding_calendar",
          type: "calendar",
          x: 240,
          y: 2580,
          w: 600,
          h: 300,
          z: 2,
          calendar_color: "#2E2E2E",
          calendar_accent_color: "#E0364B",
        },
        // ── 5. 식순(Timing) — ⚠️(a) placeholder (라벨은 배경 PNG)
        {
          id: "timing",
          type: "text",
          x: 140,
          y: 2960,
          w: 800,
          h: 200,
          z: 2,
          placeholder:
            "15:30  하객 맞이\n16:00  예식 시작\n17:00  피로연",
          font_size: 22,
          color: "#3A3A3A",
          align: "center",
          line_height: 2,
        },
        // ── 6. 오시는 길 (약도 + 주소)
        {
          id: "venue_map",
          type: "map",
          x: 140,
          y: 3220,
          w: 800,
          h: 240,
          z: 2,
          fit: "contain",
        },
        {
          id: "venue_address",
          type: "text",
          x: 100,
          y: 3480,
          w: 880,
          h: 60,
          z: 2,
          field: "venue_address",
          font_size: 20,
          color: "#555",
          align: "center",
          line_height: 1.5,
        },
        // ── 7. 참석 안내(정적 대체) + QR (🚧 RSVP 폼 대체)
        {
          id: "rsvp_notice",
          type: "text",
          x: 100,
          y: 3540,
          w: 760,
          h: 40,
          z: 2,
          text: "참석 회신은 아래 QR / 카카오톡으로 부탁드려요",
          font_size: 16,
          color: "#888",
          align: "center",
          locked: true,
        },
        {
          id: "share_qr",
          type: "qr",
          x: 880,
          y: 3500,
          w: 100,
          h: 100,
          z: 2,
        },
      ],
    },
  },
];
