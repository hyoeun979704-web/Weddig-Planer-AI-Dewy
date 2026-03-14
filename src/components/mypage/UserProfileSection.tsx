import { useNavigate } from "react-router-dom";
import { User, LogIn, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User as SupaUser } from "@supabase/supabase-js";

interface UserProfileSectionProps {
  user: SupaUser | null;
  isLoading: boolean;
}

const UserProfileSection = ({ user, isLoading }: UserProfileSectionProps) => {
  const navigate = useNavigate();

  const getUserDisplayName = () => {
    if (user?.user_metadata?.full_name) return user.user_metadata.full_name;
    if (user?.user_metadata?.name) return user.user_metadata.name;
    if (user?.email) return user.email.split("@")[0];
    return "사용자";
  };

  const getUserAvatar = () =>
    user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;

  const getUserInitial = () => getUserDisplayName().charAt(0).toUpperCase();

  if (isLoading) {
    return (
      <div className="px-4 py-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <button
        onClick={() => navigate("/auth")}
        className="mx-4 mt-4 p-5 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent rounded-2xl border border-primary/20 flex items-center gap-4 active:scale-[0.98] transition-transform w-[calc(100%-2rem)]"
      >
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="w-7 h-7 text-primary" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-base font-bold text-foreground">로그인해주세요</p>
          <p className="text-xs text-muted-foreground mt-0.5">맞춤 웨딩 준비를 시작해보세요</p>
        </div>
        <div className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold">
          <LogIn className="w-4 h-4" />
          로그인
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={() => navigate("/profile")}
      className="mx-4 mt-4 p-5 bg-gradient-to-br from-primary/10 via-accent/50 to-transparent rounded-2xl border border-border flex items-center gap-4 active:scale-[0.98] transition-transform w-[calc(100%-2rem)]"
    >
      <Avatar className="w-14 h-14 border-2 border-primary/20 shadow-sm">
        <AvatarImage src={getUserAvatar() || undefined} alt={getUserDisplayName()} />
        <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
          {getUserInitial()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 text-left min-w-0">
        <p className="text-base font-bold text-foreground truncate">{getUserDisplayName()}</p>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
    </button>
  );
};

export default UserProfileSection;
