import { useNavigate } from "react-router-dom";
import {
  Calendar, User, Bell, FileText, MessageSquare,
  HelpCircle, Settings, ChevronRight, LogOut, Building2, Heart
} from "lucide-react";
import { User as SupaUser } from "@supabase/supabase-js";
import { useUserRole } from "@/hooks/useUserRole";

interface MenuSectionProps {
  user: SupaUser | null;
  onSignOut: () => void;
  /** Open the WeddingInfoSetupModal — wired by MyPage so users can edit
   *  their wedding info (date / region / partner / planning stage) any time. */
  onEditWeddingInfo?: () => void;
}

// Each item is either a navigation (href) or an action (onClick). The
// menuGroups list is built per-render so action handlers like
// onEditWeddingInfo can close over component props.
type MenuItem =
  | { icon: typeof Calendar; title: string; description: string; href: string; onClick?: undefined }
  | { icon: typeof Calendar; title: string; description: string; onClick: () => void; href?: undefined };

const MenuSection = ({ user, onSignOut, onEditWeddingInfo }: MenuSectionProps) => {
  const navigate = useNavigate();
  const { isBusiness, businessProfile } = useUserRole();

  const menuGroups: { title: string; items: MenuItem[] }[] = [
    {
      title: "웨딩 준비",
      items: [
        ...(onEditWeddingInfo
          ? [{ icon: Heart, title: "결혼 정보 수정", description: "예정일·지역·진행 단계 변경", onClick: onEditWeddingInfo } as MenuItem]
          : []),
        { icon: Calendar, title: "내 웨딩 일정", description: "D-Day 설정 및 일정 관리", href: "/my-schedule" },
        { icon: FileText, title: "내 문의/예약", description: "문의 및 예약 내역 확인", href: "/my-inquiries" },
      ],
    },
    {
      title: "계정",
      items: [
        { icon: User, title: "내 정보", description: "프로필 및 계정 관리", href: "/profile" },
        { icon: Bell, title: "알림 설정", description: "푸시 알림 관리", href: "/notifications" },
        { icon: Settings, title: "설정", description: "다크 모드, 언어 등", href: "/settings" },
      ],
    },
    {
      title: "고객 지원",
      items: [
        { icon: MessageSquare, title: "1:1 문의", description: "고객센터 문의하기", href: "/contact" },
        { icon: HelpCircle, title: "자주 묻는 질문", description: "FAQ", href: "/faq" },
      ],
    },
  ];

  return (
    <div className="px-4 py-2 space-y-4">
      {/* Business management card - only for business users */}
      {isBusiness && (
        <div>
          <h3 className="text-xs font-medium text-muted-foreground mb-1.5 px-1">업체 관리</h3>
          <button
            onClick={() => navigate("/business/dashboard")}
            className="w-full flex items-center gap-3 px-4 py-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl border border-primary/20 hover:border-primary/40 active:scale-[0.98] transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-semibold text-foreground">{businessProfile?.business_name || "업체 관리"}</p>
              <p className="text-[11px] text-muted-foreground">업체 정보, 이미지, 문의 관리</p>
            </div>
            <ChevronRight className="w-5 h-5 text-primary flex-shrink-0" />
          </button>
        </div>
      )}

      {menuGroups.map((group) => (
        <div key={group.title}>
          <h3 className="text-xs font-medium text-muted-foreground mb-1.5 px-1">{group.title}</h3>
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            {group.items.map((item, idx) => {
              const onClick = item.onClick ?? (() => item.href && navigate(item.href));
              return (
                <button
                  key={item.href ?? item.title}
                  onClick={onClick}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 active:bg-muted/80 transition-colors text-left ${
                    idx < group.items.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-[18px] h-[18px] text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="text-[11px] text-muted-foreground">{item.description}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Logout */}
      {user && (
        <div>
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <button
              onClick={onSignOut}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-destructive/5 active:bg-destructive/10 transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <LogOut className="w-[18px] h-[18px] text-destructive" />
              </div>
              <span className="text-sm font-medium text-destructive">로그아웃</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuSection;
