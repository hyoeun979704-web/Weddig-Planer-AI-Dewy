import { QueryClient } from "@tanstack/react-query";

// 앱 전역 단일 React Query 클라이언트.
// App 의 QueryClientProvider 와 AuthContext 의 signOut 캐시 clear 가
// 반드시 동일 인스턴스를 공유하도록 별도 모듈로 분리한다.
export const queryClient = new QueryClient();
