/**
 * 커플 관련 핸들러
 * 커플 연동 상태·다이어리·투표.
 */

import { supabase } from "@/integrations/supabase/client";

const MOOD_EMOJI: Record<string, string> = {
  happy: "😊",
  excited: "✨",
  nervous: "😅",
  tired: "😴",
  sad: "😔",
  loved: "🥰",
};

// ────────────────────────────────────────────────────────────
// 커플 연동 상태
// ────────────────────────────────────────────────────────────
export const handleCoupleStatus = async (userId: string): Promise<string> => {
  const { data, error } = await (supabase as any)
    .from("couple_links")
    .select("invite_code, status, partner_user_id, linked_at, created_at")
    .or(`user_id.eq.${userId},partner_user_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return "아직 파트너와 연결되지 않으셨어요 💑\n\n[커플 연동](/schedule)에서 초대 코드를 만들어 파트너에게 공유하시거나, 파트너의 코드를 입력해 연결하실 수 있어요. 함께 일정·다이어리·투표를 공유할 수 있어요.";
  }

  if (data.status === "linked") {
    const linkedDate = data.linked_at
      ? new Date(data.linked_at).toLocaleDateString("ko-KR")
      : "최근";
    return `파트너와 연결되어 있어요 💑\n\n• 연결일: ${linkedDate}\n\n함께 [커플 다이어리·투표·일정](/schedule)을 공유하고 계세요.`;
  }

  // pending 상태
  return `초대 코드 **${data.invite_code}** 가 발급된 상태예요 💌\n\n파트너에게 이 코드를 공유하면 연결이 완료돼요.\n[커플 연동 페이지](/schedule)에서 확인하실 수 있어요.`;
};

// ────────────────────────────────────────────────────────────
// 최근 다이어리
// ────────────────────────────────────────────────────────────
export const handleDiary = async (userId: string): Promise<string> => {
  // 본인의 couple_link_id 찾기
  const { data: link } = await (supabase as any)
    .from("couple_links")
    .select("id")
    .or(`user_id.eq.${userId},partner_user_id.eq.${userId}`)
    .eq("status", "linked")
    .maybeSingle();

  if (!link) {
    return "아직 파트너와 연결되지 않아 다이어리를 사용할 수 없어요 💑\n[커플 연동](/schedule)에서 먼저 연결해주세요.";
  }

  const { data, error } = await (supabase as any)
    .from("couple_diary")
    .select("title, mood, diary_date, author_id")
    .eq("couple_link_id", link.id)
    .order("diary_date", { ascending: false })
    .limit(5);

  if (error || !data || data.length === 0) {
    return "아직 작성된 다이어리가 없어요 📔\n[다이어리 페이지](/couple-diary)에서 첫 일기를 시작해보세요.";
  }

  const lines = data
    .map((d: any) => {
      const mood = d.mood ? MOOD_EMOJI[d.mood] || "📝" : "📝";
      const date = new Date(d.diary_date).toLocaleDateString("ko-KR");
      const who = d.author_id === userId ? "내가" : "파트너가";
      return `• ${mood} ${date} — ${d.title} (${who} 작성)`;
    })
    .join("\n");

  return `최근 다이어리 ${data.length}개 📔\n\n${lines}\n\n전체 일기는 [다이어리 페이지](/couple-diary)에서 확인하실 수 있어요.`;
};

// ────────────────────────────────────────────────────────────
// 진행 중인 투표
// ────────────────────────────────────────────────────────────
export const handleVotes = async (userId: string): Promise<string> => {
  const { data: link } = await (supabase as any)
    .from("couple_links")
    .select("id")
    .or(`user_id.eq.${userId},partner_user_id.eq.${userId}`)
    .eq("status", "linked")
    .maybeSingle();

  if (!link) {
    return "아직 파트너와 연결되지 않아 투표 기능을 사용할 수 없어요 💑\n[커플 연동](/schedule)에서 먼저 연결해주세요.";
  }

  const { data, error } = await (supabase as any)
    .from("couple_votes")
    .select("option_a, option_b, my_pick, partner_pick, created_at")
    .eq("couple_link_id", link.id)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error || !data || data.length === 0) {
    return "아직 진행한 투표가 없어요 🗳️\n[커플 투표](/couple-vote)에서 양가 의사결정 항목을 함께 정리해보세요.";
  }

  const pending = data.filter((v: any) => !v.my_pick || !v.partner_pick);
  const decided = data.filter((v: any) => v.my_pick && v.partner_pick);

  let result = `진행 중인 투표 ${pending.length}건, 결정된 투표 ${decided.length}건 🗳️\n\n`;

  if (pending.length > 0) {
    result += "**아직 결정 못 한 투표 (최근 5)**\n";
    result += pending
      .slice(0, 5)
      .map((v: any) => {
        const who: string[] = [];
        if (!v.my_pick) who.push("나");
        if (!v.partner_pick) who.push("파트너");
        return `• ${v.option_a} vs ${v.option_b} (${who.join("·")} 미투표)`;
      })
      .join("\n");
    result += "\n\n";
  }

  result += "전체 투표는 [커플 투표 페이지](/couple-vote)에서 확인하실 수 있어요.";
  return result;
};
