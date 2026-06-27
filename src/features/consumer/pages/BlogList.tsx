import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, FileText } from "lucide-react";
import Seo from "@/components/Seo";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { fetchPublishedBlogList } from "@/features/consumer/data/blog";

// 자체 블로그 목록 — dewy-wedding.com/blog. 개별 글 SSR 은 api/blog.ts.
const BlogList = () => {
  const navigate = useNavigate();
  const { data: posts, isLoading } = useQuery({
    queryKey: ["public-blog-list"],
    queryFn: () => fetchPublishedBlogList(50),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="min-h-screen bg-background app-col mx-auto relative">
      <Seo
        title="Dewy 웨딩 블로그 — 결혼 준비 가이드"
        description="스드메·웨딩홀·예산·청첩장까지, 예비부부를 위한 결혼 준비 정보를 Dewy가 정리했습니다."
        path="/blog"
      />
      <PageHeader title="블로그" />

      <main className="pb-24 px-4 py-5">
        {isLoading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : !posts || posts.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
            아직 발행된 글이 없어요.
          </div>
        ) : (
          <ul className="space-y-3">
            {posts.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => navigate(`/blog/${encodeURIComponent(p.slug ?? "")}`)}
                  disabled={!p.slug}
                  className="w-full text-left flex gap-3 rounded-2xl border border-border bg-card p-3 hover:bg-muted/40 transition-colors disabled:opacity-60"
                >
                  <div className="w-20 h-20 rounded-xl bg-muted shrink-0 overflow-hidden flex items-center justify-center">
                    {p.featured_image_url ? (
                      <img src={p.featured_image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <FileText className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm font-semibold leading-snug line-clamp-2">{p.title}</h2>
                    {p.excerpt && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.excerpt}</p>
                    )}
                    {p.published_at && (
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {new Date(p.published_at).toLocaleDateString("ko-KR")}
                      </p>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>

      <BottomNav activeTab="/" onTabChange={(href) => navigate(href)} />
    </div>
  );
};

export default BlogList;
