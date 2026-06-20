import { useState } from "react";
import { Lock } from "lucide-react";

// AI 스튜디오 카드 — 파스텔 단색 배경 + 우측 누끼(투명 PNG/webp) 피사체 + 좌측 타이틀/설명/CTA.
// 레퍼런스(리테일 배너) 스타일. 활성/잠금 공용(드리프트 방지 단일 컴포넌트).

// 카드별 파스텔 배경(카드 순서 = colorIndex 에 1:1 대응, 레퍼런스 색감과 매칭).
const PALETTE = [
  "from-[#FDE2E8] to-[#FBD0DD]", // 0 컨설팅 — 핑크
  "from-[#DCEBFB] to-[#C7DCF7]", // 1 드레스 — 블루
  "from-[#FBEFC9] to-[#F6E3A8]", // 2 스드메 — 버터
  "from-[#EAE3FB] to-[#DCD0F7]", // 3 메이크업 — 라벤더
  "from-[#E3F1C9] to-[#D2E9AE]", // 4 헤어 — 그린
  "from-[#FBE9D6] to-[#F6DCC0]", // 5 종이청첩장 — 크림
  "from-[#FDE2E8] to-[#FBD0DD]", // 6 모바일청첩장 — 핑크
  "from-[#DDF1EA] to-[#C7E9DC]", // 7 웨딩촬영 — 민트
  "from-[#FBE3D2] to-[#F6CFB3]", // 8 식전영상 — 피치
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
  // 이미지 로드 실패 시 깨진 아이콘 대신 배경만 보이게.
  const [imgFailed, setImgFailed] = useState(false);
  const showImg = imageUrl && !imgFailed;
  return (
    <button
      type="button"
      onClick={onClick}
      data-tutorial={dataTutorial}
      className={`relative w-full min-h-[168px] overflow-hidden rounded-3xl text-left shadow-sm active:scale-[0.99] transition-transform bg-gradient-to-br ${PALETTE[colorIndex % PALETTE.length]}`}
    >
      {/* 우측 누끼 피사체 — 투명 배경이라 파스텔 위에 떠 보인다. 하단 정렬. */}
      {showImg && (
        <img
          src={imageUrl}
          alt={imageAlt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onError={() => setImgFailed(true)}
          className={`pointer-events-none absolute bottom-0 right-1 top-2 h-[calc(100%-0.5rem)] w-[56%] object-contain object-bottom ${locked ? "opacity-60" : ""}`}
        />
      )}

      {/* 코너 배지(잠금) */}
      {badge && (
        <span className="absolute top-3 right-3 z-10 inline-flex items-center gap-1 rounded-full bg-white/85 px-2 py-0.5 text-[10px] font-bold text-[#3b2b32]">
          {locked && <Lock className="w-2.5 h-2.5" strokeWidth={2.5} />}
          {badge}
        </span>
      )}

      {/* 좌측 텍스트 */}
      <div className="relative z-10 max-w-[54%] px-5 py-5">
        <h3 className="text-[17px] font-extrabold leading-snug text-[#3b2b32] break-keep">{title}</h3>
        {description && (
          <p className="mt-1.5 text-[12px] leading-snug text-[#6b5860] line-clamp-3 break-keep">{description}</p>
        )}
        <p className={`mt-2.5 text-[12px] font-bold ${locked ? "text-[#8a7a80]" : "text-primary"}`}>{ctaLabel}</p>
      </div>
    </button>
  );
};

export default StudioBannerCard;
