import DOMPurify from "dompurify";
import type { ChatMessage } from "./constants";

const ChatBubble = ({ msg }: { msg: ChatMessage }) => {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[80%] rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
          style={{
            background: "linear-gradient(135deg, #8B9D77, #7A8E68)",
            color: "#FFFFFF",
          }}
        >
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 items-start">
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-base"
        style={{ background: "#E8E0D0" }}
      >
        🌸
      </div>
      <div
        className="max-w-[85%] rounded-2xl rounded-tl-sm px-4 py-3.5"
        style={{
          background: "#FDFBF7",
          border: "1px solid #E8E0D0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        {msg.isHtml ? (
          <div
            className="text-sm leading-relaxed [&_table]:w-full [&_td]:py-1 [&_b]:font-bold"
            style={{ color: "#4A4A4A" }}
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(msg.content.replace(/\n/g, "<br/>")),
            }}
          />
        ) : (
          <p
            className="text-sm leading-relaxed whitespace-pre-wrap"
            style={{ color: "#4A4A4A" }}
          >
            {msg.content}
          </p>
        )}
      </div>
    </div>
  );
};

export default ChatBubble;
