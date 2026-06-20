import {
  LayoutDashboard, Shirt, Sparkles, FileText, Camera, Bell, Users,
  Instagram, MessageSquare, Megaphone, MapPin, Building2, Flag, AlertTriangle, Bot,
  Star, ShoppingBag,
} from "lucide-react";

// 어드민 내비게이션 단일 소스 — 사이드바(AdminLayout) + 대시보드 빠른액션(AdminDashboard)이
// 모두 이 배열에서 파생한다(라벨·경로·배지 드리프트 방지). `featured`=대시보드 빠른액션 노출.
export interface AdminNavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  badge?: string;
  featured?: boolean;
}

export const ADMIN_NAV: AdminNavItem[] = [
  { label: "대시보드", href: "/admin", icon: LayoutDashboard },
  { label: "드레스 카탈로그", href: "/admin/dress-samples", icon: Shirt, featured: true },
  { label: "메이크업 카탈로그", href: "/admin/makeup-samples", icon: Sparkles, featured: true },
  { label: "헤어 카탈로그", href: "/admin/hair-samples", icon: Sparkles, featured: true },
  { label: "업체 정보 관리", href: "/admin/places", icon: MapPin, featured: true },
  { label: "콘텐츠 검토", href: "/admin/content-review", icon: Megaphone, featured: true },
  { label: "기업회원 검토", href: "/admin/business-review", icon: Building2, featured: true },
  { label: "업체 권한 요청", href: "/admin/place-claims", icon: Building2 },
  { label: "신고 처리", href: "/admin/reports", icon: Flag, featured: true },
  { label: "AI 생성 현황", href: "/admin/ai-jobs", icon: Sparkles, featured: true },
  { label: "AI 프롬프트 검증", href: "/admin/ai-prompts", icon: Sparkles, featured: true },
  { label: "청첩장 템플릿", href: "/admin/invitation-templates", icon: FileText },
  { label: "청첩장 에셋", href: "/admin/invitation-assets", icon: FileText },
  { label: "청첩장 폰트", href: "/admin/invitation-fonts", icon: FileText },
  { label: "촬영 시안", href: "/admin/wedding-photo-refs", icon: Camera, badge: "준비중" },
  { label: "인스타 큐레이션", href: "/admin/tip-instagrams", icon: Instagram, featured: true },
  { label: "인스타 카드뉴스", href: "/admin/instagram-posts", icon: Instagram, badge: "1단계" },
  { label: "사전알림 신청", href: "/admin/service-waitlist", icon: Bell, featured: true },
  { label: "사용자 관리", href: "/admin/users", icon: Users, featured: true },
  { label: "상품 큐레이션", href: "/admin/product-curation", icon: ShoppingBag, featured: true },
  { label: "추천 상품 관리", href: "/admin/featured-products", icon: Star, featured: true },
  { label: "이벤트·진입 팝업", href: "/admin/promotions", icon: Star, featured: true },
  { label: "1:1 문의·불편접수", href: "/admin/inquiries", icon: MessageSquare, featured: true },
  { label: "커뮤니티 공지", href: "/admin/announcements", icon: Megaphone, featured: true },
  { label: "오류 모니터링", href: "/admin/error-logs", icon: AlertTriangle },
  { label: "에이전트 산출물", href: "/admin/agent-outputs", icon: Bot },
];

export const ADMIN_NAV_FEATURED = ADMIN_NAV.filter((i) => i.featured);
