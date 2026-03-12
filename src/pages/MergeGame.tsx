import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Trophy, Coins, Medal } from 'lucide-react';
import { Game } from '@/game/Game';
import { useGamePoints } from '@/hooks/useGamePoints';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

export default function MergeGame() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { saveScore, myPoints, ranking, myBestScore } = useGamePoints();
  const [bestScore, setBestScore] = useState(() => {
    return Number(localStorage.getItem('mergeGame_best') ?? 0);
  });
  const [showRanking, setShowRanking] = useState(false);

  const effectiveBest = user ? Math.max(bestScore, myBestScore) : bestScore;

  const handleScoreChange = useCallback((s: number) => {
    if (s > bestScore) {
      setBestScore(s);
      localStorage.setItem('mergeGame_best', String(s));
    }
  }, [bestScore]);

  const handleGameOver = useCallback(async (finalScore: number) => {
    if (finalScore > bestScore) {
      setBestScore(finalScore);
      localStorage.setItem('mergeGame_best', String(finalScore));
    }
    if (user) {
      await saveScore(finalScore, false);
      queryClient.invalidateQueries({ queryKey: ['user-points'] });
      queryClient.invalidateQueries({ queryKey: ['game-ranking'] });
      queryClient.invalidateQueries({ queryKey: ['my-best-score'] });
    }
  }, [bestScore, user, saveScore, queryClient]);

  const handleDoublePoints = useCallback(async (finalScore: number) => {
    if (user) {
      await saveScore(finalScore, true);
      queryClient.invalidateQueries({ queryKey: ['user-points'] });
      queryClient.invalidateQueries({ queryKey: ['game-ranking'] });
      queryClient.invalidateQueries({ queryKey: ['my-best-score'] });
    }
  }, [user, saveScore, queryClient]);

  return (
    <div className="flex flex-col h-[100dvh] max-w-[430px] mx-auto bg-background overflow-hidden relative">
      {/* 헤더 */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between px-4 h-11">
          <div className="flex items-center">
            <button
              onClick={() => navigate(-1)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors -ml-1"
            >
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </button>
            <span className="text-base font-bold text-foreground ml-1">💐 꽃 머지 게임</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowRanking(!showRanking)}
              className="flex items-center gap-1 px-2 h-8 rounded-full hover:bg-muted transition-colors"
            >
              <span className="text-xs font-semibold text-muted-foreground">RANK</span>
              <Trophy className="w-4 h-4 text-primary" />
            </button>
          </div>
        </div>
      </header>

      {/* 랭킹 패널 */}
      {showRanking && (
        <div className="absolute top-11 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-b border-border max-h-[60vh] overflow-y-auto">
          <div className="p-4">
            <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
              <Medal className="w-4 h-4 text-primary" />
              랭킹 TOP 20
            </h3>
            {!user ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                로그인하면 랭킹에 참여할 수 있어요!
              </p>
            ) : ranking.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                아직 기록이 없어요. 첫 게임을 시작해보세요!
              </p>
            ) : (
              <div className="space-y-2">
                {ranking.map((r, i) => (
                  <div
                    key={r.user_id}
                    className={`flex items-center justify-between p-2.5 rounded-lg border ${
                      r.user_id === user?.id
                        ? 'bg-primary/10 border-primary/30'
                        : 'bg-muted/30 border-border'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`text-sm font-bold w-6 text-center ${
                        i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-600' : 'text-muted-foreground'
                      }`}>
                        {i < 3 ? ['🥇','🥈','🥉'][i] : `${i + 1}`}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {r.user_id === user?.id ? '나' : `Player ${i + 1}`}
                        </p>
                        <p className="text-xs text-muted-foreground">{r.games_played}게임</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">{r.best_score.toLocaleString()}점</p>
                      <p className="text-xs text-muted-foreground">{r.total_earned.toLocaleString()}P 획득</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 게임 영역 */}
      <div className="flex-1 overflow-hidden" onClick={() => showRanking && setShowRanking(false)}>
        <Game
          onScoreChange={handleScoreChange}
          onGameOver={handleGameOver}
          onDoublePoints={handleDoublePoints}
          bestScore={effectiveBest}
        />
      </div>
    </div>
  );
}
