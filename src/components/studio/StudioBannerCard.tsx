import { useState } from "react";
import { Lock } from "lucide-react";

// AI 스튜디오 카드 — 완성형 파스텔 배너(2.5:1)를 카드 전체 배경으로 깔고(object-cover),
// 좌측 빈 여백 위에 타이틀/설명/CTA 텍스트를 얹는다. 배너는 직접 제작(피사체 우측 배치).
// 잠금 카드는 배너가 없으므로 PALETTE 단색 그라디언트를 폴백 배경으로 사용.
// 활성/잠금 공용(드리프트 방지 단일 컴포넌트).

// 잠금 카드 폴백 배경(배너 미제작분). colorIndex 1:1 대응.
const PALETTE = [
  "from-[#FDE2E8] to-[#FBD0DD]", // 0 컨설팅 — 핑크
  "from-[#FBEFC9] to-[#F6E3A8]", // 1 스드메 — 버터
  "from-[#DCEBFB] to-[#C7DCF7]", // 2 드레스 — 블루
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
  // 이미지 로드 실패 시 깨진 아이콘 대신 폴백 배경만 보이게.
  const [imgFailed, setImgFailed] = useState(false);
  const showImg = imageUrl && !imgFailed;
  return (
    <button
      type="button"
      onClick={onClick}
      data-tutorial={dataTutorial}
      className={`relative w-full aspect-[5/2] overflow-hidden rounded-3xl text-left shadow-sm active:scale-[0.99] transition-transform bg-gradient-to-br ${PALETTE[colorIndex % PALETTE.length]}`}
    >
      {/* 완성형 배너 — 카드 전체를 채움(좌측 여백에 텍스트가 얹힘). 잠금 카드는 배너 없이 폴백 배경만. */}
      {showImg && (
        <img
          src={imageUrl}
          alt={imageAlt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onError={() => setImgFailed(true)}
          className={`pointer-events-none absolute inset-0 h-full w-full object-cover ${locked ? "opacity-60" : ""}`}
        />
      )}

      {/* 코너 배지(잠금) */}
      {badge && (
        <span className="absolute top-3 right-3 z-10 inline-flex items-center gap-1 rounded-full bg-white/85 px-2 py-0.5 text-[10px] font-bold text-[#3b2b32]">
          {locked && <Lock className="w-2.5 h-2.5" strokeWidth={2.5} />}
          {badge}
        </span>
      )}

      {/* 좌측 텍스트(배너의 빈 여백 위) */}
      <div className="relative z-10 flex h-full max-w-[56%] flex-col justify-center px-5 py-4">
        <h3 className="text-[17px] font-extrabold leading-snug text-[#3b2b32] break-keep line-clamp-3">{title}</h3>
        {description && (
          <p className="mt-1.5 text-[12px] leading-snug text-[#6b5860] line-clamp-2 break-keep">{description}</p>
        )}
        <p className={`mt-2.5 text-[12px] font-bold ${locked ? "text-[#8a7a80]" : "text-primary"}`}>{ctaLabel}</p>
      </div>
    </button>
  );
};

export default StudioBannerCard;
