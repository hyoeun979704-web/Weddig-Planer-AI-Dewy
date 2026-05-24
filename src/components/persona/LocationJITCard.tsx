// 근처 식장 추천 카드 — 식장·지역 모두 미설정 사용자에게 Venues 페이지에서만 노출.
// v2 §6 위치 정보 전략:
//   - Just-in-time (베뉴 페이지 첫 진입 시점)
//   - 가치 교환 카피 ("근처 식장을 추천해드릴까요?")
//   - "한 번만" — lat/lng 저장 X, 결과 시도도 DB 영속화 X (현재 세션 필터만)
//   - 정확도 단계: 시도 단계
//
// 중요 — wedding_region 자동 영속화 안 함:
//   한국에서는 하객 편의·고향 결혼 등으로 거주지와 식장 지역이 다른 경우가 많다.
//   현재 위치 ≠ 결혼식 지역이므로 본 카드는 "추천만" 한다. 사용자가 실제로
//   마음에 드는 식장 골라 [이 식장으로 정하기] 누르면 그때 wedding_region 이
//   확정 (venue anchor 트리거).
//
// 식장이 명시 등록되거나 wedding_region 이 있으면 본 카드는 안 뜸. X dismiss 시 7일 cooldown.

import { useState } from "react";
import { MapPin, X, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import { useWeddingVenue } from "@/hooks/useWeddingVenue";
import { useFilterStore } from "@/stores/useFilterStore";
import { normalizeRegion } from "@/lib/regions";
import { toast } from "sonner";

const DISMISS_KEY = "dewy:location-jit-dismissed";
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

interface ReverseGeocoded {
  city: string | null;
  district: string | null;
}

// 단순 좌표 → 시도 매핑. F#8 — 이전 구현은 sequential if + 겹치는 bounding box
// 라 첫 매치가 잘못 잡힘(부천 → 서울, 인천 → 경기 같은 오분류). 가장 가까운
// 중심점(시도별 대표 좌표) 으로 distance 계산해 1위만 반환 — 겹침 0.
//
// 한계: 시군구 정확도는 본 함수로 부족(시도 단위 근사). district=null 유지.
// 정밀 reverse-geocode 필요 시 카카오 로컬 API 통합 권장.
// F#4 — 경기도/충청 등 큰 광역지자체는 단일 중심점으로는 변두리 시군이 잘못 분류됨
// (부천/고양/안양 등 인구밀집 위성도시가 서울/인천에 더 가까운 문제).
// 권역별 sub-anchor 를 같은 city 라벨로 여러 개 두어 nearest-center 매칭이 옳게 동작.
const KR_CITY_CENTERS: Array<{ city: string; lat: number; lng: number }> = [
  { city: "서울특별시", lat: 37.5665, lng: 126.978 },
  // 인천 권역 — 본토(연수) + 강화도(서북부 도서)
  { city: "인천광역시", lat: 37.4563, lng: 126.7052 },
  { city: "인천광역시", lat: 37.74,   lng: 126.485 },  // 강화
  // 경기 권역 4개 sub-anchor — 부천/고양/성남/수원/의정부 모두 포섭
  { city: "경기도",     lat: 37.738,  lng: 127.045 }, // 의정부 (북부)
  { city: "경기도",     lat: 37.6584, lng: 126.832 }, // 고양  (서북부)
  { city: "경기도",     lat: 37.5035, lng: 126.766 }, // 부천  (서부)
  { city: "경기도",     lat: 37.42,   lng: 127.127 }, // 성남  (남동부)
  { city: "경기도",     lat: 37.4138, lng: 127.5183 }, // 수원 (남부)
  { city: "경기도",     lat: 36.99,   lng: 127.10 },  // 평택 (최남부)
  { city: "강원특별자치도", lat: 37.8228, lng: 128.1555 }, // 춘천
  { city: "강원특별자치도", lat: 37.7519, lng: 128.876 },  // 강릉 (영동)
  { city: "충청북도",   lat: 36.6357, lng: 127.4912 },  // 청주
  { city: "충청남도",   lat: 36.6588, lng: 126.6728 },  // 홍성
  { city: "충청남도",   lat: 36.815,  lng: 127.114 },   // 천안 (충남 동북부)
  { city: "세종특별자치시", lat: 36.4801, lng: 127.289 },
  { city: "대전광역시", lat: 36.3504, lng: 127.3845 },
  { city: "전북특별자치도", lat: 35.8242, lng: 127.148 },  // 전주
  { city: "전라남도",   lat: 34.8161, lng: 126.4629 },  // 무안
  { city: "전라남도",   lat: 34.7604, lng: 127.6622 },  // 여수 (전남 동부)
  { city: "광주광역시", lat: 35.1595, lng: 126.8526 },
  { city: "경상북도",   lat: 36.4919, lng: 128.8889 },  // 안동
  { city: "경상북도",   lat: 36.0190, lng: 129.343 },   // 포항 (경북 동부)
  { city: "대구광역시", lat: 35.8714, lng: 128.6014 },
  { city: "경상남도",   lat: 35.4606, lng: 128.2132 },  // 창원
  { city: "경상남도",   lat: 35.2280, lng: 128.683 },   // 김해 (경남 동부)
  { city: "부산광역시", lat: 35.1796, lng: 129.0756 },
  { city: "울산광역시", lat: 35.5384, lng: 129.3114 },
  { city: "제주특별자치도", lat: 33.4996, lng: 126.5312 },
];

function squareDist(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLat = aLat - bLat;
  // 경도 1도 ≈ cos(lat) * 111km. 한국은 ~37도라 cos≈0.798. 거리 정확도가 시도 식별에
  // 충분하면 됨 — 절댓값 거리만 비교하므로 cos 보정 생략해도 1위는 거의 같음.
  const dLng = aLng - bLng;
  return dLat * dLat + dLng * dLng;
}

function roughReverseGeocode(lat: number, lng: number): ReverseGeocoded {
  // 한국 본토 + 제주 외 좌표는 식별 안 함.
  if (lat < 33 || lat > 39 || lng < 124 || lng > 132) {
    return { city: null, district: null };
  }
  // 너무 멀면(예: 일본 본토) null 반환. 임계: 1.5도(약 167km) 초과면 미식별.
  let best: { city: string; d: number } | null = null;
  for (const center of KR_CITY_CENTERS) {
    const d = squareDist(lat, lng, center.lat, center.lng);
    if (!best || d < best.d) best = { city: center.city, d };
  }
  if (!best || best.d > 1.5 * 1.5) return { city: null, district: null };
  return { city: best.city, district: null };
}

export default function LocationJITCard() {
  const { user } = useAuth();
  const { weddingSettings } = useWeddingSchedule();
  const venue = useWeddingVenue();
  const setRegion = useFilterStore((s) => s.setRegion);
  const [requesting, setRequesting] = useState(false);
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      const at = localStorage.getItem(DISMISS_KEY);
      if (!at) return false;
      const ms = Number(at);
      if (Number.isFinite(ms) && Date.now() - ms < COOLDOWN_MS) return true;
    } catch {
      /* ignore */
    }
    return false;
  });

  // 노출 조건: 식장 미등록 + 지역 미설정 + dismiss cooldown 만료 + geolocation 사용 가능
  // 로그인 여부와 무관 — 어차피 DB 영속화 안 하므로 비회원도 추천 가능.
  if (venue.isSet) return null;
  if (weddingSettings.wedding_region) return null;
  if (dismissed) return null;
  if (typeof navigator === "undefined" || !navigator.geolocation) return null;

  const handleYes = () => {
    setRequesting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const { city } = roughReverseGeocode(latitude, longitude);
          if (!city) {
            toast.info("위치는 확인했는데 시도를 식별 못했어요. 직접 골라주세요.");
            setDismissed(true);
            persistDismiss();
            return;
          }
          // ⚠️ wedding_region 영속화 안 함 — 결혼식이 거주지와 다를 수 있음.
          // 현재 세션 필터(메모리)만 임시 설정. 같은 페이지에서 베뉴 목록이
          // 그 지역으로 좁혀짐. 사용자가 마음에 드는 식장 골라 "이 식장으로
          // 정하기" 누르면 그때 venue anchor 가 wedding_region 확정.
          setRegion(normalizeRegion(city));
          toast.success(`${city} 식장을 보여드릴게요`, {
            description: "마음에 드는 식장에서 [이 식장으로 정하기] 누르시면 큐레이션이 정확해져요.",
            duration: 4500,
          });
          // 카드는 닫음 — 같은 페이지 반복 노출 피로 회피. 단, dismiss cooldown 은
          // 적용 안 함 (사용자가 "네" 한 케이스는 다음 방문 시 또 물어봐도 OK).
          setDismissed(true);
        } catch (e) {
          console.error("location seed failed", e);
          toast.error("추천 적용에 실패했어요");
        } finally {
          setRequesting(false);
        }
      },
      (err) => {
        console.warn("geolocation denied", err);
        setRequesting(false);
        toast.info("괜찮아요. 직접 지역을 골라주셔도 돼요.");
        handleNo();
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60 * 60 * 1000 }
    );
  };

  const persistDismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  };

  const handleNo = () => {
    setDismissed(true);
    persistDismiss();
  };

  // X 닫기 = handleNo. 같은 cooldown.
  const handleClose = handleNo;

  // 비회원 케이스에 user 없어도 toast 등 동작은 OK. 단, 위 가드를 통과한 경우만 도달.
  void user;

  return (
    <section className="mx-4 mt-3 rounded-2xl border border-border bg-card p-3.5 relative">
      <button
        type="button"
        aria-label="닫기"
        onClick={handleClose}
        className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center opacity-50 hover:opacity-100"
      >
        <X className="w-3.5 h-3.5" />
      </button>
      <div className="pr-6">
        <div className="flex items-center gap-1.5 mb-1">
          <MapPin className="w-3.5 h-3.5 text-primary" />
          <p className="text-[13px] font-bold text-foreground">근처 식장을 추천해드릴까요?</p>
        </div>
        <p className="text-[11px] text-muted-foreground leading-snug mb-3">
          위치는 한 번만 확인하고 좌표는 저장하지 않아요. 식장은 추천만 하고
          확정은 [이 식장으로 정하기] 를 누르실 때만 돼요.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleYes}
            disabled={requesting}
            className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-[12px] font-bold disabled:opacity-60 active:scale-[0.98] transition-transform inline-flex items-center justify-center gap-1.5"
          >
            {requesting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            네, 좋아요
          </button>
          <button
            type="button"
            onClick={handleNo}
            className="flex-1 py-2 rounded-xl bg-transparent border border-border text-foreground text-[12px] font-semibold active:scale-[0.98] transition-transform"
          >
            아니요, 괜찮아요
          </button>
        </div>
      </div>
    </section>
  );
}

