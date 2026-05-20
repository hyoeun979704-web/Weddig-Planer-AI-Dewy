import { Preferences } from '@capacitor/preferences';

// Supabase auth.storage 어댑터 (네이티브 앱 전용).
// WebView 의 localStorage 는 OS 정리·저장소 압박 시 휘발 가능성이 있고
// iOS WKWebView 의 사이트 데이터 정책상 비결정적이라 토큰 유실 위험이 있다.
// 네이티브 SharedPreferences/UserDefaults 기반 Preferences 로 옮겨
// 콜드스타트 세션 유지와 자동 토큰 갱신 안정성을 확보한다.
//
// Supabase 클라이언트는 storage 인터페이스의 async 반환을 그대로 받아들인다.
export const preferencesStorage = {
  async getItem(key: string): Promise<string | null> {
    const { value } = await Preferences.get({ key });
    return value;
  },
  async setItem(key: string, value: string): Promise<void> {
    await Preferences.set({ key, value });
  },
  async removeItem(key: string): Promise<void> {
    await Preferences.remove({ key });
  },
};
