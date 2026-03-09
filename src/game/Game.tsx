import { useRef, useEffect, useCallback, useState } from 'react';
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
  const [showAdDoubled, setShowAdDoubled] = useState(false);

  const { gameState, dropXRef, mergeFlashesRef, startGame, dropFlower, setDropX, tick, getBodies } =
    useGameLogic({ canvasRef, onScoreChange, onGameOver });

  const gameStateRef = useRef<GameState>(gameState);
  gameStateRef.current = gameState;

  // 획득 포인트 계산 (점수 / 10, 최소 10)
  const earnedPoints = Math.max(10, Math.floor(gameState.score / 10));

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

  // ─── 캔버스 렌더링 함수 ──────────────────────────────────────────────────
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
  }, [getBodies, dropXRef, mergeFlashesRef]);

  // ─── RAF 루프 ────────────────────────────────────────────────────────────
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

  // 게임 오버 시 광고 2배 상태 초기화
  useEffect(() => {
    if (gameState.phase !== 'gameover') {
      setShowAdDoubled(false);
    }
  }, [gameState.phase]);

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

  const handleAdDouble = () => {
    // 광고 시청 후 포인트 2배 처리 (실제 광고 SDK 연동 위치)
    setShowAdDoubled(true);
  };

  const handleRestart = () => {
    setShowAdDoubled(false);
    startGame();
  };

  return (
    <div
      className="flex flex-col items-center w-full h-full bg-pink-50 select-none overflow-hidden"
      style={{ fontFamily: 'sans-serif' }}
    >
      {/* ── 상단 HUD (축소) ── */}
      <div className="flex items-center justify-between w-full px-3 py-1 bg-white/90 backdrop-blur border-b border-pink-100 shadow-sm flex-shrink-0">
        {/* 지금 꽃 */}
        <div className="flex items-center gap-1.5">
          <span className="text-xl leading-none">{currentLevel?.emoji}</span>
          <span className="text-[10px] text-pink-500 font-medium truncate max-w-[56px]">
            {currentLevel?.name}
          </span>
        </div>

        {/* 점수 */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-400">🏆</span>
          <span className="text-lg font-bold text-pink-500 tabular-nums leading-none">
            {gameState.score}
          </span>
        </div>

        {/* 다음 꽃 */}
        <div className="flex items-center gap-1.5 opacity-70">
          <span className="text-[10px] text-gray-400">next</span>
          <span className="text-base leading-none">{nextLevel?.emoji}</span>
        </div>
      </div>

      {/* ── 캔버스 플레이 영역 (확대) ── */}
      <div className="flex-1 flex items-center justify-center w-full overflow-hidden relative">
        <canvas
          ref={canvasRef}
          width={GAME_WIDTH}
          height={GAME_HEIGHT}
          className="touch-none block"
          style={{
            height: 'min(calc(100vh - 90px), 680px)',
            width: 'auto',
            maxWidth: '100%',
            cursor: gameState.phase === 'gameover' ? 'default' : 'crosshair',
            border: '1.5px solid #fce7f3',
            borderRadius: '0 0 12px 12px',
          }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />

        {/* ── 게임 오버 팝업 (HTML 오버레이) ── */}
        {gameState.phase === 'gameover' && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.55)' }}
          >
            <div className="bg-white rounded-2xl shadow-2xl px-6 py-6 flex flex-col items-center gap-3 w-[260px]">
              <p className="text-red-500 font-bold text-xl">💐 Game Over</p>

              <div className="w-full bg-pink-50 rounded-xl px-4 py-3 text-center">
                <p className="text-sm text-gray-500">최종 점수</p>
                <p className="text-2xl font-bold text-pink-500 tabular-nums">{gameState.score}점</p>
              </div>

              <div className="w-full bg-yellow-50 rounded-xl px-4 py-3 text-center">
                <p className="text-sm text-gray-500">획득 포인트</p>
                <p className="text-xl font-bold text-yellow-500 tabular-nums">
                  {showAdDoubled ? earnedPoints * 2 : earnedPoints}P
                  {showAdDoubled && (
                    <span className="ml-1 text-xs bg-yellow-400 text-white rounded px-1 py-0.5">2배!</span>
                  )}
                </p>
              </div>

              {!showAdDoubled && (
                <button
                  onClick={handleAdDouble}
                  className="w-full py-2.5 rounded-full bg-yellow-400 hover:bg-yellow-500 active:scale-95 text-white font-semibold text-sm shadow transition-all"
                >
                  📺 광고 보고 포인트 2배 받기
                </button>
              )}

              <button
                onClick={handleRestart}
                className="w-full py-2.5 rounded-full bg-pink-400 hover:bg-pink-500 active:scale-95 text-white font-semibold text-sm shadow transition-all"
              >
                🔄 다시하기
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── 하단 광고 배너 ── */}
      <div className="w-full flex-shrink-0 bg-gray-100 border-t border-gray-200 flex items-center justify-center"
        style={{ height: '50px' }}
      >
        <span className="text-xs text-gray-400">광고 배너</span>
      </div>
    </div>
  );
}
