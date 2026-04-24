import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

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
