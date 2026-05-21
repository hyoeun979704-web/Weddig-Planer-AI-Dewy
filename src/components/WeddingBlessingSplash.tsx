import { useState, useEffect } from "react";
import DewyLogo from "@/components/home/DewyLogo";

const blessings = [
  "두 사람의 사랑이\n영원히 빛나길 바랍니다",
  "오늘도 행복한\n웨딩 준비 되세요",
  "사랑으로 가득한\n아름다운 하루 되세요",
  "두 분의 앞날에\n꽃길만 가득하길",
  "세상에서 가장 빛나는\n순간을 준비하세요",
  "함께라서 더 아름다운\n오늘이 되길 바랍니다",
  "사랑하는 사람과 함께\n꿈꾸는 모든 것이 이루어지길",
  "두 사람의 이야기가\n가장 아름다운 동화가 되길",
  "행복한 결혼 준비,\n듀이가 함께 할게요",
  "오늘 하루도\n사랑 가득한 하루 되세요",
  "세상 모든 축복이\n두 분에게 함께하길",
  "둘이니까, 쉬워지니까.\n듀이와 함께해요",
];

// 세션당 1회만 노출 — 같은 탭 세션에서 화면 이동·새로고침마다 반복되지 않도록.
const SESSION_KEY = "dewy.splash_shown";

const WeddingBlessingSplash = () => {
  const [visible, setVisible] = useState(() => {
    try {
      return sessionStorage.getItem(SESSION_KEY) !== "1";
    } catch {
      return true;
    }
  });
  const [fadeOut, setFadeOut] = useState(false);
  const [blessing] = useState(() => blessings[Math.floor(Math.random() * blessings.length)]);

  useEffect(() => {
    if (!visible) return;
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // best effort
    }
    const fadeTimer = setTimeout(() => setFadeOut(true), 2000);
    const hideTimer = setTimeout(() => setVisible(false), 2600);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [visible]);

  // 탭하면 즉시 건너뛰기.
  const skip = () => {
    setFadeOut(true);
    setTimeout(() => setVisible(false), 300);
  };

  if (!visible) return null;

  return (
    <div
      onClick={skip}
      role="button"
      tabIndex={0}
      aria-label="시작 화면 건너뛰기"
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-b from-primary/5 via-background to-primary/10 transition-opacity duration-500 cursor-pointer ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center gap-6 px-8 animate-in fade-in zoom-in-95 duration-700">
        <DewyLogo size={72} className="animate-pulse" />
        <p className="text-xl font-semibold text-foreground text-center whitespace-pre-line leading-relaxed">
          {blessing}
        </p>
        <p className="text-sm text-muted-foreground tracking-widest uppercase">Dewy</p>
      </div>
      <p className="absolute bottom-10 text-xs text-muted-foreground/70">탭하여 시작하기</p>
    </div>
  );
};

export default WeddingBlessingSplash;
