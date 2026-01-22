import { PWAUpdatePrompt } from "@/components/PWAUpdatePrompt";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Studios from "./pages/Studios";
import HoneymoonGifts from "./pages/HoneymoonGifts";
import Honeymoon from "./pages/Honeymoon";
import Appliances from "./pages/Appliances";
import Suit from "./pages/Suit";
import Hanbok from "./pages/Hanbok";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <PWAUpdatePrompt />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/studios" element={<Studios />} />
          <Route path="/honeymoon-gifts" element={<HoneymoonGifts />} />
          <Route path="/honeymoon" element={<Honeymoon />} />
          <Route path="/appliances" element={<Appliances />} />
          <Route path="/suit" element={<Suit />} />
          <Route path="/hanbok" element={<Hanbok />} />
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
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
