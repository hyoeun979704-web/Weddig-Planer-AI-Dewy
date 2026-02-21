import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft, ExternalLink, Users, Play, Image, FileText, Eye, Heart, Loader2 } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useInfluencerDetail, useCategoryLabels } from "@/hooks/useInfluencers";
import { Button } from "@/components/ui/button";

const platformNames: Record<string, string> = {
  instagram: "Instagram",
  youtube: "YouTube",
  blog: "블로그",
};

const contentTypeIcons: Record<string, React.ElementType> = {
  post: Image,
  reel: Play,
  video: Play,
  blog: FileText,
};

const formatCount = (n: number): string => {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}천`;
  return n.toString();
};

const InfluencerDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const categoryLabels = useCategoryLabels();
  const { influencer, contents, isLoading } = useInfluencerDetail(id);

  const handleTabChange = (href: string) => navigate(href);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background max-w-[430px] mx-auto flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!influencer) {
    return (
      <div className="min-h-screen bg-background max-w-[430px] mx-auto flex items-center justify-center">
        <p className="text-muted-foreground">인플루언서를 찾을 수 없습니다</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3 px-4 h-14">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground truncate">{influencer.name}</h1>
        </div>
      </header>

      <main className="pb-20">
        {/* Profile Section */}
        <div className="relative">
          {/* Cover */}
          <div className="h-32 bg-gradient-to-br from-primary/20 via-accent to-primary/10" />

          {/* Profile Info */}
          <div className="px-4 -mt-10">
            <div className="flex items-end gap-4 mb-4">
              {influencer.profile_image_url ? (
                <img
                  src={influencer.profile_image_url}
                  alt={influencer.name}
                  className="w-20 h-20 rounded-full object-cover border-4 border-background"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-primary/20 border-4 border-background flex items-center justify-center text-2xl font-bold text-primary">
                  {influencer.name[0]}
                </div>
              )}
              <div className="pb-1 flex-1">
                <h2 className="font-bold text-foreground text-lg">{influencer.name}</h2>
                <p className="text-sm text-muted-foreground">{influencer.handle}</p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">{formatCount(influencer.follower_count)}</span>
                <span className="text-xs text-muted-foreground">팔로워</span>
              </div>
              <span className="px-2 py-0.5 bg-muted rounded-full text-xs text-muted-foreground">
                {platformNames[influencer.platform] || influencer.platform}
              </span>
              <span className="px-2 py-0.5 bg-primary/10 rounded-full text-xs text-primary font-medium">
                {categoryLabels[influencer.category] || influencer.category}
              </span>
            </div>

            {/* Bio */}
            {influencer.bio && (
              <p className="text-sm text-foreground leading-relaxed mb-4">{influencer.bio}</p>
            )}

            {/* Tags */}
            {influencer.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {influencer.tags.map((tag) => (
                  <span key={tag} className="px-2 py-1 bg-muted rounded-full text-xs text-muted-foreground">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* External Link */}
            {influencer.external_url && (
              <a
                href={influencer.external_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block mb-4"
              >
                <Button variant="outline" className="w-full">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {platformNames[influencer.platform] || "프로필"} 방문하기
                </Button>
              </a>
            )}
          </div>
        </div>

        {/* Contents Section */}
        <div className="px-4 mt-2">
          <div className="border-t border-border pt-4">
            <h3 className="font-bold text-foreground mb-3">콘텐츠</h3>

            {contents.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">아직 등록된 콘텐츠가 없습니다</p>
              </div>
            ) : (
              <div className="space-y-3">
                {contents.map((content) => {
                  const TypeIcon = contentTypeIcons[content.content_type] || FileText;
                  return (
                    <div
                      key={content.id}
                      className="flex gap-3 p-3 bg-card rounded-xl border border-border"
                      onClick={() => content.content_url && window.open(content.content_url, "_blank")}
                    >
                      {content.thumbnail_url ? (
                        <img
                          src={content.thumbnail_url}
                          alt={content.title}
                          className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <TypeIcon className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground text-sm mb-1 line-clamp-2">{content.title}</h4>
                        {content.description && (
                          <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{content.description}</p>
                        )}
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Eye className="w-3 h-3" /> {formatCount(content.view_count)}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Heart className="w-3 h-3" /> {formatCount(content.like_count)}
                          </span>
                          <span className="px-1.5 py-0.5 bg-muted rounded text-[10px] text-muted-foreground uppercase">
                            {content.content_type}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      <BottomNav activeTab={location.pathname} onTabChange={handleTabChange} />
    </div>
  );
};

export default InfluencerDetail;
