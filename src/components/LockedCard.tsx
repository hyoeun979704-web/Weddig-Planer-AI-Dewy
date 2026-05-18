import { Lock } from "lucide-react";

interface LockedCardProps {
  title: string;
  description?: string;
  badge?: string;
  onClick?: () => void;
}

/**
 * AI Studio의 출시 전 서비스 카드.
 * 잠금 아이콘 + 출시 단계 뱃지를 표시하며, 클릭 시 사전알림 신청 모달을 열 수 있다.
 */
const LockedCard = ({ title, description, badge, onClick }: LockedCardProps) => (
  <button
    type="button"
    onClick={onClick}
    className="bg-white rounded-2xl overflow-hidden shadow-sm text-left active:scale-[0.98] transition-transform group"
  >
    <div className="relative aspect-square bg-[#e5e5e5]">
      {/* 잠금 오버레이 */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
        <div className="flex flex-col items-center gap-1 text-white">
          <Lock className="w-7 h-7" strokeWidth={2.5} />
          {badge && (
            <span className="text-[10px] font-semibold bg-white/90 text-foreground px-2 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </div>
      </div>
    </div>
    <div className="px-4 py-3">
      <h3 className="text-[15px] font-bold text-foreground leading-tight">{title}</h3>
      {description && (
        <p className="mt-1 text-[12px] text-muted-foreground line-clamp-2">{description}</p>
      )}
      {onClick && (
        <p className="mt-1.5 text-[11px] text-primary font-medium">출시 알림 받기 →</p>
      )}
    </div>
  </button>
);

export default LockedCard;
