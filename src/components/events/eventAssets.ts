import crownImg from "@/assets/events/crown.png";
import coinImg from "@/assets/events/coin.png";
import calendarImg from "@/assets/events/calendar.png";
import bouquetImg from "@/assets/events/bouquet.png";
import cameraImg from "@/assets/events/camera.png";
import heartImg from "@/assets/events/heart.png";

// slug → 일러스트 에셋(단일 소스). Events.tsx(/events)·Deals.tsx(이벤트 탭=/deals)
// 둘 다 같은 promotional_events 를 카드로 그리므로 여기서 한 번만 매핑한다(드리프트 차단).
// 매핑이 없는 slug 는 그래디언트 박스 + 이모지로 폴백(운영팀 신규 카드 대비).
export const EVENT_ASSETS: Record<string, string> = {
  welcome: crownImg,
  referral: coinImg,
  attendance: calendarImg,
  mini_game: bouquetImg,
  review: cameraImg,
  partner_link: heartImg,
};
