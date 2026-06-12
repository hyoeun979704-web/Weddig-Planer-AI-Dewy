// AI 웨딩플래너 모델 비교 하네스.
// 사용: npx tsx scripts/eval-chatbot/run.ts [--list-models] [--models gemini:gemini-2.5-flash,openai:gpt-4o-mini]
// 필요 env: EVAL_SUPABASE_URL, EVAL_SUPABASE_ANON_KEY, EVAL_EMAIL, EVAL_PASSWORD
// 결과: scripts/eval-chatbot/out/results-<ts>.json (모델×시나리오 응답 + judge 점수)

import { writeFileSync, mkdirSync } from "node:fs";
import { SCENARIOS } from "./scenarios";

const URL_BASE = process.env.EVAL_SUPABASE_URL!;
const ANON = process.env.EVAL_SUPABASE_ANON_KEY!;
const EMAIL = process.env.EVAL_EMAIL!;
const PASSWORD = process.env.EVAL_PASSWORD!;
const JUDGE = { provider: "gemini", model: "gemini-2.5-pro" };

async function signIn(): Promise<string> {
  const r = await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error("signin failed: " + JSON.stringify(j).slice(0, 200));
  return j.access_token;
}

async function callPlanner(token: string, body: unknown): Promise<any> {
  const r = await fetch(`${URL_BASE}/functions/v1/ai-planner`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: ANON },
    body: JSON.stringify(body),
  });
  return r.json();
}

const JUDGE_SYSTEM = `너는 한국 웨딩 도메인 AI 챗봇 응답의 엄격한 평가자다.
주어진 [채점 기준]에 따라 [응답]을 1~5점으로 채점한다 (5=기준 완벽 충족, 3=부분 충족, 1=실패/허위).
허위 사실 단정·거짓 실행 주장은 최대 2점. 반드시 아래 JSON 만 출력:
{"score": <1-5>, "hallucination": <true|false>, "reason": "<한 줄>"}`;

async function judge(token: string, scenario: { checks: string }, lastUser: string, answer: string) {
  const res = await callPlanner(token, {
    messages: [
      {
        role: "user",
        content: `[채점 기준]\n${scenario.checks}\n\n[사용자 질문]\n${lastUser}\n\n[응답]\n${answer}`,
      },
    ],
    eval_options: { ...JUDGE, raw_system: JUDGE_SYSTEM },
  });
  try {
    const m = (res.text ?? "").match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : { score: null, reason: "judge-parse-fail", raw: res.text?.slice(0, 200) };
  } catch {
    return { score: null, reason: "judge-parse-fail", raw: res.text?.slice(0, 200) };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const token = await signIn();
  console.log("signed in");

  if (args.includes("--list-models")) {
    const res = await callPlanner(token, { messages: [], eval_options: { list_models: true } });
    console.log(JSON.stringify(res, null, 2));
    return;
  }

  const modelsArg = args.find((a) => a.startsWith("--models="))?.slice(9)
    ?? "gemini:gemini-2.5-flash";
  const models = modelsArg.split(",").map((s) => {
    const [provider, ...rest] = s.split(":");
    return { provider: provider as "gemini" | "openai", model: rest.join(":") };
  });

  const results: any[] = [];
  for (const m of models) {
    console.log(`=== ${m.provider}:${m.model} ===`);
    for (const sc of SCENARIOS) {
      const lastUser = sc.messages.filter((x) => x.role === "user").slice(-1)[0].content;
      try {
        const res = await callPlanner(token, {
          messages: sc.messages,
          eval_options: { provider: m.provider, model: m.model },
        });
        if (res.error) {
          results.push({ ...m, id: sc.id, criterion: sc.criterion, error: res.error, detail: res.detail });
          console.log(`  ${sc.id}: ERROR ${res.error}`);
          continue;
        }
        const j = await judge(token, sc, lastUser, res.text ?? "");
        results.push({
          ...m, id: sc.id, criterion: sc.criterion,
          latency_ms: res.latency_ms, usage: res.usage,
          score: j.score, hallucination: j.hallucination ?? null, judge_reason: j.reason,
          answer: (res.text ?? "").slice(0, 1500),
        });
        console.log(`  ${sc.id}: score=${j.score} ${res.latency_ms}ms`);
      } catch (e) {
        results.push({ ...m, id: sc.id, criterion: sc.criterion, error: String(e).slice(0, 200) });
        console.log(`  ${sc.id}: EXCEPTION`);
      }
    }
  }

  mkdirSync("scripts/eval-chatbot/out", { recursive: true });
  const file = `scripts/eval-chatbot/out/results-${Date.now()}.json`;
  writeFileSync(file, JSON.stringify(results, null, 2));

  // 요약: 모델×기준 평균
  const summary: Record<string, Record<string, { n: number; sum: number; lat: number; hall: number }>> = {};
  for (const r of results) {
    if (r.score == null) continue;
    const mk = `${r.provider}:${r.model}`;
    summary[mk] ??= {};
    summary[mk][r.criterion] ??= { n: 0, sum: 0, lat: 0, hall: 0 };
    const s = summary[mk][r.criterion];
    s.n++; s.sum += r.score; s.lat += r.latency_ms ?? 0; s.hall += r.hallucination ? 1 : 0;
  }
  const table: any = {};
  for (const [mk, crit] of Object.entries(summary)) {
    table[mk] = Object.fromEntries(
      Object.entries(crit).map(([c, s]) => [c, { avg: +(s.sum / s.n).toFixed(2), avg_ms: Math.round(s.lat / s.n), halluc: s.hall }]),
    );
  }
  console.log("\nSUMMARY:");
  console.log(JSON.stringify(table, null, 2));
  console.log("saved:", file);
}

main().catch((e) => { console.error(e); process.exit(1); });
