import { useRef, useEffect, useCallback, useState } from 'react';
import { showRewardedAd } from '@/lib/ads/adService';
import { useGameLogic } from './useGameLogic';
import { GAME_WIDTH, GAME_HEIGHT, DEATH_LINE_Y, DROP_START_Y, FLOWER_LEVEL_MAP } from './constants';
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
      line: '/game/line.png',
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

  const { gameState, dropXRef, mergeFlashesRef, startGame, dropFlower, setDropX, tick, getBodies } =
    useGameLogic({ canvasRef, onScoreChange, onGameOver });

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

    // 바닥
    ctx.fillStyle = '#F9D5E5';
    ctx.fillRect(0, GAME_HEIGHT - 30, GAME_WIDTH, 30);

    // 데드라인 — garland 에셋이 있으면 그걸로, 없으면 점선 폴백.
    if (chromeReadyRef.current.has('line')) {
      const img = chromeRef.current.line;
      const lh = (img.height / img.width) * GAME_WIDTH;
      ctx.drawImage(img, 0, DEATH_LINE_Y - lh / 2, GAME_WIDTH, lh);
    } else {
      ctx.save();
      ctx.strokeStyle = 'rgba(220,120,150,0.5)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.moveTo(0, DEATH_LINE_Y);
      ctx.lineTo(GAME_WIDTH, DEATH_LINE_Y);
      ctx.stroke();
      ctx.restore();
    }

    // ─── 인게임 상단 HUD (데스라인 위) ──────────────────────────────
    // 현재 꽃 (가운데)
    const waitLevel = FLOWER_LEVEL_MAP.get(gs.currentLevelId);
    const nextLevel = FLOWER_LEVEL_MAP.get(gs.nextLevelId);

    if (gs.phase !== 'gameover' && waitLevel) {
      // 현재 꽃 라벨 + 아이콘 (가운데 상단)
      const centerX = GAME_WIDTH / 2;
      const hudY = 18;
      const drawIcon = (id: number, lv: typeof waitLevel, cx: number, cy: number, sz: number) => {
        if (flowerReadyRef.current.has(id)) {
          ctx.drawImage(flowerImgRef.current.get(id)!, cx - sz / 2, cy - sz / 2, sz, sz);
        } else {
          ctx.font = `${sz}px serif`;
          ctx.textBaseline = 'middle';
          ctx.fillText(lv!.emoji, cx, cy);
        }
      };

      ctx.save();
      ctx.font = "9px 'Noto Sans KR', sans-serif";
      ctx.fillStyle = 'rgba(120,80,100,0.7)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('지금', centerX, hudY - 2);
      drawIcon(gs.currentLevelId, waitLevel, centerX, hudY + 22, 36);
      ctx.restore();

      // 다음 꽃 (우측)
      if (nextLevel) {
        const nextX = GAME_WIDTH - 40;
        ctx.save();
        ctx.globalAlpha = 0.8;
        ctx.font = "8px 'Noto Sans KR', sans-serif";
        ctx.fillStyle = 'rgba(120,80,100,0.6)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('next', nextX, hudY - 2);
        drawIcon(gs.nextLevelId, nextLevel, nextX, hudY + 20, 24);
        ctx.restore();
      }
    }

    // 머지 이펙트
    const now = performance.now();
    mergeFlashesRef.current.forEach((f) => {
      const elapsed = now - f.createdAt;
      const progress = elapsed / 600;
      const expandR = f.radius + f.radius * 1.2 * progress;
      const alpha = (1 - progress) * 0.7;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(f.x, f.y, expandR, 0, Math.PI * 2);
      ctx.stroke();
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
      ctx.lineTo(x, GAME_HEIGHT - 32);
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

      // 제목
      ctx.fillStyle = '#e53e3e';
      ctx.font = "bold 22px 'Noto Sans KR', sans-serif";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(' Game Over', GAME_WIDTH / 2, popY + 32);

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
    [dropFlower, getCanvasCoords, startGame, watchRewardedForDouble]
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
      {/* 상단 스코어 바 — 컴팩트 */}
      <div className="flex items-center justify-between w-full px-4 py-1.5 bg-card/90 backdrop-blur border-b border-border flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground font-medium">SCORE</span>
          <span className="text-lg font-bold text-primary tabular-nums">{gameState.score}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-1 text-muted-foreground">
            <span className="text-xs"></span>
            <span className="text-sm font-semibold text-primary/80 tabular-nums">{bestScore}점</span>
          </div>
        </div>
      </div>

      {/* 캔버스 — 최대한 넓게 */}
      <div className="flex-1 flex items-center justify-center w-full overflow-hidden">
        <canvas
          ref={canvasRef}
          width={GAME_WIDTH}
          height={GAME_HEIGHT}
          className="touch-none block"
          style={{
            // 컬럼 폭을 채우도록 키움(비율 유지 → 왜곡 없음). 남는 위/아래는 루트 bg.
            height: 'min(calc(100dvh - 84px), 694px)',
            width: 'auto',
            maxWidth: '100%',
            cursor: gameState.phase === 'gameover' ? POINTER_CURSOR : PLAY_CURSOR,
            borderRadius: '0 0 8px 8px',
          }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />
      </div>
    </div>
  );
}
