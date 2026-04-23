import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Works in both Vite (import.meta.env) and Next.js (process.env) environments
const viteEnv =
  typeof import.meta !== 'undefined' ? import.meta.env : undefined;

const SUPABASE_URL =
  viteEnv?.VITE_SUPABASE_URL ||
  (typeof process !== 'undefined'
    ? process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL
    : undefined) ||
  'https://placeholder.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
  viteEnv?.VITE_SUPABASE_ANON_KEY ||
  viteEnv?.VITE_SUPABASE_PUBLISHABLE_KEY ||
  (typeof process !== 'undefined'
    ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY
    : undefined) ||
  'placeholder-key';

const isBrowser = typeof window !== 'undefined';

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: isBrowser ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
});
