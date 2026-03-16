import { useRef, useEffect, useCallback, useState } from 'react';
import { Trophy } from 'lucide-react';
import { useGameLogic } from './useGameLogic';
import { GAME_WIDTH, GAME_HEIGHT, DEATH_LINE_Y, DROP_START_Y, FLOWER_LEVEL_MAP } from './constants';
import type { GameState } from './types';

interface GameProps {
  onScoreChange?: (score: number) => void;
  onGameOver?: (score: number) => void;
  bestScore?: number;
}

export function Game({ onScoreChange, onGameOver, bestScore = 0 }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const [adWatched, setAdWatched] = useState(false);

  // ─── 신기록 알림 상태 ────────────────────────────────────────────────────
  const prevBestRef = useRef(bestScore);
  const [isNewBest, setIsNewBest] = useState(false);
  const newBestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { gameState, dropXRef, mergeFlashesRef, startGame, dropFlower, setDropX, tick, getBodies } =
    useGameLogic({ canvasRef, onScoreChange, onGameOver });

  const gameStateRef = useRef<GameState>(gameState);
  gameStateRef.current = gameState;

  // bestScore 갱신 시 NEW! 알림 (2.5초)
  useEffect(() => {
    if (bestScore > prevBestRef.current && gameStateRef.current.phase !== 'gameover') {
      prevBestRef.current = bestScore;
      setIsNewBest(true);
      if (newBestTimerRef.current) clearTimeout(newBestTimerRef.current);
      newBestTimerRef.current = setTimeout(() => setIsNewBest(false), 2500);
    }
  }, [bestScore]);

  useEffect(() => {
    return () => {
      if (newBestTimerRef.current) clearTimeout(newBestTimerRef.current);
    };
  }, []);

  // ─── 게임 오버 팝업 핸들러 ────────────────────────────────────────────────
  const handleWatchAd = useCallback(() => {
    if (adWatched) return;
    setAdWatched(true);
    const doubled = gameStateRef.current.score * 2;
    onScoreChange?.(doubled);
  }, [adWatched, onScoreChange]);

  const handleRestart = useCallback(() => {
    setAdWatched(false);
    setIsNewBest(false);
    if (newBestTimerRef.current) clearTimeout(newBestTimerRef.current);
    prevBestRef.current = bestScore;
    startGame();
  }, [startGame, bestScore]);

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
  // dropXRef / mergeFlashesRef는 mutable ref → 의존성 불필요
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const gs = gameStateRef.current;
    const now = performance.now();

    // getBodies는 한 번만 호출
    const bodies = getBodies();

    // ── 위험 상태 감지 (꽃이 데스라인 50px 내에 있으면 위험) ──
    const isDanger =
      gs.phase !== 'gameover' &&
      bodies.some(
        ({ body }) =>
          (body as Matter.Body & { circleRadius?: number }).circleRadius !== undefined &&
          body.position.y - ((body as Matter.Body & { circleRadius?: number }).circleRadius ?? 0) < DEATH_LINE_Y + 50
      );
    // 위험 시 0~1 펄스 (1Hz)
    const dangerPulse = isDanger ? (Math.sin(now * 0.006) + 1) / 2 : 0;

    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // 전체 배경
    const bgGrad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    bgGrad.addColorStop(0, '#FFF0F5');
    bgGrad.addColorStop(1, '#FFF9FA');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // 드롭 존 배경 (데드라인 위 영역 구분)
    ctx.fillStyle = 'rgba(255,230,242,0.45)';
    ctx.fillRect(0, 0, GAME_WIDTH, DEATH_LINE_Y);

    // 위험 경고 배경 오버레이 (danger 상태 시 하단 영역 붉게 틴트)
    if (isDanger) {
      ctx.fillStyle = `rgba(220, 38, 38, ${dangerPulse * 0.07})`;
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }

    // 바닥
    ctx.fillStyle = '#F9D5E5';
    ctx.fillRect(0, GAME_HEIGHT - 30, GAME_WIDTH, 30);

    // 데스 라인 (위험 시 펄스)
    ctx.save();
    if (isDanger) {
      ctx.strokeStyle = `rgba(220, 38, 38, ${0.55 + dangerPulse * 0.45})`;
      ctx.lineWidth = 1.5 + dangerPulse * 2.5;
    } else {
      ctx.strokeStyle = 'rgba(220, 38, 38, 0.55)';
      ctx.lineWidth = 1.5;
    }
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(0, DEATH_LINE_Y);
    ctx.lineTo(GAME_WIDTH, DEATH_LINE_Y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = isDanger
      ? `rgba(220, 38, 38, ${0.6 + dangerPulse * 0.4})`
      : 'rgba(220, 38, 38, 0.5)';
    ctx.font = `bold ${isDanger ? 10 : 9}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(isDanger ? '⚠ GAME OVER LINE' : 'GAME OVER LINE', 6, DEATH_LINE_Y - 2);
    ctx.restore();

    // 머지 이펙트 (원형 확장 + 점수 팝업 텍스트)
    mergeFlashesRef.current.forEach((f) => {
      const elapsed = now - f.createdAt;
      const progress = elapsed / 700;
      if (progress >= 1) return;

      // 원형 확장 이펙트
      const expandR = f.radius + f.radius * 1.2 * progress;
      const circleAlpha = (1 - progress) * 0.7;
      ctx.save();
      ctx.globalAlpha = circleAlpha;
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(f.x, f.y, expandR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // +N점 팝업 텍스트 (위로 이동 + 페이드 아웃)
      const textAlpha = progress < 0.5 ? 1 : 1 - (progress - 0.5) * 2;
      const yOffset = progress * 50;
      const fontSize = Math.min(18, 12 + Math.floor(Math.log2(f.score + 1) * 2));
      ctx.save();
      ctx.globalAlpha = textAlpha;
      // 외곽선 (가독성)
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 3;
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeText(`+${f.score}`, f.x, f.y - yOffset);
      // 본문
      ctx.fillStyle = '#E05010';
      ctx.fillText(`+${f.score}`, f.x, f.y - yOffset);
      ctx.restore();
    });

    // 꽃 오브젝트
    bodies.forEach(({ body, levelId }) => {
      drawFlower(ctx, body.position.x, body.position.y, body.angle, levelId);
    });

    // 드롭 미리보기 + 현재 꽃 정보 + NEXT 아이콘
    if (gs.phase !== 'gameover') {
      const waitLevel = FLOWER_LEVEL_MAP.get(gs.currentLevelId);

      // 현재 드롭 꽃 (마우스 따라가는 고스트)
      if (waitLevel) {
        const x = dropXRef.current;
        const r = waitLevel.radius;
        const previewY = DROP_START_Y;

        drawFlower(ctx, x, previewY, 0, gs.currentLevelId, 0.55);

        ctx.save();
        ctx.strokeStyle = isDanger ? 'rgba(220,80,80,0.25)' : 'rgba(180,120,140,0.3)';
        ctx.setLineDash([4, 6]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, previewY + r);
        ctx.lineTo(x, GAME_HEIGHT - 32);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      // 현재 꽃 이름 (드롭존 좌측)
      if (waitLevel) {
        ctx.save();
        ctx.fillStyle = 'rgba(140,60,100,0.7)';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.font = `bold 9px sans-serif`;
        ctx.fillText(`Lv.${gs.currentLevelId}`, 8, DEATH_LINE_Y / 2 - 6);
        ctx.font = `8px sans-serif`;
        ctx.fillText(waitLevel.name, 8, DEATH_LINE_Y / 2 + 6);
        ctx.restore();
      }

      // NEXT 아이콘 (우측 상단)
      const nextLvl = FLOWER_LEVEL_MAP.get(gs.nextLevelId);
      if (nextLvl) {
        const TARGET_R = 22;
        const scale = TARGET_R / nextLvl.radius;
        const nx = GAME_WIDTH - TARGET_R - 10;
        const ny = DEATH_LINE_Y / 2;

        ctx.save();
        ctx.fillStyle = 'rgba(160,80,120,0.75)';
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('NEXT', nx, ny - TARGET_R - 3);
        ctx.restore();

        ctx.save();
        ctx.translate(nx, ny);
        ctx.scale(scale, scale);
        drawFlower(ctx, 0, 0, 0, gs.nextLevelId, 0.85);
        ctx.restore();
      }
    }
  }, [getBodies]); // dropXRef, mergeFlashesRef는 ref이므로 deps 불필요

  // ─── RAF 루프 ───────────────────────────────────────────────────────────
  // draw/tick을 ref로 감싸서 루프가 절대 재시작되지 않게 함
  // (draw/tick이 바뀌어도 teardown+restart → 프레임 드롭 없음)
  const drawRef = useRef(draw);
  drawRef.current = draw;
  const tickRef = useRef(tick);
  tickRef.current = tick;

  useEffect(() => {
    let running = true;
    function loop() {
      if (!running) return;
      tickRef.current();
      drawRef.current();
      animFrameRef.current = requestAnimationFrame(loop);
    }
    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []); // 의존성 없음 — 루프는 마운트/언마운트 시에만 시작/종료

  useEffect(() => {
    startGame();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Pointer 이벤트 ─────────────────────────────────────────────────────
  // ✅ UX: pointerDown에서도 X위치 업데이트 → 첫 터치 즉시 반영
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const scaleX = GAME_WIDTH / rect.width;
      setDropX((e.clientX - rect.left) * scaleX, gameStateRef.current.currentLevelId);
    },
    [setDropX]
  );

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

  const displayScore = adWatched ? gameState.score * 2 : gameState.score;

  return (
    <>
      {/* 게임오버 팝업 / 신기록 애니메이션 CSS */}
      <style>{`
        @keyframes popIn {
          0%   { opacity: 0; transform: scale(0.6) translateY(20px); }
          70%  { transform: scale(1.05) translateY(-4px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes newBestPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.7; transform: scale(1.15); }
        }
        @keyframes fadeInOverlay {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>

      <div className="relative flex flex-col items-center w-full h-full select-none overflow-hidden bg-secondary/30">

        {/* ── 상단 점수 배너 (좌=점수, 우=최고기록) ── */}
        <div className="flex items-center justify-between w-full px-4 bg-card/90 backdrop-blur border-b border-border flex-shrink-0 h-10">
          {/* 좌: 현재 점수 */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">점수</span>
            <span className="text-xl font-bold text-primary leading-none tabular-nums">
              {gameState.score}
            </span>
          </div>

          {/* 우: 최고기록 + NEW! 배지 */}
          <div className="flex items-center gap-1.5">
            {isNewBest && (
              <span
                className="text-[10px] font-bold text-amber-500 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded-full leading-none"
                style={{ animation: 'newBestPulse 0.6s ease-in-out infinite' }}
              >
                🎉 NEW!
              </span>
            )}
            <Trophy className="w-3 h-3 text-amber-500" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">최고기록</span>
            <span className="text-xl font-semibold text-amber-500 leading-none tabular-nums">
              {bestScore}
            </span>
          </div>
        </div>

        {/* ── 게임 캔버스 ── */}
        <div className="flex-1 flex items-center justify-center w-full overflow-hidden">
          <canvas
            ref={canvasRef}
            width={GAME_WIDTH}
            height={GAME_HEIGHT}
            className="touch-none block"
            style={{
              height: 'min(calc(100dvh - 156px), 620px)',
              width: 'auto',
              maxWidth: '100%',
              cursor: gameState.phase === 'gameover' ? 'default' : 'crosshair',
              border: '1.5px solid hsl(var(--border))',
              borderRadius: '0 0 8px 8px',
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          />
        </div>

        {/* ── 하단 광고 배너 ── */}
        <div className="w-full flex-shrink-0 h-[56px] bg-gray-50 border-t border-border flex items-center justify-center gap-2">
          <span className="text-[10px] font-medium text-gray-400 border border-gray-300 px-1.5 py-0.5 rounded leading-none">
            AD
          </span>
          <span className="text-xs text-gray-400">웨딩 플래너 서비스 광고 영역</span>
        </div>

        {/* ── 게임 오버 팝업 오버레이 ── */}
        {gameState.phase === 'gameover' && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-black/60 z-20"
            style={{ animation: 'fadeInOverlay 0.2s ease-out both' }}
          >
            <div
              className="bg-white rounded-2xl px-6 py-7 w-[270px] shadow-2xl flex flex-col items-center gap-4"
              style={{ animation: 'popIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}
            >
              {/* 타이틀 */}
              <div className="flex flex-col items-center gap-1">
                <span className="text-4xl">💐</span>
                <h2 className="text-xl font-bold text-red-500 tracking-tight">Game Over</h2>
              </div>

              {/* 획득 포인트 */}
              <div className="w-full rounded-xl bg-pink-50 border border-pink-100 p-4 flex flex-col items-center gap-1">
                <span className="text-xs text-pink-400 font-medium uppercase tracking-wide">획득 포인트</span>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-bold text-pink-600 tabular-nums leading-none">
                    {displayScore}
                  </span>
                  <span className="text-base text-pink-400 mb-0.5">점</span>
                </div>
                {adWatched ? (
                  <span className="text-xs text-amber-500 font-semibold mt-0.5">
                    ✨ 광고 2배 보너스 적용!
                  </span>
                ) : (
                  <span className="text-xs text-gray-400 mt-0.5">
                    광고를 보면 2배로 받을 수 있어요
                  </span>
                )}
              </div>

              {/* 광고 2배 버튼 */}
              {!adWatched && (
                <button
                  onClick={handleWatchAd}
                  className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-500 active:scale-95 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <span className="text-base">📺</span>
                  광고 보고 2배 포인트!
                </button>
              )}

              {/* 다시하기 버튼 */}
              <button
                onClick={handleRestart}
                className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 active:scale-95 text-primary-foreground font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span className="text-base">🔄</span>
                다시하기
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
