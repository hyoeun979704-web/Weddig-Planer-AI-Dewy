import {
  LayoutDashboard, Shirt, Sparkles, FileText, Camera, Bell, Users,
  Instagram, MessageSquare, Megaphone, MapPin, Building2, Flag, AlertTriangle, Bot,
  Star, ShoppingBag, Shield, type LucideIcon,
} from "lucide-react";

// 어드민 내비게이션 단일 소스 — 사이드바(AdminLayout) + 대시보드 빠른액션(AdminDashboard)이
// 모두 이 배열에서 파생한다(라벨·경로·배지·그룹 드리프트 방지). `featured`=대시보드 빠른액션 노출.
// `group`=전용 대시보드 그룹(미지정 = 대시보드 허브 자신). 새 운영 기능은 여기 항목 1개만 추가하면
// 사이드바·허브·그룹 섹션에 자동 반영된다(고도화 쉬운 구조의 핵심).
export type AdminNavGroupKey =
  | "vendors" | "commerce" | "moderation" | "invitation" | "ai" | "marketing";

export interface AdminNavGroup {
  key: AdminNavGroupKey;
  label: string;
  icon: LucideIcon;
}

// 그룹 정의(표시 순서). 사이드바·허브가 이 순서대로 섹션을 렌더한다.
export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  { key: "vendors", label: "업체·입점", icon: Building2 },
  { key: "commerce", label: "상품·커머스", icon: ShoppingBag },
  { key: "moderation", label: "모더레이션·CS", icon: Shield },
  { key: "invitation", label: "청첩장 에셋", icon: FileText },
  { key: "ai", label: "AI 운영", icon: Bot },
  { key: "marketing", label: "마케팅", icon: Megaphone },
];

export interface AdminNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  featured?: boolean;
  group?: AdminNavGroupKey; // 미지정 = 대시보드(허브) 자신
}

export const ADMIN_NAV: AdminNavItem[] = [
  { label: "대시보드", href: "/admin", icon: LayoutDashboard },

  // 업체·입점
  { label: "업체 정보 관리", href: "/admin/places", icon: MapPin, featured: true, group: "vendors" },
  { label: "기업회원 검토", href: "/admin/business-review", icon: Building2, featured: true, group: "vendors" },
  { label: "업체 권한 요청", href: "/admin/place-claims", icon: Building2, group: "vendors" },

  // 상품·커머스
  { label: "상품 큐레이션", href: "/admin/product-curation", icon: ShoppingBag, featured: true, group: "commerce" },
  { label: "추천 상품 관리", href: "/admin/featured-products", icon: Star, featured: true, group: "commerce" },
  { label: "콘텐츠 검토", href: "/admin/content-review", icon: Megaphone, featured: true, group: "commerce" },

  // 모더레이션·CS
  { label: "신고 처리", href: "/admin/reports", icon: Flag, featured: true, group: "moderation" },
  { label: "1:1 문의·불편접수", href: "/admin/inquiries", icon: MessageSquare, featured: true, group: "moderation" },
  { label: "사용자 관리", href: "/admin/users", icon: Users, featured: true, group: "moderation" },
  { label: "사전알림 신청", href: "/admin/service-waitlist", icon: Bell, featured: true, group: "moderation" },
  { label: "커뮤니티 공지", href: "/admin/announcements", icon: Megaphone, featured: true, group: "moderation" },
  { label: "오류 모니터링", href: "/admin/error-logs", icon: AlertTriangle, group: "moderation" },

  // 청첩장 에셋
  { label: "청첩장 템플릿", href: "/admin/invitation-templates", icon: FileText, group: "invitation" },
  { label: "청첩장 에셋", href: "/admin/invitation-assets", icon: FileText, group: "invitation" },
  { label: "청첩장 폰트", href: "/admin/invitation-fonts", icon: FileText, group: "invitation" },

  // AI 운영
  { label: "AI 생성 현황", href: "/admin/ai-jobs", icon: Sparkles, featured: true, group: "ai" },
  { label: "AI 프롬프트 검증", href: "/admin/ai-prompts", icon: Sparkles, featured: true, group: "ai" },
  { label: "AI 프롬프트 편집", href: "/admin/ai-prompt-editor", icon: Bot, featured: true, group: "ai" },
  { label: "에이전트 산출물", href: "/admin/agent-outputs", icon: Bot, group: "ai" },
  { label: "드레스 카탈로그", href: "/admin/dress-samples", icon: Shirt, featured: true, group: "ai" },
  { label: "메이크업 카탈로그", href: "/admin/makeup-samples", icon: Sparkles, featured: true, group: "ai" },
  { label: "헤어 카탈로그", href: "/admin/hair-samples", icon: Sparkles, featured: true, group: "ai" },
  { label: "촬영 시안", href: "/admin/wedding-photo-refs", icon: Camera, badge: "준비중", group: "ai" },

  // 마케팅
  { label: "인스타 큐레이션", href: "/admin/tip-instagrams", icon: Instagram, featured: true, group: "marketing" },
  { label: "인스타 카드뉴스", href: "/admin/instagram-posts", icon: Instagram, badge: "1단계", group: "marketing" },
  { label: "블로그·워드프레스", href: "/admin/blog-posts", icon: FileText, group: "marketing" },
  { label: "이벤트·진입 팝업", href: "/admin/promotions", icon: Star, featured: true, group: "marketing" },
];

export const ADMIN_NAV_FEATURED = ADMIN_NAV.filter((i) => i.featured);

// 그룹별 항목(표시 순서대로). 대시보드(group 미지정)는 제외된다.
export const adminNavItemsByGroup = (group: AdminNavGroupKey): AdminNavItem[] =>
  ADMIN_NAV.filter((i) => i.group === group);
