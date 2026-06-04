import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, MessageSquare, Tag, Calendar, Heart } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  NOTIFICATION_PREF_DEFAULTS,
  persistDevicePrefs,
  readDevicePrefs,
  type NotificationToggleId,
} from "@/lib/notifications/prefs";
import { isNativeApp } from "@/lib/platform";

const notificationSettings: Array<{
  id: NotificationToggleId;
  icon: typeof Bell;
  title: string;
  description: string;
}> = [
  { id: "push", icon: Bell, title: "푸시 알림", description: "앱 푸시 알림 받기" },
  { id: "marketing", icon: Tag, title: "마케팅 알림", description: "할인 및 이벤트 정보" },
  { id: "chat", icon: MessageSquare, title: "채팅 알림", description: "1:1 문의 답변 알림" },
  { id: "schedule", icon: Calendar, title: "일정 알림", description: "웨딩 일정 리마인더" },
  { id: "favorite", icon: Heart, title: "찜 알림", description: "찜한 업체 소식" },
];

// 기기 단위 알림 토글은 localStorage(prefs.ts)에 보관.
// 마케팅 토글은 PIPA 동의 이력(user_consents.marketing_v1)과 동기화한다.
// 로그인 사용자는 서버 푸시 발송 시 토글을 존중하도록 user_notification_prefs 에도 미러링.
const MARKETING_CONSENT_TYPE = "marketing_v1";

const Notifications = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [settings, setSettings] = useState<Record<string, boolean>>(() =>
    readDevicePrefs(),
  );

  // 로그인 사용자는 마케팅 동의의 현재 상태를 user_consents 최신 row 에서 동기화.
  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      // Round 10 — canonical view 로 reads 통일. backfill 행 자동 제외.
      const { data } = await (supabase as any)
        .from("user_consents_canonical")
        .select("agreed")
        .eq("user_id", user.id)
        .eq("consent_type", MARKETING_CONSENT_TYPE)
        .order("agreed_at", { ascending: false })
        .limit(1);
      if (active && data && data.length > 0) {
        setSettings((prev) => ({ ...prev, marketing: !!data[0].agreed }));
      }
    })();
    return () => {
      active = false;
    };
  }, [user]);

  // 서버 푸시가 토글을 존중하도록 카테고리 토글을 user_notification_prefs 에 upsert.
  // 테이블 미배포 단계에서는 조용히 무시(푸시 미활성).
  const syncServerPrefs = async (next: Record<string, boolean>) => {
    if (!user) return;
    try {
      await (supabase as any).from("user_notification_prefs").upsert(
        {
          user_id: user.id,
          push: next.push,
          marketing: next.marketing,
          chat: next.chat,
          schedule: next.schedule,
          favorite: next.favorite,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    } catch {
      // 테이블 미배포/오프라인 — 무시.
    }
  };

  const toggleSetting = async (id: NotificationToggleId) => {
    const nextValue = !settings[id];
    const next = { ...settings, [id]: nextValue };
    setSettings(next);
    persistDevicePrefs(next);
    void syncServerPrefs(next);

    // 마스터 푸시를 켜면 즉시 OS 권한 요청 + 토큰 등록(네이티브).
    if (id === "push" && nextValue && isNativeApp()) {
      const { initPushNotifications } = await import(
        "@/lib/native/pushNotifications"
      );
      void initPushNotifications();
    }

    if (id === "marketing") {
      if (!user) {
        toast.info("로그인 후 마케팅 수신 동의를 저장할 수 있어요");
        return;
      }
      // PIPA — 동의·철회 모두 새 row 로 기록(이력 보존).
      const { error } = await (supabase as any).from("user_consents").insert({
        user_id: user.id,
        consent_type: MARKETING_CONSENT_TYPE,
        agreed: nextValue,
        user_agent:
          typeof navigator !== "undefined"
            ? navigator.userAgent?.slice(0, 500)
            : null,
      });
      if (error) {
        // 실패 시 토글 롤백
        const reverted = { ...next, marketing: !nextValue };
        setSettings(reverted);
        persistDevicePrefs(reverted);
        void syncServerPrefs(reverted);
        toast.error("마케팅 수신 설정을 저장하지 못했어요");
        return;
      }
      toast.success(
        nextValue ? "마케팅 수신에 동의했어요" : "마케팅 수신을 해제했어요",
      );
    }
  };

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      <PageHeader title="알림 설정" />

      <main className="pb-20">
        <div className="p-4">
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            {notificationSettings.map((item, index) => (
              <div
                key={item.id}
                className={`flex items-center gap-4 p-4 ${
                  index < notificationSettings.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-foreground text-sm">{item.title}</h4>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
                <Switch
                  checked={settings[item.id] ?? NOTIFICATION_PREF_DEFAULTS[item.id]}
                  onCheckedChange={() => toggleSetting(item.id)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="px-4 py-2">
          <p className="text-xs text-muted-foreground text-center">
            마케팅 수신 동의는 계정에 저장되며, 나머지 알림 설정은 이 기기에 저장됩니다.
            푸시 알림은 기기의 알림 권한에 따라 다르게 적용될 수 있습니다.
          </p>
        </div>
      </main>

      <BottomNav activeTab="/mypage" onTabChange={(href) => navigate(href)} />
    </div>
  );
};

export default Notifications;
