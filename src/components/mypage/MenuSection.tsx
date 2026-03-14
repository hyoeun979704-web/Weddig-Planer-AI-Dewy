import { useNavigate } from "react-router-dom";
import {
  Calendar, User, Bell, FileText, MessageSquare,
  HelpCircle, Settings, ChevronRight, LogOut
} from "lucide-react";
import { User as SupaUser } from "@supabase/supabase-js";

interface MenuSectionProps {
  user: SupaUser | null;
  onSignOut: () => void;
}

const menuGroups = [
  {
    title: "웨딩 준비",
    items: [
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

const MenuSection = ({ user, onSignOut }: MenuSectionProps) => {
  const navigate = useNavigate();

  return (
    <div className="px-4 py-2 space-y-4">
      {menuGroups.map((group) => (
        <div key={group.title}>
          <h3 className="text-xs font-medium text-muted-foreground mb-1.5 px-1">{group.title}</h3>
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            {group.items.map((item, idx) => (
              <button
                key={item.href}
                onClick={() => navigate(item.href)}
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
            ))}
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
