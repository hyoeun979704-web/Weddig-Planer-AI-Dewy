import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Seo from "@/components/Seo";
import { Camera, User, Mail, Phone, Calendar, Save, Loader2, MapPin, CakeSlice, MessageCircle, Lock } from "lucide-react";
import { genNickname } from "@/lib/communityIdentity";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchProfile,
  fetchWeddingSettings,
  uploadAvatar,
  updateAvatarUrl,
  updateProfile,
  upsertWeddingSettings,
  syncBudgetRegion,
  sendReauthCode,
  updatePassword,
} from "@/features/consumer/data/account";
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
  const [newPassword, setNewPassword] = useState("");
  const [changingPw, setChangingPw] = useState(false);
  // 비밀번호 변경 본인확인(이메일 OTP) — Supabase Secure password change(reauthentication) 사용.
  // updateUser({password}) 는 reauthenticate() 로 받은 nonce(이메일 코드)를 요구한다.
  const [reauthSent, setReauthSent] = useState(false);
  const [reauthCode, setReauthCode] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
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
        const profile = await fetchProfile(user.id);

        // Load wedding settings
        const settings = await fetchWeddingSettings(user.id);

        if (profile) {
          setDisplayName(profile.display_name || user?.user_metadata?.full_name || user?.user_metadata?.name || "");
          setAvatarUrl(profile.avatar_url ?? null);
          setBirthYear(profile.birth_year ? String(profile.birth_year) : "1997");
          setPhone(profile.phone || "");
          setCommunityNickname(profile.community_nickname || "");
        } else {
          setDisplayName(user?.user_metadata?.full_name || user?.user_metadata?.name || "");
        }

        if (settings) {
          setWeddingDate(settings.wedding_date || "");
          setWeddingRegion(settings.wedding_region || "서울");
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
      const url = await uploadAvatar(user.id, file);
      await updateAvatarUrl(user.id, url);
      setAvatarUrl(url);
      toast.success("프로필 사진을 변경했어요");
    } catch (err) {
      toast.error("사진 변경에 실패했어요", { description: err instanceof Error ? err.message : undefined });
    } finally {
      setUploadingAvatar(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // 비밀번호 변경 1단계 — 본인확인 코드 발송(이메일 OTP). Supabase reauthenticate() 가
  // reauthentication.html 템플릿으로 6자리 코드를 메일 발송한다. 새 비번 유효성 먼저 검증.
  const handleSendReauthCode = async () => {
    if (newPassword.length < 8) { toast.error("새 비밀번호는 8자 이상이어야 해요"); return; }
    setSendingCode(true);
    try {
      const { error } = await sendReauthCode();
      if (error) { toast.error("인증 코드 발송 실패", { description: error.message }); return; }
      setReauthSent(true);
      toast.success("가입 이메일로 인증 코드를 보냈어요");
    } finally {
      setSendingCode(false);
    }
  };

  // 비밀번호 변경 2단계 — 이메일 코드(nonce)로 새 비밀번호 적용. 이메일 가입자만.
  const handlePasswordChange = async () => {
    if (!user?.email) return;
    if (newPassword.length < 8) { toast.error("새 비밀번호는 8자 이상이어야 해요"); return; }
    if (!reauthCode.trim()) { toast.error("이메일로 받은 인증 코드를 입력해주세요"); return; }
    setChangingPw(true);
    try {
      // 이메일 코드(nonce) 로 재인증 + 새 비밀번호 적용.
      const { error } = await updatePassword(newPassword, reauthCode.trim());
      if (error) {
        const msg = /nonce|reauth|token|expired|invalid/i.test(error.message)
          ? "인증 코드가 올바르지 않거나 만료됐어요. 코드를 다시 받아주세요."
          : error.message;
        toast.error("비밀번호 변경 실패", { description: msg });
        return;
      }
      setNewPassword("");
      setReauthCode("");
      setReauthSent(false);
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
      await updateProfile(user.id, {
        display_name: displayName,
        community_nickname: communityNickname.trim() || null,
        birth_year: birthYear ? parseInt(birthYear) : null,
        phone: phone.trim() || null,
      });

      // Update or insert wedding settings
      if (weddingDate || weddingRegion) {
        await upsertWeddingSettings(user.id, {
          wedding_date: weddingDate || null,
          wedding_region: weddingRegion || null,
        });
      }

      // Sync region to budget_settings
      if (weddingRegion) {
        const budgetRegionKey = Object.entries(regions).find(([_, r]) => r.label === weddingRegion)?.[0];
        if (budgetRegionKey) {
          await syncBudgetRegion(user.id, budgetRegionKey);
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

          {/* 비밀번호 변경 — 이메일 가입자만(소셜 로그인은 제공자에서 관리).
              보안상 가입 이메일로 받은 인증 코드(본인확인)로 변경한다. */}
          {isEmailUser && (
            <div className="mt-8 pt-6 border-t border-border space-y-2">
              <Label className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                비밀번호 변경
              </Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="새 비밀번호 (8자 이상)"
                autoComplete="new-password"
              />
              {!reauthSent ? (
                <Button
                  onClick={handleSendReauthCode}
                  variant="outline"
                  className="w-full"
                  disabled={sendingCode || newPassword.length < 8}
                >
                  {sendingCode ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  본인 확인 코드 받기
                </Button>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">
                    {user?.email} 로 보낸 인증 코드를 입력해주세요.
                  </p>
                  <Input
                    id="reauthCode"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={reauthCode}
                    onChange={(e) => setReauthCode(e.target.value)}
                    placeholder="인증 코드 6자리"
                  />
                  <Button
                    onClick={handlePasswordChange}
                    variant="outline"
                    className="w-full"
                    disabled={changingPw || !reauthCode.trim() || newPassword.length < 8}
                  >
                    {changingPw ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    비밀번호 변경
                  </Button>
                  <button
                    type="button"
                    onClick={handleSendReauthCode}
                    disabled={sendingCode}
                    className="w-full text-xs text-muted-foreground underline disabled:opacity-50"
                  >
                    코드 다시 받기
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </main>

      <BottomNav activeTab="/mypage" onTabChange={(href) => navigate(href)} />
    </div>
  );
};

export default Profile;
