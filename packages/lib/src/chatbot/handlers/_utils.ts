// 챗봇 핸들러 공용 유틸. 핸들러별 import는 짧게.

/**
 * PostgREST `.or()` / ilike 필터에 들어가기 전에 사용자 입력에서
 * 쿼리 grammar를 깨뜨릴 수 있는 특수문자를 제거한다.
 *
 * 제거 문자:
 *  - `,` `(` `)`  → PostgREST `.or()` 분리자
 *  - `/`          → 구버전 모달 라벨에서 사용 ("강남/서초")
 *  - `%` `*`      → ILIKE wildcard로 오해될 수 있음
 *  - `.`          → PostgREST의 `key.op.value` 구분자
 *  - `\`          → 이스케이프
 *
 * 잘라낸 공백은 1칸으로 합치고 trim. 결과가 빈 문자열이면 `undefined` 반환.
 */
export const sanitizeForIlike = (s: string | undefined): string | undefined => {
  if (!s) return undefined;
  const cleaned = s.replace(/[,()/%*\\.]/g, " ").replace(/\s+/g, " ").trim();
  return cleaned || undefined;
};
