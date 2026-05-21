import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  /** 상단 아이콘 (선택). 없으면 아이콘 영역 자체를 그리지 않음. */
  icon?: LucideIcon;
  /** 제목 — 한 줄 핵심 메시지 */
  title: string;
  /** 보조 설명 (선택) */
  description?: string;
  /** 하단 액션 버튼 등 (선택) */
  action?: ReactNode;
  className?: string;
}

/**
 * 빈 상태 카드 — 목록/검색 결과가 없을 때 일관된 모양으로 표시.
 *
 * 인라인 "등록된 X 가 없어요" 같은 메시지를 이 컴포넌트로 통일한다.
 * 데코 아이콘이 디자인 핵심인 화면(예: 게임, 일부 대시보드)은 자체 빈 상태를
 * 유지하고 이걸 강제하지 않는다.
 */
const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) => (
  <div
    className={cn(
      "flex flex-col items-center justify-center text-center py-12 px-6",
      className,
    )}
  >
    {Icon && (
      <div className="inline-flex p-3.5 bg-muted rounded-full mb-3">
        <Icon className="w-6 h-6 text-muted-foreground" />
      </div>
    )}
    <p className="text-title font-semibold text-foreground">{title}</p>
    {description && (
      <p className="text-body text-muted-foreground mt-1.5 max-w-xs">
        {description}
      </p>
    )}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export default EmptyState;
