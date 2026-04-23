interface DewyLogoProps {
  size?: number;
  className?: string;
}

const DewyLogo = ({ size = 24, className }: DewyLogoProps) => (
  <svg
    viewBox="0 0 24 21"
    width={size}
    height={Math.round((size * 21) / 24)}
    className={className}
    aria-hidden
  >
    <defs>
      <radialGradient id="dewy-core" cx="90%" cy="79%" r="80%">
        <stop offset="0%" stopColor="#FFBE62" />
        <stop offset="54%" stopColor="#FF94BB" />
      </radialGradient>
      <linearGradient id="dewy-fold" x1="0" y1="0" x2="1" y2="0.4">
        <stop offset="34%" stopColor="#F86B79" />
        <stop offset="80%" stopColor="#FFC261" />
      </linearGradient>
      <linearGradient id="dewy-drop" x1="0" y1="0" x2="0" y2="1">
        <stop offset="28%" stopColor="#59A7F0" />
        <stop offset="100%" stopColor="#A7E2FF" />
      </linearGradient>
    </defs>
    <path
      d="M12 20C7.5 16.5 2 12.5 2 7.5 2 4.5 4.2 2 7 2c1.9 0 3.7 1 5 2.6C13.3 3 15.1 2 17 2c2.8 0 5 2.5 5 5.5 0 5-5.5 9-10 12.5Z"
      fill="url(#dewy-core)"
    />
    <path
      d="M12 7.5c1.8-2 3.6-3 5.3-3 .9 0 1.7.3 2.3.8-1.5 4.1-5.3 7.5-7.6 9.2-2.3-1.7-6.1-5.1-7.6-9.2.6-.5 1.4-.8 2.3-.8 1.7 0 3.5 1 5.3 3Z"
      fill="url(#dewy-fold)"
      opacity="0.9"
    />
    <path
      d="M15.5 13.5c.6.3 1.1.8 1.3 1.5.2.8-.1 1.6-.8 2-.7.4-1.6.2-2.1-.4-.4-.5-.4-1.2-.1-1.7l1.7-1.4Z"
      fill="url(#dewy-drop)"
    />
  </svg>
);

export default DewyLogo;
