import { lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import BusinessGuard from "@/features/partners/components/BusinessGuard";
import { DESIGN_MARKET_ENABLED } from "@/lib/featureFlags";

// Partners(기업) 도메인 라우트 모듈. App.tsx 는 <Route path="/business/*" element={<PartnersRoutes/>}/>
// 한 줄로 위임하고, partners 페이지·가드 참조는 전부 이 모듈 안에 갇힌다(도메인 경계).
// 경로는 /business 기준 **상대**(예: "dashboard" = /business/dashboard). 코드분할은 lazy 유지.
const BusinessLanding = lazy(() => import("@/features/partners/pages/BusinessLanding"));
const BusinessOnboard = lazy(() => import("@/features/partners/pages/BusinessOnboard"));
const BusinessDashboard = lazy(() => import("@/features/partners/pages/BusinessDashboard"));
const BusinessGuideIndex = lazy(() => import("@/features/partners/pages/BusinessGuideIndex"));
const BusinessGuide = lazy(() => import("@/features/partners/pages/BusinessGuide"));
const BusinessGuideDetail = lazy(() => import("@/features/partners/pages/BusinessGuideDetail"));
const BusinessVendorEdit = lazy(() => import("@/features/partners/pages/BusinessVendorEdit"));
const BusinessClaim = lazy(() => import("@/features/partners/pages/BusinessClaim"));
const BusinessGallery = lazy(() => import("@/features/partners/pages/BusinessGallery"));
const BusinessCoupons = lazy(() => import("@/features/partners/pages/BusinessCoupons"));
const BusinessEvents = lazy(() => import("@/features/partners/pages/BusinessEvents"));
const BusinessProducts = lazy(() => import("@/features/partners/pages/BusinessProducts"));
const BusinessInquiries = lazy(() => import("@/features/partners/pages/BusinessInquiries"));
const BusinessDeliveries = lazy(() => import("@/features/partners/pages/BusinessDeliveries"));
const BusinessDesigns = lazy(() => import("@/features/partners/pages/BusinessDesigns"));
const BusinessReviews = lazy(() => import("@/features/partners/pages/BusinessReviews"));
const BusinessLeads = lazy(() => import("@/features/partners/pages/BusinessLeads"));
const BusinessAvailability = lazy(() => import("@/features/partners/pages/BusinessAvailability"));

const PartnersRoutes = () => (
  <Routes>
    <Route index element={<BusinessLanding />} />
    <Route path="onboard" element={<BusinessOnboard />} />
    <Route path="dashboard" element={<BusinessGuard><BusinessDashboard /></BusinessGuard>} />
    {/* 사용법 가이드는 정적 콘텐츠(데이터 패치 없음) — 기업회원 '전환 전'
        예비 사장님(로그인 페이지 진입)도 봐야 하므로 가드 없이 공개한다. */}
    <Route path="guides" element={<BusinessGuideIndex />} />
    <Route path="guide" element={<BusinessGuide />} />
    <Route path="guide/:guideId" element={<BusinessGuideDetail />} />
    <Route path="edit" element={<BusinessGuard requireApproved><BusinessVendorEdit /></BusinessGuard>} />
    <Route path="claim" element={<BusinessGuard requireApproved><BusinessClaim /></BusinessGuard>} />
    <Route path="gallery" element={<BusinessGuard requireApproved><BusinessGallery /></BusinessGuard>} />
    <Route path="coupons" element={<BusinessGuard requireApproved><BusinessCoupons /></BusinessGuard>} />
    <Route path="events" element={<BusinessGuard requireApproved><BusinessEvents /></BusinessGuard>} />
    <Route path="products" element={<BusinessGuard requireApproved><BusinessProducts /></BusinessGuard>} />
    <Route path="inquiries" element={<BusinessGuard requireApproved><BusinessInquiries /></BusinessGuard>} />
    <Route path="deliveries" element={<BusinessGuard requireApproved><BusinessDeliveries /></BusinessGuard>} />
    {/* 디자인 마켓(판매) 미오픈 — 등록 라우트도 플래그로 막는다(대시보드 메뉴만 숨기면 직접 URL 로
        승인대기 디자인이 쌓임). buyer 측 /invitation/market 가드와 일관. 켤 때 결제 IAP 분기 필수. */}
    <Route
      path="designs"
      element={DESIGN_MARKET_ENABLED ? <BusinessGuard requireApproved><BusinessDesigns /></BusinessGuard> : <Navigate to="/business/dashboard" replace />}
    />
    <Route path="availability" element={<BusinessGuard requireApproved><BusinessAvailability /></BusinessGuard>} />
    <Route path="reviews" element={<BusinessGuard requireApproved><BusinessReviews /></BusinessGuard>} />
    <Route path="leads" element={<BusinessGuard requireApproved><BusinessLeads /></BusinessGuard>} />
  </Routes>
);

export default PartnersRoutes;
