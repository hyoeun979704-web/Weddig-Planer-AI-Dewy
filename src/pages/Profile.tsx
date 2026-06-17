import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Seo from "@/components/Seo";
import { Camera, User, Mail, Phone, Calendar, Save, Loader2, MapPin, CakeSlice, MessageCircle, Lock } from "lucide-react";
import { genNickname } from "@/lib/communityIdentity";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { regions } from "@/data/budgetData";
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
  const [communityNickname, setCommunityNickname] = useState("");
  const [birthYear, setBirthYear] = useState("1997");
  const [phone, setPhone] = useState("");
  const [weddingRegion, setWeddingRegion] = useState("서울");
  const [weddingDate, setWeddingDate] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changingPw, setChangingPw] = useState(false);
  // 이메일 가입자만 비밀번호 변경 노출(OAuth/소셜은 제공자 관리).
  const isEmailUser = user?.app_metadata?.provider === "email" || (user?.identities ?? []).some((i: any) => i.provider === "email");

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
          .select("display_name, avatar_url, birth_year, phone, community_nickname")
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
          setAvatarUrl((profile as any).avatar_url ?? null);
          setBirthYear(profile.birth_year ? String(profile.birth_year) : "1997");
          setPhone((profile as any).phone || "");
          setCommunityNickname((profile as any).community_nickname || "");
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
    return avatarUrl || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;
  };

  // 프로필 사진 업로드 — vendor-images(public) 의 본인 폴더에 저장 후 profiles.avatar_url 갱신.
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) { toast.error("이미지 파일만 올릴 수 있어요"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("5MB 이하 이미지를 올려주세요"); return; }
    setUploadingAvatar(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("vendor-images").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const url = supabase.storage.from("vendor-images").getPublicUrl(path).data.publicUrl;
      const { error: dbErr } = await supabase.from("profiles").update({ avatar_url: url } as any).eq("user_id", user.id);
      if (dbErr) throw dbErr;
      setAvatarUrl(url);
      toast.success("프로필 사진을 변경했어요");
    } catch (err) {
      toast.error("사진 변경에 실패했어요", { description: err instanceof Error ? err.message : undefined });
    } finally {
      setUploadingAvatar(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // 비밀번호 변경 — 현재 비밀번호로 재인증(보안) 후 새 비밀번호 적용. 이메일 가입자만.
  const handlePasswordChange = async () => {
    if (!user?.email) return;
    if (!currentPassword) { toast.error("현재 비밀번호를 입력해주세요"); return; }
    if (newPassword.length < 8) { toast.error("새 비밀번호는 8자 이상이어야 해요"); return; }
    if (newPassword === currentPassword) { toast.error("새 비밀번호가 기존과 같아요"); return; }
    setChangingPw(true);
    try {
      // 1) 현재 비밀번호 검증(재인증) — 틀리면 변경 차단.
      const { error: reauthErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (reauthErr) { toast.error("현재 비밀번호가 올바르지 않아요"); return; }
      // 2) 새 비밀번호 적용.
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) { toast.error("비밀번호 변경 실패", { description: error.message }); return; }
      setCurrentPassword("");
      setNewPassword("");
      toast.success("비밀번호를 변경했어요");
    } finally {
      setChangingPw(false);
    }
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
          community_nickname: communityNickname.trim() || null,
          birth_year: birthYear ? parseInt(birthYear) : null,
          phone: phone.trim() || null
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

      // Sync region to budget_settings
      if (weddingRegion) {
        const budgetRegionKey = Object.entries(regions).find(([_, r]) => r.label === weddingRegion)?.[0];
        if (budgetRegionKey) {
          const { data: budgetSettings } = await (supabase as any)
            .from("budget_settings")
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle();

          if (budgetSettings) {
            await (supabase as any)
              .from("budget_settings")
              .update({ region: budgetRegionKey })
              .eq("id", budgetSettings.id);
          }
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
      <div className="min-h-screen bg-background app-col mx-auto relative">
        <PageHeader title="내 정보" />
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
    <div className="min-h-screen bg-background app-col mx-auto relative">
      <Seo title="내 정보 | Dewy" description="프로필 정보를 관리하세요." path="/profile" noIndex />
      <PageHeader title="내 정보" />

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
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploadingAvatar}
              aria-label="프로필 사진 변경"
              className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg disabled:opacity-60"
            >
              {uploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
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
            <Label htmlFor="communityNickname" className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              커뮤니티 닉네임
            </Label>
            <Input
              id="communityNickname"
              value={communityNickname}
              onChange={(e) => setCommunityNickname(e.target.value)}
              maxLength={20}
              placeholder={user ? genNickname(user.id) : "닉네임"}
            />
            <p className="text-xs text-muted-foreground">
              커뮤니티 글·댓글에 표시돼요. 비우면 “{user ? genNickname(user.id) : "자동 닉네임"}”으로 자동 표시됩니다. (실명·예식일은 공개되지 않아요)
            </p>
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

          {/* 비밀번호 변경 — 이메일 가입자만(소셜 로그인은 제공자에서 관리) */}
          {isEmailUser && (
            <div className="mt-8 pt-6 border-t border-border space-y-2">
              <Label className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                비밀번호 변경
              </Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="현재 비밀번호"
                autoComplete="current-password"
              />
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="새 비밀번호 (8자 이상)"
                autoComplete="new-password"
              />
              <Button
                onClick={handlePasswordChange}
                variant="outline"
                className="w-full"
                disabled={changingPw || !currentPassword || newPassword.length < 8}
              >
                {changingPw ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                비밀번호 변경
              </Button>
            </div>
          )}
        </div>
      </main>

      <BottomNav activeTab="/mypage" onTabChange={(href) => navigate(href)} />
    </div>
  );
};

export default Profile;
