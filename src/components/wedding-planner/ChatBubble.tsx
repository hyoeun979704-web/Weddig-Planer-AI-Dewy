import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import type { Components } from "react-markdown";

type Message = {
  role: "user" | "assistant";
  content: string;
  intent?: string | null;
  /** 영속화된 메시지 행 id — 있어야 만족도 평가 가능 */
  id?: string | null;
  feedback?: "up" | "down" | null;
};

interface Props {
  msg: Message;
  /** 응답 만족도(👍/👎) 핸들러 — 영속화된 assistant 메시지에만 버튼 노출 */
  onFeedback?: (messageId: string, rating: "up" | "down") => void;
}

const ChatBubble = ({ msg, onFeedback }: Props) => {
  const navigate = useNavigate();

  // 챗봇 답변에는 [예산 페이지](/budget) 같은 앱 내부 링크가 자주 들어간다.
  // 기본 <a>는 전체 페이지를 새로고침해 SPA 상태가 날아가므로, 내부 링크는
  // React Router로 라우팅하고 외부 링크만 새 탭으로 연다.
  const markdownComponents: Components = {
    a: ({ href, children, ...props }) => {
      const isInternal = !!href && href.startsWith("/") && !href.startsWith("//");
      if (isInternal) {
        return (
          <a
            href={href}
            onClick={(e) => {
              e.preventDefault();
              navigate(href!);
            }}
            className="text-primary font-medium underline underline-offset-2"
            {...props}
          >
            {children}
          </a>
        );
      }
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary font-medium underline underline-offset-2"
          {...props}
        >
          {children}
        </a>
      );
    },
  };

  if (msg.role === "user") {
    return (
      <motion.div
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex justify-end"
      >
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap bg-primary/15 text-foreground">
          {msg.content}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex gap-3 items-start"
    >
      <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0 text-sm">
        
      </div>
      <div className="max-w-[85%] bg-card rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-border">
        <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-ul:pl-5 prose-ol:my-2 prose-li:my-1 prose-li:leading-relaxed prose-headings:font-bold prose-headings:text-foreground prose-h2:text-base prose-h2:mt-4 prose-h2:mb-2 prose-h3:text-[15px] prose-h3:mt-3 prose-h3:mb-1.5 prose-strong:text-foreground text-foreground [&_table]:w-full [&_td]:py-1 [&_th]:py-1 [&_th]:text-left [&_th]:font-semibold">
          <ReactMarkdown components={markdownComponents}>{msg.content}</ReactMarkdown>
        </div>
        {/* 응답 만족도 — 영속화된(평가 저장 가능한) 답변에만. 에러 버블 제외. */}
        {onFeedback && msg.id && msg.intent !== "error" && (
          <div className="flex items-center gap-1 mt-2 -mb-1">
            <button
              onClick={() => onFeedback(msg.id!, "up")}
              className={`p-1 rounded-md active:scale-90 transition-all ${
                msg.feedback === "up"
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground/60 hover:text-foreground hover:bg-muted"
              }`}
              title="도움이 됐어요"
              aria-label="도움이 됐어요"
              aria-pressed={msg.feedback === "up"}
            >
              <ThumbsUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onFeedback(msg.id!, "down")}
              className={`p-1 rounded-md active:scale-90 transition-all ${
                msg.feedback === "down"
                  ? "text-destructive bg-destructive/10"
                  : "text-muted-foreground/60 hover:text-foreground hover:bg-muted"
              }`}
              title="아쉬워요"
              aria-label="아쉬워요"
              aria-pressed={msg.feedback === "down"}
            >
              <ThumbsDown className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ChatBubble;
