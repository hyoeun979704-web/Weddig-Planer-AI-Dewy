import { useState } from "react";
import { X } from "lucide-react";

/**
 * 탭하면 전체화면으로 확대되는 이미지(AI 결과 공통). 배경/X 탭으로 닫힘.
 * 외부 의존 없이 풀스크린 오버레이로 구현(모바일에선 큰 이미지에 핀치줌 가능).
 */
export default function ZoomableImage({
  src,
  alt = "",
  className,
}: {
  src: string;
  alt?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <img
        src={src}
        alt={alt}
        className={className}
        style={{ cursor: "zoom-in" }}
        onClick={() => setOpen(true)}
      />
      {open && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="닫기"
            className="absolute top-[calc(0.5rem+var(--safe-top,0px))] right-3 text-white p-2"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={src}
            alt={alt}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
