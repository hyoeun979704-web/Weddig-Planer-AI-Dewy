import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { isNativeApp } from '@/lib/platform';
import { preferencesStorage } from './preferencesStorage';
import { createSafeStorage } from './safeLocalStorage';

// Supabase project URL + anon publishable key.
// These are SAFE to embed in the client bundle — anon key is designed to be public,
// and data is protected by Row Level Security (RLS) policies, not by key secrecy.
// Env vars are preferred for flexibility but fallbacks ensure the app never hits
// "placeholder" values if a deploy misconfigures them.
const DEFAULT_SUPABASE_URL = 'https://qabeywyzjsgyqpjqsvkd.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhYmV5d3l6anNneXFwanFzdmtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NTg4MzUsImV4cCI6MjA5MTEzNDgzNX0.ae0GIokaeczwm0-FaVSoCnkNqBgagsdD1-1I_BP90Jo';

const viteEnv =
  typeof import.meta !== 'undefined' ? import.meta.env : undefined;

const SUPABASE_URL =
  viteEnv?.VITE_SUPABASE_URL ||
  (typeof process !== 'undefined'
    ? process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL
    : undefined) ||
  DEFAULT_SUPABASE_URL;

const SUPABASE_PUBLISHABLE_KEY =
  viteEnv?.VITE_SUPABASE_ANON_KEY ||
  viteEnv?.VITE_SUPABASE_PUBLISHABLE_KEY ||
  (typeof process !== 'undefined'
    ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY
    : undefined) ||
  DEFAULT_SUPABASE_ANON_KEY;

// 공개 Edge Function (verify_jwt=false) 을 <img> 등 raw URL 로 부를 때 쓰는 베이스.
// 예: `${SUPABASE_FUNCTIONS_URL}/place-static-map?lat=..&lng=..`
export const SUPABASE_FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

const isBrowser = typeof window !== 'undefined';

// 세션 저장소 결정 규칙:
//   - 네이티브 앱(Capacitor): Preferences 어댑터 (SharedPreferences/UserDefaults)
//   - 웹 브라우저 / PWA:     안전 localStorage 어댑터(예외 안 던짐 — iOS Safari
//                            프라이빗/추적방지에서 raw localStorage 가 throw 해 가입이
//                            실패하던 버그 차단. 실패 시 인메모리 폴백.)
//   - SSR / Node:            undefined (Supabase 가 기본값 사용)
// 분기는 platform.ts 한 곳에서만 이뤄진다.
const authStorage = isNativeApp()
  ? preferencesStorage
  : isBrowser
    ? createSafeStorage(window.localStorage)
    : undefined;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

// PKCE 플로우는 모바일 OAuth 의 표준이고, 웹에서도 그대로 동작한다.
// 네이티브 앱은 WebView 가 콜백 URL 을 직접 보지 않으므로(딥링크로 들어옴)
// detectSessionInUrl 을 꺼서 의도치 않은 자동 교환을 막는다.
const native = isNativeApp();

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: authStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: !native,
    flowType: 'pkce',
  },
});
