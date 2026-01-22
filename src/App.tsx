import { PWAUpdatePrompt } from "@/components/PWAUpdatePrompt";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Studios from "./pages/Studios";
import StudioDetail from "./pages/StudioDetail";
import HoneymoonGifts from "./pages/HoneymoonGifts";
import HoneymoonGiftDetail from "./pages/HoneymoonGiftDetail";
import Honeymoon from "./pages/Honeymoon";
import HoneymoonDetail from "./pages/HoneymoonDetail";
import Appliances from "./pages/Appliances";
import ApplianceDetail from "./pages/ApplianceDetail";
import Suit from "./pages/Suit";
import SuitDetail from "./pages/SuitDetail";
import Hanbok from "./pages/Hanbok";
import HanbokDetail from "./pages/HanbokDetail";
import Venues from "./pages/Venues";
import VenueDetail from "./pages/VenueDetail";
import Favorites from "./pages/Favorites";
import Store from "./pages/Store";
import More from "./pages/More";
import Magazine from "./pages/Magazine";
import Reviews from "./pages/Reviews";
import Gallery from "./pages/Gallery";
import AIPlanner from "./pages/AIPlanner";
import Schedule from "./pages/Schedule";
import AIStudio from "./pages/AIStudio";
import Community from "./pages/Community";
import MyPage from "./pages/MyPage";
import Auth from "./pages/Auth";
import Points from "./pages/Points";
import Coupons from "./pages/Coupons";
import Orders from "./pages/Orders";
import MySchedule from "./pages/MySchedule";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notifications";
import MyInquiries from "./pages/MyInquiries";
import Contact from "./pages/Contact";
import FAQ from "./pages/FAQ";
import Settings from "./pages/Settings";
import InvitationVenues from "./pages/InvitationVenues";
import InvitationVenueDetail from "./pages/InvitationVenueDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <PWAUpdatePrompt />
        <Toaster />
        <Sonner />
        <BrowserRouter>
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
            <Route path="/ai-studio/:service" element={<AIStudio />} />
            <Route path="/community" element={<Community />} />
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
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
