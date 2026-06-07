import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Trophy, Medal, Flower2, Clapperboard, Moon } from 'lucide-react';
import { Game, type GameHandle } from '@/game/Game';
import AdBanner from '@/components/ads/AdBanner';
import RewardedAdModal from '@/components/ads/RewardedAdModal';
import { setWebRewardedHandler, clearWebRewardedHandler, isNativeAds, showRewardedAd } from '@/lib/ads/adService';
import { useGamePoints } from '@/hooks/useGamePoints';
import { useGameQuota } from '@/game/useGameQuota';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

const fmtHMS = (ms: number): string => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
};

export default function MergeGame() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { saveScore, ranking, myBestScore } = useGamePoints();
  const quota = useGameQuota();

  const gameRef = useRef<GameHandle>(null);
  const currentPlayIsAd = useRef(false);

  const [bestScore, setBestScore] = useState(() => Number(localStorage.getItem('mergeGame_best') ?? 0));
  const [showRanking, setShowRanking] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [lastEarned, setLastEarned] = useState(0);
  const [adBusy, setAdBusy] = useState(false);
  const [, setNowTick] = useState(0); // 잠금 카운트다운 1초 재렌더용

  const effectiveBest = user ? Math.max(bestScore, myBestScore) : bestScore;

  // 웹 '광고 보고 한 판 더' — AdSense 디스플레이 광고 모달(adService 브리지). 네이티브는
  // AdMob 보상형이라 등록 안 함(AdSense 가 앱 WebView 에 안 뜨게).
  const [adModalOpen, setAdModalOpen] = useState(false);
  const adResolveRef = useRef<((rewarded: boolean) => void) | null>(null);
  useEffect(() => {
    if (isNativeAds()) return;
    const handler = () =>
      new Promise<boolean>((resolve) => {
        adResolveRef.current = resolve;
        setAdModalOpen(true);
      });
    setWebRewardedHandler(handler);
    return () => {
      adResolveRef.current?.(false);
      adResolveRef.current = null;
      clearWebRewardedHandler(handler);
    };
  }, []);
  const handleAdComplete = useCallback((rewarded: boolean) => {
    setAdModalOpen(false);
    adResolveRef.current?.(rewarded);
    adResolveRef.current = null;
  }, []);

  const invalidatePoints = useCallback(() => {
    for (const k of ['user-points', 'user-points-full', 'game-ranking', 'my-best-score']) {
      queryClient.invalidateQueries({ queryKey: [k] });
    }
  }, [queryClient]);

  // 무료 판 시작
  const startFree = useCallback(() => {
    if (quota.freeLeft <= 0) return;
    quota.consumeFree();
    currentPlayIsAd.current = false;
    setLastScore(null);
    setPlaying(true);
    gameRef.current?.start();
  }, [quota]);

  // 광고 보고 한 판 더 (보상형 시청 완료 시에만 시작)
  const startAd = useCallback(async () => {
    if (quota.adLeft <= 0 || adBusy) return;
    setAdBusy(true);
    try {
      const ok = await showRewardedAd();
      if (ok) {
        quota.consumeAd();
        currentPlayIsAd.current = true;
        setLastScore(null);
        setPlaying(true);
        gameRef.current?.start();
      }
    } finally {
      setAdBusy(false);
    }
  }, [quota, adBusy]);

  // 진입 시: 무료 판이 남아있으면 자동 시작, 없으면 오버레이(광고/잠금) 노출.
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    if (quota.freeLeft > 0) startFree();
    // else: playing=false 라 오버레이가 광고 옵션/잠금을 보여줌.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 잠금 화면 카운트다운 틱(플레이 중엔 불필요).
  useEffect(() => {
    if (playing) return;
    const id = setInterval(() => setNowTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [playing]);

  const handleScoreChange = useCallback(
    (s: number) => {
      if (s > bestScore) {
        setBestScore(s);
        localStorage.setItem('mergeGame_best', String(s));
      }
    },
    [bestScore],
  );

  const handleGameOver = useCallback(
    async (finalScore: number) => {
      setPlaying(false);
      setLastScore(finalScore);
      if (finalScore > bestScore) {
        setBestScore(finalScore);
        localStorage.setItem('mergeGame_best', String(finalScore));
      }
      if (user) {
        const awarded = await saveScore(finalScore, currentPlayIsAd.current);
        setLastEarned(awarded ?? 0);
        invalidatePoints();
      } else {
        setLastEarned(0);
      }
    },
    [bestScore, user, saveScore, invalidatePoints],
  );

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
            <span className="text-base font-bold text-foreground ml-1"> 꽃 머지 게임</span>
          </div>
          <div className="flex items-center gap-2">
            {/* 남은 판 인디케이터 (항상 노출) */}
            <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
              <Flower2 className="w-3.5 h-3.5 text-pink-400" />{quota.freeLeft}
              <Clapperboard className="w-3.5 h-3.5 text-amber-500 ml-1" />{quota.adLeft}
            </span>
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
              <p className="text-sm text-muted-foreground text-center py-4">로그인하면 랭킹에 참여할 수 있어요!</p>
            ) : ranking.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">아직 기록이 없어요. 첫 게임을 시작해보세요!</p>
            ) : (
              <div className="space-y-2">
                {ranking.map((r, i) => (
                  <div
                    key={r.user_id}
                    className={`flex items-center justify-between p-2.5 rounded-lg border ${
                      r.user_id === user?.id ? 'bg-primary/10 border-primary/30' : 'bg-muted/30 border-border'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`text-sm font-bold w-6 text-center ${
                          i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-600' : 'text-muted-foreground'
                        }`}
                      >
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-foreground">{r.user_id === user?.id ? '나' : `Player ${i + 1}`}</p>
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
      <div className="flex-1 overflow-hidden relative" onClick={() => showRanking && setShowRanking(false)}>
        <Game ref={gameRef} onScoreChange={handleScoreChange} onGameOver={handleGameOver} bestScore={effectiveBest} />

        {/* 게임오버/시작/잠금 오버레이 (플레이 중이 아닐 때) */}
        {!playing && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/55 p-6">
            <div className="bg-card rounded-2xl p-5 w-full max-w-[300px] text-center shadow-xl border border-border">
              {lastScore !== null && (
                <>
                  <p className="text-lg font-extrabold text-foreground">게임 종료</p>
                  <p className="text-sm text-muted-foreground mt-1">점수 {lastScore.toLocaleString()}점</p>
                  {user && lastEarned > 0 && (
                    <p className="text-primary font-bold text-base mt-1"> +{lastEarned.toLocaleString()}P 적립</p>
                  )}
                </>
              )}

              {/* 남은 판 */}
              <p className="text-xs text-muted-foreground mt-3 flex items-center justify-center gap-1.5">
                <Flower2 className="w-3.5 h-3.5 text-pink-400" /> 무료 {quota.freeLeft}/{quota.FREE_MAX}
                <span className="mx-0.5">·</span>
                <Clapperboard className="w-3.5 h-3.5 text-amber-500" /> 광고 {quota.adLeft}/{quota.AD_MAX}
              </p>

              {/* 액션 */}
              <div className="mt-4 space-y-2">
                {quota.freeLeft > 0 ? (
                  <button
                    onClick={startFree}
                    className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold active:scale-[0.98] transition-transform"
                  >
                    {lastScore === null ? '게임 시작' : '다시하기'} <span className="font-normal text-sm">(무료 {quota.freeLeft}판)</span>
                  </button>
                ) : quota.adLeft > 0 ? (
                  <button
                    onClick={startAd}
                    disabled={adBusy}
                    className="w-full py-3 rounded-xl bg-amber-400 text-amber-950 font-bold active:scale-[0.98] transition-transform disabled:opacity-60 flex items-center justify-center gap-1.5"
                  >
                    <Clapperboard className="w-4 h-4" />
                    {adBusy ? '광고 불러오는 중…' : `광고 보고 한 판 더 (${quota.adLeft})`}
                  </button>
                ) : (
                  <div className="rounded-xl bg-muted/60 border border-border p-3">
                    <p className="font-bold text-foreground flex items-center justify-center gap-1.5">
                      <Moon className="w-4 h-4 text-indigo-400" /> 오늘 플레이 완료!
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">내일 자정에 {quota.FREE_MAX + quota.AD_MAX}판이 새로 충전돼요</p>
                    <p className="text-xl font-mono font-bold text-foreground mt-2 tabular-nums">{fmtHMS(quota.msUntilReset())}</p>
                  </div>
                )}
                <button onClick={() => navigate(-1)} className="w-full py-2 rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">
                  홈으로
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 하단 광고 배너 (웹=AdSense 슬롯 4600179427 / 네이티브=AdMob). */}
      <AdBanner className="flex-shrink-0 w-full" height={96} placeholder />

      {/* 웹 '광고 보고 한 판 더' 디스플레이 광고 모달 (슬롯 1646713028). */}
      <RewardedAdModal open={adModalOpen} onComplete={handleAdComplete} />
    </div>
  );
}
