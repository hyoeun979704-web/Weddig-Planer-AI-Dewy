// 공통 CORS 헤더 단일 소스.
//
// 토큰(Authorization) 기반 인증이라 Allow-Credentials 를 켜지 않으므로 와일드카드
// origin 도 자격증명 탈취로 이어지지 않는다(결제 함수는 redirect origin 을
// _shared/allowedOrigins 로 별도 검증). 이전엔 40개 함수가 각자 corsHeaders 를
// 정의하면서 Allow-Headers 가 제각각이라 일부 함수는 supabase-js 가 보내는
// x-supabase-client-* 헤더를 빠뜨려 preflight 가 깨질 위험이 있었다.
//
// 여기서는 supabase-js 가 보내는 헤더까지 포함한 "상위집합"을 허용한다 —
// 허용 헤더가 많아져도 무해하며 모든 함수가 동일 정책을 쓰게 된다.
const ALLOW_HEADERS = [
  "authorization",
  "x-client-info",
  "apikey",
  "content-type",
  "x-supabase-client-platform",
  "x-supabase-client-platform-version",
  "x-supabase-client-runtime",
  "x-supabase-client-runtime-version",
].join(", ");

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": ALLOW_HEADERS,
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

/** 추가 Allow-Headers 가 필요한 함수용(예: notify-inquiry 의 x-webhook-secret). */
export function corsWith(extraAllowHeaders: string[]): Record<string, string> {
  return {
    ...corsHeaders,
    "Access-Control-Allow-Headers": `${ALLOW_HEADERS}, ${extraAllowHeaders.join(", ")}`,
  };
}
