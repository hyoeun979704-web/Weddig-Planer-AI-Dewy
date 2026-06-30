import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ConfirmDialogHost } from "@/components/ui/confirm-dialog";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// 사장님 앱 루트 — partners 도메인만 마운트한다(소비자 라우트 없음).
// partners 라우트 모듈은 /business 하위 상대경로(dashboard·onboard 등)를 그대로 쓰므로
// 앱에서도 /business/* 로 마운트하고, 앱 진입("/")은 대시보드로 보낸다(내부 navigate 경로 무수정).
const PartnersRoutes = lazy(() => import("@/features/partners/routes"));
// 사장님 전용 독립 로그인(4-B). 소비자 Auth 재사용을 끊고 사장님 맥락의 진입 동선 제공.
const PartnerAuth = lazy(() => import("@/features/partners/pages/PartnerAuth"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, gcTime: 5 * 60_000, refetchOnWindowFocus: false },
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
          <Sonner />
          <BrowserRouter>
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Navigate to="/business/dashboard" replace />} />
                  <Route path="/auth" element={<PartnerAuth />} />
                  <Route path="/business/*" element={<PartnersRoutes />} />
                  {/* 알 수 없는 경로는 대시보드로(사장님 앱엔 소비자 라우트가 없음). */}
                  <Route path="*" element={<Navigate to="/business/dashboard" replace />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
            {/* 명령형 확인 다이얼로그 호스트 — partners 페이지(쿠폰/상품/갤러리 등)가 confirm() 사용. */}
            <ConfirmDialogHost />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
