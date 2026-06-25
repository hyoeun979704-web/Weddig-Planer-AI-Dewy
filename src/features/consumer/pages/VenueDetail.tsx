// Thin re-export — VendorDetailPage handles wedding_hall via WeddingHallExtras
// (hall_styles, meal_types, min/max_guarantee, food_tasting_available, ...).
// The legacy tabs (Info / Hall / Review) are dropped: place_halls has only 11
// rows, place_reviews has 0; both will return as in-layout sections once data
// is populated.
export { default } from "./VendorDetailPage";
