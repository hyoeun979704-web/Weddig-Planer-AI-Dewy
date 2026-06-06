// JWT 클레임에서 role 을 추출(서명 검증 없이 payload 만 디코드).
//
// 게이트웨이(verify_jwt=true)가 이미 서명을 검증했으므로, cron/server 호출을
// env SERVICE_ROLE_KEY 문자열 매칭 대신 role 클레임("service_role")으로 인가한다
// (키 로테이션/포맷 드리프트에 강함). 이전엔 4개 함수에 동일 복붙돼 있었다.
export function jwtRole(token: string): string | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, "="));
    return (JSON.parse(json)?.role as string | undefined) ?? null;
  } catch {
    return null;
  }
}
