import { lazy, Suspense } from "react";
import { PWAUpdatePrompt } from "@/components/PWAUpdatePrompt";
import WeddingBlessingSplash from "@/components/WeddingBlessingSplash";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "next-themes";
import CoupleDiary from "./pages/CoupleDiary";
import CoupleDiaryWrite from "./pages/CoupleDiaryWrite";
import Influencers from "./pages/Influencers";
import InfluencerDetail from "./pages/InfluencerDetail";
import Deals from "./pages/Deals";
import DealDetail from "./pages/DealDetail";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderComplete from "./pages/OrderComplete";

// Lazy-loaded pages
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Studios = lazy(() => import("./pages/Studios"));
const StudioDetail = lazy(() => import("./pages/StudioDetail"));
const HoneymoonGifts = lazy(() => import("./pages/HoneymoonGifts"));
const HoneymoonGiftDetail = lazy(() => import("./pages/HoneymoonGiftDetail"));
const Honeymoon = lazy(() => import("./pages/Honeymoon"));
const HoneymoonDetail = lazy(() => import("./pages/HoneymoonDetail"));
const Appliances = lazy(() => import("./pages/Appliances"));
const ApplianceDetail = lazy(() => import("./pages/ApplianceDetail"));
const Suit = lazy(() => import("./pages/Suit"));
const SuitDetail = lazy(() => import("./pages/SuitDetail"));
const Hanbok = lazy(() => import("./pages/Hanbok"));
const HanbokDetail = lazy(() => import("./pages/HanbokDetail"));
const Venues = lazy(() => import("./pages/Venues"));
const VenueDetail = lazy(() => import("./pages/VenueDetail"));
const Favorites = lazy(() => import("./pages/Favorites"));
const Store = lazy(() => import("./pages/Store"));
const More = lazy(() => import("./pages/More"));
const Magazine = lazy(() => import("./pages/Magazine"));
const Reviews = lazy(() => import("./pages/Reviews"));
const Gallery = lazy(() => import("./pages/Gallery"));
const AIPlanner = lazy(() => import("./pages/AIPlanner"));
const Schedule = lazy(() => import("./pages/Schedule"));
const AIStudio = lazy(() => import("./pages/AIStudio"));
const AIStudioService = lazy(() => import("./pages/AIStudioService"));
const Community = lazy(() => import("./pages/Community"));
const CommunityWrite = lazy(() => import("./pages/CommunityWrite"));
const CommunityEdit = lazy(() => import("./pages/CommunityEdit"));
const CommunityPostDetail = lazy(() => import("./pages/CommunityPostDetail"));
const BookmarkedPosts = lazy(() => import("./pages/BookmarkedPosts"));
const MyPage = lazy(() => import("./pages/MyPage"));
const Points = lazy(() => import("./pages/Points"));
const Coupons = lazy(() => import("./pages/Coupons"));
const Orders = lazy(() => import("./pages/Orders"));
const MySchedule = lazy(() => import("./pages/MySchedule"));
const Profile = lazy(() => import("./pages/Profile"));
const Notifications = lazy(() => import("./pages/Notifications"));
const MyInquiries = lazy(() => import("./pages/MyInquiries"));
const Contact = lazy(() => import("./pages/Contact"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Settings = lazy(() => import("./pages/Settings"));
const InvitationVenues = lazy(() => import("./pages/InvitationVenues"));
const InvitationVenueDetail = lazy(() => import("./pages/InvitationVenueDetail"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
        <PWAUpdatePrompt />
        <WeddingBlessingSplash />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/studios" element={<Studios />} />
              <Route path="/studio/:id" element={<StudioDetail />} />
              <Route path="/honeymoon-gifts" element={<HoneymoonGifts />} />
              <Route path="/honeymoon-gifts/:id" element={<HoneymoonGiftDetail />} />
              <Route path="/honeymoon" element={<Honeymoon />} />
              <Route path="/honeymoon/:id" element={<HoneymoonDetail />} />
              <Route path="/appliances" element={<Appliances />} />
              <Route path="/appliances/:id" element={<ApplianceDetail />} />
              <Route path="/suit" element={<Suit />} />
              <Route path="/suit/:id" element={<SuitDetail />} />
              <Route path="/hanbok" element={<Hanbok />} />
              <Route path="/hanbok/:id" element={<HanbokDetail />} />
              <Route path="/venues" element={<Venues />} />
              <Route path="/venue/:id" element={<VenueDetail />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/store" element={<Store />} />
              <Route path="/more" element={<More />} />
              <Route path="/magazine" element={<Magazine />} />
              <Route path="/reviews" element={<Reviews />} />
              <Route path="/gallery" element={<Gallery />} />
              <Route path="/ai-planner" element={<AIPlanner />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/ai-studio" element={<AIStudio />} />
              <Route path="/ai-studio/:service" element={<AIStudioService />} />
              <Route path="/community" element={<Community />} />
              <Route path="/community/write" element={<CommunityWrite />} />
              <Route path="/community/bookmarks" element={<BookmarkedPosts />} />
              <Route path="/community/:id" element={<CommunityPostDetail />} />
              <Route path="/community/:id/edit" element={<CommunityEdit />} />
              <Route path="/mypage" element={<MyPage />} />
              <Route path="/points" element={<Points />} />
              <Route path="/coupons" element={<Coupons />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/my-schedule" element={<MySchedule />} />
              <Route path="/couple-diary" element={<CoupleDiary />} />
              <Route path="/couple-diary/write" element={<CoupleDiaryWrite />} />
              <Route path="/couple-diary/edit/:id" element={<CoupleDiaryWrite />} />
              <Route path="/influencers" element={<Influencers />} />
              <Route path="/influencers/:id" element={<InfluencerDetail />} />
              <Route path="/deals" element={<Deals />} />
              <Route path="/deals/:id" element={<DealDetail />} />
              <Route path="/store/:id" element={<ProductDetail />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/order-complete/:id" element={<OrderComplete />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/my-inquiries" element={<MyInquiries />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/invitation-venues" element={<InvitationVenues />} />
              <Route path="/invitation-venues/:id" element={<InvitationVenueDetail />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
