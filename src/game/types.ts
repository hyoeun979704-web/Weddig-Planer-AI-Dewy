// 게임에서 사용하는 TypeScript 타입 정의

export interface FlowerLevel {
  id: number;           // 레벨 ID (1~12)
  name: string;         // 꽃 이름
  radius: number;       // 원형 충돌 반지름 (px)
  color: string;        // 캔버스 렌더링 색상
  emoji: string;        // UI 표시용 이모지
  score: number;        // 머지 시 획득 점수
  nextLevelId: number | null; // 머지 후 생성될 레벨 ID (null = 최종 레벨)
}

export interface GameObject {
  id: string;           // matter.js Body와 연결되는 고유 ID
  levelId: number;      // FlowerLevel.id 참조
  bodyId: number;       // matter.js Body.id
  isMerging: boolean;   // 현재 머지 처리 중인지 (중복 머지 방지)
}

export type GamePhase = 'idle' | 'dropping' | 'gameover';

export interface GameState {
  phase: GamePhase;
  score: number;
  currentLevelId: number;  // 현재 대기 중인 꽃 레벨
  nextLevelId: number;     // 다음에 나올 꽃 레벨 (미리보기)
  objects: GameObject[];
}
