import { useCallback, useEffect, useRef, useState } from 'react';

// ─── 게임 사운드(BGM + 효과음) ────────────────────────────────────────────────
// - BGM: 루프 재생. 모바일 자동재생 정책상 첫 사용자 제스처에서 unlock 후 재생.
// - 효과음(머지): 빠르게 연속 발생할 수 있어 노드를 cloneNode 해 겹쳐 재생.
// - 음소거 상태는 localStorage 에 저장해 재방문 시 유지.
//
// 에셋 경로: public/game/bgm.wav, sfx-merge.wav, sfx-premium.wav
//   파일이 없으면 load 에러를 조용히 무시 — 게임은 정상 동작.
//   (교체 시 같은 파일명 유지, 또는 위 *_SRC 상수의 확장자만 변경)

const BGM_SRC = '/game/bgm.wav';
const SFX_MERGE_SRC = '/game/sfx-merge.wav';
const SFX_PREMIUM_SRC = '/game/sfx-premium.wav'; // 프리미엄 부케 완성 전용 효과음
const PREMIUM_LEVEL_ID = 12;
const BGM_VOLUME = 0.35;
const SFX_VOLUME = 0.6;
const SFX_PREMIUM_VOLUME = 0.8;
const MUTE_KEY = 'dewy_game_muted';

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function useGameAudio() {
  const [muted, setMuted] = useState<boolean>(readMuted);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const sfxMergeRef = useRef<HTMLAudioElement | null>(null);
  const sfxPremiumRef = useRef<HTMLAudioElement | null>(null);
  const unlockedRef = useRef(false);

  // 오디오 엘리먼트 준비 (브라우저 환경에서만)
  useEffect(() => {
    if (typeof Audio === 'undefined') return;

    const bgm = new Audio(BGM_SRC);
    bgm.loop = true;
    bgm.volume = BGM_VOLUME;
    bgm.preload = 'auto';
    bgmRef.current = bgm;

    const sfx = new Audio(SFX_MERGE_SRC);
    sfx.volume = SFX_VOLUME;
    sfx.preload = 'auto';
    sfxMergeRef.current = sfx;

    const premium = new Audio(SFX_PREMIUM_SRC);
    premium.volume = SFX_PREMIUM_VOLUME;
    premium.preload = 'auto';
    sfxPremiumRef.current = premium;

    return () => {
      bgm.pause();
      bgmRef.current = null;
      sfxMergeRef.current = null;
      sfxPremiumRef.current = null;
    };
  }, []);

  // 첫 제스처에서 호출 — 모바일 자동재생 잠금 해제 + BGM 시작
  const unlock = useCallback(() => {
    if (unlockedRef.current) return;
    unlockedRef.current = true;
    const bgm = bgmRef.current;
    if (bgm && !mutedRef.current) {
      bgm.play().catch(() => { /* 자동재생 차단 등 — 무시 */ });
    }
  }, []);

  // 머지 효과음 — 겹침을 위해 clone 후 재생.
  // 프리미엄 부케(최종 레벨) 완성 시엔 전용 효과음을 사용.
  const playMerge = useCallback((newLevelId?: number) => {
    if (mutedRef.current) return;
    const isPremium = newLevelId === PREMIUM_LEVEL_ID;
    const base = isPremium ? sfxPremiumRef.current : sfxMergeRef.current;
    if (!base) return;
    try {
      const node = base.cloneNode(true) as HTMLAudioElement;
      node.volume = isPremium ? SFX_PREMIUM_VOLUME : SFX_VOLUME;
      node.play().catch(() => { /* 무시 */ });
    } catch {
      /* 무시 */
    }
  }, []);

  // 음소거 토글
  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(MUTE_KEY, next ? '1' : '0');
      } catch {
        /* 무시 */
      }
      const bgm = bgmRef.current;
      if (bgm) {
        if (next) {
          bgm.pause();
        } else if (unlockedRef.current) {
          bgm.play().catch(() => { /* 무시 */ });
        }
      }
      return next;
    });
  }, []);

  return { muted, toggleMute, unlock, playMerge };
}
