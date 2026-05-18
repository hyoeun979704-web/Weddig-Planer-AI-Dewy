import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  ChevronRight, 
  Moon, 
  Globe, 
  Shield, 
  FileText, 
  Info, 
  LogOut,
  Trash2 
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useTheme } from "next-themes";

const Settings = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("로그아웃되었습니다");
      navigate("/");
    } catch (error) {
      toast.error("로그아웃에 실패했습니다");
    }
  };

  const handleDeleteAccount = () => {
    toast.error("계정 삭제 기능은 준비 중입니다");
  };

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center h-14 px-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-center font-semibold text-lg pr-10">설정</h1>
        </div>
      </header>

      <main className="pb-20">
        {/* App Settings */}
        <div className="p-4">
          <h2 className="text-xs font-medium text-muted-foreground mb-2 px-1">앱 설정</h2>
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <Moon className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm font-medium">다크 모드</span>
              </div>
              <Switch checked={theme === "dark"} onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")} />
            </div>
            <button className="w-full flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm font-medium">언어</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="text-sm">한국어</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>
          </div>
        </div>

        {/* Legal */}
        <div className="p-4">
          <h2 className="text-xs font-medium text-muted-foreground mb-2 px-1">약관 및 정책</h2>
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <button className="w-full flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm font-medium">이용약관</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <button className="w-full flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm font-medium">개인정보 처리방침</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <button className="w-full flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Info className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm font-medium">오픈소스 라이선스</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Account */}
        {user && (
          <div className="p-4">
            <h2 className="text-xs font-medium text-muted-foreground mb-2 px-1">계정</h2>
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <button 
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 p-4 border-b border-border text-left"
              >
                <LogOut className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm font-medium">로그아웃</span>
              </button>
              <button 
                onClick={handleDeleteAccount}
                className="w-full flex items-center gap-3 p-4 text-left"
              >
                <Trash2 className="w-5 h-5 text-destructive" />
                <span className="text-sm font-medium text-destructive">계정 삭제</span>
              </button>
            </div>
          </div>
        )}

        {/* App Info */}
        <div className="p-4">
          <div className="text-center text-xs text-muted-foreground">
            <p>앱 버전 1.0.0</p>
            <p className="mt-1">© 2025 웨딩 플래너</p>
          </div>
        </div>
      </main>

      <BottomNav activeTab="/mypage" onTabChange={(href) => navigate(href)} />
    </div>
  );
};

export default Settings;
