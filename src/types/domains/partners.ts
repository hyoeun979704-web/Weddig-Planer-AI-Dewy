// ───────────────────────────────────────────────────────────────────────────
// 도메인 타입 뷰 — 웨딩 사업자(Partners) 도메인
// 사업자 전용 테이블. 대부분의 사업자 기능은 마켓플레이스 공유 테이블(shared)에 RLS 로 자기 행만 접근한다.
//
// 단일 소스 = src/integrations/supabase/types.ts(실 DB 생성). 이 파일은 그 6,749줄에서
// 이 도메인 테이블만 골라 re-export 하는 "뷰"다(소유권 분류 근거: docs/260625_backend_domain_map.md §3).
// 목적: 각 feature 가 자기 도메인 표면만 보게 해 ergonomics 개선. 인가는 RLS 가 책임(이 분류 ≠ 권한).
// Insert/Update 가 필요하면 types.ts 의 TablesInsert<"x">/TablesUpdate<"x"> 를 직접 쓴다.
// 네이밍: 테이블명 PascalCase(단수화 안 함 — 기계적·드리프트 방지). 예: community_posts → CommunityPosts.
// ───────────────────────────────────────────────────────────────────────────
import type { Tables } from "@/integrations/supabase/types";

/** 이 도메인이 주로 소유하는 테이블명 union (도메인 스코프 .from() 타이핑용). */
export type PartnersTable =
  | "business_profiles"
  | "partnership_applications"
  | "place_claims";

// ── 각 테이블 Row 타입 ──
export type BusinessProfiles = Tables<"business_profiles">;
export type PartnershipApplications = Tables<"partnership_applications">;
export type PlaceClaims = Tables<"place_claims">;
