// 도메인 타입 뷰 인덱스 — 단일 소스 분류: docs/260625_backend_domain_map.md
// 각 테이블은 정확히 한 도메인에 배정(중복 0). 도메인 네임스페이스로 묶어 re-export.
export * as ConsumerTables from "./consumer";
export * as PartnersTables from "./partners";
export * as ConsoleTables from "./console";
export * as SharedTables from "./shared";
