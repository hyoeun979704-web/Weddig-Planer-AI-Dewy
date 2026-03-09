import type { FlowerLevel } from './types';

// 플레이 영역 크기 (모바일 세로 기준)
export const GAME_WIDTH = 360;
export const GAME_HEIGHT = 580;

// 물리 엔진 설정
export const GRAVITY_Y = 1.5;          // 중력 강도
export const WALL_THICKNESS = 30;      // 바닥/벽 두께
export const DEATH_LINE_Y = 80;        // 이 Y 좌표 위로 오브젝트가 쌓이면 게임 오버
export const DEATH_CHECK_DELAY = 2000; // 게임 오버 판정까지 대기 시간 (ms)

// 오브젝트 드롭 시작 Y 좌표
export const DROP_START_Y = 50;

// 충돌 후 머지 대기 시간 (ms) - 너무 빠르면 물리 연산과 충돌함
export const MERGE_DELAY = 100;

// 레벨 1~5는 드롭 가능한 꽃 (랜덤 생성 풀)
export const MAX_DROP_LEVEL = 5;

// 꽃/부케 레벨 테이블
export const FLOWER_LEVELS: FlowerLevel[] = [
  {
    id: 1,
    name: '씨앗',
    radius: 14,
    color: '#8B6914',
    emoji: '🌰',
    score: 1,
    nextLevelId: 2,
  },
  {
    id: 2,
    name: '새싹',
    radius: 20,
    color: '#4CAF50',
    emoji: '🌱',
    score: 3,
    nextLevelId: 3,
  },
  {
    id: 3,
    name: '꽃봉우리',
    radius: 27,
    color: '#FF8C94',
    emoji: '🌸',
    score: 6,
    nextLevelId: 4,
  },
  {
    id: 4,
    name: '흰색 안개꽃',
    radius: 34,
    color: '#F5F5F5',
    emoji: '🤍',
    score: 10,
    nextLevelId: 5,
  },
  {
    id: 5,
    name: '분홍 부바르디아',
    radius: 41,
    color: '#FFB7C5',
    emoji: '🌺',
    score: 15,
    nextLevelId: 6,
  },
  {
    id: 6,
    name: '노랑 프리지아',
    radius: 49,
    color: '#FFE066',
    emoji: '🌼',
    score: 21,
    nextLevelId: 7,
  },
  {
    id: 7,
    name: '코랄 튤립',
    radius: 57,
    color: '#FF6B6B',
    emoji: '🌷',
    score: 28,
    nextLevelId: 8,
  },
  {
    id: 8,
    name: '빨강 장미꽃',
    radius: 65,
    color: '#E8001D',
    emoji: '🌹',
    score: 36,
    nextLevelId: 9,
  },
  {
    id: 9,
    name: '흰색 라넌큘러스',
    radius: 73,
    color: '#FFF0F5',
    emoji: '🏵️',
    score: 45,
    nextLevelId: 10,
  },
  {
    id: 10,
    name: '연분홍 작약',
    radius: 81,
    color: '#FFAEC9',
    emoji: '💮',
    score: 55,
    nextLevelId: 11,
  },
  {
    id: 11,
    name: '하얀 카라 부케',
    radius: 89,
    color: '#FFFFF0',
    emoji: '💐',
    score: 66,
    nextLevelId: 12,
  },
  {
    id: 12,
    name: '프리미엄부케',
    radius: 97,
    color: '#FFD700',
    emoji: '👰',
    score: 78,
    nextLevelId: null, // 최종 레벨 - 더 이상 합쳐지지 않음
  },
];

// ID로 레벨 객체를 빠르게 찾기 위한 Map
export const FLOWER_LEVEL_MAP = new Map<number, FlowerLevel>(
  FLOWER_LEVELS.map((f) => [f.id, f])
);
