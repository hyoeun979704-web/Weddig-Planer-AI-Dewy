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
      return `- ${mood} ${date} — ${d.title} (${who} 작성)`;
    })
    .join("\n");

  // ── 인사이트: mood 분포 + 작성 균형 ─────────────────
  // 단순 나열에 끝나지 않고, 최근 컨디션 신호를 알려준다.
  const moods = data.map((d: any) => d.mood).filter(Boolean);
  const tiredCount = moods.filter((m: string) => m === "tired" || m === "nervous" || m === "sad").length;
  const happyCount = moods.filter((m: string) => m === "happy" || m === "excited" || m === "loved").length;
  const myCount = data.filter((d: any) => d.author_id === userId).length;
  const partnerCount = data.length - myCount;

  const insights: string[] = [];
  if (tiredCount >= 3) {
    insights.push(`😴 최근 5건 중 **${tiredCount}건이 피곤·긴장·우울 톤** — 준비 스트레스 누적된 신호일 수 있어요. 잠깐 둘만의 시간 가져보시는 것도 좋아요.`);
  } else if (happyCount >= 4) {
    insights.push(`✨ 최근 5건 중 **${happyCount}건이 행복·설렘 톤** — 좋은 흐름이세요! 이 감정 그대로 본식까지 가시면 좋겠어요.`);
  }
  if (data.length >= 3 && (myCount === 0 || partnerCount === 0)) {
    const alone = myCount === 0 ? "파트너만" : "나만";
    insights.push(`📝 최근 일기를 **${alone}** 쓰고 있어요. 둘이 같이 적으면 서로의 마음을 더 잘 알 수 있어요.`);
  }

  const insightBlock = insights.length > 0 ? `\n\n${insights.join("\n\n")}` : "";

  return `최근 다이어리 ${data.length}개 📔

${lines}${insightBlock}

전체 일기는 [다이어리 페이지](/couple-diary)에서 확인하실 수 있어요.`;
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
  const total = data.length;
  const decidedPct = total > 0 ? Math.round((decided.length / total) * 100) : 0;

  // ── 인사이트: 결정률 + 미투표 책임자 ───────────────
  // raw 카운트 대신 진행 상태 한 줄 + 다음 액션.
  const insights: string[] = [];
  if (total >= 5 && decidedPct >= 80) {
    insights.push(`🎉 **${decidedPct}% 결정 완료** — 결정 모드가 잘 굴러가고 있어요. 남은 ${pending.length}건만 마무리하면 큰 줄기는 정해져요.`);
  } else if (total >= 5 && decidedPct < 40) {
    insights.push(`⚠️ **결정률 ${decidedPct}%** — 미결정이 많이 쌓였어요. 가장 임박한 항목부터 둘이서 한 번에 정리해보시는 게 좋아요.`);
  }

  // 미투표 책임자 분석
  if (pending.length >= 3) {
    const myMissing = pending.filter((v: any) => !v.my_pick).length;
    const partnerMissing = pending.filter((v: any) => !v.partner_pick).length;
    if (myMissing >= 3 && myMissing > partnerMissing) {
      insights.push(`📝 미투표 ${pending.length}건 중 **${myMissing}건이 내 차례**예요. 빠른 결정이 어렵다면 파트너와 이야기 나눠보세요.`);
    } else if (partnerMissing >= 3 && partnerMissing > myMissing) {
      insights.push(`💌 미투표 ${pending.length}건 중 **${partnerMissing}건은 파트너가 결정**해야 해요. 가볍게 리마인드 보내드릴까요?`);
    }
  }

  let result = `진행 중인 투표 ${pending.length}건 · 결정된 투표 ${decided.length}건 🗳️ (결정률 ${decidedPct}%)`;

  if (insights.length > 0) {
    result += `\n\n${insights.join("\n\n")}`;
  }

  if (pending.length > 0) {
    result += "\n\n**아직 결정 못 한 투표 (최근 5)**\n";
    result += pending
      .slice(0, 5)
      .map((v: any) => {
        const who: string[] = [];
        if (!v.my_pick) who.push("나");
        if (!v.partner_pick) who.push("파트너");
        return `- ${v.option_a} vs ${v.option_b} (${who.join("·")} 미투표)`;
      })
      .join("\n");
  }

  result += "\n\n전체 투표는 [커플 투표 페이지](/couple-vote)에서 확인하실 수 있어요.";
  return result;
};
