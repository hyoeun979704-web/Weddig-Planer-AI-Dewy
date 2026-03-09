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
  FLOWER_LEVELS,
  FLOWER_LEVEL_MAP,
} from './constants';
import type { GameObject, GameState } from './types';

// 1~MAX_DROP_LEVEL 사이의 랜덤 레벨 ID를 반환
function randomDropLevel(): number {
  return Math.floor(Math.random() * MAX_DROP_LEVEL) + 1;
}

// 고유 ID 생성기
let idCounter = 0;
function genId() {
  return `obj_${++idCounter}`;
}

interface UseGameLogicOptions {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  onScoreChange?: (score: number) => void;
  onGameOver?: (score: number) => void;
}

export function useGameLogic({ canvasRef, onScoreChange, onGameOver }: UseGameLogicOptions) {
  const engineRef = useRef<Matter.Engine | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);

  // gameObjects: matter Body ID → GameObject 매핑
  const gameObjectsRef = useRef<Map<number, GameObject>>(new Map());

  // 대기 중인 아이템의 X 위치 (커서/터치 추적)
  const dropXRef = useRef<number>(GAME_WIDTH / 2);

  // 드롭 중복 방지 플래그
  const isDroppingRef = useRef(false);

  // 게임 오버 타이머 ref
  const deathTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isGameOverRef = useRef(false);

  const [gameState, setGameState] = useState<GameState>({
    phase: 'idle',
    score: 0,
    currentLevelId: randomDropLevel(),
    nextLevelId: randomDropLevel(),
    objects: [],
  });

  // ─── 물리 바디 생성 헬퍼 ───────────────────────────────────────────────────
  // 꽃 오브젝트를 matter.js 원형 바디로 생성하고 게임 맵에 등록
  const createFlowerBody = useCallback(
    (levelId: number, x: number, y: number): Matter.Body => {
      const level = FLOWER_LEVEL_MAP.get(levelId)!;
      const body = Matter.Bodies.circle(x, y, level.radius, {
        restitution: 0.3,   // 탄성 (살짝 튀기는 효과)
        friction: 0.5,
        density: 0.002,
        label: `flower_${levelId}`,
      });

      // body에 levelId를 커스텀 속성으로 저장 (matter.js는 label 외 플러그인 데이터 지원)
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
  // 같은 레벨 두 바디가 충돌하면 하나로 합치고 상위 레벨 생성
  const handleMerge = useCallback(
    (bodyA: Matter.Body, bodyB: Matter.Body, engine: Matter.Engine) => {
      const objA = gameObjectsRef.current.get(bodyA.id);
      const objB = gameObjectsRef.current.get(bodyB.id);

      if (!objA || !objB) return;
      if (objA.isMerging || objB.isMerging) return;
      if (objA.levelId !== objB.levelId) return;

      const level = FLOWER_LEVEL_MAP.get(objA.levelId);
      if (!level || level.nextLevelId === null) return; // 최종 레벨은 머지 안 함

      // 중복 머지 방지 플래그 설정
      objA.isMerging = true;
      objB.isMerging = true;

      // 두 오브젝트 중심 좌표의 평균 위치에 새 오브젝트 생성
      const midX = (bodyA.position.x + bodyB.position.x) / 2;
      const midY = (bodyA.position.y + bodyB.position.y) / 2;

      // matter.js 월드 수정은 setTimeout으로 물리 스텝과 분리해야 안전함
      // (충돌 이벤트 핸들러 내부에서 직접 바디를 제거하면 엔진 상태가 깨질 수 있음)
      setTimeout(() => {
        Matter.World.remove(engine.world, bodyA);
        Matter.World.remove(engine.world, bodyB);
        gameObjectsRef.current.delete(bodyA.id);
        gameObjectsRef.current.delete(bodyB.id);

        const newBody = createFlowerBody(level.nextLevelId!, midX, midY);
        Matter.World.add(engine.world, newBody);

        setGameState((prev) => {
          const newScore = prev.score + level.score;
          onScoreChange?.(newScore);
          return { ...prev, score: newScore };
        });
      }, MERGE_DELAY);
    },
    [createFlowerBody, onScoreChange]
  );

  // ─── 게임 오버 체크 ─────────────────────────────────────────────────────────
  // 매 프레임마다 DEATH_LINE_Y 위에 오브젝트가 있는지 감시
  const checkDeathLine = useCallback(
    (engine: Matter.Engine) => {
      if (isGameOverRef.current) return;

      const bodies = Matter.Composite.allBodies(engine.world).filter(
        (b) => b.label.startsWith('flower_')
      );

      // 벽/바닥이 아닌 꽃 오브젝트가 데스라인 위에 있는지 확인
      const overLine = bodies.some((b) => b.position.y - (b.circleRadius ?? 0) < DEATH_LINE_Y);

      if (overLine) {
        if (!deathTimerRef.current) {
          // 일정 시간 유지될 때만 게임 오버 (순간 튀어오른 경우 제외)
          deathTimerRef.current = setTimeout(() => {
            if (isGameOverRef.current) return;
            const stillOver = Matter.Composite.allBodies(engine.world)
              .filter((b) => b.label.startsWith('flower_'))
              .some((b) => b.position.y - (b.circleRadius ?? 0) < DEATH_LINE_Y);

            if (stillOver) {
              isGameOverRef.current = true;
              setGameState((prev) => {
                onGameOver?.(prev.score);
                return { ...prev, phase: 'gameover' };
              });
            }
            deathTimerRef.current = null;
          }, DEATH_CHECK_DELAY);
        }
      } else {
        // 데스라인을 벗어났으면 타이머 리셋
        if (deathTimerRef.current) {
          clearTimeout(deathTimerRef.current);
          deathTimerRef.current = null;
        }
      }
    },
    [onGameOver]
  );

  // ─── 엔진 초기화 ──────────────────────────────────────────────────────────
  const initEngine = useCallback(() => {
    if (!canvasRef.current) return;

    // 이전 엔진 정리
    if (runnerRef.current) Matter.Runner.stop(runnerRef.current);
    if (renderRef.current) {
      Matter.Render.stop(renderRef.current);
      renderRef.current.canvas.remove();
    }
    if (engineRef.current) Matter.Engine.clear(engineRef.current);

    const engine = Matter.Engine.create({
      gravity: { y: GRAVITY_Y },
    });

    // matter.js Render는 디버그용으로만 생성하지 않고 직접 Canvas에 그릴 것이므로 사용 안 함
    // 물리 연산만 수행하고 렌더링은 Game.tsx의 requestAnimationFrame에서 직접 처리

    const halfWall = WALL_THICKNESS / 2;

    // 바닥과 좌우 벽 (정적 바디 - 중력 영향 없음)
    const floor = Matter.Bodies.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT - halfWall,
      GAME_WIDTH,
      WALL_THICKNESS,
      { isStatic: true, label: 'wall', friction: 0.5 }
    );
    const wallLeft = Matter.Bodies.rectangle(
      -halfWall,
      GAME_HEIGHT / 2,
      WALL_THICKNESS,
      GAME_HEIGHT,
      { isStatic: true, label: 'wall' }
    );
    const wallRight = Matter.Bodies.rectangle(
      GAME_WIDTH + halfWall,
      GAME_HEIGHT / 2,
      WALL_THICKNESS,
      GAME_HEIGHT,
      { isStatic: true, label: 'wall' }
    );

    Matter.World.add(engine.world, [floor, wallLeft, wallRight]);

    // 충돌 이벤트: 같은 레벨끼리 만나면 머지
    Matter.Events.on(engine, 'collisionStart', (event) => {
      event.pairs.forEach(({ bodyA, bodyB }) => {
        const oA = gameObjectsRef.current.get(bodyA.id);
        const oB = gameObjectsRef.current.get(bodyB.id);
        if (oA && oB && oA.levelId === oB.levelId) {
          handleMerge(bodyA, bodyB, engine);
        }
      });
    });

    const runner = Matter.Runner.create();
    Matter.Runner.run(runner, engine);

    engineRef.current = engine;
    runnerRef.current = runner;
    gameObjectsRef.current.clear();
    isGameOverRef.current = false;
    isDroppingRef.current = false;
    if (deathTimerRef.current) {
      clearTimeout(deathTimerRef.current);
      deathTimerRef.current = null;
    }
  }, [canvasRef, handleMerge]);

  // ─── 게임 시작 / 재시작 ───────────────────────────────────────────────────
  const startGame = useCallback(() => {
    initEngine();
    const firstLevel = randomDropLevel();
    const secondLevel = randomDropLevel();
    setGameState({
      phase: 'idle',
      score: 0,
      currentLevelId: firstLevel,
      nextLevelId: secondLevel,
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

      // 드롭 후 짧은 지연을 두고 다음 드롭 허용 (연타 방지)
      setTimeout(() => {
        isDroppingRef.current = false;
      }, 400);

      return {
        ...prev,
        phase: 'idle',
        currentLevelId: newCurrent,
        nextLevelId: newNext,
      };
    });
  }, [createFlowerBody]);

  // ─── 마우스/터치 X 위치 업데이트 ─────────────────────────────────────────
  const updateDropX = useCallback((x: number) => {
    if (isGameOverRef.current) return;
    // 꽃이 벽 안에 완전히 들어오도록 X 범위 클램핑
    const level = FLOWER_LEVEL_MAP.get(
      // 현재 레벨을 직접 읽기 위해 setGameState를 쓰지 않고 ref 패턴 사용
      0 // 임시값 - 아래 setGameState 내부에서 갱신
    );
    dropXRef.current = Math.max(20, Math.min(x, GAME_WIDTH - 20));
  }, []);

  // dropX 클램핑을 현재 레벨 반지름에 맞게 적용
  const setDropX = useCallback((x: number, currentLevelId: number) => {
    if (isGameOverRef.current) return;
    const level = FLOWER_LEVEL_MAP.get(currentLevelId);
    const r = level?.radius ?? 20;
    dropXRef.current = Math.max(r, Math.min(x, GAME_WIDTH - r));
  }, []);

  // ─── 매 프레임 데스 라인 체크 ─────────────────────────────────────────────
  // requestAnimationFrame은 Game.tsx에서 관리하고, 이 함수를 호출하도록 노출
  const tickDeathCheck = useCallback(() => {
    if (engineRef.current) {
      checkDeathLine(engineRef.current);
    }
  }, [checkDeathLine]);

  // ─── 현재 물리 오브젝트 스냅샷 (렌더링용) ────────────────────────────────
  const getBodies = useCallback((): Array<{ body: Matter.Body; levelId: number }> => {
    if (!engineRef.current) return [];
    return Matter.Composite.allBodies(engineRef.current.world)
      .filter((b) => b.label.startsWith('flower_'))
      .map((b) => ({
        body: b,
        levelId: (b as Matter.Body & { levelId: number }).levelId,
      }));
  }, []);

  // 컴포넌트 언마운트 시 엔진 정리
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
    startGame,
    dropFlower,
    setDropX,
    tickDeathCheck,
    getBodies,
  };
}
