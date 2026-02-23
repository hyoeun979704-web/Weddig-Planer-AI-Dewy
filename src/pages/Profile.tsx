import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, User, Mail, Phone, Calendar, Save, Loader2, MapPin, CakeSlice } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const birthYearOptions = Array.from({ length: 61 }, (_, i) => 1960 + i); // 1960~2020
const regionOptions = [
  "서울", "경기", "인천", "부산", "대구", "대전", "광주", "울산", "세종",
  "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"
];

const Profile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [displayName, setDisplayName] = useState("");
  const [birthYear, setBirthYear] = useState("1997");
  const [phone, setPhone] = useState("");
  const [weddingRegion, setWeddingRegion] = useState("서울");
  const [weddingDate, setWeddingDate] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load profile data
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        // Load profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, avatar_url, birth_year")
          .eq("user_id", user.id)
          .maybeSingle();

        // Load wedding settings
        const { data: settings } = await supabase
          .from("user_wedding_settings")
          .select("wedding_date, partner_name, wedding_region")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profile) {
          setDisplayName(profile.display_name || user?.user_metadata?.full_name || user?.user_metadata?.name || "");
          setBirthYear(profile.birth_year ? String(profile.birth_year) : "1997");
        } else {
          setDisplayName(user?.user_metadata?.full_name || user?.user_metadata?.name || "");
        }

        if (settings) {
          setWeddingDate(settings.wedding_date || "");
          setWeddingRegion((settings as any).wedding_region || "서울");
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  const getUserAvatar = () => {
    return user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;
  };

  const getUserInitial = () => {
    const name = displayName || user?.email?.charAt(0) || "U";
    return name.charAt(0).toUpperCase();
  };

  const handleSave = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ 
          display_name: displayName,
          birth_year: birthYear ? parseInt(birthYear) : null
        } as any)
        .eq("user_id", user.id);

      if (profileError) throw profileError;

      // Update or insert wedding settings
      if (weddingDate || weddingRegion) {
        const { data: existing } = await supabase
          .from("user_wedding_settings")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("user_wedding_settings")
            .update({ wedding_date: weddingDate || null, wedding_region: weddingRegion || null } as any)
            .eq("user_id", user.id);
        } else {
          await supabase
            .from("user_wedding_settings")
            .insert({ user_id: user.id, wedding_date: weddingDate || null, wedding_region: weddingRegion || null } as any);
        }
      }

      toast.success("프로필이 저장되었습니다");
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("저장에 실패했습니다");
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
          <div className="flex items-center h-14 px-4">
            <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center -ml-2">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="flex-1 text-center font-semibold text-lg pr-10">내 정보</h1>
          </div>
        </header>
        <main className="flex flex-col items-center justify-center py-20">
          <User className="w-16 h-16 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground mb-4">로그인이 필요합니다</p>
          <Button onClick={() => navigate("/auth")}>로그인하기</Button>
        </main>
        <BottomNav activeTab="/mypage" onTabChange={(href) => navigate(href)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center h-14 px-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-center font-semibold text-lg pr-10">내 정보</h1>
        </div>
      </header>

      <main className="pb-20">
        {/* Avatar Section */}
        <div className="flex flex-col items-center py-8 bg-gradient-to-br from-primary/10 to-background">
          <div className="relative">
            <Avatar className="w-24 h-24 border-4 border-background shadow-lg">
              <AvatarImage src={getUserAvatar() || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                {getUserInitial()}
              </AvatarFallback>
            </Avatar>
            <button className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg">
              <Camera className="w-4 h-4" />
            </button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">{user.email}</p>
        </div>

        {/* Form */}
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              이름
            </Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="이름을 입력하세요"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CakeSlice className="w-4 h-4" />
              출생년도
            </Label>
            <Select value={birthYear} onValueChange={setBirthYear}>
              <SelectTrigger>
                <SelectValue placeholder="출생년도 선택" />
              </SelectTrigger>
              <SelectContent className="bg-background border border-border z-50 max-h-60">
                {birthYearOptions.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}년
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              이메일
            </Label>
            <Input
              id="email"
              value={user.email || ""}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              연락처
            </Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-0000-0000"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              결혼 지역
            </Label>
            <Select value={weddingRegion} onValueChange={setWeddingRegion}>
              <SelectTrigger>
                <SelectValue placeholder="지역 선택" />
              </SelectTrigger>
              <SelectContent className="bg-background border border-border z-50 max-h-60">
                {regionOptions.map((region) => (
                  <SelectItem key={region} value={region}>
                    {region}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="weddingDate" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              결혼 예정일
            </Label>
            <Input
              id="weddingDate"
              type="date"
              value={weddingDate}
              onChange={(e) => setWeddingDate(e.target.value)}
            />
          </div>

          <Button onClick={handleSave} className="w-full mt-6" size="lg" disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            저장하기
          </Button>
        </div>
      </main>

      <BottomNav activeTab="/mypage" onTabChange={(href) => navigate(href)} />
    </div>
  );
};

export default Profile;
