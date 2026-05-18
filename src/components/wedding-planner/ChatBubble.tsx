import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const ChatBubble = ({ msg }: { msg: Message }) => {
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
        <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-ul:pl-5 prose-ol:my-2 prose-li:my-1 prose-li:leading-relaxed prose-headings:font-bold prose-headings:text-foreground prose-h2:text-base prose-h2:mt-4 prose-h2:mb-2 prose-h3:text-body prose-h3:mt-3 prose-h3:mb-1.5 prose-strong:text-foreground text-foreground [&_table]:w-full [&_td]:py-1 [&_th]:py-1 [&_th]:text-left [&_th]:font-semibold">
          <ReactMarkdown>{msg.content}</ReactMarkdown>
        </div>
      </div>
    </motion.div>
  );
};

export default ChatBubble;
