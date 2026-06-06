import { Instagram, Building2, Camera, Sparkles, Gem, Plane, Shirt, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlaceImagePlaceholderProps {
  category?: string | null;
  instagramUrl?: string | null;
  instagramAuthor?: string | null;
  className?: string;
}

/**
 * 업체 대표 이미지가 비어있거나 깨졌을 때의 fallback.
 *
 * 우선순위:
 *  1. instagram_url 있음 → 분홍 그라데이션 + Instagram 아이콘 + @username 안내
 *     ("이 업체는 인스타에서 사진을 볼 수 있어요" 시그널)
 *  2. instagram_url 없음 → 카테고리별 아이콘 + 카테고리 라벨
 *
 * 사용자가 "앱 용량 안 늘리고, 인스타 계정은 안내만" 요청 — 인스타 사진을
 * 우리 storage 에 복사하지 않고, 깨진 이미지 자리에 의미 있는 placeholder.
 */

const CATEGORY_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  wedding_hall: Building2,
  studio: Camera,
  dress_shop: Sparkles,
  makeup_shop: Sparkles,
  hanbok: Shirt,
  tailor_shop: Shirt,
  honeymoon: Plane,
  wedding_gifts: Gem,
  jewelry: Gem,
  appliance: Building2,
};

const CATEGORY_LABEL: Record<string, string> = {
  wedding_hall: "웨딩홀",
  studio: "스튜디오",
  dress_shop: "드레스",
  makeup_shop: "메이크업",
  hanbok: "한복",
  tailor_shop: "예복",
  honeymoon: "허니문",
  wedding_gifts: "예단·예물",
  jewelry: "예물",
  appliance: "혼수",
  invitation_venue: "청첩장 모임",
};

// instagram_url 에서 username 추출 — https://www.instagram.com/{username}/
function extractAuthor(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/instagram\.com\/([^/?#]+)/);
  if (!m) return null;
  return m[1].replace(/^@/, "");
}

const PlaceImagePlaceholder = ({
  category,
  instagramUrl,
  instagramAuthor,
  className,
}: PlaceImagePlaceholderProps) => {
  const hasInstagram = !!instagramUrl;
  const author = instagramAuthor || extractAuthor(instagramUrl);

  if (hasInstagram) {
    // 인스타 계정 안내 fallback — 분홍 그라데이션 + 아이콘 + @username
    return (
      <div
        className={cn(
          "w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#fce7f3] via-[#fbcfe8] to-[#fed7aa]",
          className,
        )}
      >
        <Instagram className="w-7 h-7 text-[hsl(330,75%,50%)] mb-1.5" />
        {author && (
          <p className="text-[11px] font-semibold text-[hsl(330,75%,40%)] truncate max-w-[80%]">
            @{author}
          </p>
        )}
        <p className="text-[9px] text-[hsl(330,55%,45%)] mt-0.5">
          Instagram 에서 보기
        </p>
      </div>
    );
  }

  // 카테고리 아이콘 placeholder
  const Icon = (category && CATEGORY_ICON[category]) || ImageIcon;
  const label = (category && CATEGORY_LABEL[category]) || "";
  return (
    <div
      className={cn(
        "w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 to-accent/30",
        className,
      )}
    >
      <Icon className="w-7 h-7 text-primary/50" />
      {label && (
        <p className="text-[10px] text-muted-foreground mt-1.5 font-medium">
          {label}
        </p>
      )}
    </div>
  );
};

export default PlaceImagePlaceholder;
