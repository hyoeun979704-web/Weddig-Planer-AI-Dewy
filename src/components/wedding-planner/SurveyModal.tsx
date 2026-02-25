import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface SurveyModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const SurveyModal = ({ isOpen, onClose, title, children }: SurveyModalProps) => {
  const isMobile = useIsMobile();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-50"
            style={{ backgroundColor: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className={`fixed z-50 bg-white overflow-hidden flex flex-col ${
              isMobile
                ? "inset-x-0 bottom-0 rounded-t-2xl"
                : "left-1/2 top-1/2 rounded-2xl w-full max-w-[520px]"
            }`}
            style={isMobile ? { maxHeight: "95vh" } : { maxHeight: "85vh" }}
            initial={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95, x: "-50%", y: "-50%" }}
            animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
            exit={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95, x: "-50%", y: "-50%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-2 flex-shrink-0">
              <h2 className="text-lg font-bold text-gray-900">{title}</h2>
              <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <p className="px-5 text-[13px] text-gray-400 mb-3">
              아래 정보를 입력하시면 맞춤 답변을 드립니다 ✨
            </p>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-5 pb-5">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SurveyModal;
