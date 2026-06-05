import { lazy, Suspense } from "react";
import { PWAUpdatePrompt } from "@/components/PWAUpdatePrompt";
import SessionTracker from "@/components/SessionTracker";
import GenerationNotifier from "@/components/GenerationNotifier";
import TutorialWelcomeSheet from "@/components/tutorial/TutorialWelcomeSheet";
import WeddingBlessingSplash from "@/components/WeddingBlessingSplash";
import AdminGuard from "@/components/admin/AdminGuard";
import BusinessGuard from "@/components/business/BusinessGuard";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "next-themes";

// Lazy-loaded pages
const MergeGame = lazy(() => import("./pages/MergeGame"));
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Studios = lazy(() => import("./pages/Studios"));
const StudioDetail = lazy(() => import("./pages/StudioDetail"));
const Jewelry = lazy(() => import("./pages/Jewelry"));
const JewelryDetail = lazy(() => import("./pages/JewelryDetail"));
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
const Tips = lazy(() => import("./pages/Tips"));
const Gallery = lazy(() => import("./pages/Gallery"));
const AIPlanner = lazy(() => import("./pages/AIPlanner"));
const Budget = lazy(() => import("./pages/Budget"));
const BudgetHistory = lazy(() => import("./pages/BudgetHistory"));
const BudgetCategoryDetail = lazy(() => import("./pages/BudgetCategoryDetail"));
const Schedule = lazy(() => import("./pages/Schedule"));
const AIStudio = lazy(() => import("./pages/AIStudio"));
const PhotoFix = lazy(() => import("./pages/PhotoFix"));
const PhotoFixResult = lazy(() => import("./pages/PhotoFixResult"));
const WeddingConsulting = lazy(() => import("./pages/WeddingConsulting"));
const ConsultingResult = lazy(() => import("./pages/ConsultingResult"));
const Community = lazy(() => import("./pages/Community"));
const CommunityWrite = lazy(() => import("./pages/CommunityWrite"));
const CommunityEdit = lazy(() => import("./pages/CommunityEdit"));
const CommunityPostDetail = lazy(() => import("./pages/CommunityPostDetail"));
const BookmarkedPosts = lazy(() => import("./pages/BookmarkedPosts"));
const CommunityNotifications = lazy(() => import("./pages/CommunityNotifications"));
const MyPage = lazy(() => import("./pages/MyPage"));
const Points = lazy(() => import("./pages/Points"));
const HeartCharge = lazy(() => import("./pages/HeartCharge"));
const HeartChargeSuccess = lazy(() => import("./pages/HeartChargeSuccess"));
const HeartChargeFail = lazy(() => import("./pages/HeartChargeFail"));
const Referral = lazy(() => import("./pages/Referral"));
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
const VendorList = lazy(() => import("./pages/VendorList"));
const VendorDetailPage = lazy(() => import("./pages/VendorDetailPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PremiumContent = lazy(() => import("./pages/PremiumContent"));
const Premium = lazy(() => import("./pages/Premium"));
const CoupleVote = lazy(() => import("./pages/CoupleVote"));
const CoupleVoteDetail = lazy(() => import("./pages/CoupleVoteDetail"));
const BudgetSplitSimulator = lazy(() => import("./pages/BudgetSplitSimulator"));
const Tutorial = lazy(() => import("./pages/Tutorial"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const AccountDeletion = lazy(() => import("./pages/AccountDeletion"));
const LocationTerms = lazy(() => import("./pages/LocationTerms"));
const DressFitting = lazy(() => import("./pages/DressFitting"));
const DressFittingResult = lazy(() => import("./pages/DressFittingResult"));
const DressFittingGallery = lazy(() => import("./pages/DressFittingGallery"));
const MakeupFitting = lazy(() => import("./pages/MakeupFitting"));
const MakeupFittingResult = lazy(() => import("./pages/MakeupFittingResult"));
const MakeupFittingGallery = lazy(() => import("./pages/MakeupFittingGallery"));
const DressRecommend = lazy(() => import("./pages/DressRecommend"));
const MakeupRecommend = lazy(() => import("./pages/MakeupRecommend"));
const InvitationFlow = lazy(() => import("./pages/invitation/InvitationFlow"));
const InvitationStudio = lazy(() => import("./pages/invitation/InvitationStudio"));
const InvitationGallery = lazy(() => import("./pages/invitation/InvitationGallery"));
const InvitationViewer = lazy(() => import("./pages/invitation/InvitationViewer"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminDressSamples = lazy(() => import("./pages/admin/AdminDressSamples"));
const AdminContentReview = lazy(() => import("./pages/admin/AdminContentReview"));
const AdminPlaceEdit = lazy(() => import("./pages/admin/AdminPlaceEdit"));
const AdminPlaces = lazy(() => import("./pages/admin/AdminPlaces"));
const AdminTipInstagrams = lazy(() => import("./pages/admin/AdminTipInstagrams"));
const AdminInstagramPosts = lazy(() => import("./pages/admin/AdminInstagramPosts"));
const AdminInstagramPostEdit = lazy(() => import("./pages/admin/AdminInstagramPostEdit"));
const AdminMakeupSamples = lazy(() => import("./pages/admin/AdminMakeupSamples"));
const AdminInvitationTemplates = lazy(() => import("./pages/admin/AdminInvitationTemplates"));
const AdminInvitationAssets = lazy(() => import("./pages/admin/AdminInvitationAssets"));
const AdminInvitationFonts = lazy(() => import("./pages/admin/AdminInvitationFonts"));
const AdminWeddingPhotoRefs = lazy(() => import("./pages/admin/AdminWeddingPhotoRefs"));
const AdminServiceWaitlist = lazy(() => import("./pages/admin/AdminServiceWaitlist"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminBusinessReview = lazy(() => import("./pages/admin/AdminBusinessReview"));
const AdminProductCuration = lazy(() => import("./pages/admin/AdminProductCuration"));
const AdminFeaturedProducts = lazy(() => import("./pages/admin/AdminFeaturedProducts"));

// 기능 1: 커플 일정 공유 + 공유 일기
const CoupleDiary = lazy(() => import("./pages/CoupleDiary"));
const CoupleDiaryWrite = lazy(() => import("./pages/CoupleDiaryWrite"));

// 기능 2: 인플루언서 소개
const Influencers = lazy(() => import("./pages/Influencers"));
const InfluencerDetail = lazy(() => import("./pages/InfluencerDetail"));

// 기능 3: 업체 제휴 혜택
const Deals = lazy(() => import("./pages/Deals"));
const DealDetail = lazy(() => import("./pages/DealDetail"));

// 진행중 이벤트 모음 (가입 혜택·미션·초대 등)
const Events = lazy(() => import("./pages/Events"));

// 기능 4: 쇼핑 결제 플로우
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const OrderComplete = lazy(() => import("./pages/OrderComplete"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PaymentFail = lazy(() => import("./pages/PaymentFail"));
const SubscriptionCheckout = lazy(() => import("./pages/SubscriptionCheckout"));
const SubscriptionPaymentSuccess = lazy(() => import("./pages/SubscriptionPaymentSuccess"));
const SubscriptionPaymentFail = lazy(() => import("./pages/SubscriptionPaymentFail"));

// 기업회원 플로우
const BusinessOnboard = lazy(() => import("./pages/business/BusinessOnboard"));
const BusinessDashboard = lazy(() => import("./pages/business/BusinessDashboard"));
const BusinessVendorEdit = lazy(() => import("./pages/business/BusinessVendorEdit"));
const BusinessGallery = lazy(() => import("./pages/business/BusinessGallery"));
const BusinessCoupons = lazy(() => import("./pages/business/BusinessCoupons"));
const BusinessEvents = lazy(() => import("./pages/business/BusinessEvents"));
const BusinessProducts = lazy(() => import("./pages/business/BusinessProducts"));
const BusinessInquiries = lazy(() => import("./pages/business/BusinessInquiries"));

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
        <SessionTracker />
        <WeddingBlessingSplash />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/studios" element={<Studios />} />
              <Route path="/studio/:id" element={<StudioDetail />} />
              <Route path="/jewelry" element={<Jewelry />} />
              <Route path="/jewelry/:id" element={<JewelryDetail />} />
              {/* 옛 URL backward-compat redirect — 외부 링크/북마크 보호 */}
              <Route path="/honeymoon-gifts" element={<Navigate to="/jewelry" replace />} />
              <Route path="/honeymoon-gifts/:id" element={<Navigate to="/jewelry" replace />} />
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
              <Route path="/tips" element={<Tips />} />
              <Route path="/magazine" element={<Navigate to="/tips" replace />} />
              <Route path="/gallery" element={<Gallery />} />
              <Route path="/ai-planner" element={<AIPlanner />} />
              <Route path="/budget" element={<Budget />} />
              <Route path="/budget/history" element={<BudgetHistory />} />
              <Route path="/budget/category/:category" element={<BudgetCategoryDetail />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/ai-studio" element={<AIStudio />} />
              <Route path="/community" element={<Community />} />
              <Route path="/community/write" element={<CommunityWrite />} />
              <Route path="/community/bookmarks" element={<BookmarkedPosts />} />
              <Route path="/community/notifications" element={<CommunityNotifications />} />
              <Route path="/community/:id" element={<CommunityPostDetail />} />
              <Route path="/community/:id/edit" element={<CommunityEdit />} />
              <Route path="/mypage" element={<MyPage />} />
              <Route path="/points" element={<Points />} />
              <Route path="/points/charge" element={<HeartCharge />} />
              <Route path="/points/charge/success" element={<HeartChargeSuccess />} />
              <Route path="/points/charge/fail" element={<HeartChargeFail />} />
              <Route path="/referral" element={<Referral />} />
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
              <Route path="/vendors/:category" element={<VendorList />} />
              <Route path="/vendor/:id" element={<VendorDetailPage />} />
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
              <Route path="/events" element={<Events />} />

              {/* 기능 4: 쇼핑 결제 플로우 */}
              <Route path="/store/:id" element={<ProductDetail />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/order-complete/:id" element={<OrderComplete />} />
              <Route path="/payment/success" element={<PaymentSuccess />} />
              <Route path="/payment/fail" element={<PaymentFail />} />
              <Route path="/premium/subscribe" element={<SubscriptionCheckout />} />
              <Route path="/premium/payment/success" element={<SubscriptionPaymentSuccess />} />
              <Route path="/premium/payment/fail" element={<SubscriptionPaymentFail />} />

              {/* 프리미엄 콘텐츠 */}
              <Route path="/premium/content" element={<PremiumContent />} />

              {/* 꽃 머지 퍼즐 게임 */}
              <Route path="/merge-game" element={<MergeGame />} />

              {/* 기업회원 플로우 */}
              <Route path="/business/onboard" element={<BusinessOnboard />} />
              <Route path="/business/dashboard" element={<BusinessGuard><BusinessDashboard /></BusinessGuard>} />
              <Route path="/business/edit" element={<BusinessGuard><BusinessVendorEdit /></BusinessGuard>} />
              <Route path="/business/gallery" element={<BusinessGuard><BusinessGallery /></BusinessGuard>} />
              <Route path="/business/coupons" element={<BusinessGuard><BusinessCoupons /></BusinessGuard>} />
              <Route path="/business/events" element={<BusinessGuard><BusinessEvents /></BusinessGuard>} />
              <Route path="/business/products" element={<BusinessGuard><BusinessProducts /></BusinessGuard>} />
              <Route path="/business/inquiries" element={<BusinessGuard><BusinessInquiries /></BusinessGuard>} />

              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/account-deletion" element={<AccountDeletion />} />
              <Route path="/location-terms" element={<LocationTerms />} />
              <Route path="/ai-studio/photo-fix" element={<PhotoFix />} />
              <Route path="/ai-studio/photo-fix/result/:id" element={<PhotoFixResult />} />
              <Route path="/ai-studio/consulting" element={<WeddingConsulting />} />
              <Route path="/ai-studio/consulting/result/:id" element={<ConsultingResult />} />
              <Route path="/ai-studio/dress-tour" element={<DressFitting />} />
              <Route path="/ai-studio/dress-tour/result/:id" element={<DressFittingResult />} />
              <Route path="/ai-studio/dress-tour/gallery" element={<DressFittingGallery />} />
              <Route path="/ai-studio/makeup-room" element={<MakeupFitting />} />
              <Route path="/ai-studio/makeup-room/result/:id" element={<MakeupFittingResult />} />
              <Route path="/ai-studio/makeup-room/gallery" element={<MakeupFittingGallery />} />
              <Route path="/ai-studio/dress-tour/recommend" element={<DressRecommend />} />
              <Route path="/ai-studio/makeup-room/recommend" element={<MakeupRecommend />} />
              <Route path="/invitation/my" element={<InvitationGallery />} />
              <Route path="/invitation/new" element={<InvitationFlow />} />
              <Route path="/invitation/:id/edit" element={<InvitationStudio />} />
              <Route path="/i/:slug" element={<InvitationViewer />} />
              {/* 관리자 라우트는 가드를 라우트 레벨에 둔다 — 페이지가 마운트되기
                  전에 권한을 확인해, 비관리자가 데이터 fetch 를 트리거하거나 잠깐
                  내용을 보는 것을 막는다. */}
              <Route path="/admin" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
              <Route path="/admin/content-review" element={<AdminGuard><AdminContentReview /></AdminGuard>} />
              <Route path="/admin/places" element={<AdminGuard><AdminPlaces /></AdminGuard>} />
              <Route path="/admin/places/:id" element={<AdminGuard><AdminPlaceEdit /></AdminGuard>} />
              <Route path="/admin/tip-instagrams" element={<AdminGuard><AdminTipInstagrams /></AdminGuard>} />
              <Route path="/admin/instagram-posts" element={<AdminGuard><AdminInstagramPosts /></AdminGuard>} />
              <Route path="/admin/instagram-posts/:id" element={<AdminGuard><AdminInstagramPostEdit /></AdminGuard>} />
              <Route path="/admin/dress-samples" element={<AdminGuard><AdminDressSamples /></AdminGuard>} />
              <Route path="/admin/makeup-samples" element={<AdminGuard><AdminMakeupSamples /></AdminGuard>} />
              <Route path="/admin/invitation-templates" element={<AdminGuard><AdminInvitationTemplates /></AdminGuard>} />
              <Route path="/admin/invitation-assets" element={<AdminGuard><AdminInvitationAssets /></AdminGuard>} />
              <Route path="/admin/invitation-fonts" element={<AdminGuard><AdminInvitationFonts /></AdminGuard>} />
              <Route path="/admin/wedding-photo-refs" element={<AdminGuard><AdminWeddingPhotoRefs /></AdminGuard>} />
              <Route path="/admin/service-waitlist" element={<AdminGuard><AdminServiceWaitlist /></AdminGuard>} />
              <Route path="/admin/users" element={<AdminGuard><AdminUsers /></AdminGuard>} />
              <Route path="/admin/reports" element={<AdminGuard><AdminReports /></AdminGuard>} />
              <Route path="/admin/business-review" element={<AdminGuard><AdminBusinessReview /></AdminGuard>} />
              <Route path="/admin/product-curation" element={<AdminGuard><AdminProductCuration /></AdminGuard>} />
              <Route path="/admin/featured-products" element={<AdminGuard><AdminFeaturedProducts /></AdminGuard>} />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          {/* First-time tutorial welcome sheet — uses useNavigate so it
              must live inside BrowserRouter. Self-gates on user + onboarding. */}
          <TutorialWelcomeSheet />
          {/* 생성 기능 백그라운드 잡 완료 알림(컨설팅/드레스/메이크업/사진보정). */}
          <GenerationNotifier />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
