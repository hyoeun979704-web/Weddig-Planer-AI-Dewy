import { useState } from "react";
import { Lock } from "lucide-react";

// AI 스튜디오 전체폭 가로 배너 카드 — 컬러 그라데이션 배경 + 좌측 타이틀/설명 + 우측 이미지 + 코너 배지.
// 활성/잠금 카드 공용(드리프트 방지 단일 컴포넌트). 잠금은 배지(Lock)+사전알림 CTA 로 표현.

// 카드별 파스텔 배경 팔레트(항상 밝은 톤 → 진한 본문 글자 고정 가독성). index 로 순환 배정.
const PALETTE = [
  "from-[#FFE0EC] to-[#FFC9DD]", // pink
  "from-[#FFF0D2] to-[#FFE0AE]", // peach
  "from-[#E1F3EC] to-[#C7ECDD]", // mint
  "from-[#E9E3FB] to-[#D6CBF6]", // lavender
  "from-[#DEEAFB] to-[#C7DCF7]", // blue
  "from-[#FFF4DE] to-[#FBE6C2]", // cream
];

export interface StudioBannerCardProps {
  title: string;
  description?: string;
  imageUrl?: string;
  imageAlt?: string;
  badge?: string;
  locked?: boolean;
  ctaLabel: string;
  colorIndex: number;
  dataTutorial?: string;
  priority?: boolean;
  onClick: () => void;
}

const StudioBannerCard = ({
  title,
  description,
  imageUrl,
  imageAlt = "",
  badge,
  locked = false,
  ctaLabel,
  colorIndex,
  dataTutorial,
  priority = false,
  onClick,
}: StudioBannerCardProps) => {
  // 이미지 로드 실패 시(파일 미존재 등) 깨진 아이콘 대신 그라데이션만 보이게 한다.
  const [imgFailed, setImgFailed] = useState(false);
  return (
  <button
    type="button"
    onClick={onClick}
    data-tutorial={dataTutorial}
    className={`relative w-full min-h-[164px] overflow-hidden rounded-3xl text-left shadow-sm active:scale-[0.99] transition-transform bg-gradient-to-br ${PALETTE[colorIndex % PALETTE.length]}`}
  >
    {/* 우측 이미지 — 좌측으로 페이드시켜 배경에 자연스럽게 녹임 */}
    {imageUrl && !imgFailed && (
      <img
        src={imageUrl}
        alt={imageAlt}
        width={320}
        height={320}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        onError={() => setImgFailed(true)}
        className={`pointer-events-none absolute right-0 top-0 h-full w-[46%] object-cover object-center ${locked ? "opacity-55" : ""}`}
        style={{
          WebkitMaskImage: "linear-gradient(to left, #000 65%, transparent)",
          maskImage: "linear-gradient(to left, #000 65%, transparent)",
        }}
      />
    )}

    {/* 코너 배지 */}
    {badge && (
      <span className="absolute top-3 right-3 z-10 inline-flex items-center gap-1 rounded-full bg-white/85 px-2 py-0.5 text-[10px] font-bold text-[#3b2b32]">
        {locked && <Lock className="w-2.5 h-2.5" strokeWidth={2.5} />}
        {badge}
      </span>
    )}

    {/* 좌측 텍스트 */}
    <div className="relative z-10 max-w-[64%] px-5 py-5">
      <h3 className="text-[17px] font-extrabold leading-snug text-[#3b2b32] break-keep">{title}</h3>
      {description && (
        <p className="mt-1.5 text-[12px] leading-snug text-[#6b5860] line-clamp-2 break-keep">{description}</p>
      )}
      <p className={`mt-2.5 text-[12px] font-bold ${locked ? "text-[#8a7a80]" : "text-primary"}`}>{ctaLabel}</p>
    </div>
  </button>
  );
};

export default StudioBannerCard;
