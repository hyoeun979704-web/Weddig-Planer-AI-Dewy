import { useState } from "react";

interface DewyLogoProps {
  size?: number;
  className?: string;
}

const DewyLogo = ({ size = 28, className }: DewyLogoProps) => {
  const [useFallback, setUseFallback] = useState(false);

  if (!useFallback) {
    return (
      <img
        src="/dewy-logo.png"
        alt="Dewy"
        width={size}
        height={size}
        className={className}
        onError={() => setUseFallback(true)}
      />
    );
  }

  return (
    <svg
      viewBox="0 0 32 28"
      width={size}
      height={size}
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id="dewy-left" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F86B79" />
          <stop offset="100%" stopColor="#FFB37A" />
        </linearGradient>
        <linearGradient id="dewy-right" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFBE62" />
          <stop offset="100%" stopColor="#FF94BB" />
        </linearGradient>
        <linearGradient id="dewy-curl" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#59A7F0" />
          <stop offset="100%" stopColor="#A7E2FF" />
        </linearGradient>
      </defs>
      <path
        d="M16 26C10.5 22 3 17 3 9.5 3 5.9 5.8 3 9.3 3c2.5 0 4.9 1.4 6.7 3.8C15.8 5.5 15.9 3.8 16 3c.1.8.2 2.5.1 3.8"
        fill="url(#dewy-left)"
      />
      <path
        d="M16 26c5.5-4 13-9 13-16.5C29 5.9 26.2 3 22.7 3c-2.5 0-4.9 1.4-6.7 3.8V26Z"
        fill="url(#dewy-right)"
      />
      <path
        d="M22 18c1.8.3 3.5 1.5 4 3.5.6 2.5-1.4 4.7-3.8 4.6-1.6-.1-2.9-1.3-3-2.9 0-1.4.9-2.7 2.2-3.4l.6-1.8Z"
        fill="url(#dewy-curl)"
      />
    </svg>
  );
};

export default DewyLogo;
