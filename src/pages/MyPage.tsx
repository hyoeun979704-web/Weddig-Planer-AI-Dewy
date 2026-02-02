import { useNavigate, useLocation } from "react-router-dom";
import { 
  User, 
  Settings, 
  HelpCircle, 
  FileText, 
  Bell, 
  MessageSquare,
  ChevronRight,
  LogIn,
  LogOut,
  Heart,
  Coins,
  Ticket,
  ShoppingBag,
  Calendar
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

const quickMenuItems = [
  { icon: Heart, label: "찜", count: 12, href: "/favorites" },
  { icon: Coins, label: "포인트", count: "3,500P", href: "/points" },
  { icon: Ticket, label: "쿠폰", count: 5, href: "/coupons" },
  { icon: ShoppingBag, label: "주문내역", count: null, href: "/orders" },
];

const menuItems = [
  { icon: Calendar, title: "내 웨딩 일정", description: "D-Day 설정 및 관리", href: "/my-schedule" },
  { icon: User, title: "내 정보", description: "프로필 및 계정 관리", href: "/profile" },
  { icon: Bell, title: "알림 설정", description: "푸시 알림 관리", href: "/notifications" },
  { icon: FileText, title: "내 문의/예약", description: "문의 및 예약 내역", href: "/my-inquiries" },
  { icon: MessageSquare, title: "1:1 문의", description: "고객센터 문의하기", href: "/contact" },
  { icon: HelpCircle, title: "자주 묻는 질문", description: "FAQ", href: "/faq" },
  { icon: Settings, title: "설정", description: "앱 설정", href: "/settings" },
];

const MyPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading, signOut } = useAuth();

  const handleTabChange = (href: string) => {
    navigate(href);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("로그아웃되었습니다");
    } catch (error) {
      toast.error("로그아웃에 실패했습니다");
    }
  };

  const getUserDisplayName = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    if (user?.user_metadata?.name) {
      return user.user_metadata.name;
    }
    if (user?.email) {
      return user.email.split("@")[0];
    }
    return "사용자";
  };

  const getUserAvatar = () => {
    return user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;
  };

  const getUserInitial = () => {
    const name = getUserDisplayName();
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <h1 className="text-lg font-bold text-foreground">마이페이지</h1>
          <button onClick={() => navigate("/settings")} className="p-2">
            <Settings className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20">
        {/* User Section */}
        <div className="px-4 py-6 bg-gradient-to-br from-primary/10 via-accent to-background">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : user ? (
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16 border-2 border-primary/20">
                <AvatarImage src={getUserAvatar() || undefined} alt={getUserDisplayName()} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                  {getUserInitial()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-foreground mb-1">{getUserDisplayName()}</h2>
                <p className="text-sm text-muted-foreground">
                  {user.email}
                </p>
              </div>
              <button 
                onClick={handleSignOut}
                className="px-4 py-2 bg-muted text-muted-foreground rounded-xl text-sm font-medium flex items-center gap-1 hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <LogOut className="w-4 h-4" />
                로그아웃
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <User className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-foreground mb-1">로그인해주세요</h2>
                <p className="text-sm text-muted-foreground">
                  더 많은 혜택을 만나보세요
                </p>
              </div>
              <button 
                onClick={() => navigate("/auth")}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium flex items-center gap-1"
              >
                <LogIn className="w-4 h-4" />
                로그인
              </button>
            </div>
          )}
        </div>

        {/* Quick Menu */}
        <div className="px-4 py-4">
          <div className="grid grid-cols-4 gap-2">
            {quickMenuItems.map((item, index) => (
              <button
                key={index}
                onClick={() => navigate(item.href)}
                className="flex flex-col items-center gap-1 p-3 bg-card rounded-2xl border border-border hover:border-primary/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <span className="text-xs font-medium text-foreground">{item.label}</span>
                {item.count !== null && (
                  <span className="text-xs font-bold text-primary">{item.count}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* D-Day Card */}
        <div className="px-4 py-2">
          <div className="p-4 bg-gradient-to-r from-primary/20 to-primary/5 rounded-2xl border border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">결혼식까지</p>
                <p className="text-2xl font-bold text-primary">D-180</p>
              </div>
              <button 
                onClick={() => navigate("/my-schedule")}
                className="px-3 py-1.5 bg-primary/10 rounded-lg text-sm font-medium text-primary"
              >
                날짜 설정
              </button>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="px-4 py-4">
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            {menuItems.map((item, index) => (
              <button
                key={index}
                onClick={() => navigate(item.href)}
                className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors text-left border-b border-border last:border-b-0"
              >
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-foreground text-sm">{item.title}</h4>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>

        {/* App Info */}
        <div className="px-4 py-4">
          <div className="text-center text-xs text-muted-foreground">
            <p>앱 버전 1.0.0</p>
            <p className="mt-1">© 2025 웨딩 플래너</p>
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNav activeTab={location.pathname} onTabChange={handleTabChange} />
    </div>
  );
};

export default MyPage;
