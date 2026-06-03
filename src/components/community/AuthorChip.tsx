import type { AuthorIdentity } from "@/lib/communityIdentity";

// 작성자 표시 칩 — 생성 아바타(가명 첫 글자) + 닉네임 + 안전 뱃지(스타일/역할).
// 기존의 밋밋한 "익명" 을 대체. 실명/예식일/지역은 표시하지 않는다.
interface AuthorChipProps {
  identity: AuthorIdentity;
  /** 부가 메타(작성 시각 등)를 닉네임 옆에 표시. */
  meta?: string;
  size?: "sm" | "md";
}

const AuthorChip = ({ identity, meta, size = "md" }: AuthorChipProps) => {
  const avatar = size === "sm" ? "w-6 h-6 text-[10px]" : "w-8 h-8 text-xs";
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div
        className={`${avatar} rounded-full flex items-center justify-center font-bold text-white shrink-0`}
        style={{ backgroundColor: identity.color }}
        aria-hidden
      >
        {identity.initial}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`font-semibold text-foreground truncate ${size === "sm" ? "text-xs" : "text-sm"}`}>
            {identity.nickname}
          </span>
          {identity.badges.map((b, i) => (
            <span
              key={i}
              className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium shrink-0"
            >
              {b}
            </span>
          ))}
        </div>
        {meta && <p className="text-[11px] text-muted-foreground leading-tight">{meta}</p>}
      </div>
    </div>
  );
};

export default AuthorChip;
