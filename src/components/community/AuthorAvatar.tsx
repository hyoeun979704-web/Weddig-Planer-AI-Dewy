import type { AuthorIdentity } from "@/lib/communityIdentity";

// 생성 아바타(가명 첫 글자 + 결정적 색). 작성자 표시가 필요한 모든 곳에서 공유.
const SIZE = {
  sm: "w-6 h-6 text-[10px]",
  md: "w-8 h-8 text-xs",
  lg: "w-9 h-9 text-xs",
} as const;

const AuthorAvatar = ({
  identity,
  size = "md",
}: {
  identity: AuthorIdentity;
  size?: keyof typeof SIZE;
}) => (
  <div
    className={`${SIZE[size]} rounded-full flex items-center justify-center font-bold text-white shrink-0`}
    style={{ backgroundColor: identity.color }}
    aria-hidden
  >
    {identity.initial}
  </div>
);

export default AuthorAvatar;
