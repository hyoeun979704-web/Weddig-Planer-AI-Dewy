import { useNavigate } from "react-router-dom";
import {
  ChevronRight,
  Moon,
  Globe,
  Shield,
  FileText,
  Info,
  LogOut,
  Trash2
} from "lucide-react";
import { useState } from "react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useTheme } from "next-themes";

const Settings = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [deleting, setDeleting] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("로그아웃되었습니다");
      navigate("/");
    } catch (error) {
      toast.error("로그아웃에 실패했습니다");
    }
  };

  const handleDeleteAccount = async () => {
    if (deleting) return;
    const ok = window.confirm(
      "정말 계정을 삭제할까요?\n\n계정과 모든 데이터(예산·일정·찜·작성글·결제내역 등)가 영구 삭제되며 복구할 수 없어요.",
    );
    if (!ok) return;
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke("delete-account");
      if (error) {
        toast.error("계정 삭제에 실패했어요. 잠시 후 다시 시도해주세요");
        return;
      }
      await signOut().catch(() => {});
      toast.success("계정이 삭제되었어요");
      navigate("/", { replace: true });
    } catch {
      toast.error("계정 삭제에 실패했어요. 잠시 후 다시 시도해주세요");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      <PageHeader title="설정" />

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
            <button
              onClick={() => toast.info("현재 한국어만 지원해요")}
              className="w-full flex items-center justify-between p-4"
            >
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
            <button
              onClick={() => navigate("/terms")}
              className="w-full flex items-center justify-between p-4 border-b border-border"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm font-medium">이용약관</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <button
              onClick={() => navigate("/privacy")}
              className="w-full flex items-center justify-between p-4 border-b border-border"
            >
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm font-medium">개인정보 처리방침</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <button
              onClick={() => toast.info("오픈소스 라이선스는 준비 중이에요")}
              className="w-full flex items-center justify-between p-4"
            >
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
                disabled={deleting}
                className="w-full flex items-center gap-3 p-4 text-left disabled:opacity-50"
              >
                <Trash2 className="w-5 h-5 text-destructive" />
                <span className="text-sm font-medium text-destructive">{deleting ? "삭제 중..." : "계정 삭제"}</span>
              </button>
            </div>
          </div>
        )}

        {/* App Info */}
        <div className="p-4">
          <div className="text-center text-xs text-muted-foreground">
            <p>앱 버전 1.0.0</p>
            <p className="mt-1">© 2026 Dewy</p>
          </div>
        </div>
      </main>

      <BottomNav activeTab="/mypage" onTabChange={(href) => navigate(href)} />
    </div>
  );
};

export default Settings;
