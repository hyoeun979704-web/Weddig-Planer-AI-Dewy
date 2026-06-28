import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

/**
 * ISO 문자열을 "N분 전 / N시간 전 / N일 전 / N개월 전" 형태의 상대 시간으로.
 *
 * date-fns 의 한국어 로케일을 단일 소스로 사용한다(이전엔 4곳에서 round/floor·
 * "방금"/"방금 전"·"약 " 처리가 제각각이라 표기가 흔들렸다).
 * date-fns 의 "약 1개월 전" 같은 접두어 "약 "은 제거해 간결하게 표기.
 */
export function relativeTime(input: string | number | Date): string {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "";
  return formatDistanceToNow(date, { addSuffix: true, locale: ko }).replace("약 ", "");
}
