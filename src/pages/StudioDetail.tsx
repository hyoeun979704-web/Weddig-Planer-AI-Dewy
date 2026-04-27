// Thin re-export — VendorDetailPage handles all categories via its
// CategoryExtras dispatch (renders shoot_styles / total_photos / etc. for
// studio rows). The /studio/:id route remains for direct linking + back-compat.
export { default } from "./VendorDetailPage";
