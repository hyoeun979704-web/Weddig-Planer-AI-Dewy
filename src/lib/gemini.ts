import { supabase } from "@/integrations/supabase/client";

export async function askGemini(
  userMessage: string,
  history: { role: string; content: string }[] = []
): Promise<string> {
  const { data, error } = await supabase.functions.invoke("ask-gemini", {
    body: { userMessage, history },
  });

  if (error) throw new Error(error.message);
  if (!data?.reply) throw new Error("AI 응답을 받지 못했어요.");
  return data.reply;
}
