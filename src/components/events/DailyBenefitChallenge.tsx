// 레퍼런스(블프 "매일 혜택 챌린지")의 핵심 모티프를 Dewy 브랜드(소프트 핑크 ·
// 웨딩 파스텔)로 번안한 데일리 혜택 챌린지. 다크 톤을 그대로 베끼지 않고 레이아웃 ·
// 인터랙션(시간대별 보상 행 + 알림 토글)만 가져와 라이트 핑크로 재구성.
//
// 데이터는 정적 프런트 콘텐츠 — DB 스키마 의존이 없어 정합성 위험 없음. 각 행의
// path 는 App.tsx 에 실재하는 라우트만 사용.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const ALARM_KEY = "dewy_daily_benefit_alarm";

interface DailySlot {
  id: string;
  time: string;
  title: string;
  reward: string;
  icon: string;
  /** 행 배경 — 보상별로 옅게 구분되는 파스텔 틴트 */
  rowBg: string;
  /** 메달(아이콘 원형) — 행보다 진한 그라데이션 */
  medalBg: string;
  path: string;
}

// 시간대별 데일리 보상 — 레퍼런스의 00:00 / 12:00 / 18:00 / 20:00 구성 차용,
// 보상은 Dewy 기능(출석·미니게임·포인트·쿠폰)으로 치환.
const SLOTS: DailySlot[] = [
  {
    id: "attendance",
    time: "00:00",
    title: "매일 출석 체크",
    reward: "보너스 하트 적립",
    icon: "🏆",
    rowBg: "from-[#FFF1F4] to-[#FFE3EA]",
    medalBg: "from-[#FBA9B8] to-[#F6909B]",
    path: "/mypage?tab=missions",
  },
  {
    id: "game",
    time: "12:00",
    title: "웨딩 미니게임",
    reward: "랜덤 하트 최대 1,000",
    icon: "💝",
    rowBg: "from-[#FFF6E9] to-[#FFEFD6]",
    medalBg: "from-[#FFD27A] to-[#F7B23B]",
    path: "/merge-game",
  },
  {
    id: "points",
    time: "18:00",
    title: "선착순 포인트",
    reward: "매일 1,000P 적립",
    icon: "🪙",
    rowBg: "from-[#F4EEFC] to-[#EBE1FA]",
    medalBg: "from-[#C9A8F0] to-[#A982E6]",
    path: "/points",
  },
  {
    id: "coupon",
    time: "20:00",
    title: "선착순 웨딩 쿠폰",
    reward: "최대 30% 할인 쿠폰",
    icon: "🎟️",
    rowBg: "from-[#E9F5F2] to-[#DBEFEA]",
    medalBg: "from-[#8FD3C7] to-[#5CBFAE]",
    path: "/coupons",
  },
];

const DailyBenefitChallenge = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [alarmOn, setAlarmOn] = useState(false);

  // 알림 설정은 localStorage 에 보존 — 새로고침/재방문에도 유지.
  useEffect(() => {
    try {
      setAlarmOn(localStorage.getItem(ALARM_KEY) === "1");
    } catch {
      // storage 차단 환경 — 기본 off 유지
    }
  }, []);

  const handleAlarmChange = (next: boolean) => {
    setAlarmOn(next);
    try {
      localStorage.setItem(ALARM_KEY, next ? "1" : "0");
    } catch {
      // no-op
    }
    toast({ description: next ? "매일 혜택 오픈 알림을 받아요" : "혜택 알림을 껐어요" });
  };

  return (
    <section className="px-4 pt-5">
      <div className="rounded-3xl overflow-hidden border border-border/60 bg-card shadow-[var(--shadow-card)]">
        {/* 헤더 — 타이틀 + 알림 토글 */}
        <div
          className="flex items-center justify-between gap-3 px-5 pt-5 pb-4"
          style={{ background: "linear-gradient(135deg, #FFF1F4 0%, #FBD3DC 100%)" }}
        >
          <div className="min-w-0">
            <p className="text-[17px] font-extrabold text-foreground leading-tight">
              매일 웨딩 혜택 챌린지
            </p>
            <p className="mt-0.5 text-[12px] font-medium text-[#B23A53]">
              매일 열리는 혜택, 알림으로 챙기기
            </p>
          </div>
          <Switch
            checked={alarmOn}
            onCheckedChange={handleAlarmChange}
            aria-label="매일 혜택 오픈 알림받기"
            className="shrink-0"
          />
        </div>

        {/* 시간대별 보상 행 */}
        <div className="flex flex-col gap-2 p-3">
          {SLOTS.map((slot) => (
            <button
              key={slot.id}
              onClick={() => navigate(slot.path)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-br text-left",
                "active:scale-[0.99] transition-transform",
                slot.rowBg,
              )}
            >
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-extrabold text-foreground leading-none">
                  <span className="text-[11px] font-bold text-muted-foreground mr-1.5 align-middle">매일</span>
                  {slot.time}
                </p>
                <p className="mt-1.5 text-[13px] font-semibold text-foreground/80 truncate">
                  {slot.reward}
                </p>
              </div>
              <div
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br shadow-sm",
                  slot.medalBg,
                )}
              >
                <span className="text-[24px]" aria-hidden>{slot.icon}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DailyBenefitChallenge;
