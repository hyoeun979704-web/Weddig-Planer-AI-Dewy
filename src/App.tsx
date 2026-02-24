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
const Budget = lazy(() => import("./pages/Budget"));
const BudgetHistory = lazy(() => import("./pages/BudgetHistory"));
const BudgetCategoryDetail = lazy(() => import("./pages/BudgetCategoryDetail"));
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
const PremiumContent = lazy(() => import("./pages/PremiumContent"));
const Premium = lazy(() => import("./pages/Premium"));
const CoupleVote = lazy(() => import("./pages/CoupleVote"));
const CoupleVoteDetail = lazy(() => import("./pages/CoupleVoteDetail"));
const BudgetSplitSimulator = lazy(() => import("./pages/BudgetSplitSimulator"));
const Tutorial = lazy(() => import("./pages/Tutorial"));

// 기능 1: 커플 일정 공유 + 공유 일기
const CoupleDiary = lazy(() => import("./pages/CoupleDiary"));
const CoupleDiaryWrite = lazy(() => import("./pages/CoupleDiaryWrite"));

// 기능 2: 인플루언서 소개
const Influencers = lazy(() => import("./pages/Influencers"));
const InfluencerDetail = lazy(() => import("./pages/InfluencerDetail"));

// 기능 3: 업체 제휴 혜택
const Deals = lazy(() => import("./pages/Deals"));
const DealDetail = lazy(() => import("./pages/DealDetail"));

// 기능 4: 쇼핑 결제 플로우
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const OrderComplete = lazy(() => import("./pages/OrderComplete"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PaymentFail = lazy(() => import("./pages/PaymentFail"));

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
              <Route path="/budget" element={<Budget />} />
              <Route path="/budget/history" element={<BudgetHistory />} />
              <Route path="/budget/category/:category" element={<BudgetCategoryDetail />} />
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
              <Route path="/profile" element={<Profile />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/my-inquiries" element={<MyInquiries />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/invitation-venues" element={<InvitationVenues />} />
              <Route path="/invitation-venues/:id" element={<InvitationVenueDetail />} />
              <Route path="/premium" element={<Premium />} />
              <Route path="/couple-vote" element={<CoupleVote />} />
              <Route path="/couple-vote/:id" element={<CoupleVoteDetail />} />
              <Route path="/budget/split-simulator" element={<BudgetSplitSimulator />} />
              <Route path="/tutorial" element={<Tutorial />} />

              {/* 기능 1: 커플 일정 공유 + 공유 일기 */}
              <Route path="/couple-diary" element={<CoupleDiary />} />
              <Route path="/couple-diary/write" element={<CoupleDiaryWrite />} />
              <Route path="/couple-diary/edit/:id" element={<CoupleDiaryWrite />} />

              {/* 기능 2: 인플루언서 소개 */}
              <Route path="/influencers" element={<Influencers />} />
              <Route path="/influencers/:id" element={<InfluencerDetail />} />

              {/* 기능 3: 업체 제휴 혜택 */}
              <Route path="/deals" element={<Deals />} />
              <Route path="/deals/:id" element={<DealDetail />} />

              {/* 기능 4: 쇼핑 결제 플로우 */}
              <Route path="/store/:id" element={<ProductDetail />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/order-complete/:id" element={<OrderComplete />} />
              <Route path="/payment/success" element={<PaymentSuccess />} />
              <Route path="/payment/fail" element={<PaymentFail />} />

              {/* 프리미엄 콘텐츠 */}
              <Route path="/premium/content" element={<PremiumContent />} />

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
