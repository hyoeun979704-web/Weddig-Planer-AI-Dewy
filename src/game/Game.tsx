import { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import { useGameLogic } from './useGameLogic';
import { useGameAudio } from './useGameAudio';
import { GAME_WIDTH, GAME_HEIGHT, JAR_INNER_BOTTOM, DROP_START_Y, FLOWER_LEVEL_MAP } from './constants';
import type { GameState } from './types';

interface GameProps {
  onScoreChange?: (score: number) => void;
  onGameOver?: (score: number) => void;
  bestScore: number;
}

/** 부모(MergeGame)가 쿼터/광고 처리 후 새 판을 시작시키는 명령 핸들. */
export interface GameHandle {
  start: () => void;
}


// Custom cursor SVGs encoded as data URIs
const PLAY_CURSOR = (() => {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'>
    <circle cx='14' cy='14' r='12' fill='none' stroke='%23F4A7B9' stroke-width='2' opacity='0.7'/>
    <circle cx='14' cy='14' r='3' fill='%23C9A96E'/>
    <line x1='14' y1='0' x2='14' y2='8' stroke='%23F4A7B9' stroke-width='1.2' opacity='0.5'/>
    <line x1='14' y1='20' x2='14' y2='28' stroke='%23F4A7B9' stroke-width='1.2' opacity='0.5'/>
    <line x1='0' y1='14' x2='8' y2='14' stroke='%23F4A7B9' stroke-width='1.2' opacity='0.5'/>
    <line x1='20' y1='14' x2='28' y2='14' stroke='%23F4A7B9' stroke-width='1.2' opacity='0.5'/>
  </svg>`;
  return `url("data:image/svg+xml,${svg}") 14 14, crosshair`;
})();

const POINTER_CURSOR = (() => {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'>
    <circle cx='12' cy='12' r='10' fill='%23C9A96E' opacity='0.25'/>
    <circle cx='12' cy='12' r='5' fill='%23C9A96E' opacity='0.6'/>
  </svg>`;
  return `url("data:image/svg+xml,${svg}") 12 12, pointer`;
})();

// 상단 음소거 버튼 좌표(캔버스 좌표) — draw 와 hit-test 가 공유.
const MUTE_BTN = { cx: 337, cy: 25, r: 15 };

// 버블 칩(pill) — 따뜻한 크림 배경 + 갈색 셀 아웃라인 + 부드러운 그림자.
// 이미지 스트레치가 없으니(roundRect 직접 그림) 왜곡 위험이 0이다.
function drawPill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const r = h / 2;
  ctx.save();
  ctx.shadowColor = 'rgba(120,70,50,0.20)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = 'rgba(255,250,244,0.96)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(150,95,70,0.55)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.stroke();
  ctx.restore();
}

// 라벨+값 칩. anchorLeft=true 면 ax 가 좌측 x, false 면 ax 가 우측 끝. 그려진 박스를 반환.
function drawLabeledChip(
  ctx: CanvasRenderingContext2D,
  anchorLeft: boolean, ax: number, y: number,
  label: string, value: string, valueColor: string
) {
  const padX = 11, h = 30, gap = 5;
  ctx.font = "700 9px 'Noto Sans KR', sans-serif";
  const lw = ctx.measureText(label).width;
  ctx.font = "bold 15px 'Noto Sans KR', sans-serif";
  const vw = ctx.measureText(value).width;
  const w = padX * 2 + lw + gap + vw;
  const x = anchorLeft ? ax : ax - w;
  drawPill(ctx, x, y, w, h);
  const cy = y + h / 2;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = "700 9px 'Noto Sans KR', sans-serif";
  ctx.fillStyle = 'rgba(150,95,70,0.8)';
  ctx.fillText(label, x + padX, cy + 1);
  ctx.font = "bold 15px 'Noto Sans KR', sans-serif";
  ctx.fillStyle = valueColor;
  ctx.fillText(value, x + padX + lw + gap, cy);
  return { x, w };
}

export const Game = forwardRef<GameHandle, GameProps>(function Game(
  { onScoreChange, onGameOver, bestScore },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  // 캔버스 표시 크기 — CSS 컨테이너쿼리(cqh)는 일부 안드로이드 인앱 웹뷰에서 안 먹어
  // 캔버스가 0 높이(흰 화면)가 되고, dvh-매직넘버는 헤더/광고/주소창을 추정으로 빼서
  // 기기마다 잘리거나 넘침(세로 늘어남). → 부모 영역(헤더·광고 뺀 실제 남은 공간)을
  // JS 로 직접 측정(ResizeObserver)해 비율 유지 박스를 px 로 계산한다(모든 웹뷰 안전·정확).
  const fitRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  useEffect(() => {
    const el = fitRef.current;
    if (!el) return;
    const measure = () => {
      const cw = el.clientWidth;
      const ch = el.clientHeight;
      if (cw <= 0 || ch <= 0) return;
      const scale = Math.min(cw / GAME_WIDTH, ch / GAME_HEIGHT);
      setCanvasSize({ w: Math.round(GAME_WIDTH * scale), h: Math.round(GAME_HEIGHT * scale) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 꽃 에셋 이미지 캐시. public/game-flowers/{id}.png 가 있으면 그걸 쓰고, 없으면
  // 기존 이모지+원 렌더로 폴백한다. 물리 충돌은 원(반지름 r)이지만 에셋이 항공샷
  // 둥근 부케라 실루엣이 거의 일치 — 이미지를 충돌 지름에 맞춰 그려 형태를 맞춘다.
  const flowerImgRef = useRef<Map<number, HTMLImageElement>>(new Map());
  const flowerReadyRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    for (let id = 1; id <= 12; id++) {
      if (flowerImgRef.current.has(id)) continue;
      const img = new Image();
      img.onload = () => flowerReadyRef.current.add(id);
      img.onerror = () => flowerReadyRef.current.delete(id);
      img.src = `/game-flowers/${id}.png`;
      flowerImgRef.current.set(id, img);
    }
  }, []);

  // 게임 chrome 에셋(배경). 없으면 핑크 그라데이션 폴백. (버튼 에셋은 게임오버 UI 가
  // React 오버레이로 이관되며 미사용 → 로드 안 함)
  const chromeRef = useRef<Record<string, HTMLImageElement>>({});
  const chromeReadyRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const assets: Record<string, string> = {
      bg: '/game/bg.png',
    };
    for (const [key, src] of Object.entries(assets)) {
      if (chromeRef.current[key]) continue;
      const img = new Image();
      img.onload = () => chromeReadyRef.current.add(key);
      img.onerror = () => chromeReadyRef.current.delete(key);
      img.src = src;
      chromeRef.current[key] = img;
    }
  }, []);

  // 사운드 — BGM 루프 + 머지 효과음. 첫 제스처에서 unlock 후 재생.
  // 메서드는 안정적인 useCallback 이라 구조분해해 deps 에 직접 쓴다(audio 객체는
  // 매 렌더 새 리터럴이라 그대로 의존하면 콜백/RAF 루프가 매 렌더 재생성됨).
  const audio = useGameAudio();
  const { muted: audioMuted, toggleMute, unlock: audioUnlock, playMerge } = audio;

  // 렌더 루프(draw)는 매 프레임 호출되므로 자주 바뀌는 값은 ref 로 읽어 draw 를 안정화한다.
  const mutedRef = useRef(audioMuted);
  mutedRef.current = audioMuted;
  const bestScoreRef = useRef(bestScore);
  bestScoreRef.current = bestScore;

  const { gameState, dropXRef, mergeFlashesRef, startGame, dropFlower, setDropX, tick, getBodies } =
    useGameLogic({ canvasRef, onScoreChange, onGameOver, onMerge: playMerge });

  const gameStateRef = useRef<GameState>(gameState);
  gameStateRef.current = gameState;

  // 시작/재시작은 부모(MergeGame)가 쿼터·광고를 처리한 뒤 ref.start() 로 호출한다.
  // (게임오버 UI·다시하기·광고 추가판은 모두 MergeGame 의 React 오버레이가 담당)
  useImperativeHandle(ref, () => ({ start: startGame }), [startGame]);

  // ─── 꽃 원형 렌더링 ───────────────────────────────────────────────────
  function drawFlower(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, levelId: number, alpha = 1) {
    const level = FLOWER_LEVEL_MAP.get(levelId);
    if (!level) return;
    const r = level.radius;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(angle);

    // 에셋 이미지가 준비됐으면 그걸로 렌더(충돌 지름에 맞춰 약간 키워 꽉 차게).
    if (flowerReadyRef.current.has(levelId)) {
      const img = flowerImgRef.current.get(levelId)!;
      const size = r * 2 * 1.08;
      ctx.drawImage(img, -size / 2, -size / 2, size, size);
      ctx.restore();
      return;
    }

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


    ctx.restore();
  }

  // ─── 색상 유틸리티 ───────────────────────────────────────────────────
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

  // ─── 캔버스 렌더링 ──────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const gs = gameStateRef.current;

    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    // 배경 — 에셋 있으면 cover 로 채우고, 없으면 핑크 그라데이션 폴백.
    if (chromeReadyRef.current.has('bg')) {
      const img = chromeRef.current.bg;
      const s = Math.max(GAME_WIDTH / img.width, GAME_HEIGHT / img.height);
      const dw = img.width * s, dh = img.height * s;
      ctx.drawImage(img, (GAME_WIDTH - dw) / 2, (GAME_HEIGHT - dh) / 2, dw, dh);
    } else {
      const bgGrad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
      bgGrad.addColorStop(0, '#FFF0F5');
      bgGrad.addColorStop(1, '#FFF9FA');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }

    // 바닥/데드라인 별도 렌더 없음 — 배경 에셋의 유리통이 바닥·벽·데드라인(윗 림)을 모두 표현.

    // ─── 인게임 상단 버블 HUD (유리 림 위 오픈 영역) ──────────────────────────
    const waitLevel = FLOWER_LEVEL_MAP.get(gs.currentLevelId);
    const nextLevel = FLOWER_LEVEL_MAP.get(gs.nextLevelId);

    if (gs.phase !== 'gameover' && waitLevel) {
      const hudY = 10;

      // SCORE 칩 (좌)
      drawLabeledChip(ctx, true, 8, hudY, 'SCORE', String(gs.score), '#E0739A');

      // NEXT 미리보기 (중앙) — 프레임 없이 'NEXT' 라벨 + 그 아래 큰 꽃.
      if (nextLevel) {
        const cx = GAME_WIDTH / 2;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.font = "bold 14px 'Noto Sans KR', sans-serif";
        ctx.fillStyle = 'rgba(140,90,65,0.95)';
        ctx.fillText('NEXT', cx, hudY - 4);

        const iconSz = 46;                  // 크게(256px 소스라 안 깨짐), 박스 없음
        const icy = hudY - 4 + 16 + iconSz / 2;
        if (flowerReadyRef.current.has(gs.nextLevelId)) {
          ctx.drawImage(flowerImgRef.current.get(gs.nextLevelId)!, cx - iconSz / 2, icy - iconSz / 2, iconSz, iconSz);
        } else {
          ctx.font = `${iconSz}px serif`;
          ctx.textBaseline = 'middle';
          ctx.fillText(nextLevel.emoji, cx, icy);
        }
      }

      // BEST 칩 (우, 음소거 버튼 왼쪽까지)
      drawLabeledChip(ctx, false, MUTE_BTN.cx - MUTE_BTN.r - 6, hudY, 'BEST', String(bestScoreRef.current), '#C9A96E');
    }

    // 머지 이펙트 — 부드러운 글로우 + 확장 링 + 사방으로 튀는 반짝이.
    // 프리미엄(최종 레벨) 완성은 더 크고 화려하게(2겹 링·무지개 반짝이·별·더 긴 지속).
    const now = performance.now();
    mergeFlashesRef.current.forEach((f) => {
      const isPrem = !!f.premium;
      const dur = isPrem ? 1200 : 600;
      const elapsed = now - f.createdAt;
      const progress = Math.min(1, elapsed / dur);
      const ease = 1 - Math.pow(1 - progress, 2); // ease-out

      ctx.save();
      ctx.translate(f.x, f.y);

      // 1) 중심 글로우 (초반에 확 밝아졌다 사라짐)
      const glowAlpha = (1 - progress) * (isPrem ? 0.7 : 0.5);
      if (glowAlpha > 0.01) {
        const gr = f.radius * (isPrem ? 1.0 + 1.4 * ease : 0.6 + 0.8 * ease);
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, gr);
        glow.addColorStop(0, `rgba(255,252,240,${glowAlpha})`);
        glow.addColorStop(0.5, `rgba(255,210,150,${glowAlpha * 0.5})`);
        glow.addColorStop(1, 'rgba(255,200,120,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, gr, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2) 확장 링 (프리미엄은 2겹)
      const rings = isPrem ? [1.2, 1.9] : [1.2];
      ctx.strokeStyle = '#FFD27A';
      rings.forEach((mult, ri) => {
        const ringR = f.radius + f.radius * mult * ease;
        ctx.globalAlpha = (1 - progress) * (0.8 - ri * 0.25);
        ctx.lineWidth = (isPrem ? 4 : 3) * (1 - progress) + 0.5;
        ctx.beginPath();
        ctx.arc(0, 0, ringR, 0, Math.PI * 2);
        ctx.stroke();
      });

      // 3) 반짝이 입자 — 결정적 분포로 사방 튀어나감 (프리미엄은 더 많고 무지개색)
      const sparkCount = isPrem ? 18 : 8;
      const sparkDist = f.radius * (isPrem ? 1.0 + 2.4 * ease : 0.9 + 1.6 * ease);
      const seed = f.createdAt;
      const premColors = ['#FFD700', '#FF9EC4', '#9ED8FF', '#FFFFFF', '#C7A6FF'];
      for (let i = 0; i < sparkCount; i++) {
        const ang = (i / sparkCount) * Math.PI * 2 + seed * 0.0007;
        const dist = sparkDist * (isPrem ? 0.8 + 0.4 * ((i * 7) % 5) / 5 : 1);
        const sx = Math.cos(ang) * dist;
        const sy = Math.sin(ang) * dist;
        const sparkR = (1 - progress) * (isPrem ? 2.2 + (i % 3) * 1.0 : 1.6 + (i % 3) * 0.7);
        if (sparkR <= 0.1) continue;
        ctx.globalAlpha = (1 - progress) * 0.95;
        ctx.fillStyle = isPrem ? premColors[i % premColors.length] : '#FFFFFF';
        ctx.beginPath();
        ctx.arc(sx, sy, sparkR, 0, Math.PI * 2);
        ctx.fill();
      }

      // 4) 프리미엄 전용 — 4방향 별빛(스파클 십자) 버스트
      if (isPrem) {
        const starLen = f.radius * (1.0 + 1.6 * ease);
        const starAlpha = (1 - progress) * 0.9;
        ctx.globalAlpha = starAlpha;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineCap = 'round';
        for (let k = 0; k < 4; k++) {
          const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
          ctx.lineWidth = 2.5 * (1 - progress) + 0.5;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a) * starLen, Math.sin(a) * starLen);
          ctx.stroke();
        }
      }
      ctx.restore();
    });

    // 꽃 오브젝트
    const bodies = getBodies();
    bodies.forEach(({ body, levelId }) => {
      drawFlower(ctx, body.position.x, body.position.y, body.angle, levelId);
    });

    // 드롭 미리보기 (가이드라인만 — HUD 아이콘은 위에서 그림)
    if (gs.phase !== 'gameover' && waitLevel) {
      const x = dropXRef.current;
      const r = waitLevel.radius;
      const previewY = DROP_START_Y;

      drawFlower(ctx, x, previewY, 0, gs.currentLevelId, 0.55);

      ctx.save();
      ctx.strokeStyle = 'rgba(180,120,140,0.25)';
      ctx.setLineDash([4, 6]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, previewY + r);
      ctx.lineTo(x, JAR_INNER_BOTTOM);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // 게임오버 시 캔버스는 어둡게만 — 점수/획득/다시하기/광고 한 판 더/잠금 카운트다운은
    // MergeGame 의 React 오버레이가 담당(접근성·정확한 카운트다운·쿼터 제어).
    if (gs.phase === 'gameover') {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }

    // 음소거 버튼 — 모든 단계에서 항상 그림(게임오버 오버레이 위에도). 음소거가
    // 어느 화면에서도 가능하도록 맨 마지막에 렌더. (mutedRef 로 매 프레임 최신값)
    drawPill(ctx, MUTE_BTN.cx - MUTE_BTN.r, MUTE_BTN.cy - MUTE_BTN.r, MUTE_BTN.r * 2, MUTE_BTN.r * 2);
    ctx.font = "15px serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(mutedRef.current ? '🔇' : '🔊', MUTE_BTN.cx, MUTE_BTN.cy + 1);
  }, [getBodies, dropXRef, mergeFlashesRef]);

  // ─── RAF 루프 ─────────────────────────────────────────────────────
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

  // 첫 판 시작은 부모(MergeGame)가 쿼터 확인 후 ref.start() 로 트리거. (RAF 루프는
  // 마운트 즉시 돌아 배경/유리통을 그리므로 시작 전에도 캔버스는 비어있지 않다.)

  // ─── 캔버스 클릭 (게임오버는 React 오버레이가 처리) ──────────────────────────
  const getCanvasCoords = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const scaleX = GAME_WIDTH / rect.width;
    const scaleY = GAME_HEIGHT / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

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

      // 첫 사용자 제스처에서 오디오 잠금 해제 + BGM 시작
      audioUnlock();

      // 음소거 버튼은 모든 단계에서 탭 가능 — 드롭/팝업 처리보다 먼저 검사하고 토글만.
      const mc = getCanvasCoords(e);
      if (mc && Math.hypot(mc.x - MUTE_BTN.cx, mc.y - MUTE_BTN.cy) <= MUTE_BTN.r + 2) {
        toggleMute();
        return;
      }

      // 게임오버 화면은 React 오버레이(MergeGame)가 처리 — 캔버스 탭은 무시.
      if (gameStateRef.current.phase === 'gameover') return;

      dropFlower();
    },
    [dropFlower, getCanvasCoords, audioUnlock, toggleMute]
  );

  return (
    <div
      className="flex-1 min-h-0 flex flex-col items-center w-full select-none overflow-hidden"
      style={{
        backgroundColor: '#fbe6ee',
        backgroundImage: 'url(/game/bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* 스코어/베스트/넥스트/음소거 HUD 는 캔버스 위 버블 칩으로 직접 그림(레퍼런스풍). */}

      {/* 캔버스 — 남는 게임 영역(이 fit 컨테이너)을 JS 로 측정(ResizeObserver)해
          비율 유지 박스를 px 로 적용. cqh(흰 화면)·dvh매직넘버(세로 넘침) 둘 다 회피. */}
      <div ref={fitRef} className="flex-1 min-h-0 flex items-center justify-center w-full overflow-hidden">
        <canvas
          ref={canvasRef}
          width={GAME_WIDTH}
          height={GAME_HEIGHT}
          className="touch-none block"
          style={{
            width: canvasSize.w ? `${canvasSize.w}px` : undefined,
            height: canvasSize.h ? `${canvasSize.h}px` : undefined,
            cursor: gameState.phase === 'gameover' ? POINTER_CURSOR : PLAY_CURSOR,
            borderRadius: '0 0 8px 8px',
          }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />
      </div>
    </div>
  );
});
