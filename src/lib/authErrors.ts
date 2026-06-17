// Supabase Auth 에러 메시지 → 사용자 친화 한국어 매핑(단일 소스).
//
// 배경(iOS 회원가입 장애): 가입/로그인 실패 시 raw Supabase 메시지를 콘솔에만 남기고
// 제네릭 토스트만 띄워 원인 파악이 불가했다. 특히 **iOS Safari 의 네트워크 실패는
// "Load failed"** (Chrome 의 "Failed to fetch" 와 다름)라 제네릭에 묻혔다.
// 알려진 케이스를 친화 문구로, 미상은 호출부가 진단(서버 로깅 + 설명 노출)하게 known=false.

export interface MappedAuthError {
  message: string;
  /** 알려진 케이스로 매핑됐는지. false 면 호출부가 원문을 로깅/진단 노출. */
  known: boolean;
}

const GENERIC = "요청 처리 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.";

export function mapAuthError(raw: string | null | undefined): MappedAuthError {
  const m = (raw ?? "").toLowerCase();
  if (!m) return { message: GENERIC, known: false };

  const hit = (msg: string): MappedAuthError => ({ message: msg, known: true });

  // 네트워크 — iOS Safari="load failed", Chrome="failed to fetch".
  if (m.includes("load failed") || m.includes("failed to fetch") || m.includes("networkerror") || m.includes("network request failed")) {
    return hit("네트워크 연결이 불안정해요. 와이파이/데이터 상태를 확인하고 다시 시도해주세요.");
  }
  // 잘못된 로그인
  if (m.includes("invalid login") || m.includes("invalid credentials")) {
    return hit("이메일 또는 비밀번호가 올바르지 않아요.");
  }
  // 이메일 미인증
  if (m.includes("email not confirmed") || m.includes("not confirmed")) {
    return hit("이메일 인증이 아직 안 됐어요. 메일의 링크를 눌러 인증해주세요.");
  }
  // 이미 가입
  if (m.includes("already registered") || m.includes("already been registered") || m.includes("user already exists")) {
    return hit("이미 가입된 이메일이에요. 로그인해 주세요.");
  }
  // 요청 과다(레이트 리밋)
  if (m.includes("rate limit") || m.includes("for security purposes") || m.includes("only request this after") || m.includes("too many requests")) {
    return hit("요청이 너무 잦아요. 잠시 후 다시 시도해주세요.");
  }
  // 이메일 형식
  if (m.includes("unable to validate email") || m.includes("invalid format") || m.includes("invalid email")) {
    return hit("이메일 형식을 다시 확인해주세요.");
  }
  // 비밀번호 약함
  if (m.includes("password") && (m.includes("at least") || m.includes("should be") || m.includes("weak") || m.includes("characters"))) {
    return hit("비밀번호는 최소 8자 이상이어야 해요.");
  }
  // 가입 차단
  if (m.includes("signups not allowed") || m.includes("signup is disabled") || m.includes("signups are disabled")) {
    return hit("현재 회원가입이 일시 중지되었어요. 잠시 후 다시 시도해주세요.");
  }
  // 리다이렉트 URL 미허용(프로젝트 설정 문제)
  if (m.includes("redirect") && (m.includes("not allowed") || m.includes("invalid"))) {
    return hit("인증 링크 설정에 문제가 있어요. 잠시 후 다시 시도하거나 고객센터로 알려주세요.");
  }

  return { message: GENERIC, known: false };
}
