import { useNavigate, useLocation } from "react-router-dom";
import { 
  MessageSquare, 
  Heart,
  Eye,
  Search,
  PenSquare,
  Image,
  TrendingUp,
  Clock
} from "lucide-react";
import BottomNav from "@/components/BottomNav";

interface Post {
  id: string;
  category: string;
  title: string;
  preview: string;
  author: string;
  date: string;
  likes: number;
  comments: number;
  views: number;
  hasImage: boolean;
}

const categories = ["전체", "웨딩홀", "스드메", "혼수", "허니문", "자유"];

const posts: Post[] = [
  {
    id: "1",
    category: "웨딩홀",
    title: "강남 웨딩홀 투어 후기 공유해요!",
    preview: "지난 주말에 강남 쪽 웨딩홀 5군데 투어 다녀왔어요. 각 웨딩홀 장단점 정리해서 공유드립니다...",
    author: "예비신부",
    date: "2시간 전",
    likes: 42,
    comments: 15,
    views: 230,
    hasImage: true
  },
  {
    id: "2",
    category: "스드메",
    title: "스드메 패키지 vs 개별계약 고민중이에요",
    preview: "예산이 한정되어있는데 스드메 패키지로 할지 개별로 할지 너무 고민되네요. 경험자분들 조언 부탁드려요!",
    author: "2025신부",
    date: "5시간 전",
    likes: 28,
    comments: 32,
    views: 456,
    hasImage: false
  },
  {
    id: "3",
    category: "혼수",
    title: "가전 혼수 브랜드별 비교 정리",
    preview: "삼성, LG, 다이슨 등 가전 브랜드별로 가격대, AS, 품질 비교해서 정리했어요. 참고하세요!",
    author: "알뜰신부",
    date: "1일 전",
    likes: 89,
    comments: 41,
    views: 1203,
    hasImage: true
  },
  {
    id: "4",
    category: "허니문",
    title: "몰디브 허니문 일정 & 비용 공개",
    preview: "6박 8일 몰디브 다녀왔어요! 리조트 선택부터 액티비티까지 상세 후기 남깁니다.",
    author: "신혼여행중",
    date: "2일 전",
    likes: 156,
    comments: 67,
    views: 2341,
    hasImage: true
  },
  {
    id: "5",
    category: "자유",
    title: "결혼 준비하면서 싸우는 커플들 많죠?",
    preview: "다들 결혼 준비하면서 싸움 많이 하시나요? 저희도 사소한 거에 자꾸 다투게 되네요...",
    author: "예비부부",
    date: "3일 전",
    likes: 203,
    comments: 89,
    views: 3421,
    hasImage: false
  }
];

const Community = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleTabChange = (href: string) => {
    navigate(href);
  };

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <h1 className="text-lg font-bold text-foreground">커뮤니티</h1>
          <div className="flex items-center gap-2">
            <button className="p-2">
              <Search className="w-5 h-5 text-muted-foreground" />
            </button>
            <button className="p-2">
              <PenSquare className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>
        
        {/* Category Tabs */}
        <div className="flex overflow-x-auto scrollbar-hide px-4 pb-3 gap-2">
          {categories.map((category, index) => (
            <button
              key={category}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                index === 0 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20">
        {/* Trending Section */}
        <div className="px-4 py-4 bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-foreground">인기 게시글</span>
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {posts.slice(0, 3).map((post, index) => (
              <div 
                key={post.id}
                className="flex-shrink-0 w-[200px] p-3 bg-card rounded-xl border border-border"
              >
                <span className="text-xs text-primary font-medium">#{index + 1}</span>
                <p className="text-sm font-medium text-foreground line-clamp-2 mt-1">{post.title}</p>
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Heart className="w-3 h-3" /> {post.likes}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" /> {post.comments}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Post List */}
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">최신 글</span>
            </div>
          </div>
          
          <div className="space-y-3">
            {posts.map((post) => (
              <button
                key={post.id}
                className="w-full p-4 bg-card rounded-2xl border border-border hover:border-primary/30 transition-colors text-left"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-muted rounded text-[10px] font-medium text-muted-foreground">
                        {post.category}
                      </span>
                      <span className="text-xs text-muted-foreground">{post.date}</span>
                    </div>
                    <h4 className="font-semibold text-foreground text-sm mb-1 line-clamp-1">{post.title}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{post.preview}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{post.author}</span>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3" /> {post.likes}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" /> {post.comments}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" /> {post.views}
                        </span>
                      </div>
                    </div>
                  </div>
                  {post.hasImage && (
                    <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                      <Image className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* Floating Write Button */}
      <button className="fixed bottom-24 right-4 w-14 h-14 bg-primary rounded-full shadow-lg flex items-center justify-center z-40">
        <PenSquare className="w-6 h-6 text-primary-foreground" />
      </button>

      {/* Bottom Navigation */}
      <BottomNav activeTab={location.pathname} onTabChange={handleTabChange} />
    </div>
  );
};

export default Community;
