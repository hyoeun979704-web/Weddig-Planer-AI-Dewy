import { useState } from "react";
import { MapPin, Navigation } from "lucide-react";
import { SUPABASE_FUNCTIONS_URL } from "@/integrations/supabase/client";
import { openExternal } from "@/lib/native/openExternal";

/**
 * 벤더 상세 약식 지도. 좌표(lat/lng)가 있을 때만 렌더한다.
 * - 지도 이미지는 공개 Edge Function(place-static-map)이 네이버 Static Map 을 프록시.
 * - "길찾기" 는 네이버 지도(앱/웹)로 식장명을 검색해 연다.
 * 좌표가 없으면 호출부에서 렌더하지 않으므로 부정확한 핀이 찍힐 일은 없다.
 */
interface PlaceMapProps {
  lat: number;
  lng: number;
  name: string;
  /** 길찾기 검색어 보조 (식장명이 모호할 때 주소 병기) */
  address?: string;
}

export default function PlaceMap({ lat, lng, name, address }: PlaceMapProps) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  const src =
    `${SUPABASE_FUNCTIONS_URL}/place-static-map` +
    `?lat=${lat}&lng=${lng}&w=600&h=300&level=15`;

  const query = encodeURIComponent([name, address].filter(Boolean).join(" "));
  const openDirections = () =>
    void openExternal(`https://map.naver.com/p/search/${query}`);

  return (
    <div className="rounded-xl overflow-hidden border border-border">
      <button
        type="button"
        onClick={openDirections}
        className="block w-full"
        aria-label={`${name} 지도 — 네이버 지도에서 열기`}
      >
        <img
          src={src}
          alt={`${name} 위치 지도`}
          loading="lazy"
          onError={() => setFailed(true)}
          className="w-full h-[150px] object-cover bg-muted"
        />
      </button>
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-card">
        <span className="flex items-center gap-1 text-xs text-muted-foreground min-w-0">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">{address || name}</span>
        </span>
        <button
          type="button"
          onClick={openDirections}
          className="flex items-center gap-1 text-xs font-medium text-primary flex-shrink-0"
        >
          <Navigation className="w-3.5 h-3.5" />
          길찾기
        </button>
      </div>
    </div>
  );
}
