import DOMPurify from "dompurify";
import type { ChatMessage } from "./constants";

const ChatBubble = ({ msg }: { msg: ChatMessage }) => {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[80%] rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
          style={{ background: "linear-gradient(135deg, #F9E4EC, #FBCFE8)" }}
        >
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 items-start">
      <div className="w-8 h-8 rounded-full bg-[#C9A96E]/10 flex items-center justify-center flex-shrink-0 text-sm">💍</div>
      <div className="max-w-[85%] bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
        {msg.isHtml ? (
          <div
            className="text-sm leading-relaxed [&_table]:w-full [&_td]:py-1 [&_b]:font-bold"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(msg.content.replace(/\n/g, "<br/>")) }}
          />
        ) : (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
        )}
      </div>
    </div>
  );
};

export default ChatBubble;
