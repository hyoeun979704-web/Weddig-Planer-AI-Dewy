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

  // Game 은 항상 마운트(in-flow)해 캔버스 높이·렌더를 유지하고, 시작/재시작만 ref.start() 로
  // 명령한다. 비플레이(시작 전·게임오버·잠금) 상태는 캔버스 위 React 오버레이가 덮는다.
  const gameRef = useRef<GameHandle>(null);
  // 마지막 판 점수·적립 청구 여부(ref) — 적립은 '한 번만' 발생: 기본(doubled=false) 또는
  // 광고로 2배(doubled=true). 게임오버 시 즉시 적립하지 않고, 사용자가 2배 광고를 보거나
  // 다음 행동(다시하기/한판더/홈) 으로 넘어갈 때 청구한다(이중 적립 방지).
  const lastScoreRef = useRef<number | null>(null);
  const claimedRef = useRef(false);

  const [bestScore, setBestScore] = useState(() => Number(localStorage.getItem('mergeGame_best') ?? 0));
  const [showRanking, setShowRanking] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [lastEarned, setLastEarned] = useState<number | null>(null); // null = 아직 미적립(청구 전)
  const [adBusy, setAdBusy] = useState(false);
  const [, setNowTick] = useState(0); // 잠금 카운트다운 1초 재렌더용

  const effectiveBest = user ? Math.max(bestScore, myBestScore) : bestScore;

  // 기본 적립 추정치(표시용) — 서버 add_game_points(doubled=false) 와 동일 공식 score/40.
  const expectedBase = lastScore !== null ? Math.max(1, Math.floor(lastScore / 40)) : 0;

  // 웹 보상형 대체 모달(AdSense). 한 판 더(5초)·포인트 2배(15초) 둘 다 이 모달을 재사용 —
  // 용도별 문구/카운트다운만 adCfg 로 바꾼다. 네이티브는 AdMob 보상형이라 등록 안 함.
  const [adModalOpen, setAdModalOpen] = useState(false);
  const [adCfg, setAdCfg] = useState({ title: '광고 보고 한 판 더', cta: '한 판 더 플레이', close: '닫기', sec: 5 });
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

  // 직전 판 기본 적립(아직 미청구일 때만). 다음 행동으로 넘어갈 때 호출.
  const claimBase = useCallback(async () => {
    if (claimedRef.current || lastScoreRef.current === null) return;
    claimedRef.current = true;
    if (!user) { setLastEarned(0); return; }
    const awarded = await saveScore(lastScoreRef.current, false);
    setLastEarned(awarded ?? 0);
    invalidatePoints();
  }, [user, saveScore, invalidatePoints]);

  // 포인트 2배 — 15초 보상형 광고 시청 완료 시 doubled=true 로 적립(=기본의 2배 단가).
  const claimDouble = useCallback(async () => {
    if (claimedRef.current || lastScoreRef.current === null || !user || adBusy) return;
    setAdBusy(true);
    setAdCfg({ title: '광고 보고 포인트 2배', cta: '포인트 2배 받기', close: '닫기 (2배 없이)', sec: 15 });
    try {
      const ok = await showRewardedAd('double');
      if (ok) {
        claimedRef.current = true;
        const awarded = await saveScore(lastScoreRef.current, true);
        setLastEarned(awarded ?? 0);
        invalidatePoints();
      }
    } finally {
      setAdBusy(false);
    }
  }, [user, adBusy, saveScore, invalidatePoints]);

  // 무료 판 시작 — 직전 판 기본 적립 후 쿼터 1판 소비, ref.start().
  const startFree = useCallback(() => {
    if (quota.freeLeft <= 0) return;
    void claimBase();
    quota.consumeFree();
    lastScoreRef.current = null;
    claimedRef.current = false;
    setLastScore(null);
    setLastEarned(null);
    setPlaying(true);
    gameRef.current?.start();
  }, [quota, claimBase]);

  // 광고 보고 한 판 더 — 5초 보상형 시청 완료 시에만 소비·시작.
  const startAd = useCallback(async () => {
    if (quota.adLeft <= 0 || adBusy) return;
    void claimBase();
    setAdBusy(true);
    setAdCfg({ title: '광고 보고 한 판 더', cta: '한 판 더 플레이', close: '닫기 (플레이 안 함)', sec: 5 });
    try {
      const ok = await showRewardedAd('extra');
      if (ok) {
        quota.consumeAd();
        lastScoreRef.current = null;
        claimedRef.current = false;
        setLastScore(null);
        setLastEarned(null);
        setPlaying(true);
        gameRef.current?.start();
      }
    } finally {
      setAdBusy(false);
    }
  }, [quota, adBusy, claimBase]);

  const goHome = useCallback(() => {
    void claimBase();
    navigate('/');
  }, [claimBase, navigate]);

  // 진입 시: 무료 판이 남아있으면 첫 판 자동 시작, 없으면 오버레이(광고/잠금) 노출.
  // (child useImperativeHandle 은 parent effect 보다 먼저 커밋되므로 ref.start() 안전)
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    if (quota.freeLeft > 0) startFree();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 잠금/시작 오버레이 카운트다운 틱(플레이 중엔 불필요).
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

  // 게임오버 — 적립은 보류(claimBase/claimDouble 가 처리). 점수·최고점만 갱신.
  const handleGameOver = useCallback(
    async (finalScore: number) => {
      setPlaying(false);
      lastScoreRef.current = finalScore;
      claimedRef.current = false;
      setLastScore(finalScore);
      setLastEarned(null); // 미청구 → 오버레이가 '2배 받기/획득 예정' 노출
      if (finalScore > bestScore) {
        setBestScore(finalScore);
        localStorage.setItem('mergeGame_best', String(finalScore));
      }
    },
    [bestScore],
  );

  return (
    <div
      className="fixed top-0 bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] flex flex-col overflow-hidden"
      style={{ backgroundColor: '#fbe6ee' }}
    >
      {/* 헤더 */}
      <header className="sticky safe-sticky-header z-50 bg-card/95 backdrop-blur-md border-b border-border flex-shrink-0">
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

      {/* 게임 캔버스 영역 — 캔버스는 가로폭=화면폭으로 헤더 바로 아래에 붙는다(높이는 비율,
          위 여백 X). Game 은 항상 마운트, 비플레이 시 오버레이가 캔버스 위를 덮는다.
          캔버스 아래 남는 공간 전부가 광고 배너 영역(아래 flex-1). */}
      <div className="shrink-0 overflow-hidden relative" onClick={() => showRanking && setShowRanking(false)}>
        <Game ref={gameRef} onScoreChange={handleScoreChange} onGameOver={handleGameOver} bestScore={effectiveBest} />

        {/* 시작/게임오버/잠금 오버레이 (플레이 중이 아닐 때) */}
        {!playing && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/55 p-6">
            <div className="bg-card rounded-2xl p-5 w-full max-w-[300px] text-center shadow-xl border border-border">
              {lastScore !== null && (
                <>
                  <p className="text-lg font-extrabold text-foreground">게임 종료</p>
                  <p className="text-sm text-muted-foreground mt-1">점수 {lastScore.toLocaleString()}점</p>
                  {!user ? (
                    <p className="text-xs text-muted-foreground mt-1">로그인하면 포인트가 적립돼요</p>
                  ) : lastEarned === null ? (
                    <p className="text-sm text-muted-foreground mt-1">획득 예정 {expectedBase.toLocaleString()}P</p>
                  ) : lastEarned > 0 ? (
                    <p className="text-primary font-bold text-base mt-1"> +{lastEarned.toLocaleString()}P 적립</p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1">오늘 적립 한도를 모두 채웠어요</p>
                  )}

                  {/* 포인트 2배 적립 — 15초 광고 시청. 아직 미청구(=2배/기본 미선택)일 때만 노출. */}
                  {user && lastEarned === null && (
                    <button
                      onClick={claimDouble}
                      disabled={adBusy}
                      className="mt-3 w-full py-2.5 rounded-xl bg-amber-400 text-amber-950 font-bold active:scale-[0.98] transition-transform disabled:opacity-60 flex items-center justify-center gap-1.5"
                    >
                      <Clapperboard className="w-4 h-4" />
                      {adBusy ? '광고 불러오는 중…' : `광고 보고 포인트 2배 (${(expectedBase * 2).toLocaleString()}P)`}
                    </button>
                  )}
                </>
              )}

              {/* 남은 판 */}
              <p className="text-xs text-muted-foreground mt-3 flex items-center justify-center gap-1.5">
                <Flower2 className="w-3.5 h-3.5 text-pink-400" /> 무료 {quota.freeLeft}/{quota.FREE_MAX}
                <span className="mx-0.5">·</span>
                <Clapperboard className="w-3.5 h-3.5 text-amber-500" /> 광고 {quota.adLeft}/{quota.AD_MAX}
              </p>

              {/* 액션 — 무료 남음 → 시작/다시하기 / 무료 소진 → 광고 한 판 더 / 전부 소진 → 잠금 */}
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
                <button onClick={goHome} className="w-full py-2 rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">
                  홈으로
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 광고 배너 — 캔버스 아래 남는 공간 전부를 채운다(헤더+게임+배너 = 한 화면).
          웹=AdSense 슬롯 4600179427 / 네이티브=AdMob. */}
      <div className="flex-1 min-h-0 w-full overflow-hidden">
        <AdBanner className="w-full h-full" fill placeholder />
      </div>

      {/* 웹 보상형 대체 모달 — 한 판 더(5초)·포인트 2배(15초) 공용, adCfg 로 문구·카운트다운 전환. */}
      <RewardedAdModal
        open={adModalOpen}
        onComplete={handleAdComplete}
        title={adCfg.title}
        ctaLabel={adCfg.cta}
        closeLabel={adCfg.close}
        countdownSec={adCfg.sec}
      />
    </div>
  );
}
