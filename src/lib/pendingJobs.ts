// 생성 기능 공용 백그라운드 잡 추적 — 페이지를 벗어나도 완료 알림을 띄우기 위해
// 진행중 잡 id 를 localStorage 에 보관한다. 서버는 EdgeRuntime.waitUntil 로 계속
// 생성하고, 전역 GenerationNotifier 가 이 목록을 폴링해 완료/실패 시 토스트를 띄운다.

const KEY = "dewy.generation.pending";

export type JobType = "consulting" | "dress" | "makeup" | "photo" | "hair";

export interface PendingJob {
  id: string;
  type: JobType;
  startedAt: number;
}

export function getPendingJobs(): PendingJob[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as PendingJob[]) : [];
    // 30분 넘은 잡은 폐기(타임아웃 안전망) — 결과는 각 기록 화면에서 확인 가능.
    const cutoff = Date.now() - 30 * 60 * 1000;
    return list.filter((j) => j && j.id && j.type && j.startedAt > cutoff);
  } catch {
    return [];
  }
}

function write(list: PendingJob[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* 저장 실패는 무시 */
  }
}

export function addPendingJob(job: { id: string; type: JobType }) {
  const list = getPendingJobs().filter((j) => j.id !== job.id);
  list.push({ ...job, startedAt: Date.now() });
  write(list);
}

export function removePendingJob(id: string) {
  write(getPendingJobs().filter((j) => j.id !== id));
}
