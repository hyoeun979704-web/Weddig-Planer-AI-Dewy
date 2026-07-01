// 재수출 심 — 단일 소스는 supabase/functions/_shared/studio/fittingScenes.ts (엣지 함수와 공유).
// 프롬프트·씬 정의를 서버(Deno)와 웹이 같은 파일로 쓰기 위한 이관(드리프트 방지).
// 웹 코드는 기존 "@/data/fittingScenes" 경로를 그대로 사용한다.
export * from "../../../../supabase/functions/_shared/studio/fittingScenes.ts";
