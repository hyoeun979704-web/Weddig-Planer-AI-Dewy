import { useRef, useEffect, useCallback, useState } from 'react';
import { showRewardedAd } from '@/lib/ads/adService';
import { useGameLogic } from './useGameLogic';
import { useGameAudio } from './useGameAudio';
import { GAME_WIDTH, GAME_HEIGHT, JAR_INNER_BOTTOM, DROP_START_Y, FLOWER_LEVEL_MAP } from './constants';
import type { GameState } from './types';

interface GameProps {
  onScoreChange?: (score: number) => void;
  onGameOver?: (score: number) => void;
  onDoublePoints?: (score: number) => void;
  bestScore: number;
}


// Custom cursor SVGs encoded as data URIs
const PLAY_CURSOR = (() => {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'>
    <circle cx='14' cy='14' r='12' fill='none' stroke='%23F4A7B9' stroke-width='2' opacity='0.7'/>
    <circle cx='14' cy='14' r='3' fill='%23C9A96E'/>
    <line x1='14' y1='0' x2='14' y2='8' stroke='%23F4A7B9' stroke-width='1.2' opacity='0.5'/>
    <line x1='14' y1='20' x2='14' y2='28' stroke='%23F4A7B9' stroke-width='1.2' opacity='0.5'/>
    <line x1='0' y1='14' x2='8' y2='14' stroke='%23F4A7B9' stroke-width='1.2' opacity='0.5'/>
    <line x1='20' y1='14' x2='28' y2='14' stroke='%23F4A7B9' stroke-width='1.2' opacity='0.5'/>
  </svg>`;
  return `url("data:image/svg+xml,${svg}") 14 14, crosshair`;
})();

const POINTER_CURSOR = (() => {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'>
    <circle cx='12' cy='12' r='10' fill='%23C9A96E' opacity='0.25'/>
    <circle cx='12' cy='12' r='5' fill='%23C9A96E' opacity='0.6'/>
  </svg>`;
  return `url("data:image/svg+xml,${svg}") 12 12, pointer`;
})();

// 상단 음소거 버튼 좌표(캔버스 좌표) — draw 와 hit-test 가 공유.
const MUTE_BTN = { cx: 337, cy: 25, r: 15 };

// 버블 칩(pill) — 따뜻한 크림 배경 + 갈색 셀 아웃라인 + 부드러운 그림자.
// 이미지 스트레치가 없으니(roundRect 직접 그림) 왜곡 위험이 0이다.
function drawPill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const r = h / 2;
  ctx.save();
  ctx.shadowColor = 'rgba(120,70,50,0.20)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = 'rgba(255,250,244,0.96)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(150,95,70,0.55)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.stroke();
  ctx.restore();
}

// 라벨+값 칩. anchorLeft=true 면 ax 가 좌측 x, false 면 ax 가 우측 끝. 그려진 박스를 반환.
function drawLabeledChip(
  ctx: CanvasRenderingContext2D,
  anchorLeft: boolean, ax: number, y: number,
  label: string, value: string, valueColor: string
) {
  const padX = 11, h = 30, gap = 5;
  ctx.font = "700 9px 'Noto Sans KR', sans-serif";
  const lw = ctx.measureText(label).width;
  ctx.font = "bold 15px 'Noto Sans KR', sans-serif";
  const vw = ctx.measureText(value).width;
  const w = padX * 2 + lw + gap + vw;
  const x = anchorLeft ? ax : ax - w;
  drawPill(ctx, x, y, w, h);
  const cy = y + h / 2;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = "700 9px 'Noto Sans KR', sans-serif";
  ctx.fillStyle = 'rgba(150,95,70,0.8)';
  ctx.fillText(label, x + padX, cy + 1);
  ctx.font = "bold 15px 'Noto Sans KR', sans-serif";
  ctx.fillStyle = valueColor;
  ctx.fillText(value, x + padX + lw + gap, cy);
  return { x, w };
}

export function Game({ onScoreChange, onGameOver, onDoublePoints, bestScore }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const [adLoading, setAdLoading] = useState(false);
  const [rewardClaimed, setRewardClaimed] = useState(false);

  // 꽃 에셋 이미지 캐시. public/game-flowers/{id}.png 가 있으면 그걸 쓰고, 없으면
  // 기존 이모지+원 렌더로 폴백한다. 물리 충돌은 원(반지름 r)이지만 에셋이 항공샷
  // 둥근 부케라 실루엣이 거의 일치 — 이미지를 충돌 지름에 맞춰 그려 형태를 맞춘다.
  const flowerImgRef = useRef<Map<number, HTMLImageElement>>(new Map());
  const flowerReadyRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    for (let id = 1; id <= 12; id++) {
      if (flowerImgRef.current.has(id)) continue;
      const img = new Image();
      img.onload = () => flowerReadyRef.current.add(id);
      img.onerror = () => flowerReadyRef.current.delete(id);
      img.src = `/game-flowers/${id}.png`;
      flowerImgRef.current.set(id, img);
    }
  }, []);

  // 게임 chrome 에셋(배경·데드라인·버튼). 없으면 기존 캔버스 그리기로 폴백.
  const chromeRef = useRef<Record<string, HTMLImageElement>>({});
  const chromeReadyRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const assets: Record<string, string> = {
      bg: '/game/bg.png',
      btnGold: '/game/btn-gold.png',
      btnPink: '/game/btn-pink.png',
    };
    for (const [key, src] of Object.entries(assets)) {
      if (chromeRef.current[key]) continue;
      const img = new Image();
      img.onload = () => chromeReadyRef.current.add(key);
      img.onerror = () => chromeReadyRef.current.delete(key);
      img.src = src;
      chromeRef.current[key] = img;
    }
  }, []);

  // 사운드 — BGM 루프 + 머지 효과음. 첫 제스처에서 unlock 후 재생.
  // 메서드는 안정적인 useCallback 이라 구조분해해 deps 에 직접 쓴다(audio 객체는
  // 매 렌더 새 리터럴이라 그대로 의존하면 콜백/RAF 루프가 매 렌더 재생성됨).
  const audio = useGameAudio();
  const { muted: audioMuted, toggleMute, unlock: audioUnlock, playMerge } = audio;

  // 렌더 루프(draw)는 매 프레임 호출되므로 자주 바뀌는 값은 ref 로 읽어 draw 를 안정화한다.
  const mutedRef = useRef(audioMuted);
  mutedRef.current = audioMuted;
  const bestScoreRef = useRef(bestScore);
  bestScoreRef.current = bestScore;

  const { gameState, dropXRef, mergeFlashesRef, startGame, dropFlower, setDropX, tick, getBodies } =
    useGameLogic({ canvasRef, onScoreChange, onGameOver, onMerge: playMerge });

  const gameStateRef = useRef<GameState>(gameState);
  gameStateRef.current = gameState;

  // 포인트 2배 — 진짜 보상형 광고. 시청 완료 시 점수 2배 적립 후 새 게임.
  const watchRewardedForDouble = useCallback(async () => {
    if (adLoading || rewardClaimed) return;
    setAdLoading(true);
    try {
      const ok = await showRewardedAd();
      if (ok) {
        setRewardClaimed(true);
        onDoublePoints?.(gameStateRef.current.score);
        setRewardClaimed(false);
        startGame();
      }
    } finally {
      setAdLoading(false);
    }
  }, [adLoading, rewardClaimed, onDoublePoints, startGame]);

  // ─── 꽃 원형 렌더링 ───────────────────────────────────────────────────
  function drawFlower(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, levelId: number, alpha = 1) {
    const level = FLOWER_LEVEL_MAP.get(levelId);
    if (!level) return;
    const r = level.radius;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(angle);

    // 에셋 이미지가 준비됐으면 그걸로 렌더(충돌 지름에 맞춰 약간 키워 꽉 차게).
    if (flowerReadyRef.current.has(levelId)) {
      const img = flowerImgRef.current.get(levelId)!;
      const size = r * 2 * 1.08;
      ctx.drawImage(img, -size / 2, -size / 2, size, size);
      ctx.restore();
      return;
    }

    const grad = ctx.createRadialGradient(0, -r * 0.25, r * 0.05, 0, 0, r);
    grad.addColorStop(0, lighten(level.color, 40));
    grad.addColorStop(0.65, level.color);
    grad.addColorStop(1, darken(level.color, 30));

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = levelId === 12 ? '#B8860B' : 'rgba(0,0,0,0.18)';
    ctx.lineWidth = levelId === 12 ? 2.5 : 1.5;
    ctx.stroke();

    const fontSize = Math.max(10, Math.floor(r * 0.85));
    ctx.font = `${fontSize}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(level.emoji, 0, 0);


    ctx.restore();
  }

  // 버튼 9-slice — 둥근 양끝(cap)은 비율 유지하고 가운데만 늘려 왜곡 방지.
  function draw9SliceBtn(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
    const cs = img.height / 2;            // source cap (semicircle) width
    const cd = Math.min(h / 2, w / 2);    // dest cap width (aspect 유지)
    ctx.drawImage(img, 0, 0, cs, img.height, x, y, cd, h);
    ctx.drawImage(img, img.width - cs, 0, cs, img.height, x + w - cd, y, cd, h);
    ctx.drawImage(img, cs, 0, Math.max(1, img.width - 2 * cs), img.height, x + cd, y, Math.max(1, w - 2 * cd), h);
  }

  // ─── 색상 유틸리티 ───────────────────────────────────────────────────
  function hexToRgb(hex: string): [number, number, number] {
    const n = parseInt(hex.replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function lighten(hex: string, amt: number): string {
    const [r, g, b] = hexToRgb(hex);
    return `rgb(${Math.min(255, r + amt)},${Math.min(255, g + amt)},${Math.min(255, b + amt)})`;
  }
  function darken(hex: string, amt: number): string {
    const [r, g, b] = hexToRgb(hex);
    return `rgb(${Math.max(0, r - amt)},${Math.max(0, g - amt)},${Math.max(0, b - amt)})`;
  }

  // ─── 캔버스 렌더링 ──────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const gs = gameStateRef.current;

    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    // 배경 — 에셋 있으면 cover 로 채우고, 없으면 핑크 그라데이션 폴백.
    if (chromeReadyRef.current.has('bg')) {
      const img = chromeRef.current.bg;
      const s = Math.max(GAME_WIDTH / img.width, GAME_HEIGHT / img.height);
      const dw = img.width * s, dh = img.height * s;
      ctx.drawImage(img, (GAME_WIDTH - dw) / 2, (GAME_HEIGHT - dh) / 2, dw, dh);
    } else {
      const bgGrad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
      bgGrad.addColorStop(0, '#FFF0F5');
      bgGrad.addColorStop(1, '#FFF9FA');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }

    // 바닥/데드라인 별도 렌더 없음 — 배경 에셋의 유리통이 바닥·벽·데드라인(윗 림)을 모두 표현.

    // ─── 인게임 상단 버블 HUD (유리 림 위 오픈 영역) ──────────────────────────
    const waitLevel = FLOWER_LEVEL_MAP.get(gs.currentLevelId);
    const nextLevel = FLOWER_LEVEL_MAP.get(gs.nextLevelId);

    if (gs.phase !== 'gameover' && waitLevel) {
      const hudY = 10;

      // SCORE 칩 (좌)
      drawLabeledChip(ctx, true, 8, hudY, 'SCORE', String(gs.score), '#E0739A');

      // NEXT 미리보기 (중앙) — 프레임 없이 'NEXT' 라벨 + 그 아래 큰 꽃.
      if (nextLevel) {
        const cx = GAME_WIDTH / 2;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.font = "bold 14px 'Noto Sans KR', sans-serif";
        ctx.fillStyle = 'rgba(140,90,65,0.95)';
        ctx.fillText('NEXT', cx, hudY - 4);

        const iconSz = 46;                  // 크게(256px 소스라 안 깨짐), 박스 없음
        const icy = hudY - 4 + 16 + iconSz / 2;
        if (flowerReadyRef.current.has(gs.nextLevelId)) {
          ctx.drawImage(flowerImgRef.current.get(gs.nextLevelId)!, cx - iconSz / 2, icy - iconSz / 2, iconSz, iconSz);
        } else {
          ctx.font = `${iconSz}px serif`;
          ctx.textBaseline = 'middle';
          ctx.fillText(nextLevel.emoji, cx, icy);
        }
      }

      // BEST 칩 (우, 음소거 버튼 왼쪽까지)
      drawLabeledChip(ctx, false, MUTE_BTN.cx - MUTE_BTN.r - 6, hudY, 'BEST', String(bestScoreRef.current), '#C9A96E');
    }

    // 머지 이펙트 — 부드러운 글로우 + 확장 링 + 사방으로 튀는 반짝이.
    // 프리미엄(최종 레벨) 완성은 더 크고 화려하게(2겹 링·무지개 반짝이·별·더 긴 지속).
    const now = performance.now();
    mergeFlashesRef.current.forEach((f) => {
      const isPrem = !!f.premium;
      const dur = isPrem ? 1200 : 600;
      const elapsed = now - f.createdAt;
      const progress = Math.min(1, elapsed / dur);
      const ease = 1 - Math.pow(1 - progress, 2); // ease-out

      ctx.save();
      ctx.translate(f.x, f.y);

      // 1) 중심 글로우 (초반에 확 밝아졌다 사라짐)
      const glowAlpha = (1 - progress) * (isPrem ? 0.7 : 0.5);
      if (glowAlpha > 0.01) {
        const gr = f.radius * (isPrem ? 1.0 + 1.4 * ease : 0.6 + 0.8 * ease);
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, gr);
        glow.addColorStop(0, `rgba(255,252,240,${glowAlpha})`);
        glow.addColorStop(0.5, `rgba(255,210,150,${glowAlpha * 0.5})`);
        glow.addColorStop(1, 'rgba(255,200,120,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, gr, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2) 확장 링 (프리미엄은 2겹)
      const rings = isPrem ? [1.2, 1.9] : [1.2];
      ctx.strokeStyle = '#FFD27A';
      rings.forEach((mult, ri) => {
        const ringR = f.radius + f.radius * mult * ease;
        ctx.globalAlpha = (1 - progress) * (0.8 - ri * 0.25);
        ctx.lineWidth = (isPrem ? 4 : 3) * (1 - progress) + 0.5;
        ctx.beginPath();
        ctx.arc(0, 0, ringR, 0, Math.PI * 2);
        ctx.stroke();
      });

      // 3) 반짝이 입자 — 결정적 분포로 사방 튀어나감 (프리미엄은 더 많고 무지개색)
      const sparkCount = isPrem ? 18 : 8;
      const sparkDist = f.radius * (isPrem ? 1.0 + 2.4 * ease : 0.9 + 1.6 * ease);
      const seed = f.createdAt;
      const premColors = ['#FFD700', '#FF9EC4', '#9ED8FF', '#FFFFFF', '#C7A6FF'];
      for (let i = 0; i < sparkCount; i++) {
        const ang = (i / sparkCount) * Math.PI * 2 + seed * 0.0007;
        const dist = sparkDist * (isPrem ? 0.8 + 0.4 * ((i * 7) % 5) / 5 : 1);
        const sx = Math.cos(ang) * dist;
        const sy = Math.sin(ang) * dist;
        const sparkR = (1 - progress) * (isPrem ? 2.2 + (i % 3) * 1.0 : 1.6 + (i % 3) * 0.7);
        if (sparkR <= 0.1) continue;
        ctx.globalAlpha = (1 - progress) * 0.95;
        ctx.fillStyle = isPrem ? premColors[i % premColors.length] : '#FFFFFF';
        ctx.beginPath();
        ctx.arc(sx, sy, sparkR, 0, Math.PI * 2);
        ctx.fill();
      }

      // 4) 프리미엄 전용 — 4방향 별빛(스파클 십자) 버스트
      if (isPrem) {
        const starLen = f.radius * (1.0 + 1.6 * ease);
        const starAlpha = (1 - progress) * 0.9;
        ctx.globalAlpha = starAlpha;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineCap = 'round';
        for (let k = 0; k < 4; k++) {
          const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
          ctx.lineWidth = 2.5 * (1 - progress) + 0.5;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a) * starLen, Math.sin(a) * starLen);
          ctx.stroke();
        }
      }
      ctx.restore();
    });

    // 꽃 오브젝트
    const bodies = getBodies();
    bodies.forEach(({ body, levelId }) => {
      drawFlower(ctx, body.position.x, body.position.y, body.angle, levelId);
    });

    // 드롭 미리보기 (가이드라인만 — HUD 아이콘은 위에서 그림)
    if (gs.phase !== 'gameover' && waitLevel) {
      const x = dropXRef.current;
      const r = waitLevel.radius;
      const previewY = DROP_START_Y;

      drawFlower(ctx, x, previewY, 0, gs.currentLevelId, 0.55);

      ctx.save();
      ctx.strokeStyle = 'rgba(180,120,140,0.25)';
      ctx.setLineDash([4, 6]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, previewY + r);
      ctx.lineTo(x, JAR_INNER_BOTTOM);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // 게임 오버 오버레이
    if (gs.phase === 'gameover') {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      // 팝업 카드
      const popW = 260;
      const popH = 210;
      const popX = (GAME_WIDTH - popW) / 2;
      const popY = (GAME_HEIGHT - popH) / 2 - 10;

      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.roundRect(popX, popY, popW, popH, 16);
      ctx.fill();

      // 제목 — 프리미엄 부케 완성(클리어) vs 데드라인 초과(게임 오버)
      const isWin = gs.endReason === 'premium';
      ctx.fillStyle = isWin ? '#C9A96E' : '#e53e3e';
      ctx.font = "bold 22px 'Noto Sans KR', sans-serif";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(isWin ? '🎉 프리미엄 부케 완성!' : 'Game Over', GAME_WIDTH / 2, popY + 32);

      // 최종 점수
      ctx.fillStyle = '#333';
      ctx.font = "14px 'Noto Sans KR', sans-serif";
      ctx.fillText(`최종 점수: ${gs.score}점`, GAME_WIDTH / 2, popY + 62);

      // 획득 포인트
      const earnedPoints = Math.floor(gs.score / 20);
      ctx.fillStyle = '#C9A96E';
      ctx.font = "bold 15px 'Noto Sans KR', sans-serif";
      ctx.fillText(` 획득 포인트: ${earnedPoints}P`, GAME_WIDTH / 2, popY + 88);

      // 포인트 2배 버튼 (광고)
      const btnW = 200;
      const btn1Y = popY + 112;
      const btn1H = 36;
      const btnX = (GAME_WIDTH - btnW) / 2;

      if (!adLoading) {
        // 보상형 광고 시청 → 포인트 2배 버튼 (골드 에셋 or 폴백)
        if (chromeReadyRef.current.has('btnGold')) {
          draw9SliceBtn(ctx, chromeRef.current.btnGold, btnX, btn1Y, btnW, btn1H);
        } else {
          const goldGrad = ctx.createLinearGradient(btnX, btn1Y, btnX + btnW, btn1Y);
          goldGrad.addColorStop(0, '#C9A96E');
          goldGrad.addColorStop(1, '#E8D5A3');
          ctx.fillStyle = goldGrad;
          ctx.beginPath();
          ctx.roundRect(btnX, btn1Y, btnW, btn1H, 10);
          ctx.fill();
        }
        ctx.fillStyle = '#7a5c00';
        ctx.font = "bold 13px 'Noto Sans KR', sans-serif";
        ctx.fillText(`광고 보고 포인트 2배 (${earnedPoints * 2}P)`, GAME_WIDTH / 2, btn1Y + btn1H / 2);
      } else {
        // 광고 로딩/시청 중 — 비활성
        ctx.fillStyle = '#999';
        ctx.beginPath();
        ctx.roundRect(btnX, btn1Y, btnW, btn1H, 10);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = "bold 13px 'Noto Sans KR', sans-serif";
        ctx.fillText('광고 불러오는 중...', GAME_WIDTH / 2, btn1Y + btn1H / 2);
      }

      // 다시하기 버튼 (핑크 에셋 or 폴백)
      const btn2Y = btn1Y + btn1H + 10;
      const btn2H = 36;
      if (chromeReadyRef.current.has('btnPink')) {
        draw9SliceBtn(ctx, chromeRef.current.btnPink, btnX, btn2Y, btnW, btn2H);
      } else {
        ctx.fillStyle = '#F4A7B9';
        ctx.beginPath();
        ctx.roundRect(btnX, btn2Y, btnW, btn2H, 10);
        ctx.fill();
      }
      ctx.fillStyle = '#8a3a50';
      ctx.font = "bold 13px 'Noto Sans KR', sans-serif";
      ctx.fillText('다시하기', GAME_WIDTH / 2, btn2Y + btn2H / 2);
    }

    // 음소거 버튼 — 모든 단계에서 항상 그림(게임오버 오버레이 위에도). 음소거가
    // 어느 화면에서도 가능하도록 맨 마지막에 렌더. (mutedRef 로 매 프레임 최신값)
    drawPill(ctx, MUTE_BTN.cx - MUTE_BTN.r, MUTE_BTN.cy - MUTE_BTN.r, MUTE_BTN.r * 2, MUTE_BTN.r * 2);
    ctx.font = "15px serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(mutedRef.current ? '🔇' : '🔊', MUTE_BTN.cx, MUTE_BTN.cy + 1);
  }, [getBodies, dropXRef, mergeFlashesRef, adLoading]);

  // ─── RAF 루프 ─────────────────────────────────────────────────────
  useEffect(() => {
    let running = true;
    function loop() {
      if (!running) return;
      tick();
      draw();
      animFrameRef.current = requestAnimationFrame(loop);
    }
    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [draw, tick]);

  useEffect(() => {
    startGame();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── 캔버스 클릭 (게임오버 팝업 버튼 처리) ──────────────────────────
  const getCanvasCoords = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const scaleX = GAME_WIDTH / rect.width;
    const scaleY = GAME_HEIGHT / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const scaleX = GAME_WIDTH / rect.width;
      setDropX((e.clientX - rect.left) * scaleX, gameStateRef.current.currentLevelId);
    },
    [setDropX]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (e.button !== undefined && e.button !== 0) return;

      // 첫 사용자 제스처에서 오디오 잠금 해제 + BGM 시작
      audioUnlock();

      // 음소거 버튼은 모든 단계에서 탭 가능 — 드롭/팝업 처리보다 먼저 검사하고 토글만.
      const mc = getCanvasCoords(e);
      if (mc && Math.hypot(mc.x - MUTE_BTN.cx, mc.y - MUTE_BTN.cy) <= MUTE_BTN.r + 2) {
        toggleMute();
        return;
      }

      if (gameStateRef.current.phase === 'gameover') {
        // 팝업 내 버튼 히트 테스트
        const coords = getCanvasCoords(e);
        if (!coords) return;

        const popW = 260;
        const popH = 210;
        const popY = (GAME_HEIGHT - popH) / 2 - 10;
        const btnW = 200;
        const btnX = (GAME_WIDTH - btnW) / 2;

        // 포인트 2배 버튼 — 카운트다운 시작만
        const btn1Y = popY + 112;
        const btn1H = 36;
        if (coords.x >= btnX && coords.x <= btnX + btnW && coords.y >= btn1Y && coords.y <= btn1Y + btn1H) {
          void watchRewardedForDouble();
          return;
        }

        // 다시하기 버튼
        const btn2Y = btn1Y + btn1H + 10;
        const btn2H = 36;
        if (coords.x >= btnX && coords.x <= btnX + btnW && coords.y >= btn2Y && coords.y <= btn2Y + btn2H) {
          setRewardClaimed(false);
          startGame();
          return;
        }
        return;
      }

      dropFlower();
    },
    [dropFlower, getCanvasCoords, startGame, watchRewardedForDouble, audioUnlock, toggleMute]
  );

  return (
    <div
      className="flex flex-col items-center w-full h-full select-none overflow-hidden"
      style={{
        backgroundColor: '#fbe6ee',
        backgroundImage: 'url(/game/bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* 스코어/베스트/넥스트/음소거 HUD 는 캔버스 위 버블 칩으로 직접 그림(레퍼런스풍). */}

      {/* 캔버스 — 기종 무관 자동 맞춤.
          뷰포트 매직넘버 대신 '실제 게임 영역(이 컨테이너)' 크기에 맞춘다.
          flex 가 헤더·광고·URL바를 빼고 남는 높이를 정확히 계산하므로(containerType:size),
          캔버스는 컨테이너의 height/width 중 작은 쪽에 비율 맞춰 들어가 잘림·왜곡이 없다. */}
      <div
        className="flex-1 min-h-0 flex items-center justify-center w-full overflow-hidden"
        style={{ containerType: 'size' }}
      >
        <canvas
          ref={canvasRef}
          width={GAME_WIDTH}
          height={GAME_HEIGHT}
          className="touch-none block"
          style={{
            // 컨테이너 높이와 (폭으로 환산한 높이) 중 작은 값 → 어느 쪽도 안 넘침.
            height: `min(100cqh, calc(100cqw * ${GAME_HEIGHT} / ${GAME_WIDTH}))`,
            width: 'auto',
            aspectRatio: `${GAME_WIDTH} / ${GAME_HEIGHT}`,
            cursor: gameState.phase === 'gameover' ? POINTER_CURSOR : PLAY_CURSOR,
          }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />
      </div>
    </div>
  );
}
