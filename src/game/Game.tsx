import { useRef, useEffect, useCallback, useState } from 'react';
import { useGameLogic } from './useGameLogic';
import { GAME_WIDTH, GAME_HEIGHT, DEATH_LINE_Y, DROP_START_Y, FLOWER_LEVEL_MAP } from './constants';
import type { GameState } from './types';

interface GameProps {
  onScoreChange?: (score: number) => void;
  onGameOver?: (score: number) => void;
  onDoublePoints?: (score: number) => void;
  bestScore: number;
}


export function Game({ onScoreChange, onGameOver, onDoublePoints, bestScore }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const [adCountdown, setAdCountdown] = useState<number | null>(null);
  const adTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { gameState, dropXRef, mergeFlashesRef, startGame, dropFlower, setDropX, tick, getBodies } =
    useGameLogic({ canvasRef, onScoreChange, onGameOver });

  const gameStateRef = useRef<GameState>(gameState);
  gameStateRef.current = gameState;

  // ─── 꽃 원형 렌더링 ───────────────────────────────────────────────────
  function drawFlower(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, levelId: number, alpha = 1) {
    const level = FLOWER_LEVEL_MAP.get(levelId);
    if (!level) return;
    const r = level.radius;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(angle);

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

    if (r >= 27) {
      ctx.font = `bold ${Math.max(7, Math.floor(r * 0.22))}px sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText(`${levelId}`, r - 3, -r + 3);
    }

    ctx.restore();
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
    const bgGrad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    bgGrad.addColorStop(0, '#FFF0F5');
    bgGrad.addColorStop(1, '#FFF9FA');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // 바닥
    ctx.fillStyle = '#F9D5E5';
    ctx.fillRect(0, GAME_HEIGHT - 30, GAME_WIDTH, 30);

    // ─── 인게임 상단 HUD (데스라인 위) ──────────────────────────────
    // 현재 꽃 (가운데)
    const waitLevel = FLOWER_LEVEL_MAP.get(gs.currentLevelId);
    const nextLevel = FLOWER_LEVEL_MAP.get(gs.nextLevelId);

    if (gs.phase !== 'gameover' && waitLevel) {
      // 현재 꽃 라벨 + 아이콘 (가운데 상단)
      const centerX = GAME_WIDTH / 2;
      const hudY = 18;

      ctx.save();
      ctx.font = '9px sans-serif';
      ctx.fillStyle = 'rgba(120,80,100,0.6)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('지금', centerX, hudY - 2);

      ctx.font = `${Math.min(28, waitLevel.radius * 1.2)}px serif`;
      ctx.textBaseline = 'middle';
      ctx.fillText(waitLevel.emoji, centerX, hudY + 20);
      ctx.restore();

      // 다음 꽃 (우측)
      if (nextLevel) {
        const nextX = GAME_WIDTH - 40;
        ctx.save();
        ctx.globalAlpha = 0.65;
        ctx.font = '8px sans-serif';
        ctx.fillStyle = 'rgba(120,80,100,0.5)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('next', nextX, hudY - 2);

        ctx.font = '18px serif';
        ctx.textBaseline = 'middle';
        ctx.fillText(nextLevel.emoji, nextX, hudY + 18);
        ctx.restore();
      }
    }

    // 데스 라인
    ctx.save();
    ctx.strokeStyle = 'rgba(220, 38, 38, 0.45)';
    ctx.setLineDash([6, 5]);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, DEATH_LINE_Y);
    ctx.lineTo(GAME_WIDTH, DEATH_LINE_Y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

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
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('💐 Game Over', GAME_WIDTH / 2, popY + 32);

      // 최종 점수
      ctx.fillStyle = '#333';
      ctx.font = '14px sans-serif';
      ctx.fillText(`최종 점수: ${gs.score}점`, GAME_WIDTH / 2, popY + 62);

      // 획득 포인트
      const earnedPoints = Math.floor(gs.score / 20);
      ctx.fillStyle = '#C9A96E';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText(`🪙 획득 포인트: ${earnedPoints}P`, GAME_WIDTH / 2, popY + 88);

      // 포인트 2배 버튼 (광고)
      const btnW = 200;
      const btn1Y = popY + 112;
      const btn1H = 36;
      const btnX = (GAME_WIDTH - btnW) / 2;
      const currentAdCountdown = adCountdown;

      if (currentAdCountdown === null) {
        // 아직 안 눌림 — 광고 시청 시작 버튼
        const goldGrad = ctx.createLinearGradient(btnX, btn1Y, btnX + btnW, btn1Y);
        goldGrad.addColorStop(0, '#C9A96E');
        goldGrad.addColorStop(1, '#E8D5A3');
        ctx.fillStyle = goldGrad;
        ctx.beginPath();
        ctx.roundRect(btnX, btn1Y, btnW, btn1H, 10);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText(`📺 포인트 2배 받기 (${earnedPoints * 2}P)`, GAME_WIDTH / 2, btn1Y + btn1H / 2);
      } else if (currentAdCountdown > 0) {
        // 카운트다운 중 — 비활성 버튼 + 타이머
        ctx.fillStyle = '#999';
        ctx.beginPath();
        ctx.roundRect(btnX, btn1Y, btnW, btn1H, 10);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText(`⏳ 광고 시청 중... ${currentAdCountdown}초`, GAME_WIDTH / 2, btn1Y + btn1H / 2);
      } else {
        // 카운트다운 완료 — 비활성 표시 (실제 버튼은 HTML 오버레이)
        ctx.fillStyle = '#aaa';
        ctx.beginPath();
        ctx.roundRect(btnX, btn1Y, btnW, btn1H, 10);
        ctx.fill();

        ctx.fillStyle = '#ddd';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText(`✅ 우측 상단에서 포인트 받기`, GAME_WIDTH / 2, btn1Y + btn1H / 2);
      }

      // 다시하기 버튼
      const btn2Y = btn1Y + btn1H + 10;
      const btn2H = 36;
      ctx.fillStyle = '#F4A7B9';
      ctx.beginPath();
      ctx.roundRect(btnX, btn2Y, btnW, btn2H, 10);
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('🔄 다시하기', GAME_WIDTH / 2, btn2Y + btn2H / 2);
    }
  }, [getBodies, dropXRef, mergeFlashesRef]);

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

        // 포인트 2배 버튼
        const btn1Y = popY + 112;
        const btn1H = 36;
        if (coords.x >= btnX && coords.x <= btnX + btnW && coords.y >= btn1Y && coords.y <= btn1Y + btn1H) {
          onDoublePoints?.(gameStateRef.current.score);
          startGame();
          return;
        }

        // 다시하기 버튼
        const btn2Y = btn1Y + btn1H + 10;
        const btn2H = 36;
        if (coords.x >= btnX && coords.x <= btnX + btnW && coords.y >= btn2Y && coords.y <= btn2Y + btn2H) {
          startGame();
          return;
        }
        return;
      }

      dropFlower();
    },
    [dropFlower, getCanvasCoords, startGame, onDoublePoints]
  );

  return (
    <div className="flex flex-col items-center w-full h-full select-none overflow-hidden bg-secondary/30">
      {/* 상단 스코어 바 — 컴팩트 */}
      <div className="flex items-center justify-between w-full px-4 py-1.5 bg-card/90 backdrop-blur border-b border-border flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground font-medium">SCORE</span>
          <span className="text-lg font-bold text-primary tabular-nums">{gameState.score}</span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <span className="text-xs">🏆</span>
          <span className="text-sm font-semibold text-primary/80 tabular-nums">{bestScore}</span>
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
            height: 'min(calc(100dvh - 130px), 600px)',
            width: 'auto',
            maxWidth: '100%',
            cursor: gameState.phase === 'gameover' ? 'pointer' : 'crosshair',
            borderRadius: '0 0 8px 8px',
          }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />
      </div>

      {/* 하단 광고 배너 */}
      <div className="w-full px-3 py-2 bg-card/90 backdrop-blur border-t border-border flex-shrink-0">
        <div className="w-full h-[50px] rounded-lg bg-muted/60 border border-border flex items-center justify-center">
          <span className="text-xs text-muted-foreground tracking-wide">AD BANNER</span>
        </div>
      </div>
    </div>
  );
}
