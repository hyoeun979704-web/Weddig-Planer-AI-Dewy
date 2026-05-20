// 결제 redirect URL 에 사용될 origin 화이트리스트 검증 헬퍼.
//
// 카카오 페이의 approval_url / cancel_url / fail_url 은 클라이언트가 전달한
// origin 을 그대로 박았다. 검증이 없으면 attacker.com 같은 외부 도메인을
// 끼워넣어 결제 콜백을 가로채는 CSRF/피싱 벡터가 된다.
//
// 사용 :
//   const safe = resolveAllowedOrigin(origin);
//   if (!safe) return jsonResp({ error: "Invalid origin" }, 403);
//   // safe 를 approval_url 등에 사용 (raw origin 은 절대 X)
//
// 환경변수 ALLOWED_PAYMENT_ORIGINS 에 쉼표로 추가 도메인을 명시할 수 있다.
// 미설정 시 기본값(production 도메인) 만 허용.

const DEFAULT_ORIGINS: string[] = [
  "https://dewy-wedding.com",
  "https://www.dewy-wedding.com",
];

function loadAllowedOrigins(): string[] {
  const env = Deno.env.get("ALLOWED_PAYMENT_ORIGINS");
  if (!env) return DEFAULT_ORIGINS;
  const extra = env
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  // 중복 제거
  return Array.from(new Set([...DEFAULT_ORIGINS, ...extra]));
}

/**
 * 클라이언트가 보낸 origin 을 허용 목록과 정확히 일치하는지 검증.
 * 일치하면 화이트리스트의 표준 표기를 반환, 아니면 null.
 *
 * 단순 startsWith / includes 검사를 절대 쓰지 않는다 —
 * "https://dewy-wedding.com.attacker.com" 같은 prefix 공격 차단.
 */
export function resolveAllowedOrigin(input: unknown): string | null {
  if (typeof input !== "string" || input.length === 0) return null;

  // URL 파싱 후 origin 만 추출 (path / query 가 섞여 와도 정상 처리)
  let parsedOrigin: string;
  try {
    parsedOrigin = new URL(input).origin;
  } catch {
    return null;
  }

  const allowed = loadAllowedOrigins();
  const hit = allowed.find((o) => o === parsedOrigin);
  return hit ?? null;
}
