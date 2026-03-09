import { useRef, useEffect, useCallback } from 'react';
import { useGameLogic } from './useGameLogic';
import { GAME_WIDTH, GAME_HEIGHT, DEATH_LINE_Y, FLOWER_LEVEL_MAP } from './constants';

interface GameProps {
  onScoreChange?: (score: number) => void;
  onGameOver?: (score: number) => void;
}

export function Game({ onScoreChange, onGameOver }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  const { gameState, dropXRef, startGame, dropFlower, setDropX, tickDeathCheck, getBodies } =
    useGameLogic({ canvasRef, onScoreChange, onGameOver });

  // ─── 캔버스 렌더링 루프 ───────────────────────────────────────────────────
  // matter.js는 물리 연산만 담당하고, 실제 그리기는 여기서 직접 처리
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 배경
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    ctx.fillStyle = '#FFF9FA';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // 데스 라인 표시 (반투명 빨간 선)
    ctx.strokeStyle = 'rgba(220, 38, 38, 0.5)';
    ctx.setLineDash([8, 6]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, DEATH_LINE_Y);
    ctx.lineTo(GAME_WIDTH, DEATH_LINE_Y);
    ctx.stroke();
    ctx.setLineDash([]);

    // 데스 라인 레이블
    ctx.fillStyle = 'rgba(220, 38, 38, 0.6)';
    ctx.font = '10px sans-serif';
    ctx.fillText('GAME OVER LINE', 8, DEATH_LINE_Y - 4);

    // 모든 꽃 오브젝트 렌더링
    const bodies = getBodies();
    bodies.forEach(({ body, levelId }) => {
      const level = FLOWER_LEVEL_MAP.get(levelId);
      if (!level) return;

      const { x, y } = body.position;
      const r = level.radius;

      // 원형 바디 그리기
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(body.angle);

      // 외곽 원
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = level.color;
      ctx.fill();

      // 테두리 (레벨 12는 골드 테두리)
      ctx.strokeStyle = levelId === 12 ? '#B8860B' : 'rgba(0,0,0,0.15)';
      ctx.lineWidth = levelId === 12 ? 2.5 : 1.5;
      ctx.stroke();

      // 이모지 텍스트
      const fontSize = Math.max(10, Math.floor(r * 0.9));
      ctx.font = `${fontSize}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(level.emoji, 0, 0);

      ctx.restore();
    });

    // 대기 중인 꽃 (게임오버가 아닐 때만) - 드롭 위치 미리보기
    if (gameState.phase !== 'gameover') {
      const waitLevel = FLOWER_LEVEL_MAP.get(gameState.currentLevelId);
      if (waitLevel) {
        const x = dropXRef.current;
        const r = waitLevel.radius;
        const y = DEATH_LINE_Y + r + 4; // 데스 라인 아래에 표시

        ctx.save();
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = waitLevel.color;
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        const fontSize = Math.max(10, Math.floor(r * 0.9));
        ctx.font = `${fontSize}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'black';
        ctx.fillText(waitLevel.emoji, x, y);

        // 드롭 가이드 라인 (점선)
        ctx.strokeStyle = 'rgba(150,150,150,0.35)';
        ctx.setLineDash([4, 5]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y + r);
        ctx.lineTo(x, GAME_HEIGHT - 30);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.restore();
      }
    }

    // 게임 오버 오버레이
    if (gameState.phase === 'gameover') {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('💐 Game Over', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20);
      ctx.font = '18px sans-serif';
      ctx.fillText(`점수: ${gameState.score}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20);
    }
  }, [gameState, getBodies, dropXRef]);

  // ─── requestAnimationFrame 루프 ───────────────────────────────────────────
  useEffect(() => {
    let running = true;

    function loop() {
      if (!running) return;
      tickDeathCheck();
      draw();
      animFrameRef.current = requestAnimationFrame(loop);
    }

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [draw, tickDeathCheck]);

  // ─── 초기 게임 시작 ────────────────────────────────────────────────────────
  useEffect(() => {
    startGame();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── 마우스 이벤트 ────────────────────────────────────────────────────────
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const scaleX = GAME_WIDTH / rect.width;
      const x = (e.clientX - rect.left) * scaleX;
      setDropX(x, gameState.currentLevelId);
    },
    [setDropX, gameState.currentLevelId]
  );

  const handleClick = useCallback(() => {
    if (gameState.phase !== 'gameover') dropFlower();
  }, [dropFlower, gameState.phase]);

  // ─── 터치 이벤트 (모바일) ─────────────────────────────────────────────────
  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault(); // 스크롤 방지
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const scaleX = GAME_WIDTH / rect.width;
      const x = (e.touches[0].clientX - rect.left) * scaleX;
      setDropX(x, gameState.currentLevelId);
    },
    [setDropX, gameState.currentLevelId]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      if (gameState.phase !== 'gameover') dropFlower();
    },
    [dropFlower, gameState.phase]
  );

  const nextLevel = FLOWER_LEVEL_MAP.get(gameState.nextLevelId);

  return (
    <div className="flex flex-col items-center w-full h-full bg-pink-50 select-none">
      {/* 상단 HUD */}
      <div className="flex items-center justify-between w-full px-4 py-2 bg-white/80 backdrop-blur border-b border-pink-100">
        <div className="flex flex-col items-center">
          <span className="text-xs text-gray-400">현재</span>
          <span className="text-2xl">
            {FLOWER_LEVEL_MAP.get(gameState.currentLevelId)?.emoji}
          </span>
          <span className="text-xs font-medium text-pink-600">
            {FLOWER_LEVEL_MAP.get(gameState.currentLevelId)?.name}
          </span>
        </div>

        <div className="flex flex-col items-center">
          <span className="text-xs text-gray-400">점수</span>
          <span className="text-2xl font-bold text-pink-500">{gameState.score}</span>
        </div>

        <div className="flex flex-col items-center opacity-70">
          <span className="text-xs text-gray-400">다음</span>
          <span className="text-xl">{nextLevel?.emoji}</span>
          <span className="text-xs text-gray-500">{nextLevel?.name}</span>
        </div>
      </div>

      {/* 캔버스 플레이 영역 */}
      <div className="flex-1 flex items-center justify-center w-full overflow-hidden">
        <canvas
          ref={canvasRef}
          width={GAME_WIDTH}
          height={GAME_HEIGHT}
          className="touch-none"
          style={{
            // 화면 너비에 맞게 비율 유지하며 스케일
            width: '100%',
            maxWidth: `${GAME_WIDTH}px`,
            height: 'auto',
            cursor: gameState.phase === 'gameover' ? 'default' : 'crosshair',
            border: '2px solid #fce7f3',
            borderRadius: '0 0 12px 12px',
            background: '#FFF9FA',
            display: 'block',
          }}
          onMouseMove={handleMouseMove}
          onClick={handleClick}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
      </div>

      {/* 하단: 다시 시작 버튼 */}
      <div className="w-full px-4 py-3 bg-white/80 backdrop-blur border-t border-pink-100 flex justify-center">
        <button
          onClick={startGame}
          className="px-8 py-2 rounded-full bg-pink-400 hover:bg-pink-500 active:bg-pink-600 text-white font-semibold text-sm shadow transition-colors"
        >
          🔄 다시 시작
        </button>
      </div>
    </div>
  );
}
