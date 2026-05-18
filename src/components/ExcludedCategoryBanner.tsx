import { Info } from "lucide-react";
import { Link } from "react-router-dom";
import { useWeddingProfile } from "@/hooks/useWeddingProfile";
import {
  WEDDING_STYLE_LABEL,
  CATEGORY_LABELS,
  type SkippableCategory,
} from "@/lib/weddingStyle";

interface Props {
  // One or more schedule-side category slugs this page covers. The
  // banner is rendered only when at least one is in the user's
  // excluded_categories — pages where the user has opted out shouldn't
  // greet them with a wall of irrelevant vendors and no acknowledgment.
  //
  // Example: Studios page covers studio + dress_shop + makeup_shop; for
  // a self-wedding user (excludes all three) the banner lists all three.
  scheduleCategories: SkippableCategory | ReadonlyArray<SkippableCategory>;
}

// Contextual info banner shown when the user lands on a vendor category
// page they've explicitly opted out of (via wedding_style presets or
// manual exclusion). The page content is still rendered below so users
// who deep-linked or changed their mind have an escape hatch — same
// philosophy as the Tips search bypass.
export default function ExcludedCategoryBanner({ scheduleCategories }: Props) {
  const { weddingStyle, excludedCategories } = useWeddingProfile();
  const cats = Array.isArray(scheduleCategories)
    ? scheduleCategories
    : [scheduleCategories];
  const matched = cats.filter((c) => excludedCategories.includes(c));
  if (matched.length === 0) return null;

  const labels = matched.map((c) => CATEGORY_LABELS[c].label).join("·");
  const styleLabel = WEDDING_STYLE_LABEL[weddingStyle];

  return (
    <div
      role="status"
      className="mx-4 mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 flex gap-2"
    >
      <Info
        className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5"
        aria-hidden="true"
      />
      <div className="text-caption leading-relaxed">
        <p className="font-medium text-amber-900">
          {styleLabel}이라 <b>{labels}</b>을(를) 제외하셨어요.
        </p>
        <p className="text-amber-700 mt-0.5">
          둘러보시는 건 자유예요. 설정은{" "}
          <Link to="/profile" className="underline font-medium">
            프로필
          </Link>
          에서 바꿀 수 있어요.
        </p>
      </div>
    </div>
  );
}
