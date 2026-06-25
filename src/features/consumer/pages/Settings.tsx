import { useNavigate } from "react-router-dom";
import Seo from "@/components/Seo";
import {
  ChevronRight,
  Moon,
  Globe,
  Shield,
  FileText,
  Info,
  LogOut,
  Trash2,
  Megaphone
} from "lucide-react";
import { useState } from "react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { APP_VERSION } from "@/lib/appVersion";
import { toast } from "sonner";
import { confirm } from "@/components/ui/confirm-dialog";
import { useTheme } from "next-themes";
import { useDataUsageConsent } from "@/hooks/useDataUsageConsent";
import CalendarSyncCard from "@/components/settings/CalendarSyncCard";

const Settings = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [deleting, setDeleting] = useState(false);
  const { state: dataUsageConsent, saving: consentSaving, set: setDataUsageConsent } =
    useDataUsageConsent();

  const handleDataUsageToggle = async (checked: boolean) => {
    try {
      await setDataUsageConsent(checked);
      toast.success(checked ? "데이터 활용에 동의했어요" : "동의를 철회했어요");
    } catch {
      toast.error("처리에 실패했어요. 잠시 후 다시 시도해주세요");
    }
  };

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
    const ok = await confirm({
      title: "정말 계정을 삭제할까요?",
      description: "계정과 모든 데이터(예산·일정·찜·작성글·결제내역 등)가 영구 삭제되며 복구할 수 없어요.",
      confirmText: "삭제",
      destructive: true,
    });
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
    <div className="min-h-screen bg-background app-col mx-auto relative">
      <Seo title="설정 | Dewy" description="알림·테마·계정 설정을 관리하세요." path="/settings" noIndex />
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
            {/* 단일 언어 — 동작이 없으므로 클릭 어포던스(chevron) 없이 정보만 표시 */}
            <div className="w-full flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm font-medium">언어</span>
              </div>
              <span className="text-sm text-muted-foreground">한국어</span>
            </div>
          </div>
        </div>

        {/* 캘린더 연동 (로그인 사용자) — Google·Kakao 각각 양방향 */}
        {user && (
          <div className="p-4">
            <h2 className="text-xs font-medium text-muted-foreground mb-2 px-1">캘린더 연동</h2>
            <div className="space-y-2">
              <CalendarSyncCard provider="google" />
              <CalendarSyncCard provider="kakao" />
            </div>
          </div>
        )}

        {/* 동의 설정 (선택) */}
        {user && (
          <div className="p-4">
            <h2 className="text-xs font-medium text-muted-foreground mb-2 px-1">동의 설정</h2>
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="flex items-center justify-between gap-3 p-4">
                <div className="flex items-start gap-3">
                  <Megaphone className="w-5 h-5 mt-0.5 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">마케팅·서비스 개선 활용 (선택)</p>
                    <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                      이벤트·혜택 안내와 서비스·AI 추천 품질 개선에 내 정보를 활용하는 데 동의해요.
                      동의하지 않아도 서비스 이용에는 제한이 없어요.
                    </p>
                  </div>
                </div>
                <Switch
                  checked={dataUsageConsent === true}
                  disabled={dataUsageConsent === undefined || consentSaving}
                  onCheckedChange={handleDataUsageToggle}
                />
              </div>
            </div>
          </div>
        )}

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
              onClick={() => navigate("/oss-licenses")}
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
            <p>앱 버전 {APP_VERSION}</p>
            <p className="mt-1">© 2026 Dewy</p>
          </div>
        </div>
      </main>

      <BottomNav activeTab="/mypage" onTabChange={(href) => navigate(href)} />
    </div>
  );
};

export default Settings;
