import { useRef, useEffect, useCallback } from 'react';
import { useGameLogic } from './useGameLogic';
import { GAME_WIDTH, GAME_HEIGHT, DEATH_LINE_Y, DROP_START_Y, FLOWER_LEVEL_MAP } from './constants';
import type { GameState } from './types';

interface GameProps {
  onScoreChange?: (score: number) => void;
  onGameOver?: (score: number) => void;
}

export function Game({ onScoreChange, onGameOver }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  const { gameState, dropXRef, mergeFlashesRef, startGame, dropFlower, setDropX, tick, getBodies } =
    useGameLogic({ canvasRef, onScoreChange, onGameOver });

  const gameStateRef = useRef<GameState>(gameState);
  gameStateRef.current = gameState;

  // ─── 꽃 원형 렌더링 (그라디언트 + 이모지) ───────────────────────────────
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

  // ─── 색상 유틸리티 ───────────────────────────────────────────────────────
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

  // ─── 캔버스 렌더링 ──────────────────────────────────────────────────────
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

    // 데스 라인
    ctx.save();
    ctx.strokeStyle = 'rgba(220, 38, 38, 0.55)';
    ctx.setLineDash([6, 5]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, DEATH_LINE_Y);
    ctx.lineTo(GAME_WIDTH, DEATH_LINE_Y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(220, 38, 38, 0.5)';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText('GAME OVER LINE', 6, DEATH_LINE_Y - 2);
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

    // 드롭 미리보기
    if (gs.phase !== 'gameover') {
      const waitLevel = FLOWER_LEVEL_MAP.get(gs.currentLevelId);
      if (waitLevel) {
        const x = dropXRef.current;
        const r = waitLevel.radius;
        const previewY = DROP_START_Y;

        drawFlower(ctx, x, previewY, 0, gs.currentLevelId, 0.55);

        ctx.save();
        ctx.strokeStyle = 'rgba(180,120,140,0.3)';
        ctx.setLineDash([4, 6]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, previewY + r);
        ctx.lineTo(x, GAME_HEIGHT - 32);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
    }

    // 게임 오버 오버레이
    if (gs.phase === 'gameover') {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.roundRect(GAME_WIDTH / 2 - 110, GAME_HEIGHT / 2 - 65, 220, 130, 16);
      ctx.fill();

      ctx.fillStyle = '#e53e3e';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('💐 Game Over', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 28);

      ctx.fillStyle = '#555';
      ctx.font = '15px sans-serif';
      ctx.fillText(`최종 점수: ${gs.score}점`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 8);

      ctx.fillStyle = '#aaa';
      ctx.font = '12px sans-serif';
      ctx.fillText('아래 [다시 시작] 버튼을 누르세요', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 38);
    }
  }, [getBodies, dropXRef, mergeFlashesRef]);

  // ─── RAF 루프 ───────────────────────────────────────────────────────────
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

  // ─── Pointer 이벤트 ─────────────────────────────────────────────────────
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
      if (gameStateRef.current.phase !== 'gameover') dropFlower();
    },
    [dropFlower]
  );

  const currentLevel = FLOWER_LEVEL_MAP.get(gameState.currentLevelId);
  const nextLevel = FLOWER_LEVEL_MAP.get(gameState.nextLevelId);

  return (
    <div
      className="flex flex-col items-center w-full h-full select-none overflow-hidden bg-secondary/30"
    >
      {/* HUD */}
      <div className="flex items-center justify-between w-full px-4 py-2 bg-card/90 backdrop-blur border-b border-border flex-shrink-0">
        {/* 현재 꽃 */}
        <div className="flex flex-col items-center min-w-[70px]">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">지금</span>
          <span className="text-3xl leading-none my-0.5">{currentLevel?.emoji}</span>
          <span className="text-[11px] font-semibold text-primary truncate max-w-[70px] text-center">
            {currentLevel?.name}
          </span>
        </div>

        {/* 점수 */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">점수</span>
          <span className="text-3xl font-bold text-primary leading-none my-0.5 tabular-nums">
            {gameState.score}
          </span>
        </div>

        {/* 다음 꽃 */}
        <div className="flex flex-col items-center min-w-[70px] opacity-70">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">다음</span>
          <span className="text-2xl leading-none my-0.5">{nextLevel?.emoji}</span>
          <span className="text-[11px] text-muted-foreground truncate max-w-[70px] text-center">
            {nextLevel?.name}
          </span>
        </div>
      </div>

      {/* 캔버스 */}
      <div className="flex-1 flex items-center justify-center w-full overflow-hidden py-1">
        <canvas
          ref={canvasRef}
          width={GAME_WIDTH}
          height={GAME_HEIGHT}
          className="touch-none block"
          style={{
            height: 'min(calc(100dvh - 180px), 520px)',
            width: 'auto',
            maxWidth: '100%',
            cursor: gameState.phase === 'gameover' ? 'default' : 'crosshair',
            border: '1.5px solid hsl(var(--border))',
            borderRadius: '0 0 12px 12px',
          }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />
      </div>

      {/* 하단 바 */}
      <div className="w-full px-4 py-3 bg-card/90 backdrop-blur border-t border-border flex items-center justify-between flex-shrink-0">
        {/* 진화 힌트 */}
        <div className="flex items-center gap-1 text-base overflow-hidden">
          {[gameState.currentLevelId, gameState.currentLevelId + 1, gameState.currentLevelId + 2]
            .filter((id) => FLOWER_LEVEL_MAP.has(id))
            .map((id, i, arr) => (
              <span key={id} className="flex items-center gap-0.5">
                <span className={i === 0 ? 'text-xl' : 'text-sm opacity-60'}>
                  {FLOWER_LEVEL_MAP.get(id)?.emoji}
                </span>
                {i < arr.length - 1 && (
                  <span className="text-muted-foreground text-xs">›</span>
                )}
              </span>
            ))}
        </div>

        <button
          onClick={startGame}
          className="px-6 py-2 rounded-full bg-primary hover:bg-primary/90 active:scale-95 text-primary-foreground font-semibold text-sm shadow-md transition-all"
        >
          🔄 다시 시작
        </button>
      </div>
    </div>
  );
}
