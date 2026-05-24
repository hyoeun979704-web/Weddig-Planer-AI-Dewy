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

// 매우 단순한 한국 좌표 → 시도 매핑 (lat/lng 대략 범위). 정밀 reverse-geocode 는
// 외부 API 필요(카카오 로컬 API 등). 본 함수는 첫 PR 의 MVP — 사용자가 동의하면
// "대략 어디" 만 안내. 실제 운영은 카카오 reverse-geocode 권장.
function roughReverseGeocode(lat: number, lng: number): ReverseGeocoded {
  if (lat >= 37.4 && lat <= 37.7 && lng >= 126.7 && lng <= 127.2) {
    return { city: "서울특별시", district: null };
  }
  if (lat >= 37.0 && lat <= 38.3 && lng >= 126.5 && lng <= 127.9) {
    return { city: "경기도", district: null };
  }
  if (lat >= 37.3 && lat <= 37.8 && lng >= 126.4 && lng <= 126.8) {
    return { city: "인천광역시", district: null };
  }
  if (lat >= 35.0 && lat <= 35.4 && lng >= 128.9 && lng <= 129.3) {
    return { city: "부산광역시", district: null };
  }
  if (lat >= 35.7 && lat <= 36.0 && lng >= 128.5 && lng <= 128.8) {
    return { city: "대구광역시", district: null };
  }
  if (lat >= 35.0 && lat <= 35.3 && lng >= 126.7 && lng <= 127.0) {
    return { city: "광주광역시", district: null };
  }
  if (lat >= 36.2 && lat <= 36.5 && lng >= 127.3 && lng <= 127.5) {
    return { city: "대전광역시", district: null };
  }
  if (lat >= 33.1 && lat <= 33.6 && lng >= 126.1 && lng <= 126.9) {
    return { city: "제주특별자치도", district: null };
  }
  return { city: null, district: null };
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

