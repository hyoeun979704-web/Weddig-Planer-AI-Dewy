import { lazy } from "react";
import { Routes, Route } from "react-router-dom";
import AdminGuard from "@/features/console/components/AdminGuard";

// Console(운영자) 도메인 라우트 모듈. App.tsx 는 <Route path="/admin/*" element={<ConsoleRoutes/>}/>
// 한 줄로 위임하고, admin 페이지·가드 참조는 전부 이 모듈 안에 갇힌다(도메인 경계).
// 경로는 /admin 기준 **상대**(예: "users" = /admin/users). 코드분할 lazy 유지.
// 가드는 라우트 레벨 — 페이지 마운트 전에 권한 확인(비관리자 데이터 fetch·내용 노출 차단).
const AdminDashboard = lazy(() => import("@/features/console/pages/AdminDashboard"));
const AdminGroupDashboard = lazy(() => import("@/features/console/pages/AdminGroupDashboard"));
const AdminDressSamples = lazy(() => import("@/features/console/pages/AdminDressSamples"));
const AdminContentReview = lazy(() => import("@/features/console/pages/AdminContentReview"));
const AdminPlaceEdit = lazy(() => import("@/features/console/pages/AdminPlaceEdit"));
const AdminPlaces = lazy(() => import("@/features/console/pages/AdminPlaces"));
const AdminTipInstagrams = lazy(() => import("@/features/console/pages/AdminTipInstagrams"));
const AdminInstagramPosts = lazy(() => import("@/features/console/pages/AdminInstagramPosts"));
const AdminInstagramPostEdit = lazy(() => import("@/features/console/pages/AdminInstagramPostEdit"));
const AdminBlogPosts = lazy(() => import("@/features/console/pages/AdminBlogPosts"));
const AdminBlogPostEdit = lazy(() => import("@/features/console/pages/AdminBlogPostEdit"));
const AdminMakeupSamples = lazy(() => import("@/features/console/pages/AdminMakeupSamples"));
const AdminHairSamples = lazy(() => import("@/features/console/pages/AdminHairSamples"));
const AdminAIPrompts = lazy(() => import("@/features/console/pages/AdminAIPrompts"));
const AdminAiPromptEditor = lazy(() => import("@/features/console/pages/AdminAiPromptEditor"));
const AdminAIJobs = lazy(() => import("@/features/console/pages/AdminAIJobs"));
const AdminInvitationTemplates = lazy(() => import("@/features/console/pages/AdminInvitationTemplates"));
const AdminInvitationAssets = lazy(() => import("@/features/console/pages/AdminInvitationAssets"));
const AdminInvitationFonts = lazy(() => import("@/features/console/pages/AdminInvitationFonts"));
const AdminWeddingPhotoRefs = lazy(() => import("@/features/console/pages/AdminWeddingPhotoRefs"));
const AdminServiceWaitlist = lazy(() => import("@/features/console/pages/AdminServiceWaitlist"));
const AdminUsers = lazy(() => import("@/features/console/pages/AdminUsers"));
const AdminReports = lazy(() => import("@/features/console/pages/AdminReports"));
const AdminInquiries = lazy(() => import("@/features/console/pages/AdminInquiries"));
const AdminCommunityAnnouncements = lazy(() => import("@/features/console/pages/AdminCommunityAnnouncements"));
const AdminPromotions = lazy(() => import("@/features/console/pages/AdminPromotions"));
const AdminErrorLogs = lazy(() => import("@/features/console/pages/AdminErrorLogs"));
const AdminAgentOutputs = lazy(() => import("@/features/console/pages/AdminAgentOutputs"));
const AdminPlaceClaims = lazy(() => import("@/features/console/pages/AdminPlaceClaims"));
const AdminBusinessReview = lazy(() => import("@/features/console/pages/AdminBusinessReview"));
const AdminProductCuration = lazy(() => import("@/features/console/pages/AdminProductCuration"));
const AdminFeaturedProducts = lazy(() => import("@/features/console/pages/AdminFeaturedProducts"));

const ConsoleRoutes = () => (
  <Routes>
    <Route index element={<AdminGuard><AdminDashboard /></AdminGuard>} />
    {/* 그룹 전용 대시보드 — adminNav 의 group 키와 동일 경로. 메인 허브에서 진입. */}
    <Route path="vendors" element={<AdminGuard><AdminGroupDashboard group="vendors" /></AdminGuard>} />
    <Route path="commerce" element={<AdminGuard><AdminGroupDashboard group="commerce" /></AdminGuard>} />
    <Route path="moderation" element={<AdminGuard><AdminGroupDashboard group="moderation" /></AdminGuard>} />
    <Route path="invitation" element={<AdminGuard><AdminGroupDashboard group="invitation" /></AdminGuard>} />
    <Route path="ai" element={<AdminGuard><AdminGroupDashboard group="ai" /></AdminGuard>} />
    <Route path="marketing" element={<AdminGuard><AdminGroupDashboard group="marketing" /></AdminGuard>} />
    <Route path="content-review" element={<AdminGuard><AdminContentReview /></AdminGuard>} />
    <Route path="places" element={<AdminGuard><AdminPlaces /></AdminGuard>} />
    <Route path="places/:id" element={<AdminGuard><AdminPlaceEdit /></AdminGuard>} />
    <Route path="tip-instagrams" element={<AdminGuard><AdminTipInstagrams /></AdminGuard>} />
    <Route path="instagram-posts" element={<AdminGuard><AdminInstagramPosts /></AdminGuard>} />
    <Route path="instagram-posts/:id" element={<AdminGuard><AdminInstagramPostEdit /></AdminGuard>} />
    <Route path="blog-posts" element={<AdminGuard><AdminBlogPosts /></AdminGuard>} />
    <Route path="blog-posts/:id" element={<AdminGuard><AdminBlogPostEdit /></AdminGuard>} />
    <Route path="dress-samples" element={<AdminGuard><AdminDressSamples /></AdminGuard>} />
    <Route path="makeup-samples" element={<AdminGuard><AdminMakeupSamples /></AdminGuard>} />
    <Route path="hair-samples" element={<AdminGuard><AdminHairSamples /></AdminGuard>} />
    <Route path="ai-prompts" element={<AdminGuard><AdminAIPrompts /></AdminGuard>} />
    <Route path="ai-prompt-editor" element={<AdminGuard><AdminAiPromptEditor /></AdminGuard>} />
    <Route path="ai-jobs" element={<AdminGuard><AdminAIJobs /></AdminGuard>} />
    <Route path="invitation-templates" element={<AdminGuard><AdminInvitationTemplates /></AdminGuard>} />
    <Route path="invitation-assets" element={<AdminGuard><AdminInvitationAssets /></AdminGuard>} />
    <Route path="invitation-fonts" element={<AdminGuard><AdminInvitationFonts /></AdminGuard>} />
    <Route path="wedding-photo-refs" element={<AdminGuard><AdminWeddingPhotoRefs /></AdminGuard>} />
    <Route path="service-waitlist" element={<AdminGuard><AdminServiceWaitlist /></AdminGuard>} />
    <Route path="users" element={<AdminGuard><AdminUsers /></AdminGuard>} />
    <Route path="reports" element={<AdminGuard><AdminReports /></AdminGuard>} />
    <Route path="inquiries" element={<AdminGuard><AdminInquiries /></AdminGuard>} />
    <Route path="announcements" element={<AdminGuard><AdminCommunityAnnouncements /></AdminGuard>} />
    <Route path="promotions" element={<AdminGuard><AdminPromotions /></AdminGuard>} />
    <Route path="error-logs" element={<AdminGuard><AdminErrorLogs /></AdminGuard>} />
    <Route path="agent-outputs" element={<AdminGuard><AdminAgentOutputs /></AdminGuard>} />
    <Route path="place-claims" element={<AdminGuard><AdminPlaceClaims /></AdminGuard>} />
    <Route path="business-review" element={<AdminGuard><AdminBusinessReview /></AdminGuard>} />
    <Route path="product-curation" element={<AdminGuard><AdminProductCuration /></AdminGuard>} />
    <Route path="featured-products" element={<AdminGuard><AdminFeaturedProducts /></AdminGuard>} />
  </Routes>
);

export default ConsoleRoutes;
