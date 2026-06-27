import { lazy, Suspense } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PWAUpdatePrompt } from "@/components/PWAUpdatePrompt";
import SessionTracker from "@/components/SessionTracker";
import GenerationNotifier from "@/components/GenerationNotifier";
import { ConfirmDialogHost } from "@/components/ui/confirm-dialog";
import { AmountPromptHost } from "@/components/ui/amount-prompt";
import WidgetBridgeHost from "@/components/native/WidgetBridgeHost";
import TutorialWelcomeSheet from "@/components/tutorial/TutorialWelcomeSheet";
import WeddingBlessingSplash from "@/components/WeddingBlessingSplash";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { aeoGuides } from "./data/aeoGuides";
import { DESIGN_MARKET_ENABLED } from "@/lib/featureFlags";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "next-themes";

// Lazy-loaded pages
const MergeGame = lazy(() => import("@/features/consumer/pages/MergeGame"));
const Index = lazy(() => import("@/features/consumer/pages/Index"));
const BlogList = lazy(() => import("@/features/consumer/pages/BlogList"));
const BlogPost = lazy(() => import("@/features/consumer/pages/BlogPost"));
const Auth = lazy(() => import("@/features/consumer/pages/Auth"));
const Studios = lazy(() => import("@/features/consumer/pages/Studios"));
const StudioDetail = lazy(() => import("@/features/consumer/pages/StudioDetail"));
const Jewelry = lazy(() => import("@/features/consumer/pages/Jewelry"));
const JewelryDetail = lazy(() => import("@/features/consumer/pages/JewelryDetail"));
const Honeymoon = lazy(() => import("@/features/consumer/pages/Honeymoon"));
const HoneymoonDetail = lazy(() => import("@/features/consumer/pages/HoneymoonDetail"));
const Appliances = lazy(() => import("@/features/consumer/pages/Appliances"));
const ApplianceDetail = lazy(() => import("@/features/consumer/pages/ApplianceDetail"));
const Suit = lazy(() => import("@/features/consumer/pages/Suit"));
const SuitDetail = lazy(() => import("@/features/consumer/pages/SuitDetail"));
const Hanbok = lazy(() => import("@/features/consumer/pages/Hanbok"));
const HanbokDetail = lazy(() => import("@/features/consumer/pages/HanbokDetail"));
const Venues = lazy(() => import("@/features/consumer/pages/Venues"));
const VenueDetail = lazy(() => import("@/features/consumer/pages/VenueDetail"));
const Favorites = lazy(() => import("@/features/consumer/pages/Favorites"));
const Store = lazy(() => import("@/features/consumer/pages/Store"));
const Tips = lazy(() => import("@/features/consumer/pages/Tips"));
const Gallery = lazy(() => import("@/features/consumer/pages/Gallery"));
const AIPlanner = lazy(() => import("@/features/consumer/pages/AIPlanner"));
const Budget = lazy(() => import("@/features/consumer/pages/Budget"));
const BudgetHistory = lazy(() => import("@/features/consumer/pages/BudgetHistory"));
const BudgetCategoryDetail = lazy(() => import("@/features/consumer/pages/BudgetCategoryDetail"));
const Schedule = lazy(() => import("@/features/consumer/pages/Schedule"));
const AIStudio = lazy(() => import("@/features/consumer/pages/AIStudio"));
const WeddingConsulting = lazy(() => import("@/features/consumer/pages/WeddingConsulting"));
const ConsultingResult = lazy(() => import("@/features/consumer/pages/ConsultingResult"));
const ConsultingGallery = lazy(() => import("@/features/consumer/pages/ConsultingGallery"));
const MyResults = lazy(() => import("@/features/consumer/pages/MyResults"));
const WeddingWrapped = lazy(() => import("@/features/consumer/pages/WeddingWrapped"));
const QuoteNew = lazy(() => import("@/features/consumer/pages/QuoteNew"));
const QuoteList = lazy(() => import("@/features/consumer/pages/QuoteList"));
const QuoteDetail = lazy(() => import("@/features/consumer/pages/QuoteDetail"));
const QuoteThread = lazy(() => import("@/features/consumer/pages/QuoteThread"));
const MyDeliveries = lazy(() => import("@/features/consumer/pages/MyDeliveries"));
const TasteQuiz = lazy(() => import("@/features/consumer/pages/TasteQuiz"));
const MailInbox = lazy(() => import("@/features/consumer/pages/MailInbox"));
const InvitationMarket = lazy(() => import("@/features/consumer/pages/invitation/InvitationMarket"));
const VendorBoard = lazy(() => import("@/features/consumer/pages/VendorBoard"));
const VendorCompare = lazy(() => import("@/features/consumer/pages/VendorCompare"));
const HairPreview = lazy(() => import("@/features/consumer/pages/HairPreview"));
const HairPreviewResult = lazy(() => import("@/features/consumer/pages/HairPreviewResult"));
const HairPreviewGallery = lazy(() => import("@/features/consumer/pages/HairPreviewGallery"));
const SdmPreview = lazy(() => import("@/features/consumer/pages/SdmPreview"));
const SdmPreviewResult = lazy(() => import("@/features/consumer/pages/SdmPreviewResult"));
const Community = lazy(() => import("@/features/consumer/pages/Community"));
const CommunityWrite = lazy(() => import("@/features/consumer/pages/CommunityWrite"));
const CommunityEdit = lazy(() => import("@/features/consumer/pages/CommunityEdit"));
const CommunityPostDetail = lazy(() => import("@/features/consumer/pages/CommunityPostDetail"));
const BookmarkedPosts = lazy(() => import("@/features/consumer/pages/BookmarkedPosts"));
const CommunityNotifications = lazy(() => import("@/features/consumer/pages/CommunityNotifications"));
const MyPage = lazy(() => import("@/features/consumer/pages/MyPage"));
const Points = lazy(() => import("@/features/consumer/pages/Points"));
const HeartCharge = lazy(() => import("@/features/consumer/pages/HeartCharge"));
const HeartChargeSuccess = lazy(() => import("@/features/consumer/pages/HeartChargeSuccess"));
const HeartChargeFail = lazy(() => import("@/features/consumer/pages/HeartChargeFail"));
const Referral = lazy(() => import("@/features/consumer/pages/Referral"));
const Coupons = lazy(() => import("@/features/consumer/pages/Coupons"));
const Orders = lazy(() => import("@/features/consumer/pages/Orders"));
const MySchedule = lazy(() => import("@/features/consumer/pages/MySchedule"));
const Profile = lazy(() => import("@/features/consumer/pages/Profile"));
const Notifications = lazy(() => import("@/features/consumer/pages/Notifications"));
const AppNotifications = lazy(() => import("@/features/consumer/pages/AppNotifications"));
const MyInquiries = lazy(() => import("@/features/consumer/pages/MyInquiries"));
const Contact = lazy(() => import("@/features/consumer/pages/Contact"));
const FAQ = lazy(() => import("@/features/consumer/pages/FAQ"));
const Settings = lazy(() => import("@/features/consumer/pages/Settings"));
const BlockedUsers = lazy(() => import("@/features/consumer/pages/BlockedUsers"));
const InvitationVenues = lazy(() => import("@/features/consumer/pages/InvitationVenues"));
const InvitationVenueDetail = lazy(() => import("@/features/consumer/pages/InvitationVenueDetail"));
const VendorList = lazy(() => import("@/features/consumer/pages/VendorList"));
const VendorDetailPage = lazy(() => import("@/features/consumer/pages/VendorDetailPage"));
const NotFound = lazy(() => import("@/features/consumer/pages/NotFound"));
const Guide = lazy(() => import("@/features/consumer/pages/Guide"));
const ConsumerGuideIndex = lazy(() => import("@/features/consumer/pages/ConsumerGuideIndex"));
const ConsumerGuideDetail = lazy(() => import("@/features/consumer/pages/ConsumerGuideDetail"));
const Beta = lazy(() => import("@/features/consumer/pages/Beta"));
const PremiumContent = lazy(() => import("@/features/consumer/pages/PremiumContent"));
const Premium = lazy(() => import("@/features/consumer/pages/Premium"));
const CoupleVote = lazy(() => import("@/features/consumer/pages/CoupleVote"));
const CoupleVoteDetail = lazy(() => import("@/features/consumer/pages/CoupleVoteDetail"));
const BudgetSplitSimulator = lazy(() => import("@/features/consumer/pages/BudgetSplitSimulator"));
const Tutorial = lazy(() => import("@/features/consumer/pages/Tutorial"));
const Terms = lazy(() => import("@/features/consumer/pages/Terms"));
const Privacy = lazy(() => import("@/features/consumer/pages/Privacy"));
const OssLicenses = lazy(() => import("@/features/consumer/pages/OssLicenses"));
const TagResults = lazy(() => import("@/features/consumer/pages/TagResults"));
const AccountDeletion = lazy(() => import("@/features/consumer/pages/AccountDeletion"));
const LocationTerms = lazy(() => import("@/features/consumer/pages/LocationTerms"));
const DressFitting = lazy(() => import("@/features/consumer/pages/DressFitting"));
const DressFittingResult = lazy(() => import("@/features/consumer/pages/DressFittingResult"));
const DressFittingGallery = lazy(() => import("@/features/consumer/pages/DressFittingGallery"));
const MakeupFitting = lazy(() => import("@/features/consumer/pages/MakeupFitting"));
const MakeupFittingResult = lazy(() => import("@/features/consumer/pages/MakeupFittingResult"));
const MakeupFittingGallery = lazy(() => import("@/features/consumer/pages/MakeupFittingGallery"));
const DressRecommend = lazy(() => import("@/features/consumer/pages/DressRecommend"));
const MakeupRecommend = lazy(() => import("@/features/consumer/pages/MakeupRecommend"));
const InvitationFlow = lazy(() => import("@/features/consumer/pages/invitation/InvitationFlow"));
const InvitationStudio = lazy(() => import("@/features/consumer/pages/invitation/InvitationStudio"));
const InvitationGallery = lazy(() => import("@/features/consumer/pages/invitation/InvitationGallery"));
const InvitationViewer = lazy(() => import("@/features/consumer/pages/invitation/InvitationViewer"));
const MobileInvitationView2 = lazy(() => import("@/features/consumer/pages/invitation/MobileInvitationView2"));
const InvitationRsvpDashboard = lazy(() => import("@/features/consumer/pages/invitation/InvitationRsvpDashboard"));
const InvitationPhotos = lazy(() => import("@/features/consumer/pages/invitation/InvitationPhotos"));
const GuestPhotoUpload = lazy(() => import("@/features/consumer/pages/invitation/GuestPhotoUpload"));
// 운영자(console) 도메인 — App.tsx 는 /admin/* 한 줄로 위임. admin 페이지 lazy·가드는
// 라우트 모듈(@/features/console/routes)이 소유한다(도메인 경계).
const ConsoleRoutes = lazy(() => import("@/features/console/routes"));
const SupportChat = lazy(() => import("@/features/consumer/pages/SupportChat"));

// 기능 1: 커플 일정 공유 + 공유 일기
const CoupleDiary = lazy(() => import("@/features/consumer/pages/CoupleDiary"));
const CoupleDiaryWrite = lazy(() => import("@/features/consumer/pages/CoupleDiaryWrite"));

// 기능 2: 인플루언서 소개
const Influencers = lazy(() => import("@/features/consumer/pages/Influencers"));
const InfluencerDetail = lazy(() => import("@/features/consumer/pages/InfluencerDetail"));

// 기능 3: 업체 제휴 혜택
const Deals = lazy(() => import("@/features/consumer/pages/Deals"));
const DealDetail = lazy(() => import("@/features/consumer/pages/DealDetail"));

// 진행중 이벤트 모음 (가입 혜택·미션·초대 등)
const Events = lazy(() => import("@/features/consumer/pages/Events"));
const EventDetailPage = lazy(() => import("@/features/consumer/pages/EventDetailPage"));
const ProductDetailPage = lazy(() => import("@/features/consumer/pages/ProductDetailPage"));

// 기능 4: 쇼핑 결제 플로우
const ProductDetail = lazy(() => import("@/features/consumer/pages/ProductDetail"));
const Cart = lazy(() => import("@/features/consumer/pages/Cart"));
const Checkout = lazy(() => import("@/features/consumer/pages/Checkout"));
const OrderComplete = lazy(() => import("@/features/consumer/pages/OrderComplete"));
const PaymentSuccess = lazy(() => import("@/features/consumer/pages/PaymentSuccess"));
const PaymentFail = lazy(() => import("@/features/consumer/pages/PaymentFail"));
const SubscriptionCheckout = lazy(() => import("@/features/consumer/pages/SubscriptionCheckout"));
const SubscriptionPaymentSuccess = lazy(() => import("@/features/consumer/pages/SubscriptionPaymentSuccess"));
const SubscriptionPaymentFail = lazy(() => import("@/features/consumer/pages/SubscriptionPaymentFail"));

// 기업(partners) 도메인 — App.tsx 는 /business/* 한 줄로 위임. partners 페이지 lazy·가드는
// 라우트 모듈(@/features/partners/routes)이 소유한다(도메인 경계 — App.tsx 에 partners 참조 최소화).
const PartnersRoutes = lazy(() => import("@/features/partners/routes"));

// React Query 전역 기본값: 기본 staleTime=0 + refetchOnWindowFocus=true 면 모바일 웹에서
// 탭 전환마다 모든 useQuery 가 재요청(중복 라운드트립). 모바일 웹이 주 사용처라 60s 신선도 +
// focus 재요청 끄기를 기본으로. 알림 등 실시간성이 필요한 hook 은 개별 staleTime 으로 override.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

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
          <ErrorBoundary>
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
              <Route path="/blog" element={<BlogList />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/magazine" element={<Navigate to="/tips" replace />} />
              <Route path="/gallery" element={<Gallery />} />
              <Route path="/ai-planner" element={<AIPlanner />} />
              <Route path="/budget" element={<Budget />} />
              <Route path="/budget/history" element={<BudgetHistory />} />
              <Route path="/budget/category/:category" element={<BudgetCategoryDetail />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/ai-studio" element={<AIStudio />} />
              <Route path="/wrapped" element={<WeddingWrapped />} />
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
              <Route path="/notifications/inbox" element={<AppNotifications />} />
              <Route path="/my-inquiries" element={<MyInquiries />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/support" element={<SupportChat />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/help" element={<ConsumerGuideIndex />} />
              <Route path="/help/:guideId" element={<ConsumerGuideDetail />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/settings/blocked" element={<BlockedUsers />} />
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
              <Route path="/event/:id" element={<EventDetailPage />} />
              <Route path="/product/:id" element={<ProductDetailPage />} />

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

              {/* 기업(partners) 도메인 — 라우트 모듈로 위임(가드·페이지는 그 모듈이 소유). */}
              <Route path="/business/*" element={<PartnersRoutes />} />

              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/oss-licenses" element={<OssLicenses />} />
              <Route path="/search/tag/:tag" element={<TagResults />} />
              <Route path="/board" element={<VendorBoard />} />
              <Route path="/compare" element={<VendorCompare />} />
              <Route path="/quote" element={<QuoteList />} />
              <Route path="/quote/new" element={<QuoteNew />} />
              <Route path="/quote/:id" element={<QuoteDetail />} />
              <Route path="/quote/:requestId/thread/:placeId" element={<QuoteThread />} />
              <Route path="/my-deliveries" element={<MyDeliveries />} />
              <Route path="/taste" element={<TasteQuiz />} />
              <Route path="/mail" element={<MailInbox />} />
              {/* 청첩장 디자인 마켓 = 디지털재화 판매(카카오 PG, IAP 분기 없음). 플래그가 꺼진 동안에는
                  라우트 자체를 막는다 — 직접 URL 도달 시 iOS에서 외부결제 노출 = App Store 3.1.1 위반.
                  플래그를 켜기 전 반드시 결제 IAP 분기 추가(docs/260625_appstore_resubmit_runbook.md §1). */}
              <Route
                path="/invitation/market"
                element={DESIGN_MARKET_ENABLED ? <InvitationMarket /> : <Navigate to="/" replace />}
              />
              <Route path="/account-deletion" element={<AccountDeletion />} />
              <Route path="/location-terms" element={<LocationTerms />} />
              <Route path="/ai-studio/consulting" element={<WeddingConsulting />} />
              <Route path="/ai-studio/consulting/result/:id" element={<ConsultingResult />} />
              <Route path="/ai-studio/consulting/gallery" element={<ConsultingGallery />} />
              <Route path="/ai-studio/my-results" element={<MyResults />} />
              <Route path="/ai-studio/hair-room" element={<HairPreview />} />
              <Route path="/ai-studio/hair-room/result/:id" element={<HairPreviewResult />} />
              <Route path="/ai-studio/hair-room/gallery" element={<HairPreviewGallery />} />
              <Route path="/ai-studio/sdm-preview" element={<SdmPreview />} />
              <Route path="/ai-studio/sdm-preview/result/:id" element={<SdmPreviewResult />} />
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
              <Route path="/invitation/:id/rsvp" element={<InvitationRsvpDashboard />} />
              <Route path="/invitation/:id/photos" element={<InvitationPhotos />} />
              <Route path="/i/:slug" element={<InvitationViewer />} />
              {/* 하객 사진 업로드 (공개) */}
              <Route path="/i/:slug/photos" element={<GuestPhotoUpload />} />
              {/* I-MOBILE Phase 1: 네이티브 섹션 뷰어 프리뷰(기존 캔버스 뷰어 병행) */}
              <Route path="/i2/:slug" element={<MobileInvitationView2 />} />
              {/* 운영자(console) 도메인 — 라우트 모듈로 위임(가드·페이지는 그 모듈이 소유).
                  가드는 모듈 내 라우트 레벨 — 페이지 마운트 전 권한 확인(비관리자 fetch·노출 차단). */}
              <Route path="/admin/*" element={<ConsoleRoutes />} />

              {/* AEO 가이드 페이지(결혼어플추천 등). 한글 슬러그 라우트를
                  src/data/aeoGuides 단일 소스에서 생성. 크롤러용 SSR 은 api/guide.ts. */}
              {aeoGuides.map((g) => (
                <Route key={g.slug} path={`/${g.slug}`} element={<Guide slug={g.slug} />} />
              ))}
              {/* 베타 신청·설치 랜딩(광고 유입 전환) */}
              <Route path="/beta" element={<Beta />} />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          </ErrorBoundary>
          {/* First-time tutorial welcome sheet — uses useNavigate so it
              must live inside BrowserRouter. Self-gates on user + onboarding. */}
          <TutorialWelcomeSheet />
          {/* 생성 기능 백그라운드 잡 완료 알림(컨설팅/드레스/메이크업/사진보정). */}
          <GenerationNotifier />
          {/* 명령형 확인 다이얼로그 호스트 — window.confirm 대체(앱 톤 일관). */}
          <ConfirmDialogHost />
          {/* 명령형 금액 입력 호스트 — 업체 '직접 결정' 시 계약 금액을 예산에 기록. */}
          <AmountPromptHost />
          {/* 홈 위젯 다리 — 위젯 딥링크 navigate + 진입/resume 시 스냅샷 동기화(네이티브 한정). */}
          <WidgetBridgeHost />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
