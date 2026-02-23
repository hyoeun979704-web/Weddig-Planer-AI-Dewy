import { useSubscription } from "@/hooks/useSubscription";

const DailyUsageBadge = () => {
  const { isPremium, dailyUsage } = useSubscription();

  if (isPremium) {
    return (
      <div className="mx-4 mb-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 rounded-full">
          <span className="text-xs font-medium text-primary">✨ Premium · 무제한</span>
        </div>
      </div>
    );
  }

  const remaining = dailyUsage.remaining ?? 0;
  let style = "bg-muted text-muted-foreground";
  if (remaining === 1) style = "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
  if (remaining === 0) style = "bg-destructive/10 text-destructive";

  return (
    <div className="mx-4 mb-2">
      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ${style}`}>
        <span className="text-xs font-medium">💬 오늘 남은 질문 {remaining}/3회</span>
      </div>
    </div>
  );
};

export default DailyUsageBadge;
