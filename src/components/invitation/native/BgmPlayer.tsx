// 배경음악 플레이어(I-MOBILE Phase 1). 우상단 떠 있는 토글.
// iOS/모바일 자동재생 정책: 사용자 제스처 전엔 재생 불가 → 첫 탭에서 시작하도록 처리.
// src 없으면 아무것도 렌더 안 함(데이터 없을 때 dead-end 방지). 부모는 position:relative.

import { useEffect, useRef, useState } from "react";
import { Music2, VolumeX } from "lucide-react";

interface BgmPlayerProps {
  src?: string;
  /** 버튼 악센트 색(테마). */
  accent?: string;
}

export function BgmPlayer({ src, accent = "#3A322C" }: BgmPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!src) return;
    const a = audioRef.current;
    if (!a) return;
    a.loop = true;
    a.volume = 0.45;
    // 자동재생 시도(대부분 모바일에서 제스처 전 차단) → 차단되면 첫 제스처에 시작.
    a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    const onFirst = () => {
      a.play().then(() => setPlaying(true)).catch(() => undefined);
    };
    window.addEventListener("pointerdown", onFirst, { once: true });
    return () => {
      window.removeEventListener("pointerdown", onFirst);
      a.pause();
    };
  }, [src]);

  if (!src) return null;

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.play().then(() => setPlaying(true)).catch(() => undefined);
    }
  };

  return (
    <>
      <audio ref={audioRef} src={src} preload="auto" />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "배경음악 끄기" : "배경음악 켜기"}
        className="absolute top-3 right-3 z-50 w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md shadow-sm"
        style={{ background: "rgba(255,255,255,0.7)", color: accent }}
      >
        <span
          style={{
            display: "inline-flex",
            animation: playing ? "dewy-bgm-spin 4s linear infinite" : undefined,
          }}
        >
          {playing ? <Music2 className="w-[18px] h-[18px]" /> : <VolumeX className="w-[18px] h-[18px]" />}
        </span>
      </button>
      <style>{`@keyframes dewy-bgm-spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </>
  );
}
