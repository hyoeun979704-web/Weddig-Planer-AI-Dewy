import { ReactNode } from "react";

// AI 생성 결과를 "인화 사진/폴라로이드"처럼 보여주는 공용 프레임.
// 따뜻한 종이 배경 + 흰 폴라로이드 테두리(아래 여백 넓게) + 살짝 기울임 + 그림자 + 상단 테이프 악센트.
// 결과 6종(드레스·메이크업·헤어·스드메·컨설팅·사진보정) 공용(드리프트 방지 단일 컴포넌트).
// children = 실제 결과 이미지(ZoomableImage 등). 인터랙션은 그대로 유지(프레임은 시각만).
const ResultPhotoFrame = ({
  children,
  caption,
  accent = true,
  tilt = -1.5,
  className,
}: {
  children: ReactNode;
  caption?: string | null;
  accent?: boolean;
  tilt?: number;
  className?: string;
}) => (
  <div className={`relative rounded-2xl bg-[#efe7da] p-4 shadow-inner ${className ?? ""}`}>
    {/* 상단 테이프 악센트 */}
    {accent && (
      <span
        aria-hidden
        className="absolute left-1/2 top-1 z-10 h-5 w-16 -translate-x-1/2 -rotate-2 rounded-[2px] bg-white/55 shadow-sm"
        style={{ backdropFilter: "blur(1px)" }}
      />
    )}
    {/* 폴라로이드 */}
    <div
      className={`mx-auto bg-white p-2.5 ${caption ? "pb-8" : ""} shadow-[0_8px_24px_rgba(60,40,30,0.18)]`}
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      <div className="overflow-hidden bg-muted">{children}</div>
      {caption && (
        <p className="mt-2 text-center text-[13px] italic text-[#6b5a50] break-keep">{caption}</p>
      )}
    </div>
  </div>
);

export default ResultPhotoFrame;
