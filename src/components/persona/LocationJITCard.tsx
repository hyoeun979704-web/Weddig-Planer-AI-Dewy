// 실시간 위치 JIT 카드 — 식장 미등록 + wedding_region 미설정 사용자에게만 노출.
// v2 §6 위치 정보 전략:
//   - Just-in-time (베뉴 페이지 첫 진입 시점에만)
//   - 가치 교환 카피 ("근처 식장 자동 추천")
//   - "한 번만 보기" — lat/lng 저장 X, 결과 시군구만 후보 컬럼에
//   - 정확도 단계 — 본 카드는 시군구 단계만 사용 (geolocation 결과 → reverse geocode)
//
// 식장이 명시 등록되면 본 카드는 더 이상 안 뜸. 사용자가 X dismiss 하면 7일 cooldown.

import { useState } from "react";
import { MapPin, X, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import { useWeddingVenue } from "@/hooks/useWeddingVenue";
import { supabase } from "@/integrations/supabase/client";
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
  // 서울(37.4~37.7, 126.7~127.2)
  if (lat >= 37.4 && lat <= 37.7 && lng >= 126.7 && lng <= 127.2) {
    return { city: "서울특별시", district: null };
  }
  // 경기도 (37.0~38.3, 126.5~127.9)
  if (lat >= 37.0 && lat <= 38.3 && lng >= 126.5 && lng <= 127.9) {
    return { city: "경기도", district: null };
  }
  // 인천 (37.3~37.8, 126.4~126.8)
  if (lat >= 37.3 && lat <= 37.8 && lng >= 126.4 && lng <= 126.8) {
    return { city: "인천광역시", district: null };
  }
  // 부산 (35.0~35.4, 128.9~129.3)
  if (lat >= 35.0 && lat <= 35.4 && lng >= 128.9 && lng <= 129.3) {
    return { city: "부산광역시", district: null };
  }
  // 대구 (35.7~36.0, 128.5~128.8)
  if (lat >= 35.7 && lat <= 36.0 && lng >= 128.5 && lng <= 128.8) {
    return { city: "대구광역시", district: null };
  }
  // 광주 (35.0~35.3, 126.7~127.0)
  if (lat >= 35.0 && lat <= 35.3 && lng >= 126.7 && lng <= 127.0) {
    return { city: "광주광역시", district: null };
  }
  // 대전 (36.2~36.5, 127.3~127.5)
  if (lat >= 36.2 && lat <= 36.5 && lng >= 127.3 && lng <= 127.5) {
    return { city: "대전광역시", district: null };
  }
  // 제주 (33.1~33.6, 126.1~126.9)
  if (lat >= 33.1 && lat <= 33.6 && lng >= 126.1 && lng <= 126.9) {
    return { city: "제주특별자치도", district: null };
  }
  return { city: null, district: null };
}

export default function LocationJITCard() {
  const { user } = useAuth();
  const { weddingSettings } = useWeddingSchedule();
  const venue = useWeddingVenue();
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

  // 노출 조건: 식장 미등록 + 지역 미설정 + 사용자 로그인 + dismiss cooldown 만료
  // 식장 등록되면 본 카드는 의미 없음 — anchor 가 이미 있음.
  if (!user) return null;
  if (venue.isSet) return null;
  if (weddingSettings.wedding_region) return null;
  if (dismissed) return null;
  if (typeof navigator === "undefined" || !navigator.geolocation) return null;

  const handleAllow = () => {
    setRequesting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const { city, district } = roughReverseGeocode(latitude, longitude);
          if (!city) {
            toast.info("위치는 확인했는데 시도를 식별 못했어요. 직접 골라주세요.");
            return;
          }
          // lat/lng 저장 X — 결과 시도 후보만 wedding_region 후보로 시드.
          // 사용자가 "이 식장으로 정하기" 또는 직접 region 변경하면 본 후보값은 overwrite.
          await (supabase as any)
            .from("user_wedding_settings")
            .upsert(
              {
                user_id: user.id,
                wedding_region: city,
                ...(district ? { wedding_region_sigungu: district } : {}),
              },
              { onConflict: "user_id" }
            );
          toast.success(`${city} 기준으로 추천을 시작했어요`, {
            description: "마음에 드는 식장을 찾으시면 [이 식장으로 정하기] 로 큐레이션을 정확히 맞춰주세요.",
            duration: 4500,
          });
          setDismissed(true);
          window.location.reload();
        } catch (e) {
          console.error("location seed failed", e);
          toast.error("위치 등록에 실패했어요");
        } finally {
          setRequesting(false);
        }
      },
      (err) => {
        console.warn("geolocation denied", err);
        setRequesting(false);
        toast.info("괜찮아요. 직접 지역을 골라주셔도 돼요.");
        handleDismiss();
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60 * 60 * 1000 }
    );
  };

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  };

  return (
    <section className="mx-4 mt-3 rounded-2xl border border-border bg-card p-3.5 relative">
      <button
        type="button"
        aria-label="닫기"
        onClick={handleDismiss}
        className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center opacity-50 hover:opacity-100"
      >
        <X className="w-3.5 h-3.5" />
      </button>
      <div className="pr-6">
        <div className="flex items-center gap-1.5 mb-1">
          <MapPin className="w-3.5 h-3.5 text-primary" />
          <p className="text-[13px] font-bold text-foreground">근처 식장을 자동으로 보여드릴까요?</p>
        </div>
        <p className="text-[11px] text-muted-foreground leading-snug mb-3">
          한 번만 위치를 확인해 가까운 시도 기준으로 추천드려요. 좌표는 저장하지 않아요.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleAllow}
            disabled={requesting}
            className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-[12px] font-bold disabled:opacity-60 active:scale-[0.98] transition-transform inline-flex items-center justify-center gap-1.5"
          >
            {requesting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            한 번만 보기
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="flex-1 py-2 rounded-xl bg-transparent border border-border text-foreground text-[12px] font-semibold active:scale-[0.98] transition-transform"
          >
            수동 입력
          </button>
        </div>
      </div>
    </section>
  );
}
