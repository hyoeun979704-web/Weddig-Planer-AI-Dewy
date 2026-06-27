import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { Loader2, ChevronRight } from "lucide-react";
import Seo from "@/components/Seo";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { fetchPublishedBlogBySlug } from "@/features/consumer/data/blog";
import NotFound from "@/features/consumer/pages/NotFound";

// 자체 블로그 글 — /blog/<slug>. 크롤러/AI 용 본문은 api/blog.ts 가 같은 데이터로 SSR.
const BlogPost = () => {
  const { slug = "" } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: post, isLoading, isError } = useQuery({
    queryKey: ["public-blog", slug],
    queryFn: () => fetchPublishedBlogBySlug(slug),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background app-col mx-auto flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }
  if (isError || !post) return <NotFound />;

  return (
    <div className="min-h-screen bg-background app-col mx-auto relative">
      <Seo
        title={post.title}
        description={(post.excerpt ?? post.title).slice(0, 160)}
        path={`/blog/${encodeURIComponent(post.slug ?? slug)}`}
      />
      <PageHeader title="블로그" />

      <main className="pb-24">
        <article className="px-4 py-5 space-y-5">
          <nav aria-label="breadcrumb" className="flex items-center gap-1 text-xs text-muted-foreground">
            <button onClick={() => navigate("/")} className="hover:text-foreground">홈</button>
            <ChevronRight className="w-3 h-3" />
            <button onClick={() => navigate("/blog")} className="hover:text-foreground">블로그</button>
          </nav>

          <h1 className="text-xl font-bold leading-snug">{post.title}</h1>

          {post.excerpt && (
            <p className="text-[15px] leading-relaxed bg-muted rounded-2xl p-4">{post.excerpt}</p>
          )}

          {post.featured_image_url && (
            <img
              src={post.featured_image_url}
              alt={post.title}
              className="w-full rounded-2xl"
              loading="lazy"
            />
          )}

          <div className="prose prose-sm max-w-none text-[15px] leading-relaxed [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mt-6 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-6 [&_h3]:font-semibold [&_h3]:mt-4 [&_p]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-3 [&_li]:my-1 [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-primary [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_table]:w-full [&_table]:text-sm [&_th]:text-left [&_th]:font-semibold [&_td]:border-t [&_td]:border-border [&_td]:py-1">
            <ReactMarkdown>{post.content_markdown ?? ""}</ReactMarkdown>
          </div>

          {post.tags.length > 0 && (
            <p className="text-xs text-muted-foreground pt-2">
              {post.tags.map((t) => `#${t}`).join(" ")}
            </p>
          )}
          {post.published_at && (
            <p className="text-[11px] text-muted-foreground">
              발행: {new Date(post.published_at).toLocaleDateString("ko-KR")}
            </p>
          )}
        </article>
      </main>

      <BottomNav activeTab="/" onTabChange={(href) => navigate(href)} />
    </div>
  );
};

export default BlogPost;
