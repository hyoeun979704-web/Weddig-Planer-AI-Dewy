import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Game } from '@/game/Game';

export default function MergeGame() {
  const navigate = useNavigate();
  const [bestScore, setBestScore] = useState(() => {
    return Number(localStorage.getItem('mergeGame_best') ?? 0);
  });

  const handleScoreChange = useCallback((s: number) => {
    setBestScore((prev) => {
      if (s > prev) {
        localStorage.setItem('mergeGame_best', String(s));
        return s;
      }
      return prev;
    });
  }, []);

  const handleGameOver = useCallback((finalScore: number) => {
    setBestScore((prev) => {
      if (finalScore > prev) {
        localStorage.setItem('mergeGame_best', String(finalScore));
        return finalScore;
      }
      return prev;
    });
  }, []);

  return (
    <div className="flex flex-col h-[100dvh] max-w-[430px] mx-auto bg-background overflow-hidden">
      {/* 네비게이션 헤더 */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border flex-shrink-0">
        <div className="flex items-center px-3 h-14">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors -ml-1 flex-shrink-0"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <span className="ml-1 text-lg font-bold text-foreground">💐 꽃 머지 게임</span>
        </div>
      </header>

      {/* 게임 영역 */}
      <div className="flex-1 overflow-hidden">
        <Game
          onScoreChange={handleScoreChange}
          onGameOver={handleGameOver}
          bestScore={bestScore}
        />
      </div>
    </div>
  );
}
