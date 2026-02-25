import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ✅ 환경변수 사전 검증
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("VITE_SUPABASE_URL 또는 VITE_SUPABASE_ANON_KEY가 설정되지 않았습니다. .env 파일을 확인해주세요.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function askGemini(
  userMessage: string,
  history: { role: string; content: string }[] = []
): Promise<string> {
  const { data, error } = await supabase.functions.invoke('ask-gemini', {
    body: { userMessage, history },
  });

  if (error) throw new Error(error.message);
  if (!data?.reply) throw new Error('AI 응답을 받지 못했어요.');

  return data.reply;
}
