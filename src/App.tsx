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
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
