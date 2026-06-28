// 로그인 후 복귀(return-to) 경로 유틸 — 홈 전환율 누수 차단.
//
// 배경: LoginRequiredOverlay 가 /auth 로 보낼 때 원래 가려던 경로를 안 넘겨서, 로그인 후
// 홈으로만 떨어지고 사용자가 목적지(예: /board)로 못 돌아오던 전환 누수가 있었다.
// /auth?redirect=<path> 로 목적지를 실어 보내고, Auth 가 로그인 성공 시 그곳으로 복귀시킨다.
//
// 보안: **오픈 리다이렉트 방지** — 내부 경로(단일 "/" 시작)만 허용. 외부 URL·프로토콜
// 상대경로(//host)·역슬래시 트릭은 전부 fallback 으로 거부한다.

/** raw 가 안전한 내부 경로면 그대로, 아니면 fallback. */
export function safeInternalPath(raw: string | null | undefined, fallback = "/"): string {
  if (!raw) return fallback;
  if (!raw.startsWith("/")) return fallback; // 절대/상대 외부 URL 거부
  if (raw.startsWith("//") || raw.startsWith("/\\")) return fallback; // 프로토콜-상대 거부
  if (raw.includes("://")) return fallback; // 임베디드 스킴 거부
  return raw;
}

/** 현재 경로를 redirect 쿼리로 담은 /auth 링크. 홈("/")이면 쿼리 생략. */
export function authLinkWithRedirect(currentPath: string | null | undefined): string {
  const safe = safeInternalPath(currentPath, "/");
  if (!safe || safe === "/") return "/auth";
  return `/auth?redirect=${encodeURIComponent(safe)}`;
}
