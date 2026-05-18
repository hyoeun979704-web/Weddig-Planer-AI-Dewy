import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, MessageSquare, Tag, Calendar, Heart } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { Switch } from "@/components/ui/switch";

const notificationSettings = [
  { id: "push", icon: Bell, title: "푸시 알림", description: "앱 푸시 알림 받기" },
  { id: "marketing", icon: Tag, title: "마케팅 알림", description: "할인 및 이벤트 정보" },
  { id: "chat", icon: MessageSquare, title: "채팅 알림", description: "1:1 문의 답변 알림" },
  { id: "schedule", icon: Calendar, title: "일정 알림", description: "웨딩 일정 리마인더" },
  { id: "favorite", icon: Heart, title: "찜 알림", description: "찜한 업체 소식" },
];

const Notifications = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<Record<string, boolean>>({
    push: true,
    marketing: false,
    chat: true,
    schedule: true,
    favorite: true,
  });

  const toggleSetting = (id: string) => {
    setSettings(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center h-14 px-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-center font-semibold text-lg pr-10">알림 설정</h1>
        </div>
      </header>

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
                  checked={settings[item.id]}
                  onCheckedChange={() => toggleSetting(item.id)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="px-4 py-2">
          <p className="text-xs text-muted-foreground text-center">
            알림 설정은 기기의 알림 권한에 따라 다르게 적용될 수 있습니다.
          </p>
        </div>
      </main>

      <BottomNav activeTab="/mypage" onTabChange={(href) => navigate(href)} />
    </div>
  );
};

export default Notifications;
