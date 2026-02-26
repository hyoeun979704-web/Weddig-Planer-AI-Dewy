import { createClient } from "@supabase/supabase-js";

export async function askGemini(
  userMessage: string,
  history: { role: string; content: string }[] = [],
): Promise<string> {
  const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

  const { data, error } = await supabase.functions.invoke("ask-gemini", {
    body: { userMessage, history },
  });

  if (error) throw new Error(error.message);
  if (!data?.reply) throw new Error("AI 응답을 받지 못 했어요.");

  return data.reply;
}
