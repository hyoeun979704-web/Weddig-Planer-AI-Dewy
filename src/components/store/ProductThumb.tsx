import { useState } from "react";
import { ShoppingCart } from "lucide-react";

interface ProductThumbProps {
  url: string | null | undefined;
  alt: string;
  sizeClass: string;
}

// 썸네일 URL 이 만료/404 일 때 placeholder 로 폴백.
export const ProductThumb = ({ url, alt, sizeClass }: ProductThumbProps) => {
  const [broken, setBroken] = useState(false);
  if (!url || broken) {
    return (
      <div className={`${sizeClass} bg-muted flex items-center justify-center`}>
        <ShoppingCart className="w-8 h-8 text-muted-foreground/30" />
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={alt}
      className={`${sizeClass} object-cover`}
      onError={() => setBroken(true)}
      loading="lazy"
    />
  );
};
