import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import weddingHallImg from "@/assets/categories/wedding-hall.png";
import studioImg from "@/assets/categories/studio.png";
import hanbokImg from "@/assets/categories/hanbok.png";
import suitImg from "@/assets/categories/suit.png";
import honeymoonImg from "@/assets/categories/honeymoon.png";
import jewelryImg from "@/assets/categories/jewelry.png";
import applianceImg from "@/assets/categories/appliance.png";
import invitationImg from "@/assets/categories/invitation.png";

type ImageSrc = string | { src: string; width: number; height: number };

interface CategoryItem {
  label: string;
  image: ImageSrc;
  path: string;
  emoji: string;
  // When set, the tile is hidden if this skippable category is in
  // user_wedding_settings.excluded_categories. Tiles without this stay
  // visible for everyone (e.g. 신혼여행, 예물).
  excludeKey?: string;
}

const baseTiles: CategoryItem[] = [
  { label: "웨딩홀", image: weddingHallImg, path: "/venues", emoji: "", excludeKey: "wedding_hall" },
  { label: "스드메", image: studioImg, path: "/studios", emoji: "", excludeKey: "studio" },
  { label: "예복", image: suitImg, path: "/suit", emoji: "", excludeKey: "tailor_shop" },
  { label: "한복", image: hanbokImg, path: "/hanbok", emoji: "", excludeKey: "hanbok" },
  { label: "청첩장 모임", image: invitationImg, path: "/invitation-venues", emoji: "", excludeKey: "invitation_venue" },
  { label: "가전·혼수", image: applianceImg, path: "/appliances", emoji: "", excludeKey: "appliance" },
  { label: "예물·예단", image: jewelryImg, path: "/jewelry", emoji: "" },
  { label: "신혼여행", image: honeymoonImg, path: "/honeymoon", emoji: "", excludeKey: "honeymoon" },
];

// Style-specific replacement tiles surfaced in slots freed up by excluded
// categories — so self/small users see something tailored instead of holes
// in the grid. Paths reuse existing routes (community filter, store, etc.)
// so we don't add UI without destinations.
const SELF_EXTRA_TILES: CategoryItem[] = [
  { label: "DIY 청첩장", image: invitationImg, path: "/invitation-venues", emoji: "" },
  { label: "셀프 굿즈", image: applianceImg, path: "/store", emoji: "" },
  { label: "셀프 후기", image: studioImg, path: "/community?style=self", emoji: "" },
];

const SMALL_EXTRA_TILES: CategoryItem[] = [
  { label: "스몰 베뉴", image: invitationImg, path: "/invitation-venues", emoji: "" },
  { label: "답례품", image: applianceImg, path: "/store", emoji: "" },
  { label: "스몰 후기", image: weddingHallImg, path: "/community?style=small", emoji: "" },
];

// 페르소나별로 baseTiles 의 노출 우선순위를 다르게 합니다.
// self: DIY/직접 컨택 카테고리 위로. 큰 웨딩홀은 뒤로.
// small: 작은 베뉴·스드메·답례 위로.
// general/null: 기존 순서(이미 일반적 우선순위).
const TILE_PRIORITY: Record<"self" | "small", string[]> = {
  self: ["청첩장 모임", "예복", "한복", "스드메", "신혼여행", "예물·예단", "가전·혼수", "웨딩홀"],
  small: ["스드메", "한복", "예복", "청첩장 모임", "웨딩홀", "신혼여행", "예물·예단", "가전·혼수"],
};

const Tile = ({ item, onClick }: { item: CategoryItem; onClick: () => void }) => {
  const src = typeof item.image === "string" ? item.image : item.image.src;
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 group active:scale-95 transition-transform"
    >
      <div className="w-[68.25px] h-[68.25px] rounded-[20px] overflow-hidden bg-white flex items-center justify-center">
        <img
          src={src}
          alt={item.label}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.style.display = "none";
            e.currentTarget.parentElement!.innerHTML = `<span class="text-2xl flex items-center justify-center w-full h-full">${item.emoji}</span>`;
          }}
        />
      </div>
      <span className="text-caption leading-[15px] text-black text-center">
        {item.label}
      </span>
    </button>
  );
};

const HomeCategoryGrid = () => {
  const navigate = useNavigate();
  const { weddingSettings } = useWeddingSchedule();

  // Derive the tile list once per (style, exclusions) change.
  // 1) Hide excluded categories.
  // 2) For self/small, prepend persona-specific extras so DIY/스몰 베뉴
  //    같은 카테고리가 1행에 노출됩니다 (페르소나 인터뷰 결과).
  // 3) Reorder remaining base tiles per TILE_PRIORITY when style is set.
  const tiles = useMemo<CategoryItem[]>(() => {
    const excluded = new Set(weddingSettings.excluded_categories ?? []);
    const visible = baseTiles.filter(t => !t.excludeKey || !excluded.has(t.excludeKey));
    const style = weddingSettings.wedding_style;

    if (style !== "self" && style !== "small") return visible.slice(0, 8);

    // Per-style ordering of base tiles
    const priority = TILE_PRIORITY[style];
    const ordered = [...visible].sort((a, b) => {
      const ai = priority.indexOf(a.label);
      const bi = priority.indexOf(b.label);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

    // Persona extras lead so they hit the first row (positions 0~3).
    const extras = style === "self" ? SELF_EXTRA_TILES : SMALL_EXTRA_TILES;
    const merged = [...extras.slice(0, 2), ...ordered];
    return merged.slice(0, 8);
  }, [weddingSettings.excluded_categories, weddingSettings.wedding_style]);

  const row1 = tiles.slice(0, 4);
  const row2 = tiles.slice(4, 8);

  return (
    <>
      <section className="bg-[hsl(var(--pink-50))] px-[30px] pt-[30px] pb-[10px]">
        <div className="grid grid-cols-4 gap-x-5 gap-y-[5px]">
          {row1.map((cat) => (
            <Tile key={cat.label} item={cat} onClick={() => navigate(cat.path)} />
          ))}
        </div>
      </section>
      {row2.length > 0 && (
        <section className="bg-[hsl(var(--pink-50))] px-[30px] pt-[10px] pb-[30px]">
          <div className="grid grid-cols-4 gap-x-5 gap-y-[5px]">
            {row2.map((cat) => (
              <Tile key={cat.label} item={cat} onClick={() => navigate(cat.path)} />
            ))}
          </div>
        </section>
      )}
    </>
  );
};

export default HomeCategoryGrid;
