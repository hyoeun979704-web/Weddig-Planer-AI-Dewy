import { useEffect, useRef, useCallback, useState } from 'react';
import Matter from 'matter-js';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  GRAVITY_Y,
  WALL_THICKNESS,
  DEATH_LINE_Y,
  DEATH_CHECK_DELAY,
  DROP_START_Y,
  MERGE_DELAY,
  MAX_DROP_LEVEL,
  FLOWER_LEVEL_MAP,
} from './constants';
import type { GameObject, GameState } from './types';

function randomDropLevel(): number {
  return Math.floor(Math.random() * MAX_DROP_LEVEL) + 1;
}

let idCounter = 0;
function genId() {
  return `obj_${++idCounter}`;
}

export interface MergeFlash {
  x: number;
  y: number;
  radius: number;   // 머지된 상위 오브젝트의 반지름
  createdAt: number;
}

interface UseGameLogicOptions {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  onScoreChange?: (score: number) => void;
  onGameOver?: (score: number) => void;
}

export function useGameLogic({ canvasRef, onScoreChange, onGameOver }: UseGameLogicOptions) {
  const engineRef = useRef<Matter.Engine | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const gameObjectsRef = useRef<Map<number, GameObject>>(new Map());

  const dropXRef = useRef<number>(GAME_WIDTH / 2);
  const isDroppingRef = useRef(false);
  const deathTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isGameOverRef = useRef(false);

  // ── Bug Fix #3: 콜백을 ref로 관리하여 클로저 staleness 방지 ──────────────
  // 엔진 이벤트 핸들러가 생성 당시의 콜백을 고정 캡처하는 문제를 해결한다.
  // ref.current는 항상 최신 함수를 가리키므로 props 변경에도 안전하다.
  const onScoreChangeRef = useRef(onScoreChange);
  const onGameOverRef = useRef(onGameOver);
  useEffect(() => {
    onScoreChangeRef.current = onScoreChange;
    onGameOverRef.current = onGameOver;
  }, [onScoreChange, onGameOver]);

  // 머지 이펙트 목록: 렌더링 루프에서 읽어 Canvas에 직접 그린다
  const mergeFlashesRef = useRef<MergeFlash[]>([]);

  const [gameState, setGameState] = useState<GameState>({
    phase: 'idle',
    score: 0,
    currentLevelId: randomDropLevel(),
    nextLevelId: randomDropLevel(),
    objects: [],
  });

  // ─── 물리 바디 생성 ────────────────────────────────────────────────────────
  const createFlowerBody = useCallback(
    (levelId: number, x: number, y: number): Matter.Body => {
      const level = FLOWER_LEVEL_MAP.get(levelId)!;
      const body = Matter.Bodies.circle(x, y, level.radius, {
        restitution: 0.25,
        friction: 0.6,
        density: 0.002,
        label: `flower_${levelId}`,
      });
      (body as Matter.Body & { levelId: number }).levelId = levelId;

      const obj: GameObject = {
        id: genId(),
        levelId,
        bodyId: body.id,
        isMerging: false,
      };
      gameObjectsRef.current.set(body.id, obj);
      return body;
    },
    []
  );

  // ─── 머지 처리 ─────────────────────────────────────────────────────────────
  // handleMerge를 ref로 감싸 initEngine 내부 이벤트 핸들러에서 항상 최신 함수를 호출한다.
  // 이렇게 하면 handleMerge 의존성 배열을 비워 initEngine이 불필요하게 재생성되지 않는다.
  const handleMergeRef = useRef<(bodyA: Matter.Body, bodyB: Matter.Body, engine: Matter.Engine) => void>();

  handleMergeRef.current = (bodyA, bodyB, engine) => {
    const objA = gameObjectsRef.current.get(bodyA.id);
    const objB = gameObjectsRef.current.get(bodyB.id);

    if (!objA || !objB) return;
    if (objA.isMerging || objB.isMerging) return;
    if (objA.levelId !== objB.levelId) return;

    const level = FLOWER_LEVEL_MAP.get(objA.levelId);
    if (!level || level.nextLevelId === null) return;

    objA.isMerging = true;
    objB.isMerging = true;

    const midX = (bodyA.position.x + bodyB.position.x) / 2;
    const midY = (bodyA.position.y + bodyB.position.y) / 2;

    // 물리 스텝과 분리: 충돌 이벤트 핸들러 안에서 바디를 즉시 제거하면 엔진이 깨진다
    setTimeout(() => {
      if (!engineRef.current) return;
      Matter.World.remove(engine.world, bodyA);
      Matter.World.remove(engine.world, bodyB);
      gameObjectsRef.current.delete(bodyA.id);
      gameObjectsRef.current.delete(bodyB.id);

      const newBody = createFlowerBody(level.nextLevelId!, midX, midY);
      Matter.World.add(engine.world, newBody);

      // 머지 이펙트 등록
      const nextLevel = FLOWER_LEVEL_MAP.get(level.nextLevelId!);
      if (nextLevel) {
        mergeFlashesRef.current.push({
          x: midX,
          y: midY,
          radius: nextLevel.radius,
          createdAt: performance.now(),
        });
      }

      setGameState((prev) => {
        const newScore = prev.score + level.score;
        onScoreChangeRef.current?.(newScore);
        return { ...prev, score: newScore };
      });
    }, MERGE_DELAY);
  };

  // ─── 게임 오버 체크 ─────────────────────────────────────────────────────────
  // Bug Fix #4: 속도(velocity)가 낮은 오브젝트만 사망 판정에 포함.
  // 드롭 직후 빠르게 떨어지는 꽃이 데스라인을 통과해도 오작동하지 않는다.
  const DEATH_SPEED_THRESHOLD = 1.5; // px/frame 이하면 "안착됨"으로 간주

  const checkDeathLine = useCallback(
    (engine: Matter.Engine) => {
      if (isGameOverRef.current) return;

      const bodies = Matter.Composite.allBodies(engine.world).filter(
        (b) => b.label.startsWith('flower_')
      );

      const overLine = bodies.some((b) => {
        const speed = Matter.Vector.magnitude(b.velocity);
        const top = b.position.y - (b.circleRadius ?? 0);
        // 안착 상태(speed 낮음)이고 데스라인 위에 있으면 위험
        return speed < DEATH_SPEED_THRESHOLD && top < DEATH_LINE_Y;
      });

      if (overLine) {
        if (!deathTimerRef.current) {
          deathTimerRef.current = setTimeout(() => {
            if (isGameOverRef.current) return;
            const stillOver = Matter.Composite.allBodies(engine.world)
              .filter((b) => b.label.startsWith('flower_'))
              .some((b) => {
                const speed = Matter.Vector.magnitude(b.velocity);
                return speed < DEATH_SPEED_THRESHOLD && b.position.y - (b.circleRadius ?? 0) < DEATH_LINE_Y;
              });

            if (stillOver) {
              isGameOverRef.current = true;
              setGameState((prev) => {
                onGameOverRef.current?.(prev.score);
                return { ...prev, phase: 'gameover' };
              });
            }
            deathTimerRef.current = null;
          }, DEATH_CHECK_DELAY);
        }
      } else {
        if (deathTimerRef.current) {
          clearTimeout(deathTimerRef.current);
          deathTimerRef.current = null;
        }
      }
    },
    [] // 외부 콜백은 ref로 관리하므로 deps 불필요
  );

  // ─── 엔진 초기화 ──────────────────────────────────────────────────────────
  const initEngine = useCallback(() => {
    // Bug Fix #5: renderRef 제거 — Matter.Render를 생성하지 않으므로 관련 정리 코드 삭제
    if (runnerRef.current) Matter.Runner.stop(runnerRef.current);
    if (engineRef.current) Matter.Engine.clear(engineRef.current);

    const engine = Matter.Engine.create({ gravity: { y: GRAVITY_Y } });
    const halfWall = WALL_THICKNESS / 2;

    const floor = Matter.Bodies.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT - halfWall, GAME_WIDTH, WALL_THICKNESS,
      { isStatic: true, label: 'wall', friction: 0.6 }
    );
    const wallLeft = Matter.Bodies.rectangle(
      -halfWall, GAME_HEIGHT / 2, WALL_THICKNESS, GAME_HEIGHT,
      { isStatic: true, label: 'wall' }
    );
    const wallRight = Matter.Bodies.rectangle(
      GAME_WIDTH + halfWall, GAME_HEIGHT / 2, WALL_THICKNESS, GAME_HEIGHT,
      { isStatic: true, label: 'wall' }
    );
    Matter.World.add(engine.world, [floor, wallLeft, wallRight]);

    // handleMergeRef를 통해 항상 최신 머지 로직이 실행됨 (Bug Fix #3)
    Matter.Events.on(engine, 'collisionStart', (event) => {
      event.pairs.forEach(({ bodyA, bodyB }) => {
        const oA = gameObjectsRef.current.get(bodyA.id);
        const oB = gameObjectsRef.current.get(bodyB.id);
        if (oA && oB && oA.levelId === oB.levelId) {
          handleMergeRef.current?.(bodyA, bodyB, engine);
        }
      });
    });

    const runner = Matter.Runner.create();
    Matter.Runner.run(runner, engine);

    engineRef.current = engine;
    runnerRef.current = runner;
    gameObjectsRef.current.clear();
    mergeFlashesRef.current = [];
    isGameOverRef.current = false;
    isDroppingRef.current = false;
    if (deathTimerRef.current) {
      clearTimeout(deathTimerRef.current);
      deathTimerRef.current = null;
    }
  }, [createFlowerBody]); // handleMerge를 deps에서 제거해 initEngine이 안정적으로 유지됨

  // ─── 게임 시작 / 재시작 ───────────────────────────────────────────────────
  const startGame = useCallback(() => {
    initEngine();
    setGameState({
      phase: 'idle',
      score: 0,
      currentLevelId: randomDropLevel(),
      nextLevelId: randomDropLevel(),
      objects: [],
    });
  }, [initEngine]);

  // ─── 오브젝트 드롭 ────────────────────────────────────────────────────────
  const dropFlower = useCallback(() => {
    if (!engineRef.current) return;
    if (isDroppingRef.current) return;
    if (isGameOverRef.current) return;

    isDroppingRef.current = true;

    setGameState((prev) => {
      if (prev.phase === 'gameover') return prev;

      const body = createFlowerBody(prev.currentLevelId, dropXRef.current, DROP_START_Y);
      Matter.World.add(engineRef.current!.world, body);

      const newCurrent = prev.nextLevelId;
      const newNext = randomDropLevel();

      setTimeout(() => { isDroppingRef.current = false; }, 450);

      return { ...prev, currentLevelId: newCurrent, nextLevelId: newNext };
    });
  }, [createFlowerBody]);

  // ─── X 위치 업데이트 (반지름 범위 내로 클램핑) ────────────────────────────
  const setDropX = useCallback((x: number, currentLevelId: number) => {
    if (isGameOverRef.current) return;
    const level = FLOWER_LEVEL_MAP.get(currentLevelId);
    const r = level?.radius ?? 20;
    dropXRef.current = Math.max(r, Math.min(x, GAME_WIDTH - r));
  }, []);

  // ─── 매 프레임 호출: 데스라인 + 이펙트 정리 ─────────────────────────────
  const tick = useCallback(() => {
    if (engineRef.current) checkDeathLine(engineRef.current);
    // 600ms 지난 머지 이펙트 제거
    const now = performance.now();
    mergeFlashesRef.current = mergeFlashesRef.current.filter(
      (f) => now - f.createdAt < 600
    );
  }, [checkDeathLine]);

  // ─── 렌더링용 스냅샷 ─────────────────────────────────────────────────────
  const getBodies = useCallback((): Array<{ body: Matter.Body; levelId: number }> => {
    if (!engineRef.current) return [];
    return Matter.Composite.allBodies(engineRef.current.world)
      .filter((b) => b.label.startsWith('flower_'))
      .map((b) => ({
        body: b,
        levelId: (b as Matter.Body & { levelId: number }).levelId,
      }));
  }, []);

  useEffect(() => {
    return () => {
      if (runnerRef.current) Matter.Runner.stop(runnerRef.current);
      if (engineRef.current) Matter.Engine.clear(engineRef.current);
      if (deathTimerRef.current) clearTimeout(deathTimerRef.current);
    };
  }, []);

  return {
    gameState,
    dropXRef,
    mergeFlashesRef,
    startGame,
    dropFlower,
    setDropX,
    tick,
    getBodies,
  };
}
