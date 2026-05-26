// YouTube 자막(transcript) fetch helper — quota 0.
//
// youtube-transcript 라이브러리가 YouTube 의 timedtext endpoint 를 호출해
// 자막 텍스트를 가져옴 (API key 불필요, quota 소모 0). 자동 생성 자막도 포함.
//
// 한계:
//   - 자막이 없는 영상: 빈 문자열 반환
//   - 한국어 자막 우선; 없으면 첫 번째 가용 언어
//   - timedtext 가 throttle 되면 짧은 지연 후 재시도

import { YoutubeTranscript } from "youtube-transcript";

// 너무 자주 호출하면 YouTube 가 IP 단위 throttle. 보수적 간격.
const MIN_GAP_MS = 250;
let lastCallAt = 0;
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function throttle(): Promise<void> {
  const elapsed = Date.now() - lastCallAt;
  if (elapsed < MIN_GAP_MS) await sleep(MIN_GAP_MS - elapsed);
  lastCallAt = Date.now();
}

interface TranscriptItem {
  text: string;
  offset: number;
  duration: number;
}

/**
 * 자막 전체를 단일 문자열로 반환. 없거나 실패 시 빈 문자열.
 * 한국어(ko) 우선 시도, 실패하면 라이브러리 default (대개 영상의 primary 자막).
 *
 * 자막 길이 cap: 5000자. 결혼 관련 정보가 5천자 안에 다 들어가지 않는 영상은
 * 거의 없고, 분류 입력 토큰량을 적정 수준으로 제한 (regex 매칭 cost 관리).
 */
export async function fetchTranscript(videoId: string): Promise<string> {
  await throttle();
  try {
    let items: TranscriptItem[] = [];
    try {
      items = (await YoutubeTranscript.fetchTranscript(videoId, {
        lang: "ko",
      })) as TranscriptItem[];
    } catch {
      // 한국어 자막 없으면 default (영상의 primary 언어 자막) 시도
      try {
        items = (await YoutubeTranscript.fetchTranscript(videoId)) as TranscriptItem[];
      } catch {
        return "";
      }
    }
    const text = items
      .map((i) => i.text)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    return text.length > 5000 ? text.slice(0, 5000) : text;
  } catch {
    return "";
  }
}
