import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Trophy } from 'lucide-react';
import { Game } from '@/game/Game';

export default function MergeGame() {
  const navigate = useNavigate();
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(() => {
    return Number(localStorage.getItem('mergeGame_best') ?? 0);
  });

  const handleScoreChange = useCallback((s: number) => {
    setScore(s);
    if (s > bestScore) {
      setBestScore(s);
      localStorage.setItem('mergeGame_best', String(s));
    }
  }, [bestScore]);

  const handleGameOver = useCallback((finalScore: number) => {
    if (finalScore > bestScore) {
      setBestScore(finalScore);
      localStorage.setItem('mergeGame_best', String(finalScore));
    }
  }, [bestScore]);

  return (
    <div className="flex flex-col h-[100dvh] max-w-[430px] mx-auto bg-background overflow-hidden relative">
      {/* 헤더 — PageHeader 패턴과 일관성 유지 */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate(-1)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors -ml-1"
            >
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </button>
            <span className="text-lg font-bold text-foreground">💐 꽃 머지 게임</span>
          </div>

          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Trophy className="w-4 h-4 text-primary" />
            <span className="font-semibold text-primary">{bestScore}</span>
          </div>
        </div>
      </header>

      {/* 게임 영역 */}
      <div className="flex-1 overflow-hidden">
        <Game onScoreChange={handleScoreChange} onGameOver={handleGameOver} />
      </div>
    </div>
  );
}
