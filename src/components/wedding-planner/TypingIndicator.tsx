import { motion } from "framer-motion";

const TypingIndicator = () => (
  <div className="flex gap-3 items-start">
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-base"
      style={{ background: "#E8E0D0" }}
    >
      🌸
    </div>
    <div
      className="rounded-2xl rounded-tl-sm px-4 py-3.5"
      style={{
        background: "#FDFBF7",
        border: "1px solid #E8E0D0",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full"
            style={{ background: "#8B9D77" }}
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </div>
  </div>
);

export default TypingIndicator;
