// 전역 "튜토리얼 활성" 신호.
//
// 튜토리얼(useTutorial)과 결혼정보 프롬프트(useWeddingInfoPrompt)는 서로 다른
// 컴포넌트/인스턴스라 상태를 공유하지 않는다. 어느 페이지에서든 튜토리얼이
// 최우선이 되도록, 튜토리얼이 떠 있는 동안에는 결혼정보 모달이 양보하도록
// 이 모듈 레벨 스토어로 활성 여부를 공유한다.

let count = 0;
const listeners = new Set<() => void>();

const emit = () => {
  listeners.forEach((l) => l());
};

export const tutorialActive = {
  /** 튜토리얼 1개 시작 */
  enter() {
    count += 1;
    emit();
  },
  /** 튜토리얼 1개 종료 */
  leave() {
    count = Math.max(0, count - 1);
    emit();
  },
  /** 현재 활성 튜토리얼이 있는가 */
  get(): boolean {
    return count > 0;
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
