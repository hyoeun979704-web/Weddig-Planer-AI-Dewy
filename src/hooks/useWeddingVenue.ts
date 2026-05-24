// 결혼식장 anchor 헬퍼 — 사용자가 등록한 식장 위치를 큐레이션 컨텍스트로 노출.
// 다른 카테고리(스튜디오·드레스·메이크업·한복) 페이지에서 같은 시군구·시도 우선
// 정렬에 사용. 식장 미등록 사용자에게는 anchor=null 반환.

import { useMemo } from "react";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";

export interface WeddingVenueAnchor {
  /** 식장 등록 여부. false 면 큐레이션은 wedding_region(기존 신호)로 fallback. */
  isSet: boolean;
  placeId: string | null;
  name: string | null;
  address: string | null;
  /** 정규화 시도(예: "서울특별시"). ILIKE 매칭용. */
  city: string | null;
  /** 정규화 시군구(예: "강남구"). 같은 시군구 우선 정렬용. */
  district: string | null;
  /** 근접 정렬용 좌표. 둘 다 있으면 거리 계산 가능. */
  lat: number | null;
  lng: number | null;
  /** 다른 페이지 상단 배너에 띄울 짧은 표시: "강남 그랜드 웨딩홀 기준". */
  shortLabel: string | null;
}

export function useWeddingVenue(): WeddingVenueAnchor {
  const { weddingSettings } = useWeddingSchedule();
  return useMemo(() => {
    const name = weddingSettings.wedding_venue_name;
    const district = weddingSettings.wedding_venue_district;
    const city = weddingSettings.wedding_venue_city;
    const isSet = !!(name || weddingSettings.wedding_venue_place_id);
    let shortLabel: string | null = null;
    if (isSet && name) {
      // "강남구 그랜드웨딩홀" / "강남 그랜드웨딩홀" / "그랜드웨딩홀"
      shortLabel = district ? `${district} ${name}` : name;
    } else if (district || city) {
      shortLabel = district ?? city;
    }
    return {
      isSet,
      placeId: weddingSettings.wedding_venue_place_id,
      name,
      address: weddingSettings.wedding_venue_address,
      city,
      district,
      lat: weddingSettings.wedding_venue_lat,
      lng: weddingSettings.wedding_venue_lng,
      shortLabel,
    };
  }, [
    weddingSettings.wedding_venue_place_id,
    weddingSettings.wedding_venue_name,
    weddingSettings.wedding_venue_address,
    weddingSettings.wedding_venue_city,
    weddingSettings.wedding_venue_district,
    weddingSettings.wedding_venue_lat,
    weddingSettings.wedding_venue_lng,
  ]);
}

/**
 * 위·경도 두 좌표 사이 거리 (km). 둘 중 하나라도 누락이면 null.
 * Haversine 공식 — 짧은 거리에선 충분히 정확.
 */
export function distanceKm(
  aLat: number | null,
  aLng: number | null,
  bLat: number | null,
  bLng: number | null,
): number | null {
  if (aLat == null || aLng == null || bLat == null || bLng == null) return null;
  const R = 6371;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
