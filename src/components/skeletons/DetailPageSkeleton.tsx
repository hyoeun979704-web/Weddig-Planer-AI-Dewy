import AppLayout from "@/components/AppLayout";

/**
 * Generic skeleton for /xxx/:id detail pages — hero image, title/meta,
 * body paragraphs, sticky bottom CTA. Used by DealDetail / ProductDetail /
 * InfluencerDetail so all three feel the same on first paint.
 *
 * Layout-matching skeletons keep the page silhouette stable while data
 * loads, instead of the silhouette popping in after a centered spinner.
 */
const DetailPageSkeleton = () => (
  <AppLayout hideCategoryTabBar mainClassName="">
    <div className="sticky top-14 z-30 bg-background/80 backdrop-blur-md border-b border-border h-14" />

    {/* Hero / cover image */}
    <div className="aspect-[16/10] bg-muted animate-pulse" />

    <div className="px-4 pt-4 space-y-3">
      <div className="flex gap-2">
        <div className="h-5 w-14 rounded-full bg-muted animate-pulse" />
        <div className="h-5 w-20 rounded-full bg-muted animate-pulse" />
      </div>
      <div className="h-6 w-3/4 rounded bg-muted animate-pulse" />
      <div className="h-4 w-1/3 rounded bg-muted animate-pulse" />
    </div>

    <div className="px-4 mt-6 space-y-2.5">
      <div className="h-3.5 w-full rounded bg-muted animate-pulse" />
      <div className="h-3.5 w-full rounded bg-muted animate-pulse" />
      <div className="h-3.5 w-5/6 rounded bg-muted animate-pulse" />
      <div className="h-3.5 w-2/3 rounded bg-muted animate-pulse" />
    </div>
  </AppLayout>
);

export default DetailPageSkeleton;
