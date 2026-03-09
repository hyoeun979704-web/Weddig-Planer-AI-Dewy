import { useState, useCallback } from 'react';
import { Game } from '@/game/Game';

export default function MergeGame() {
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
    <div className="flex flex-col h-screen w-screen bg-pink-50 overflow-hidden">
      {/* 타이틀 바 */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-pink-100 shadow-sm">
        <h1 className="text-lg font-bold text-pink-600">💐 꽃 머지 게임</h1>
        <div className="text-xs text-gray-500">
          최고: <span className="font-bold text-pink-500">{bestScore}</span>
        </div>
      </div>

      {/* 게임 영역 */}
      <div className="flex-1 overflow-hidden">
        <Game onScoreChange={handleScoreChange} onGameOver={handleGameOver} />
      </div>
    </div>
  );
}
