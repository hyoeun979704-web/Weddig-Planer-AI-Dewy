import { useEffect, useState } from "react";
import { Drawer } from "vaul";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Heart, X, Sparkles, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useStyleSwipeDeck } from "@/hooks/useStyleSwipeDeck";
import { useFavorites } from "@/hooks/useFavorites";
import { PLACE_CATEGORY_TO_ITEM_TYPE } from "@/lib/placeMappers";
import { PLACE_CATEGORY_LABEL } from "@/lib/categoryLabels";
import PlaceImagePlaceholder from "@/components/place/PlaceImagePlaceholder";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 예식 지역 — 덱을 내 지역 우선으로 큐레이션. */
  region: string | null;
}

/**
 * I1 — 온보딩 시각취향 seed. 스타일 카드를 한 장씩 보여주고 마음에 드는 것만 찜한다.
 * 찜은 기존 favorites 테이블에 정식 item_type(PLACE_CATEGORY_TO_ITEM_TYPE)으로 저장돼
 * 상세페이지·무드보드·홈 추천과 100% 동일하게 인식된다(별도 신호 테이블 없음). 좋아요는
 * 더하기만(toggle off 아님) — 스와이프 흐름을 끊지 않게 토스트 없이 조용히 insert 하고,
 * 끝에서 한 번 요약한다. 강제 아님(언제든 닫기/건너뛰기).
 */
const StyleSwipeSheet = ({ open, onOpenChange, region }: Props) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: deck = [], isLoading } = useStyleSwipeDeck(region, open);
  const { isFavorite } = useFavorites();

  const [index, setIndex] = useState(0);
  const [likedCount, setLikedCount] = useState(0);

  // 시트를 새로 열 때마다 진행 상태 초기화.
  useEffect(() => {
    if (open) {
      setIndex(0);
      setLikedCount(0);
    }
  }, [open]);

  const current = deck[index];
  const done = !isLoading && (deck.length === 0 || index >= deck.length);

  const advance = () => setIndex((i) => i + 1);

  const like = async () => {
    const card = current;
    advance(); // 낙관적으로 즉시 다음 카드(스와이프 체감).
    if (!card || !user) return;
    const itemType = PLACE_CATEGORY_TO_ITEM_TYPE[card.category_slug];
    if (!itemType) return;
    // 이미 찜한 항목이면 중복 insert 방지(다른 화면에서 먼저 찜한 경우).
    if (isFavorite(card.vendor_id, itemType)) return;
    setLikedCount((c) => c + 1);
    // 좋아요만(추가). 토스트는 흐름을 끊으므로 생략하고 끝에서 요약. 중복(이미 찜) 등
    // 에러는 조용히 무시하되 관측은 남긴다.
    const { error } = await (supabase as any).from("favorites").insert({
      user_id: user.id,
      item_id: card.vendor_id,
      item_type: itemType,
    });
    if (error) {
      console.warn("style swipe favorite insert failed", error);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["favorites", user.id] });
  };

  const close = () => onOpenChange(false);
  const goRecommendations = () => {
    onOpenChange(false);
    navigate("/favorites");
  };

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Drawer.Content className="bg-background flex flex-col rounded-t-[10px] h-[88%] mt-24 fixed bottom-0 left-0 right-0 app-col mx-auto z-50 focus:outline-none">
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <Drawer.Title className="text-[15px] font-bold text-foreground flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary" />
              취향 고르기
            </Drawer.Title>
            <button onClick={close} aria-label="닫기" className="p-1 text-muted-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 진행 표시 — 덱이 있고 아직 끝나지 않았을 때만. */}
          {!isLoading && deck.length > 0 && !done && (
            <div className="px-5 pb-2">
              <div className="h-1 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${(index / deck.length) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 text-right">
                {index + 1} / {deck.length}
              </p>
            </div>
          )}

          <div className="flex-1 overflow-hidden px-5 pb-[calc(1rem+var(--safe-bottom))] flex flex-col">
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : done ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <Heart className="w-7 h-7 text-primary fill-primary" />
                </div>
                {likedCount > 0 ? (
                  <>
                    <h3 className="text-[17px] font-bold text-foreground">
                      취향 {likedCount}개를 찜했어요!
                    </h3>
                    <p className="text-[13px] text-muted-foreground px-6">
                      찜한 스타일을 바탕으로 홈 추천이 더 정확해져요. 찜 목록에서 언제든 확인할 수 있어요.
                    </p>
                    <Button className="mt-2 h-11 px-6" onClick={goRecommendations}>
                      찜 목록 보러가기
                    </Button>
                    <button onClick={close} className="text-[12px] text-muted-foreground mt-1">
                      닫기
                    </button>
                  </>
                ) : (
                  <>
                    <h3 className="text-[17px] font-bold text-foreground">다음에 골라볼까요?</h3>
                    <p className="text-[13px] text-muted-foreground px-6">
                      마음에 드는 스타일을 찜하면 홈 추천이 내 취향으로 맞춰져요.
                    </p>
                    <Button variant="outline" className="mt-2 h-11 px-6" onClick={close}>
                      닫기
                    </Button>
                  </>
                )}
              </div>
            ) : current ? (
              <>
                {/* 스타일 카드 */}
                <div className="flex-1 min-h-0 rounded-2xl overflow-hidden border border-border bg-muted relative">
                  {current.thumbnail_url ? (
                    <img
                      src={current.thumbnail_url}
                      alt={current.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <PlaceImagePlaceholder category={current.category_slug} className="w-full h-full" />
                  )}
                  <div className="absolute top-3 left-3">
                    <span className="px-2 py-0.5 rounded-full bg-black/55 text-white text-[11px] font-semibold">
                      {PLACE_CATEGORY_LABEL[current.category_slug] ?? current.category_type}
                    </span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                    <p className="text-white text-[16px] font-bold leading-tight">{current.name}</p>
                    {current.region && (
                      <p className="text-white/80 text-[12px] mt-0.5 flex items-center gap-0.5">
                        <MapPin className="w-3 h-3" />
                        {current.region}
                      </p>
                    )}
                  </div>
                </div>

                {/* 액션 */}
                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1 h-12 gap-1.5"
                    onClick={advance}
                  >
                    <X className="w-4 h-4" />
                    건너뛰기
                  </Button>
                  <Button className="flex-[1.5] h-12 gap-1.5" onClick={() => void like()}>
                    <Heart className="w-4 h-4" />
                    마음에 들어요
                  </Button>
                </div>
              </>
            ) : null}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};

export default StyleSwipeSheet;
