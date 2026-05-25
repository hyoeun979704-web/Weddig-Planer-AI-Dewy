// "이 식장으로 정하기" CTA — 식장 상세 페이지에서 1탭으로 큐레이션 anchor 설정.
// v2 §1 L5 JIT: 직접 폼 입력 대신 사용자가 식장 보던 흐름에서 자연스럽게 수집.
// v2 §6 위치 정보 전략: 사용자 명시 등록이 primary anchor.
//
// 동작:
//   - 미등록 상태: "이 식장으로 정하기" 버튼
//   - 이미 등록된 다른 식장: "이 식장으로 바꾸기" 버튼 (확인 토스트)
//   - 이 식장으로 등록된 상태: "내 결혼식장 ✓" 라벨 (비활성, 마이페이지 링크)

import { useState } from "react";
import { Check, MapPin, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  useWeddingSchedule,
  useInvalidateWeddingSettings,
} from "@/hooks/useWeddingSchedule";
import { useWeddingVenue } from "@/hooks/useWeddingVenue";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SetAsWeddingVenueButtonProps {
  placeId: string;
  placeName: string;
  /** places.city — DB 저장 형태 (예: "서울특별시"). */
  city: string | null;
  /** places.district — DB 저장 형태 (예: "강남구"). */
  district: string | null;
  /** 주소 표시용. */
  address?: string | null;
  /** 좌표 — 있으면 근접 정렬에 활용. */
  lat?: number | null;
  lng?: number | null;
}

export default function SetAsWeddingVenueButton({
  placeId,
  placeName,
  city,
  district,
  address,
  lat,
  lng,
}: SetAsWeddingVenueButtonProps) {
  const { user } = useAuth();
  const venue = useWeddingVenue();
  const { weddingSettings } = useWeddingSchedule();
  const invalidateWeddingSettings = useInvalidateWeddingSettings();
  const [saving, setSaving] = useState(false);

  const isCurrent = venue.placeId === placeId;
  const hasOther = venue.isSet && !isCurrent;

  const handleClick = async () => {
    if (!user) {
      toast.info("로그인하시면 식장 기준으로 추천이 정확해져요");
      return;
    }
    // 이미 같은 식장이면 마이페이지로 안내만.
    if (isCurrent) return;
    // 다른 식장 등록돼 있으면 한 번 확인 — 큐레이션 anchor 가 바뀌는 큰 변경.
    if (hasOther) {
      const ok = window.confirm(
        `결혼식장 anchor 를\n"${venue.name ?? "이전 식장"}" → "${placeName}"\n으로 바꾸시겠어요?\n\n다른 카테고리(스튜디오·드레스·메이크업) 추천이 새 식장 기준으로 다시 정렬돼요.`
      );
      if (!ok) return;
    }
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from("user_wedding_settings")
        .upsert(
          {
            user_id: user.id,
            wedding_venue_place_id: placeId,
            wedding_venue_name: placeName,
            wedding_venue_address: address ?? null,
            wedding_venue_city: city,
            wedding_venue_district: district,
            wedding_venue_lat: lat ?? null,
            wedding_venue_lng: lng ?? null,
            // wedding_region 미설정 사용자에겐 식장 city 로 자동 시드.
            // DB 트리거(sync_venue_region)가 같은 일을 하지만, 이 upsert 가
            // 새 row 를 만드는 케이스에선 트리거가 INSERT 에 대해서도 동작하므로 OK.
            ...(weddingSettings.wedding_region == null && city
              ? { wedding_region: city }
              : {}),
          },
          { onConflict: "user_id" }
        );
      if (error) throw error;
      toast.success(`식장 등록 완료 — ${placeName}`, {
        description: "다른 카테고리(스튜디오·드레스 등)에서 같은 시군구 업체를 우선 추천해드려요.",
        duration: 4500,
      });
      // window.location.reload 제거 (마이그레이션) — wedding_settings 캐시 invalidate
      // 한 번이면 useWeddingSchedule / useWeddingVenue 양쪽 호출자가 자동 refetch.
      void invalidateWeddingSettings();
    } catch (e) {
      console.error("set wedding venue failed", e);
      toast.error("식장 등록에 실패했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  };

  if (isCurrent) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[12px] font-bold">
        <Check className="w-3.5 h-3.5" />
        내 결혼식장
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={saving}
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-[12px] font-bold active:scale-[0.98] transition-transform disabled:opacity-60"
      title="이 식장 기준으로 다른 카테고리(스튜디오·드레스 등) 추천을 정렬합니다"
    >
      {saving ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <MapPin className="w-3.5 h-3.5" />
      )}
      {hasOther ? "이 식장으로 바꾸기" : "이 식장으로 정하기"}
    </button>
  );
}
