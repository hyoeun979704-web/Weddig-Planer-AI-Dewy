// provider → 어댑터/OAuth 매핑 + 설정 여부. cal-* 함수가 공유.
import { googleAdapter, googleOAuth } from "./googleCalendar.ts";
import { kakaoAdapter, kakaoOAuth } from "./kakaoCalendar.ts";
import type { CalendarAdapter, CalendarOAuth } from "./calendarSync.ts";

export type CalProvider = "google" | "kakao";

export function isProvider(p: unknown): p is CalProvider {
  return p === "google" || p === "kakao";
}

export function getAdapter(p: CalProvider): CalendarAdapter {
  return p === "google" ? googleAdapter : kakaoAdapter;
}

export function getOAuth(p: CalProvider): CalendarOAuth {
  return p === "google" ? googleOAuth : kakaoOAuth;
}

// 해당 provider 의 시크릿이 설정됐는지(미설정이면 연결 시도 자체를 막아 헛동의 방지).
export function isConfigured(p: CalProvider): boolean {
  if (p === "google") return !!Deno.env.get("GOOGLE_CLIENT_ID") && !!Deno.env.get("GOOGLE_CLIENT_SECRET");
  return !!Deno.env.get("KAKAO_REST_API_KEY"); // kakao
}
